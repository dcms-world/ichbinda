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
  ensurePairingRequestsTable,
  ensurePersonDevicesTable,
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
  parseCoordinate,
  parseDeviceModel,
  parsePushToken,
} from './helpers/validation';
import type { AppEnv, PairingRequestRow, PersonDeviceRow, RateLimitRow } from './types';

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
        'INSERT OR IGNORE INTO persons (id) VALUES (?1)',
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
      .json<{ person_id?: string; status?: string; lat?: unknown; lng?: unknown; loc?: boolean; device_id?: string }>()
      .catch((): { person_id?: string; status?: string; lat?: unknown; lng?: unknown; loc?: boolean; device_id?: string } => ({}));
    const personId = typeof body.person_id === 'string' ? body.person_id.trim() : '';
    const status = typeof body.status === 'string' ? body.status.trim() : 'ok';
    const deviceId = typeof body.device_id === 'string' ? body.device_id.trim() : '';
    const locEnabled = body.loc === true;
    const hasLat = Object.prototype.hasOwnProperty.call(body, 'lat');
    const hasLng = Object.prototype.hasOwnProperty.call(body, 'lng');
    const lat = hasLat ? parseCoordinate(body.lat) : null;
    const lng = hasLng ? parseCoordinate(body.lng) : null;
    const clearLocationRequested = body.loc === false;

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

    if (locEnabled) {
      if (hasLat !== hasLng) {
        return c.json({ error: 'lat and lng must be provided together' }, 400);
      }
      if ((hasLat && lat === null) || (hasLng && lng === null)) {
        return c.json({ error: 'Invalid coordinates' }, 400);
      }
      if (lat !== null && (lat < -90 || lat > 90)) {
        return c.json({ error: 'Invalid latitude' }, 400);
      }
      if (lng !== null && (lng < -180 || lng > 180)) {
        return c.json({ error: 'Invalid longitude' }, 400);
      }
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
      if (clearLocationRequested) {
        await c.env.DB.prepare(
          `INSERT INTO persons (id, last_heartbeat, last_location_lat, last_location_lng) VALUES (?, ?, NULL, NULL)
           ON CONFLICT(id) DO UPDATE SET
           last_heartbeat = excluded.last_heartbeat,
           last_location_lat = NULL,
           last_location_lng = NULL`,
        ).bind(personId, nowIso).run();
      } else if (lat !== null && lng !== null) {
        await c.env.DB.prepare(
          `INSERT INTO persons (id, last_heartbeat, last_location_lat, last_location_lng) VALUES (?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
           last_heartbeat = excluded.last_heartbeat,
           last_location_lat = excluded.last_location_lat,
           last_location_lng = excluded.last_location_lng`,
        ).bind(personId, nowIso, lat, lng).run();
      } else {
        await c.env.DB.prepare(
          `INSERT INTO persons (id, last_heartbeat) VALUES (?, ?)
           ON CONFLICT(id) DO UPDATE SET last_heartbeat = excluded.last_heartbeat`,
        ).bind(personId, nowIso).run();
      }

      if (deviceId) {
        await ensurePersonDevicesTable(c.env.DB);
        await upsertPersonDevice(
          c.env.DB,
          personId,
          deviceId,
          detectDeviceModel(c.req.header('user-agent') ?? ''),
          nowIso,
        );
      }

      return c.json({
        success: true,
        person_id: personId,
        device_id: deviceId || null,
        status,
        timestamp: nowIso,
        location: lat !== null && lng !== null ? { lat, lng } : null,
        location_cleared: clearLocationRequested,
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

    const result = await c.env.DB.prepare(
      `SELECT wr.watcher_id, wna.name as watcher_name
       FROM watch_relations wr
       LEFT JOIN watcher_name_announcements wna ON wr.watcher_id = wna.watcher_id
       WHERE wr.person_id = ?1 AND wr.removed_at IS NULL`,
    ).bind(personId).all<{ watcher_id: string; watcher_name: string | null }>();

    const rows = result.results ?? [];
    const withNames = rows.filter((row) => row.watcher_name !== null);
    if (withNames.length > 0) {
      await c.env.DB.batch(
        withNames.map((row) => c.env.DB.prepare('DELETE FROM watcher_name_announcements WHERE watcher_id = ?').bind(row.watcher_id)),
      );
    }

    const watchers = rows.map((row) => ({ id: row.watcher_id, name: row.watcher_name ?? null }));
    return c.json({ watcher_count: watchers.length, watchers });
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

    await c.env.DB.prepare(
      `INSERT OR REPLACE INTO watcher_name_announcements (watcher_id, name, created_at)
       VALUES (?1, ?2, datetime('now'))`,
    ).bind(watcher.watcher_id, pairing.watcher_name).run();

    return c.json({
      success: true,
      status: 'completed',
      person_id: pairing.person_id,
      watcher_id: watcher.watcher_id,
      watcher_name: pairing.watcher_name,
    });
  });

  app.post('/api/watcher/:id/announce', async (c) => {
    const watcherId = c.req.param('id').trim();
    if (!isValidUUID(watcherId)) {
      return c.json({ error: 'Ungültige watcher_id' }, 400);
    }

    const body = await c.req.json<{ name?: unknown }>().catch((): { name?: unknown } => ({}));
    const name = typeof body.name === 'string' ? body.name : '';
    const nameError = getDisplayNameValidationError(name);
    if (nameError === 'name-too-short') return c.json({ error: 'name too short' }, 400);
    if (nameError === 'name-too-long') return c.json({ error: 'name too long' }, 400);
    if (nameError === 'name-invalid-start') return c.json({ error: 'name must start with 2 letters' }, 400);
    const safeName = normalizeDisplayName(name);

    const deviceId = c.get('deviceId');
    const owns = await c.env.DB.prepare(
      'SELECT 1 FROM watcher_devices WHERE watcher_id = ? AND device_id = ?',
    ).bind(watcherId, deviceId).first();
    if (!owns) return c.json({ error: 'Forbidden' }, 403);

    await c.env.DB.prepare(
      'INSERT OR REPLACE INTO watcher_name_announcements (watcher_id, name, created_at) VALUES (?, ?, datetime(\'now\'))',
    ).bind(watcherId, safeName).run();

    return c.json({ ok: true });
  });

  app.get('/api/person/:id/devices', async (c) => {
    const personId = c.req.param('id').trim();
    if (!isValidUUID(personId)) return c.json({ error: 'Ungültige person_id' }, 400);
    if (!await deviceOwnsPerson(c.env.DB, c.get('deviceId'), personId)) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    await ensurePersonDevicesTable(c.env.DB);
    const devices = await c.env.DB.prepare(
      `SELECT id, person_id, device_id, device_model, last_seen
       FROM person_devices
       WHERE person_id = ?1
       ORDER BY datetime(last_seen) DESC, id DESC`,
    ).bind(personId).all<PersonDeviceRow>();

    return c.json(devices.results ?? []);
  });

  app.post('/api/person/:id/devices', async (c) => {
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
    if (personId.length > 255 || deviceId.length > 255) {
      return c.json({ error: 'person_id or device_id is too long' }, 400);
    }

    const nowIso = new Date().toISOString();
    const deviceModel = detectDeviceModel(c.req.header('user-agent') ?? '');
    await ensurePersonDevicesTable(c.env.DB);
    await c.env.DB.prepare('INSERT OR IGNORE INTO persons (id) VALUES (?1)').bind(personId).run();
    await upsertPersonDevice(c.env.DB, personId, deviceId, deviceModel, nowIso);

    return c.json({
      success: true,
      person_id: personId,
      device_id: deviceId,
      device_model: deviceModel,
      last_seen: nowIso,
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
    const body = await c.req.json<{ push_token?: unknown; device_model?: unknown }>().catch((): { push_token?: unknown; device_model?: unknown } => ({}));
    const pushToken = parsePushToken(body.push_token);
    if (!pushToken) return c.json({ error: 'push_token invalid' }, 400);

    const deviceModel = parseDeviceModel(body.device_model);
    if (deviceModel === null) {
      return c.json({ error: `device_model too long` }, 400);
    }

    const deviceId = c.get('deviceId');
    const watcherId = crypto.randomUUID();
    await c.env.DB.batch([
      c.env.DB.prepare('INSERT INTO watchers (id, push_token) VALUES (?, \'\')').bind(watcherId),
      c.env.DB.prepare(
        `INSERT OR REPLACE INTO watcher_devices (watcher_id, device_id, push_token, device_model, last_seen)
         VALUES (?, ?, ?, ?, datetime('now'))`,
      ).bind(watcherId, deviceId, pushToken, deviceModel || 'unknown'),
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

    await c.env.DB.prepare(
      'UPDATE watch_relations SET removed_at = datetime(\'now\') WHERE person_id = ? AND watcher_id = ? AND removed_at IS NULL',
    ).bind(personId, watcherId).run();
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

    const persons = await c.env.DB.prepare(
      `SELECT
        p.id,
        p.last_heartbeat,
        p.last_location_lat,
        p.last_location_lng,
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
