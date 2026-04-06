import type { Hono } from 'hono';

import {
  MAX_CHECK_INTERVAL_MINUTES,
  MIN_CHECK_INTERVAL_MINUTES,
  PAIRING_TOKEN_TTL_MINUTES,
  TURNSTILE_TEST_TOKEN,
} from './constants';
import {
  checkRateLimit,
  deviceOwnsPerson,
  ensureDeviceLinkRequestsTable,
  ensurePairingRequestsTable,
  ensurePersonDevicesTable,
  ensurePersonsMaxDevicesColumn,
  ensureWatcherDisconnectEventsTable,
  expirePendingDeviceLinkToken,
  expirePendingPairingToken,
  lookupRequestDevice,
  rollbackRateLimit,
  upsertPersonDevice,
} from './helpers/db';
import {
  applyCorsHeaders,
  constantTimeEquals,
  hashApiKey,
  isLocalHostHeader,
  isLocalRequest,
  resolveAllowedCorsOrigin,
  resolveTurnstileSecret,
  verifyTurnstileToken,
} from './helpers/security';
import {
  detectDeviceModel,
  getDisplayNameValidationError,
  isValidUUID,
  normalizeDisplayName,
  parseCheckIntervalMinutes,
  parseDeviceModel,
} from './helpers/validation';
import type {
  AppEnv,
  DeviceLinkRequestRow,
  PairingRequestRow,
  PersonDeviceRow,
  PersonDevicesResponse,
  RateLimitRow,
  WatcherDisconnectEventRow,
} from './types';

type PersonMetaRow = {
  id: string;
  max_devices: number | string | null;
};

type DeviceLinkPublicStatus = 'pending' | 'requested' | 'completed' | 'expired' | 'rejected';

class ApiRouteError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function resolvePersonMaxDevices(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 1);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function resolvePersonDeviceAction(deviceCount: number, maxDevices: number): PersonDevicesResponse['device_action'] {
  if (maxDevices <= 1) {
    return 'switch';
  }

  return deviceCount < maxDevices ? 'add' : 'full';
}

function resolveDeviceLinkStatus(request: DeviceLinkRequestRow | null): DeviceLinkPublicStatus {
  if (!request) return 'expired';
  if (request.status === 'completed' || request.status === 'expired') {
    return request.status;
  }
  if (request.rejected_at) {
    return 'rejected';
  }
  if (request.requested_device_id) {
    return 'requested';
  }
  return 'pending';
}

async function deletePersonDeviceKeys(db: D1Database, deviceIds: string[]): Promise<void> {
  if (deviceIds.length === 0) return;
  await db.prepare(
    `DELETE FROM device_keys
     WHERE role = 'person'
       AND device_id IN (${deviceIds.map((_, index) => `?${index + 1}`).join(', ')})`,
  ).bind(...deviceIds).run();
}

async function bindPersonDeviceToPerson(
  db: D1Database,
  options: {
    personId: string;
    deviceId: string;
    mode: 'switch' | 'add';
    deviceModel: string;
    allowReassignFromWatcherlessPerson: boolean;
  },
): Promise<{ removedDeviceIds: string[]; maxDevices: number }> {
  const watcherBinding = await db.prepare(
    'SELECT watcher_id FROM watcher_devices WHERE device_id = ?1',
  ).bind(options.deviceId).first<{ watcher_id: string }>();
  if (watcherBinding?.watcher_id) {
    throw new ApiRouteError(409, 'Dieses Gerät ist bereits als Watcher registriert.');
  }

  const deviceKey = await db.prepare(
    'SELECT role FROM device_keys WHERE device_id = ?1',
  ).bind(options.deviceId).first<{ role: string }>();
  if (!deviceKey) {
    throw new ApiRouteError(404, 'Dieses Gerät ist noch nicht registriert.');
  }
  if (deviceKey.role !== 'person') {
    throw new ApiRouteError(409, 'Dieses Gerät ist bereits einer anderen Rolle zugeordnet.');
  }

  const existingBinding = await db.prepare(
    'SELECT person_id FROM person_devices WHERE device_id = ?1',
  ).bind(options.deviceId).first<{ person_id: string }>();
  if (existingBinding?.person_id && existingBinding.person_id !== options.personId) {
    if (!options.allowReassignFromWatcherlessPerson) {
      throw new ApiRouteError(409, 'Dieses Gerät ist bereits mit einer anderen Person verknüpft.');
    }

    const watcherCount = await db.prepare(
      'SELECT COUNT(*) as count FROM watch_relations WHERE person_id = ?1 AND removed_at IS NULL',
    ).bind(existingBinding.person_id).first<{ count: number | string }>();
    if (Number(watcherCount?.count ?? 0) > 0) {
      throw new ApiRouteError(409, 'Dieses Gerät ist bereits mit einer anderen Person verbunden.');
    }

    await db.prepare(
      'DELETE FROM person_devices WHERE device_id = ?1 AND person_id = ?2',
    ).bind(options.deviceId, existingBinding.person_id).run();
  }

  const targetPerson = await db.prepare(
    'SELECT id, max_devices FROM persons WHERE id = ?1',
  ).bind(options.personId).first<PersonMetaRow>();
  if (!targetPerson) {
    throw new ApiRouteError(404, 'Person not found');
  }

  const maxDevices = resolvePersonMaxDevices(targetPerson.max_devices);
  const targetCountRow = await db.prepare(
    'SELECT COUNT(*) as count FROM person_devices WHERE person_id = ?1',
  ).bind(options.personId).first<{ count: number | string }>();
  const targetDeviceCount = Number(targetCountRow?.count ?? 0);
  const isAlreadyBoundToTarget = existingBinding?.person_id === options.personId;

  if (options.mode === 'add' && !isAlreadyBoundToTarget && targetDeviceCount >= maxDevices) {
    throw new ApiRouteError(409, 'Gerätelimit erreicht.');
  }

  await upsertPersonDevice(
    db,
    options.personId,
    options.deviceId,
    options.deviceModel,
    new Date().toISOString(),
  );

  let removedDeviceIds: string[] = [];
  if (options.mode === 'switch') {
    const removableDevices = await db.prepare(
      `SELECT device_id
       FROM person_devices
       WHERE person_id = ?1 AND device_id <> ?2`,
    ).bind(options.personId, options.deviceId).all<{ device_id: string }>();
    removedDeviceIds = (removableDevices.results ?? []).map((row) => row.device_id).filter(Boolean);

    if (removedDeviceIds.length > 0) {
      await db.prepare(
        `DELETE FROM person_devices
         WHERE person_id = ?1
           AND device_id <> ?2
           AND device_id IN (${removedDeviceIds.map((_, index) => `?${index + 3}`).join(', ')})`,
      ).bind(options.personId, options.deviceId, ...removedDeviceIds).run();
      await deletePersonDeviceKeys(db, removedDeviceIds);
    }
  }

  return { removedDeviceIds, maxDevices };
}

export function registerApiRoutes(app: Hono<AppEnv>): void {
  app.use('/api/*', async (c, next) => {
    const requestOrigin = c.req.header('Origin');
    const allowedOrigin = resolveAllowedCorsOrigin(requestOrigin, c.req.url);

    if (requestOrigin && !allowedOrigin) {
      return c.json({ error: 'Origin not allowed' }, 403);
    }

    if (c.req.method === 'OPTIONS') {
      if (allowedOrigin) {
        applyCorsHeaders(c, allowedOrigin);
      }
      return c.body(null, 204);
    }

    await next();

    if (allowedOrigin) {
      applyCorsHeaders(c, allowedOrigin);
    }
  });

  app.use('/api/*', async (c, next) => {
    if (c.req.path === '/api/auth/register-device') return await next();

    if (c.env.DEV_TOKEN) {
      const devToken = new URL(c.req.url).searchParams.get('dev_token');
      if (devToken && constantTimeEquals(devToken, c.env.DEV_TOKEN)) {
        c.set('deviceId', 'dev');
        c.set('role', 'person');
        return await next();
      }
    }

    const isWatcherRoute =
      c.req.path.startsWith('/api/watcher') ||
      c.req.path.startsWith('/api/watch') ||
      c.req.path === '/api/pair/respond';

    const device = await lookupRequestDevice(
      c.env.DB,
      c.req.header('Cookie'),
      c.req.header('Authorization'),
      isWatcherRoute ? 'watcher' : 'person',
    );

    if (device) {
      c.set('deviceId', device.device_id);
      c.set('role', device.role);
      return await next();
    }

    return c.json({ error: 'Unauthorized' }, 401);
  });

  app.post('/api/auth/register-device', async (c) => {
    try {
      const body = await c.req.json<{ device_id?: string; turnstile_token?: string; role?: string }>();
      const { device_id, turnstile_token } = body;
      const role = body.role === 'watcher' ? 'watcher' : 'person';

      if (!device_id || !turnstile_token) {
        return c.json({ error: 'device_id und turnstile_token erforderlich' }, 400);
      }
      if (device_id.length > 255) {
        return c.json({ error: 'device_id zu lang' }, 400);
      }

      const isLocalTurnstileTestRequest =
        turnstile_token === TURNSTILE_TEST_TOKEN &&
        (
          isLocalRequest(c.req.url) ||
          isLocalHostHeader(c.req.header('host')) ||
          Boolean(c.env.DEV_TOKEN)
        );
      const turnstileSecret = resolveTurnstileSecret(c.req.url, c.env.TURNSTILE_SECRET_KEY, c.req.header('host'));
      const valid = isLocalTurnstileTestRequest
        ? true
        : await verifyTurnstileToken(turnstile_token, turnstileSecret);
      if (!valid) {
        return c.json({ error: 'Bot-Check fehlgeschlagen' }, 400);
      }

      const existingDevice = await c.env.DB.prepare(
        'SELECT role FROM device_keys WHERE device_id = ?1',
      ).bind(device_id).first<{ role: string }>();

      if (existingDevice) {
        const authenticatedDevice = await lookupRequestDevice(
          c.env.DB,
          c.req.header('Cookie'),
          c.req.header('Authorization'),
          role,
        );

        if (authenticatedDevice?.device_id !== device_id) {
          return c.json({ error: 'device_id bereits registriert' }, 409);
        }

        if (existingDevice.role !== role) {
          return c.json({ error: 'device_id ist bereits einer anderen Rolle zugeordnet' }, 409);
        }
      }

      const apiKey = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
      const keyHashHex = await hashApiKey(apiKey);

      await c.env.DB.prepare(
        `INSERT INTO device_keys (device_id, key_hash, created_at, role)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(device_id) DO UPDATE SET
           key_hash = excluded.key_hash,
           created_at = excluded.created_at,
           role = excluded.role`,
      ).bind(device_id, keyHashHex, new Date().toISOString(), role).run();

      const cookieMaxAge = 60 * 60 * 24 * 365;
      const cookieName = role === 'watcher' ? 'api_key_watcher' : 'api_key_person';
      c.header('Set-Cookie', `${cookieName}=${apiKey}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${cookieMaxAge}`);
      return c.json({ registered: true }, 201);
    } catch (error) {
      console.error('Error registering device:', error);
      return c.json({ error: 'Interner Fehler' }, 500);
    }
  });

  app.post('/api/person', async (c) => {
    try {
      const body = await c.req.json<{ id?: string }>().catch((): { id?: string } => ({}));
      const providedId = typeof body.id === 'string' ? body.id.trim() : '';
      if (providedId && !isValidUUID(providedId)) {
        return c.json({ error: 'Ungültige person_id' }, 400);
      }

      const personId = providedId || crypto.randomUUID();
      const deviceId = c.get('deviceId');

      await ensurePersonsMaxDevicesColumn(c.env.DB);
      await ensurePersonDevicesTable(c.env.DB);

      const existingPerson = await c.env.DB.prepare(
        'SELECT 1 FROM persons WHERE id = ?1',
      ).bind(personId).first();

      if (existingPerson) {
        const ownerCount = await c.env.DB.prepare(
          'SELECT COUNT(*) as count FROM person_devices WHERE person_id = ?1',
        ).bind(personId).first<{ count: number | string }>();
        const hasOwner = Number(ownerCount?.count ?? 0) > 0;

        if (hasOwner && !await deviceOwnsPerson(c.env.DB, deviceId, personId)) {
          return c.json({ error: 'Forbidden' }, 403);
        }
      }

      await c.env.DB.prepare(
        'INSERT OR IGNORE INTO persons (id, max_devices) VALUES (?1, 1)',
      ).bind(personId).run();

      const nowIso = new Date().toISOString();
      await upsertPersonDevice(c.env.DB, personId, deviceId, detectDeviceModel(c.req.header('user-agent') ?? ''), nowIso);

      return c.json({ id: personId }, 201);
    } catch (error) {
      console.error('Error creating person:', error);
      return c.json({ error: 'Failed to create person' }, 500);
    }
  });

  app.post('/api/heartbeat', async (c) => {
    const body = await c.req
      .json<{ person_id?: string; status?: string; device_id?: string; push_token?: string }>()
      .catch((): { person_id?: string; status?: string; device_id?: string; push_token?: string } => ({}));
    const personId = typeof body.person_id === 'string' ? body.person_id.trim() : '';
    const status = typeof body.status === 'string' ? body.status.trim() : 'ok';
    const deviceId = typeof body.device_id === 'string' ? body.device_id.trim() : '';
    const pushToken = typeof body.push_token === 'string' ? body.push_token.trim() : null;

    if (!personId || !isValidUUID(personId)) {
      return c.json({ error: 'Ungültige person_id' }, 400);
    }
    if (status.length > 64 || deviceId.length > 255) {
      return c.json({ error: 'person_id, status or device_id is too long' }, 400);
    }

    const authDeviceId = c.get('deviceId');
    if (!await deviceOwnsPerson(c.env.DB, authDeviceId, personId)) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const rateLimitKey = deviceId || personId;
    const rateLimitCheck = await checkRateLimit(c.env.DB, rateLimitKey);
    if (!rateLimitCheck.allowed) {
      return c.json({
        error: 'Too many requests',
        retry_after_seconds: rateLimitCheck.retryAfterSeconds,
      }, 429);
    }

    try {
      await c.env.DB.prepare(
        `INSERT INTO persons (id, last_heartbeat, created_at) VALUES (?, ?, datetime('now'))
         ON CONFLICT(id) DO UPDATE SET
           last_heartbeat = excluded.last_heartbeat,
           created_at = COALESCE(persons.created_at, excluded.created_at)`,
      ).bind(personId, nowIso).run();

      if (deviceId) {
        await ensurePersonDevicesTable(c.env.DB);
        await upsertPersonDevice(
          c.env.DB,
          personId,
          deviceId,
          detectDeviceModel(c.req.header('user-agent') ?? ''),
          nowIso,
          pushToken,
        );
      }

      return c.json({
        success: true,
        person_id: personId,
        device_id: deviceId || null,
        status,
        timestamp: nowIso,
      });
    } catch (error) {
      const previousRateLimit = await c.env.DB.prepare(
        'SELECT last_heartbeat_at FROM device_rate_limits WHERE device_id = ?1',
      ).bind(rateLimitKey).first<RateLimitRow>();

      await rollbackRateLimit(
        c.env.DB,
        rateLimitKey,
        previousRateLimit?.last_heartbeat_at ?? null,
        nowIso,
      );

      console.error('Error storing heartbeat:', error);
      return c.json({ error: 'Failed to store heartbeat' }, 500);
    }
  });

  app.get('/api/person/:id', async (c) => {
    const personId = c.req.param('id').trim();
    if (!isValidUUID(personId)) {
      return c.json({ error: 'Ungültige person_id' }, 400);
    }
    if (!await deviceOwnsPerson(c.env.DB, c.get('deviceId'), personId)) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const person = await c.env.DB.prepare('SELECT * FROM persons WHERE id = ?').bind(personId).first();
    if (!person) return c.json({ error: 'Person not found' }, 404);
    return c.json(person);
  });

  app.get('/api/person/:id/has-watcher', async (c) => {
    const personId = c.req.param('id').trim();
    if (!isValidUUID(personId)) return c.json({ error: 'Ungültige person_id' }, 400);
    if (!await deviceOwnsPerson(c.env.DB, c.get('deviceId'), personId)) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const result = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM watch_relations WHERE person_id = ?1 AND removed_at IS NULL',
    ).bind(personId).first<{ count: number | string }>();

    const watcherCount = Number(result?.count ?? 0);
    return c.json({
      has_watcher: watcherCount > 0,
      watcher_count: watcherCount,
    });
  });

  app.get('/api/person/:id/watchers', async (c) => {
    const personId = c.req.param('id').trim();
    if (!isValidUUID(personId)) return c.json({ error: 'Ungültige person_id' }, 400);
    if (!await deviceOwnsPerson(c.env.DB, c.get('deviceId'), personId)) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    await ensureWatcherDisconnectEventsTable(c.env.DB);

    const result = await c.env.DB.prepare(
      `SELECT watcher_id FROM watch_relations WHERE person_id = ?1 AND removed_at IS NULL`,
    ).bind(personId).all<{ watcher_id: string }>();

    const rows = result.results ?? [];
    const watchers = rows.map((row) => ({ id: row.watcher_id }));
    const disconnectEvents = await c.env.DB.prepare(
      `SELECT id, person_id, watcher_id, created_at, acknowledged_at
       FROM watcher_disconnect_events
       WHERE person_id = ?1 AND acknowledged_at IS NULL
       ORDER BY datetime(created_at) ASC, id ASC`,
    ).bind(personId).all<WatcherDisconnectEventRow>();

    return c.json({
      watcher_count: watchers.length,
      watchers,
      disconnect_events: (disconnectEvents.results ?? []).map((event) => ({
        id: event.id,
        watcher_id: event.watcher_id,
        created_at: event.created_at,
      })),
    });
  });

  app.post('/api/person/:id/disconnect-events/ack', async (c) => {
    const personId = c.req.param('id').trim();
    if (!isValidUUID(personId)) {
      return c.json({ error: 'Ungültige person_id' }, 400);
    }
    if (!await deviceOwnsPerson(c.env.DB, c.get('deviceId'), personId)) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const body = await c.req.json<{ event_ids?: unknown }>().catch((): { event_ids?: unknown } => ({}));
    const eventIds = Array.isArray(body.event_ids)
      ? body.event_ids
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0)
      : [];

    if (eventIds.length === 0) {
      return c.json({ error: 'event_ids required' }, 400);
    }

    await ensureWatcherDisconnectEventsTable(c.env.DB);

    const placeholders = eventIds.map((_, index) => `?${index + 2}`).join(', ');
    const result = await c.env.DB.prepare(
      `UPDATE watcher_disconnect_events
       SET acknowledged_at = datetime('now')
       WHERE person_id = ?1
         AND acknowledged_at IS NULL
         AND id IN (${placeholders})`,
    ).bind(personId, ...eventIds).run();

    return c.json({
      success: true,
      acknowledged_count: result.meta?.changes ?? 0,
    });
  });

  app.post('/api/pair/create', async (c) => {
    const body = await c.req.json<{ person_id?: string }>().catch((): { person_id?: string } => ({}));
    const personId = typeof body.person_id === 'string' ? body.person_id.trim() : '';

    if (!personId || !isValidUUID(personId)) {
      return c.json({ error: 'Ungültige person_id' }, 400);
    }
    if (!await deviceOwnsPerson(c.env.DB, c.get('deviceId'), personId)) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    await ensurePairingRequestsTable(c.env.DB);
    await c.env.DB.prepare(
      `UPDATE pairing_requests
       SET status = 'expired'
       WHERE person_id = ?1 AND status = 'pending'`,
    ).bind(personId).run();

    const pairingToken = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO pairing_requests (pairing_token, person_id, status)
       VALUES (?1, ?2, 'pending')`,
    ).bind(pairingToken, personId).run();

    return c.json({
      pairing_token: pairingToken,
      expires_in_seconds: PAIRING_TOKEN_TTL_MINUTES * 60,
    }, 201);
  });

  app.post('/api/person/:id/device-link/create', async (c) => {
    const personId = c.req.param('id').trim();
    if (!isValidUUID(personId)) {
      return c.json({ error: 'Ungültige person_id' }, 400);
    }
    if (!await deviceOwnsPerson(c.env.DB, c.get('deviceId'), personId)) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const body = await c.req.json<{ mode?: unknown }>().catch((): { mode?: unknown } => ({}));
    const mode = body.mode === 'switch' || body.mode === 'add' ? body.mode : null;
    if (!mode) {
      return c.json({ error: 'Ungültiger Modus' }, 400);
    }

    await ensureDeviceLinkRequestsTable(c.env.DB);
    await c.env.DB.prepare(
      `UPDATE device_link_requests
       SET status = 'expired'
       WHERE person_id = ?1 AND status = 'pending'`,
    ).bind(personId).run();

    const linkToken = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO device_link_requests (link_token, person_id, mode, status)
       VALUES (?1, ?2, ?3, 'pending')`,
    ).bind(linkToken, personId, mode).run();

    return c.json({
      link_token: linkToken,
      mode,
      expires_in_seconds: PAIRING_TOKEN_TTL_MINUTES * 60,
    }, 201);
  });

  app.get('/api/person/device-link/:token', async (c) => {
    const linkToken = c.req.param('token').trim();
    if (!linkToken || !isValidUUID(linkToken)) {
      return c.json({ error: 'Ungültiger link_token' }, 400);
    }

    await ensureDeviceLinkRequestsTable(c.env.DB);
    await expirePendingDeviceLinkToken(c.env.DB, linkToken);

    const request = await c.env.DB.prepare(
      `SELECT link_token, person_id, mode, status, requested_device_id, requested_device_model,
              requested_person_id, requested_at, rejected_at, created_at, completed_at
       FROM device_link_requests
       WHERE link_token = ?1`,
    ).bind(linkToken).first<DeviceLinkRequestRow>();

    if (!request) {
      return c.json({ error: 'Gerätewechsel nicht gefunden' }, 404);
    }

    const deviceId = c.get('deviceId');
    const ownsPerson = await deviceOwnsPerson(c.env.DB, deviceId, request.person_id);
    const isRequestingDevice = request.requested_device_id === deviceId;
    if (!ownsPerson && !isRequestingDevice) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    return c.json({
      link_token: request.link_token,
      person_id: request.person_id,
      mode: request.mode,
      status: resolveDeviceLinkStatus(request),
      requested_device_id: ownsPerson ? request.requested_device_id : undefined,
      requested_device_model: request.requested_device_model,
      requested_at: request.requested_at,
      completed_at: request.completed_at,
    });
  });

  app.post('/api/person/device-link/claim', async (c) => {
    try {
      const body = await c.req.json<{ link_token?: unknown }>().catch((): { link_token?: unknown } => ({}));
      const linkToken = typeof body.link_token === 'string' ? body.link_token.trim() : '';
      if (!linkToken || !isValidUUID(linkToken)) {
        return c.json({ error: 'Ungültiger link_token' }, 400);
      }

      await ensurePersonsMaxDevicesColumn(c.env.DB);
      await ensurePersonDevicesTable(c.env.DB);
      await ensureDeviceLinkRequestsTable(c.env.DB);
      await expirePendingDeviceLinkToken(c.env.DB, linkToken);

      const request = await c.env.DB.prepare(
        `SELECT link_token, person_id, mode, status, requested_device_id, requested_device_model,
                requested_person_id, requested_at, rejected_at, created_at, completed_at
         FROM device_link_requests
         WHERE link_token = ?1`,
      ).bind(linkToken).first<DeviceLinkRequestRow>();

      if (!request) {
        return c.json({ error: 'Gerätewechsel nicht gefunden' }, 404);
      }
      const requestStatus = resolveDeviceLinkStatus(request);
      if (requestStatus === 'expired') {
        return c.json({ error: 'Gerätewechsel abgelaufen' }, 410);
      }
      if (requestStatus === 'completed') {
        return c.json({ error: 'Gerätewechsel bereits abgeschlossen' }, 409);
      }
      if (requestStatus === 'rejected') {
        return c.json({ error: 'Gerätewechsel wurde abgelehnt' }, 409);
      }

      const deviceId = c.get('deviceId');
      const deviceModel = detectDeviceModel(c.req.header('user-agent') ?? '');

      if (request.mode === 'add') {
        const result = await bindPersonDeviceToPerson(c.env.DB, {
          personId: request.person_id,
          deviceId,
          mode: 'add',
          deviceModel,
          allowReassignFromWatcherlessPerson: true,
        });

        await c.env.DB.prepare(
          `UPDATE device_link_requests
           SET status = 'completed',
               requested_device_id = ?2,
               requested_device_model = ?3,
               requested_at = COALESCE(requested_at, datetime('now')),
               rejected_at = NULL,
               completed_at = datetime('now')
           WHERE link_token = ?1`,
        ).bind(linkToken, deviceId, deviceModel).run();

        return c.json({
          success: true,
          person_id: request.person_id,
          device_id: deviceId,
          device_action: request.mode,
          max_devices: result.maxDevices,
          removed_device_ids: result.removedDeviceIds,
        });
      }

      if (request.requested_device_id && request.requested_device_id !== deviceId) {
        return c.json({ error: 'Gerätewechsel wurde bereits von einem anderen Gerät angefragt' }, 409);
      }

      const currentBinding = await c.env.DB.prepare(
        'SELECT person_id FROM person_devices WHERE device_id = ?1',
      ).bind(deviceId).first<{ person_id: string }>();
      if (currentBinding?.person_id && currentBinding.person_id !== request.person_id) {
        const watcherCount = await c.env.DB.prepare(
          'SELECT COUNT(*) as count FROM watch_relations WHERE person_id = ?1 AND removed_at IS NULL',
        ).bind(currentBinding.person_id).first<{ count: number | string }>();
        if (Number(watcherCount?.count ?? 0) > 0) {
          return c.json({ error: 'Dieses Gerät ist bereits mit einer anderen Person verbunden.' }, 409);
        }
      }

      await c.env.DB.prepare(
        `UPDATE device_link_requests
         SET requested_device_id = ?2,
             requested_device_model = ?3,
             requested_person_id = ?4,
             requested_at = datetime('now'),
             rejected_at = NULL
         WHERE link_token = ?1`,
      ).bind(linkToken, deviceId, deviceModel, currentBinding?.person_id ?? null).run();

      return c.json({
        success: true,
        person_id: request.person_id,
        device_id: deviceId,
        device_action: request.mode,
        status: 'requested',
      }, 202);
    } catch (error) {
      if (error instanceof ApiRouteError) {
        return c.json({ error: error.message }, error.status);
      }
      console.error('Error claiming person device link:', error);
      return c.json({ error: 'Gerätewechsel fehlgeschlagen' }, 500);
    }
  });

  app.post('/api/person/:id/device-link/confirm', async (c) => {
    const personId = c.req.param('id').trim();
    if (!isValidUUID(personId)) {
      return c.json({ error: 'Ungültige person_id' }, 400);
    }
    if (!await deviceOwnsPerson(c.env.DB, c.get('deviceId'), personId)) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    try {
      const body = await c.req.json<{ link_token?: unknown; action?: unknown }>().catch(
        (): { link_token?: unknown; action?: unknown } => ({}),
      );
      const linkToken = typeof body.link_token === 'string' ? body.link_token.trim() : '';
      const action = body.action === 'approve' || body.action === 'reject' ? body.action : null;
      if (!linkToken || !isValidUUID(linkToken)) {
        return c.json({ error: 'Ungültiger link_token' }, 400);
      }
      if (!action) {
        return c.json({ error: 'Ungültige Aktion' }, 400);
      }

      await ensurePersonDevicesTable(c.env.DB);
      await ensurePersonsMaxDevicesColumn(c.env.DB);
      await ensureDeviceLinkRequestsTable(c.env.DB);
      await expirePendingDeviceLinkToken(c.env.DB, linkToken);

      const request = await c.env.DB.prepare(
        `SELECT link_token, person_id, mode, status, requested_device_id, requested_device_model,
                requested_person_id, requested_at, rejected_at, created_at, completed_at
         FROM device_link_requests
         WHERE link_token = ?1 AND person_id = ?2`,
      ).bind(linkToken, personId).first<DeviceLinkRequestRow>();

      if (!request) {
        return c.json({ error: 'Gerätewechsel nicht gefunden' }, 404);
      }

      const requestStatus = resolveDeviceLinkStatus(request);
      if (requestStatus === 'expired') {
        return c.json({ error: 'Gerätewechsel abgelaufen' }, 410);
      }
      if (requestStatus === 'completed') {
        return c.json({ error: 'Gerätewechsel bereits abgeschlossen' }, 409);
      }
      if (requestStatus === 'rejected') {
        return c.json({ error: 'Gerätewechsel wurde bereits abgelehnt' }, 409);
      }
      if (requestStatus !== 'requested' || !request.requested_device_id) {
        return c.json({ error: 'Noch keine Geräteanfrage vorhanden' }, 409);
      }

      if (action === 'reject') {
        await c.env.DB.prepare(
          `UPDATE device_link_requests
           SET rejected_at = datetime('now')
           WHERE link_token = ?1`,
        ).bind(linkToken).run();

        return c.json({
          success: true,
          person_id: request.person_id,
          device_action: request.mode,
          status: 'rejected',
        });
      }

      const result = await bindPersonDeviceToPerson(c.env.DB, {
        personId: request.person_id,
        deviceId: request.requested_device_id,
        mode: request.mode,
        deviceModel: request.requested_device_model || 'unknown',
        allowReassignFromWatcherlessPerson: true,
      });

      await c.env.DB.prepare(
        `UPDATE device_link_requests
         SET status = 'completed',
             completed_at = datetime('now'),
             rejected_at = NULL
         WHERE link_token = ?1`,
      ).bind(linkToken).run();

      return c.json({
        success: true,
        person_id: request.person_id,
        device_id: request.requested_device_id,
        device_action: request.mode,
        max_devices: result.maxDevices,
        removed_device_ids: result.removedDeviceIds,
        status: 'completed',
      });
    } catch (error) {
      if (error instanceof ApiRouteError) {
        return c.json({ error: error.message }, error.status);
      }
      console.error('Error confirming person device link:', error);
      return c.json({ error: 'Gerätewechsel-Bestätigung fehlgeschlagen' }, 500);
    }
  });

  app.get('/api/pair/:token', async (c) => {
    const pairingToken = c.req.param('token').trim();
    if (!pairingToken || !isValidUUID(pairingToken)) {
      return c.json({ error: 'Ungültiger pairing_token' }, 400);
    }

    await ensurePairingRequestsTable(c.env.DB);
    await expirePendingPairingToken(c.env.DB, pairingToken);

    const pairing = await c.env.DB.prepare(
      `SELECT pairing_token, person_id, watcher_name, watcher_device_id, status, created_at, completed_at
       FROM pairing_requests
       WHERE pairing_token = ?1`,
    ).bind(pairingToken).first<PairingRequestRow>();

    if (!pairing) {
      return c.json({ error: 'Pairing nicht gefunden' }, 404);
    }

    const requesterDeviceId = c.get('deviceId');
    const isPersonOwner = await deviceOwnsPerson(c.env.DB, requesterDeviceId, pairing.person_id);
    const isRequestingWatcher = pairing.watcher_device_id === requesterDeviceId;
    if (!isPersonOwner && !isRequestingWatcher) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    let status: 'pending' | 'requested' | 'completed' | 'expired' | 'rejected' = pairing.status;
    if (pairing.status === 'pending' && pairing.watcher_device_id) {
      status = 'requested';
    } else if (pairing.status === 'expired' && pairing.watcher_device_id && pairing.completed_at) {
      status = 'rejected';
    }

    return c.json({
      status,
      watcher_name: pairing.watcher_name,
    });
  });

  app.post('/api/pair/respond', async (c) => {
    const body = await c.req
      .json<{ pairing_token?: string; watcher_name?: string }>()
      .catch((): { pairing_token?: string; watcher_name?: string } => ({}));
    const pairingToken = typeof body.pairing_token === 'string' ? body.pairing_token.trim() : '';
    const watcherName = typeof body.watcher_name === 'string' ? body.watcher_name : '';

    if (!pairingToken || !isValidUUID(pairingToken)) {
      return c.json({ error: 'Ungültiger pairing_token' }, 400);
    }

    const nameError = getDisplayNameValidationError(watcherName);
    if (nameError === 'name-too-short') return c.json({ error: 'watcher_name too short' }, 400);
    if (nameError === 'name-too-long') return c.json({ error: 'watcher_name too long' }, 400);
    if (nameError === 'name-invalid-start') return c.json({ error: 'watcher_name must start with 2 letters' }, 400);
    const safeName = normalizeDisplayName(watcherName);

    await ensurePairingRequestsTable(c.env.DB);
    await expirePendingPairingToken(c.env.DB, pairingToken);

    const pairing = await c.env.DB.prepare(
      `SELECT pairing_token, person_id, watcher_name, watcher_device_id, status, created_at, completed_at
       FROM pairing_requests
       WHERE pairing_token = ?1`,
    ).bind(pairingToken).first<PairingRequestRow>();

    if (!pairing) {
      return c.json({ error: 'Pairing nicht gefunden' }, 404);
    }
    if (pairing.status === 'expired') {
      return c.json({ error: 'Pairing abgelaufen' }, 410);
    }
    if (pairing.status === 'completed') {
      return c.json({ error: 'Pairing bereits abgeschlossen' }, 409);
    }

    const deviceId = c.get('deviceId');
    const watcher = await c.env.DB.prepare(
      'SELECT watcher_id FROM watcher_devices WHERE device_id = ?1',
    ).bind(deviceId).first<{ watcher_id: string }>();
    if (!watcher?.watcher_id) {
      return c.json({ error: 'Watcher nicht registriert' }, 404);
    }

    if (pairing.watcher_device_id) {
      if (pairing.watcher_device_id === deviceId) {
        return c.json({
          success: true,
          status: 'requested',
          person_id: pairing.person_id,
          watcher_id: watcher.watcher_id,
          watcher_name: pairing.watcher_name ?? safeName,
        });
      }
      return c.json({ error: 'Pairing bereits angefragt' }, 409);
    }

    const claimResult = await c.env.DB.prepare(
      `UPDATE pairing_requests
       SET watcher_name = ?2,
           watcher_device_id = ?3,
           completed_at = NULL
       WHERE pairing_token = ?1
         AND status = 'pending'
         AND watcher_device_id IS NULL`,
    ).bind(pairingToken, safeName, deviceId).run();

    if ((claimResult.meta?.changes ?? 0) === 0) {
      const currentState = await c.env.DB.prepare(
        'SELECT status, watcher_device_id FROM pairing_requests WHERE pairing_token = ?1',
      ).bind(pairingToken).first<{ status: PairingRequestRow['status']; watcher_device_id: string | null }>();
      if (currentState?.status === 'expired') {
        return c.json({ error: 'Pairing abgelaufen' }, 410);
      }
      if (currentState?.watcher_device_id) {
        return c.json({ error: 'Pairing bereits angefragt' }, 409);
      }
      return c.json({ error: 'Pairing bereits abgeschlossen' }, 409);
    }

    return c.json({
      success: true,
      status: 'requested',
      person_id: pairing.person_id,
      watcher_id: watcher.watcher_id,
      watcher_name: safeName,
    });
  });

  app.post('/api/pair/confirm', async (c) => {
    const body = await c.req
      .json<{ pairing_token?: string; action?: string }>()
      .catch((): { pairing_token?: string; action?: string } => ({}));
    const pairingToken = typeof body.pairing_token === 'string' ? body.pairing_token.trim() : '';
    const action = body.action === 'approve' || body.action === 'reject' ? body.action : '';

    if (!pairingToken || !isValidUUID(pairingToken)) {
      return c.json({ error: 'Ungültiger pairing_token' }, 400);
    }
    if (!action) {
      return c.json({ error: 'Ungültige Aktion' }, 400);
    }

    await ensurePairingRequestsTable(c.env.DB);
    await expirePendingPairingToken(c.env.DB, pairingToken);

    const pairing = await c.env.DB.prepare(
      `SELECT pairing_token, person_id, watcher_name, watcher_device_id, status, created_at, completed_at
       FROM pairing_requests
       WHERE pairing_token = ?1`,
    ).bind(pairingToken).first<PairingRequestRow>();

    if (!pairing) {
      return c.json({ error: 'Pairing nicht gefunden' }, 404);
    }
    if (!await deviceOwnsPerson(c.env.DB, c.get('deviceId'), pairing.person_id)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    if (pairing.status === 'expired') {
      return c.json({ error: 'Pairing abgelaufen' }, 410);
    }
    if (pairing.status === 'completed') {
      return c.json({ error: 'Pairing bereits abgeschlossen' }, 409);
    }
    if (!pairing.watcher_device_id || !pairing.watcher_name) {
      return c.json({ error: 'Keine ausstehende Verbindungsanfrage' }, 409);
    }

    if (action === 'reject') {
      await c.env.DB.prepare(
        `UPDATE pairing_requests
         SET status = 'expired',
             completed_at = datetime('now')
         WHERE pairing_token = ?1`,
      ).bind(pairingToken).run();
      return c.json({ success: true, status: 'rejected' });
    }

    const watcher = await c.env.DB.prepare(
      'SELECT watcher_id FROM watcher_devices WHERE device_id = ?1',
    ).bind(pairing.watcher_device_id).first<{ watcher_id: string }>();
    if (!watcher?.watcher_id) {
      return c.json({ error: 'Watcher nicht registriert' }, 404);
    }

    await c.env.DB.prepare(
      `UPDATE pairing_requests
       SET status = 'completed',
           completed_at = datetime('now')
       WHERE pairing_token = ?1 AND status = 'pending'`,
    ).bind(pairingToken).run();

    const existingRelation = await c.env.DB.prepare(
      `SELECT id, removed_at
       FROM watch_relations
       WHERE person_id = ?1 AND watcher_id = ?2
       ORDER BY id DESC
       LIMIT 1`,
    ).bind(pairing.person_id, watcher.watcher_id).first<{ id: number; removed_at: string | null }>();

    if (!existingRelation) {
      await c.env.DB.prepare(
        `INSERT INTO watch_relations (person_id, watcher_id, check_interval_minutes)
         VALUES (?1, ?2, ?3)`,
      ).bind(pairing.person_id, watcher.watcher_id, 1440).run();
    } else if (existingRelation.removed_at) {
      await c.env.DB.prepare(
        `UPDATE watch_relations
         SET removed_at = NULL,
             added_at = datetime('now'),
             last_notified_at = NULL,
             check_interval_minutes = ?2
         WHERE id = ?1`,
      ).bind(existingRelation.id, 1440).run();
    }

    return c.json({
      success: true,
      status: 'completed',
      person_id: pairing.person_id,
      watcher_id: watcher.watcher_id,
      watcher_name: pairing.watcher_name,
    });
  });

  app.get('/api/person/:id/devices', async (c) => {
    const personId = c.req.param('id').trim();
    if (!isValidUUID(personId)) return c.json({ error: 'Ungültige person_id' }, 400);
    if (!await deviceOwnsPerson(c.env.DB, c.get('deviceId'), personId)) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    await ensurePersonDevicesTable(c.env.DB);
    await ensurePersonsMaxDevicesColumn(c.env.DB);
    const person = await c.env.DB.prepare(
      'SELECT id, max_devices FROM persons WHERE id = ?1',
    ).bind(personId).first<PersonMetaRow>();
    if (!person) {
      return c.json({ error: 'Person not found' }, 404);
    }

    const devices = await c.env.DB.prepare(
      `SELECT id, person_id, device_id, device_model, last_seen
       FROM person_devices
       WHERE person_id = ?1
       ORDER BY datetime(last_seen) DESC, id DESC`,
    ).bind(personId).all<PersonDeviceRow>();
    const deviceRows = devices.results ?? [];
    const maxDevices = resolvePersonMaxDevices(person.max_devices);

    return c.json({
      devices: deviceRows,
      max_devices: maxDevices,
      device_count: deviceRows.length,
      device_action: resolvePersonDeviceAction(deviceRows.length, maxDevices),
    });
  });

  app.post('/api/person/:id/devices', async (c) => {
    const personId = c.req.param('id').trim();
    if (!isValidUUID(personId)) {
      return c.json({ error: 'Ungültige person_id' }, 400);
    }
    if (!await deviceOwnsPerson(c.env.DB, c.get('deviceId'), personId)) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const body = await c.req.json<{ device_id?: string; mode?: unknown }>().catch((): { device_id?: string; mode?: unknown } => ({}));
    const deviceId = typeof body.device_id === 'string' ? body.device_id.trim() : '';
    const mode = body.mode === 'switch' || body.mode === 'add' ? body.mode : null;
    if (!personId || !deviceId) {
      return c.json({ error: 'person_id and device_id required' }, 400);
    }
    if (personId.length > 255 || deviceId.length > 255) {
      return c.json({ error: 'person_id or device_id is too long' }, 400);
    }

    const deviceModel = detectDeviceModel(c.req.header('user-agent') ?? '');
    await ensurePersonDevicesTable(c.env.DB);
    await ensurePersonsMaxDevicesColumn(c.env.DB);
    await c.env.DB.prepare('INSERT OR IGNORE INTO persons (id, max_devices) VALUES (?1, 1)').bind(personId).run();

    const person = await c.env.DB.prepare(
      'SELECT id, max_devices FROM persons WHERE id = ?1',
    ).bind(personId).first<PersonMetaRow>();
    if (!person) {
      return c.json({ error: 'Person not found' }, 404);
    }

    const maxDevices = resolvePersonMaxDevices(person.max_devices);
    const effectiveMode: 'switch' | 'add' = mode ?? (maxDevices <= 1 ? 'switch' : 'add');
    let removedDeviceIds: string[] = [];
    try {
      const result = await bindPersonDeviceToPerson(c.env.DB, {
        personId,
        deviceId,
        mode: effectiveMode,
        deviceModel,
        allowReassignFromWatcherlessPerson: false,
      });
      removedDeviceIds = result.removedDeviceIds;
    } catch (error) {
      if (error instanceof ApiRouteError) {
        return c.json({ error: error.message }, error.status);
      }
      throw error;
    }

    return c.json({
      success: true,
      person_id: personId,
      device_id: deviceId,
      device_model: deviceModel,
      last_seen: new Date().toISOString(),
      max_devices: maxDevices,
      device_action: effectiveMode,
      removed_device_ids: removedDeviceIds,
    });
  });

  app.delete('/api/person/:id/devices', async (c) => {
    const personId = c.req.param('id').trim();
    if (!isValidUUID(personId)) {
      return c.json({ error: 'Ungültige person_id' }, 400);
    }
    if (!await deviceOwnsPerson(c.env.DB, c.get('deviceId'), personId)) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const body = await c.req.json<{ device_id?: string }>().catch((): { device_id?: string } => ({}));
    const deviceId = typeof body.device_id === 'string' ? body.device_id.trim() : '';
    if (!personId || !deviceId) {
      return c.json({ error: 'person_id and device_id required' }, 400);
    }

    await ensurePersonDevicesTable(c.env.DB);
    const existing = await c.env.DB.prepare(
      'SELECT id FROM person_devices WHERE person_id = ?1 AND device_id = ?2',
    ).bind(personId, deviceId).first<{ id: number }>();

    if (!existing) {
      return c.json({ error: 'Device not found' }, 404);
    }

    const countRow = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM person_devices WHERE person_id = ?1',
    ).bind(personId).first<{ count: number | string }>();
    const deviceCount = Number(countRow?.count ?? 0);
    if (deviceCount <= 1) {
      return c.json({ error: 'Das letzte Gerät kann nicht gelöscht werden.' }, 409);
    }

    await c.env.DB.prepare(
      'DELETE FROM person_devices WHERE person_id = ?1 AND device_id = ?2',
    ).bind(personId, deviceId).run();

    return c.json({ success: true, person_id: personId, device_id: deviceId });
  });

  app.post('/api/watcher', async (c) => {
    const body = await c.req.json<{ push_token?: unknown }>().catch((): { push_token?: unknown } => ({}));
    const pushToken = typeof body.push_token === 'string' ? body.push_token.trim() : '';
    const deviceModel = detectDeviceModel(c.req.header('user-agent') ?? '');

    const deviceId = c.get('deviceId');
    const watcherId = crypto.randomUUID();
    await c.env.DB.batch([
      c.env.DB.prepare(`INSERT INTO watchers (id, last_seen, created_at) VALUES (?, datetime('now'), datetime('now'))`).bind(watcherId),
      c.env.DB.prepare(
        `INSERT OR REPLACE INTO watcher_devices (watcher_id, device_id, push_token, device_model, last_seen)
         VALUES (?, ?, ?, ?, datetime('now'))`,
      ).bind(watcherId, deviceId, pushToken, deviceModel),
    ]);
    return c.json({ id: watcherId }, 201);
  });

  app.post('/api/watch', async (c) => {
    return c.json({ error: 'Direktes Verbinden ist deaktiviert. Bitte den Pairing-QR-Code verwenden.' }, 410);
  });

  app.put('/api/watch', async (c) => {
    const body = await c.req
      .json<{ person_id?: unknown; watcher_id?: unknown; check_interval_minutes?: unknown }>()
      .catch((): { person_id?: unknown; watcher_id?: unknown; check_interval_minutes?: unknown } => ({}));
    const personId = typeof body.person_id === 'string' ? body.person_id.trim() : '';
    const watcherId = typeof body.watcher_id === 'string' ? body.watcher_id.trim() : '';
    const checkIntervalMinutes = parseCheckIntervalMinutes(body.check_interval_minutes);

    if (!personId || !watcherId || typeof body.check_interval_minutes === 'undefined') {
      return c.json({ error: 'person_id, watcher_id and check_interval_minutes required' }, 400);
    }
    if (!isValidUUID(personId)) {
      return c.json({ error: 'Ungültige person_id' }, 400);
    }
    if (!isValidUUID(watcherId)) {
      return c.json({ error: 'Ungültige watcher_id' }, 400);
    }
    if (checkIntervalMinutes === null) {
      return c.json({ error: `check_interval_minutes must be an integer between ${MIN_CHECK_INTERVAL_MINUTES} and ${MAX_CHECK_INTERVAL_MINUTES}` }, 400);
    }

    const deviceId = c.get('deviceId');
    const owns = await c.env.DB.prepare(
      'SELECT 1 FROM watcher_devices WHERE watcher_id = ? AND device_id = ?',
    ).bind(watcherId, deviceId).first();
    if (!owns) return c.json({ error: 'Forbidden' }, 403);

    await c.env.DB.prepare(
      'UPDATE watch_relations SET check_interval_minutes = ? WHERE person_id = ? AND watcher_id = ? AND removed_at IS NULL',
    ).bind(checkIntervalMinutes, personId, watcherId).run();

    return c.json({
      success: true,
      person_id: personId,
      watcher_id: watcherId,
      check_interval_minutes: checkIntervalMinutes,
    });
  });

  app.delete('/api/watch', async (c) => {
    const body = await c.req
      .json<{ person_id?: unknown; watcher_id?: unknown }>()
      .catch((): { person_id?: unknown; watcher_id?: unknown } => ({}));
    const personId = typeof body.person_id === 'string' ? body.person_id.trim() : '';
    const watcherId = typeof body.watcher_id === 'string' ? body.watcher_id.trim() : '';
    if (!personId || !watcherId) return c.json({ error: 'person_id and watcher_id required' }, 400);
    if (!isValidUUID(personId)) return c.json({ error: 'Ungültige person_id' }, 400);
    if (!isValidUUID(watcherId)) return c.json({ error: 'Ungültige watcher_id' }, 400);

    const deviceId = c.get('deviceId');
    const owns = await c.env.DB.prepare(
      'SELECT 1 FROM watcher_devices WHERE watcher_id = ? AND device_id = ?',
    ).bind(watcherId, deviceId).first();
    if (!owns) return c.json({ error: 'Forbidden' }, 403);

    await ensureWatcherDisconnectEventsTable(c.env.DB);

    const removalResult = await c.env.DB.prepare(
      'UPDATE watch_relations SET removed_at = datetime(\'now\') WHERE person_id = ? AND watcher_id = ? AND removed_at IS NULL',
    ).bind(personId, watcherId).run();

    if ((removalResult.meta?.changes ?? 0) > 0) {
      await c.env.DB.prepare(
        `INSERT INTO watcher_disconnect_events (person_id, watcher_id) VALUES (?1, ?2)`,
      ).bind(personId, watcherId).run();
    }

    return c.json({ success: true });
  });

  app.get('/api/watcher/:id', async (c) => {
    const watcherId = c.req.param('id').trim();
    if (!isValidUUID(watcherId)) {
      return c.json({ error: 'Ungültige watcher_id' }, 400);
    }

    const deviceId = c.get('deviceId');
    const owns = await c.env.DB.prepare(
      'SELECT 1 FROM watcher_devices WHERE watcher_id = ? AND device_id = ?',
    ).bind(watcherId, deviceId).first();
    if (!owns) return c.json({ error: 'Forbidden' }, 403);

    const watcher = await c.env.DB.prepare(
      'SELECT id, max_persons FROM watchers WHERE id = ?',
    ).bind(watcherId).first<{ id: string; max_persons: number }>();
    if (!watcher) return c.json({ error: 'Not found' }, 404);
    return c.json(watcher);
  });

  app.get('/api/watcher/:id/persons', async (c) => {
    const watcherId = c.req.param('id').trim();
    if (!isValidUUID(watcherId)) {
      return c.json({ error: 'Ungültige watcher_id' }, 400);
    }

    const deviceId = c.get('deviceId');
    const owns = await c.env.DB.prepare(
      'SELECT 1 FROM watcher_devices WHERE watcher_id = ? AND device_id = ?',
    ).bind(watcherId, deviceId).first();
    if (!owns) return c.json({ error: 'Forbidden' }, 403);

    await c.env.DB.prepare(
      `UPDATE watchers SET last_seen = datetime('now') WHERE id = ?`,
    ).bind(watcherId).run();

    const persons = await c.env.DB.prepare(
      `SELECT
        p.id,
        p.last_heartbeat,
        wr.check_interval_minutes,
        CASE
          WHEN p.last_heartbeat IS NULL THEN 'never'
          WHEN datetime(p.last_heartbeat, '+' || wr.check_interval_minutes || ' minutes') < datetime('now')
          THEN 'overdue'
          ELSE 'ok'
        END as status
       FROM persons p
       JOIN watch_relations wr ON p.id = wr.person_id
       WHERE wr.watcher_id = ? AND wr.removed_at IS NULL`,
    ).bind(watcherId).all();
    return c.json(persons.results);
  });
}
