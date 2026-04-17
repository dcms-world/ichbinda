import { DEVICE_LINK_CLEANUP_AFTER_MINUTES, PAIRING_CLEANUP_AFTER_MINUTES, PAIRING_TOKEN_TTL_MINUTES, RATE_LIMIT_WINDOW_MS } from '../constants';
import type { DeviceLinkRequestRow, OverduePersonRow, PairingRequestRow, RateLimitRow } from '../types';
import { hashApiKey } from './security';

export async function lookupApiKey(db: D1Database, apiKey: string): Promise<{ device_id: string; role: string } | null> {
  const hash = await hashApiKey(apiKey);
  const row = await db.prepare(
    'SELECT device_id, role FROM device_keys WHERE key_hash = ?1',
  ).bind(hash).first<{ device_id: string; role: string }>();
  return row ?? null;
}

export async function lookupRequestDevice(
  db: D1Database,
  cookieHeader: string | undefined,
  authHeader: string | undefined,
  preferredRole: 'person' | 'watcher',
): Promise<{ device_id: string; role: string } | null> {
  const cookies: Record<string, string> = {};
  for (const part of (cookieHeader ?? '').split(';')) {
    const eqIdx = part.indexOf('=');
    if (eqIdx === -1) continue;
    cookies[part.slice(0, eqIdx).trim()] = part.slice(eqIdx + 1).trim();
  }

  const primaryCookie = preferredRole === 'watcher' ? 'api_key_watcher' : 'api_key_person';
  const secondaryCookie = preferredRole === 'watcher' ? 'api_key_person' : 'api_key_watcher';
  const cookiesToTry = [primaryCookie, secondaryCookie, 'api_key'];

  for (const name of cookiesToTry) {
    const value = cookies[name];
    if (!value) continue;
    const device = await lookupApiKey(db, value);
    if (device) return device;
  }

  if (authHeader?.startsWith('Bearer ')) {
    return await lookupApiKey(db, authHeader.slice(7));
  }

  return null;
}

export async function checkRateLimit(
  db: D1Database,
  deviceKey: string,
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const now = new Date();
  const nowIso = now.toISOString();
  const cutoffIso = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS).toISOString();

  const previousRateLimit = await db.prepare(
    'SELECT last_heartbeat_at FROM device_rate_limits WHERE device_id = ?1',
  ).bind(deviceKey).first<RateLimitRow>();

  const rateLimitResult = await db.prepare(
    `
      INSERT INTO device_rate_limits (device_id, last_heartbeat_at)
      VALUES (?1, ?2)
      ON CONFLICT(device_id) DO UPDATE SET last_heartbeat_at = excluded.last_heartbeat_at
      WHERE unixepoch(device_rate_limits.last_heartbeat_at) <= unixepoch(?3)
    `,
  ).bind(deviceKey, nowIso, cutoffIso).run();

  const rateLimitUpdated = (rateLimitResult.meta?.changes ?? 0) > 0;

  if (!rateLimitUpdated) {
    const lastHeartbeatMs = previousRateLimit?.last_heartbeat_at
      ? Date.parse(previousRateLimit.last_heartbeat_at)
      : 0;
    const retryAfterMs = lastHeartbeatMs + RATE_LIMIT_WINDOW_MS - now.getTime();
    const retryAfterSeconds = retryAfterMs > 0 ? Math.ceil(retryAfterMs / 1000) : 0;

    return { allowed: false, retryAfterSeconds };
  }

  return { allowed: true };
}

export async function rollbackRateLimit(
  db: D1Database,
  deviceKey: string,
  previousTimestamp: string | null,
  currentTimestamp: string,
): Promise<void> {
  try {
    if (previousTimestamp) {
      await db.prepare(
        `
          UPDATE device_rate_limits
          SET last_heartbeat_at = ?1
          WHERE device_id = ?2 AND last_heartbeat_at = ?3
        `,
      ).bind(previousTimestamp, deviceKey, currentTimestamp).run();
      return;
    }

    await db.prepare(
      'DELETE FROM device_rate_limits WHERE device_id = ?1 AND last_heartbeat_at = ?2',
    ).bind(deviceKey, currentTimestamp).run();
  } catch (rollbackError) {
    console.error('Failed to rollback rate limit state', rollbackError);
  }
}

export async function deviceOwnsPerson(db: D1Database, deviceId: string, personId: string): Promise<boolean> {
  const row = await db.prepare(
    'SELECT 1 FROM person_devices WHERE device_id = ?1 AND person_id = ?2',
  ).bind(deviceId, personId).first();
  return !!row;
}

export async function ensurePersonDevicesTable(db: D1Database): Promise<void> {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS person_devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id TEXT NOT NULL,
      device_id TEXT NOT NULL UNIQUE,
      device_model TEXT NOT NULL,
      push_token TEXT,
      last_seen DATETIME NOT NULL,
      FOREIGN KEY (person_id) REFERENCES persons(id)
    )`,
  ).run();
  await db.prepare(
    'CREATE INDEX IF NOT EXISTS idx_person_devices_person_id_last_seen ON person_devices(person_id, last_seen DESC)',
  ).run();
}

export async function ensurePersonsMaxDevicesColumn(db: D1Database): Promise<void> {
  try {
    await db.prepare(
      'ALTER TABLE persons ADD COLUMN max_devices INTEGER NOT NULL DEFAULT 1',
    ).run();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.toLowerCase().includes('duplicate column name')) {
      throw error;
    }
  }
}

export async function ensurePairingRequestsTable(db: D1Database): Promise<void> {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS pairing_requests (
      pairing_token TEXT PRIMARY KEY,
      person_id TEXT NOT NULL,
      watcher_name TEXT,
      watcher_device_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'expired')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      FOREIGN KEY (person_id) REFERENCES persons(id)
    )`,
  ).run();
  await db.prepare(
    'CREATE INDEX IF NOT EXISTS idx_pairing_requests_person_status ON pairing_requests(person_id, status)',
  ).run();
  await db.prepare(
    'CREATE INDEX IF NOT EXISTS idx_pairing_requests_created ON pairing_requests(created_at)',
  ).run();
}

export async function ensureDeviceLinkRequestsTable(db: D1Database): Promise<void> {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS device_link_requests (
      link_token TEXT PRIMARY KEY,
      person_id TEXT NOT NULL,
      mode TEXT NOT NULL CHECK(mode IN ('switch', 'add')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'expired')),
      requested_device_id TEXT,
      requested_device_model TEXT,
      requested_person_id TEXT,
      requested_at TEXT,
      rejected_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      FOREIGN KEY (person_id) REFERENCES persons(id)
    )`,
  ).run();
  await db.prepare(
    'CREATE INDEX IF NOT EXISTS idx_device_link_requests_person_status ON device_link_requests(person_id, status)',
  ).run();
  await db.prepare(
    'CREATE INDEX IF NOT EXISTS idx_device_link_requests_created ON device_link_requests(created_at)',
  ).run();
  await addDeviceLinkRequestColumn(db, 'requested_device_id TEXT');
  await addDeviceLinkRequestColumn(db, 'requested_device_model TEXT');
  await addDeviceLinkRequestColumn(db, 'requested_person_id TEXT');
  await addDeviceLinkRequestColumn(db, 'requested_at TEXT');
  await addDeviceLinkRequestColumn(db, 'rejected_at TEXT');
}

async function addDeviceLinkRequestColumn(db: D1Database, definition: string): Promise<void> {
  try {
    await db.prepare(`ALTER TABLE device_link_requests ADD COLUMN ${definition}`).run();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.toLowerCase().includes('duplicate column name')) {
      throw error;
    }
  }
}

export async function ensureWatcherDisconnectEventsTable(db: D1Database): Promise<void> {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS watcher_disconnect_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id TEXT NOT NULL,
      watcher_id TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT (datetime('now')),
      acknowledged_at DATETIME,
      FOREIGN KEY (person_id) REFERENCES persons(id),
      FOREIGN KEY (watcher_id) REFERENCES watchers(id)
    )`,
  ).run();
  await db.prepare(
    'CREATE INDEX IF NOT EXISTS idx_watcher_disconnect_events_person_ack ON watcher_disconnect_events(person_id, acknowledged_at, created_at DESC)',
  ).run();
}

export async function expirePendingPairingToken(db: D1Database, pairingToken: string): Promise<void> {
  await db.prepare(
    `UPDATE pairing_requests
     SET status = 'expired'
     WHERE pairing_token = ?1
       AND status = 'pending'
       AND created_at < datetime('now', ?2)`,
  ).bind(pairingToken, `-${PAIRING_TOKEN_TTL_MINUTES} minutes`).run();
}

export async function expirePendingDeviceLinkToken(db: D1Database, linkToken: string): Promise<void> {
  await db.prepare(
    `UPDATE device_link_requests
     SET status = 'expired'
     WHERE link_token = ?1
       AND status = 'pending'
       AND created_at < datetime('now', ?2)`,
  ).bind(linkToken, `-${PAIRING_TOKEN_TTL_MINUTES} minutes`).run();
}

export async function upsertPersonDevice(
  db: D1Database,
  personId: string,
  deviceId: string,
  deviceModel: string,
  lastSeenIso: string,
  pushToken?: string | null,
): Promise<void> {
  if (!deviceId) return;
  await db.prepare(
    `INSERT INTO person_devices (person_id, device_id, device_model, push_token, last_seen)
     VALUES (?1, ?2, ?3, ?4, ?5)
     ON CONFLICT(device_id) DO UPDATE SET
       person_id = excluded.person_id,
       device_model = excluded.device_model,
       push_token = COALESCE(excluded.push_token, person_devices.push_token),
       last_seen = excluded.last_seen`,
  ).bind(personId, deviceId, deviceModel, pushToken ?? null, lastSeenIso).run();
}

export async function checkOverduePersons(db: D1Database, expoToken?: string): Promise<{ checked: number }> {
  const overdue = await db.prepare(
    `SELECT p.id as person_id, p.last_heartbeat, wr.watcher_id, wr.check_interval_minutes, wd.push_token
     FROM persons p
     JOIN watch_relations wr ON p.id = wr.person_id
     JOIN watcher_devices wd ON wr.watcher_id = wd.watcher_id
     WHERE wr.removed_at IS NULL
     AND p.deleted_at IS NULL
     AND (p.last_heartbeat IS NULL OR datetime(p.last_heartbeat, '+' || wr.check_interval_minutes || ' minutes') < datetime('now'))
     AND (wr.last_notified_at IS NULL OR wr.last_notified_at < datetime('now', '-1 hour'))`,
  ).all<OverduePersonRow>();

  for (const item of overdue.results ?? []) {
    if (expoToken && item.push_token) {
      const hours = Math.round(item.check_interval_minutes / 60);
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${expoToken}` },
        body: JSON.stringify({
          to: item.push_token,
          title: 'I bin da – Alarm',
          body: `Keine Meldung seit ${hours} Stunden`,
          data: { person_id: item.person_id },
        }),
      });
    }

    await db.prepare(
      'UPDATE watch_relations SET last_notified_at = datetime("now") WHERE person_id = ? AND watcher_id = ? AND removed_at IS NULL',
    ).bind(item.person_id, item.watcher_id).run();
  }

  return { checked: overdue.results?.length ?? 0 };
}

export async function cleanupPairingRequests(db: D1Database): Promise<{ deleted: number }> {
  await ensurePairingRequestsTable(db);
  const result = await db.prepare(
    `DELETE FROM pairing_requests
     WHERE created_at < datetime('now', ?1)`,
  ).bind(`-${PAIRING_CLEANUP_AFTER_MINUTES} minutes`).run();
  return { deleted: result.meta?.changes ?? 0 };
}

export async function cleanupDeviceLinkRequests(db: D1Database): Promise<{ deleted: number }> {
  await ensureDeviceLinkRequestsTable(db);
  const result = await db.prepare(
    `DELETE FROM device_link_requests
     WHERE created_at < datetime('now', ?1)`,
  ).bind(`-${DEVICE_LINK_CLEANUP_AFTER_MINUTES} minutes`).run();
  return { deleted: result.meta?.changes ?? 0 };
}
