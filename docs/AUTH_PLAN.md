# Auth-Plan – iBinda

Erstellt: 2026-03-22
Aktualisiert: 2026-03-28
Status: bereit zur Implementierung

---

## Entscheidung

**API-Key (SHA-256-gehasht) mit Ownership-Prüfung.** ECDSA wurde geprüft und als Overkill verworfen (siehe `DECISIONS.md`).

Bestehende Implementierung ist zu ~70% korrekt — es fehlt die Identifikation des Geräts und Ownership-Checks.

---

## Was bereits funktioniert

- Turnstile-Verifikation bei Registrierung ✅
- API-Key-Generierung (`crypto.randomUUID()`) ✅
- SHA-256-Hashing des Keys in D1 ✅
- HttpOnly + Secure + SameSite=Strict Cookie ✅
- Bearer-Token-Header für Native ✅
- Dev-Token als Query-Parameter (nur Dev) ✅
- `device_keys`-Tabelle mit `device_id`, `key_hash`, `role` ✅

---

## Was fehlt (die Fixes)

### Fix 1: Middleware muss Device identifizieren

**Aktuell:** `lookupApiKey()` gibt nur `true/false` zurück — Middleware weiß nicht, welches Gerät den Request macht.

**Soll:** Lookup gibt `{ device_id, role }` zurück, Middleware setzt das in den Hono-Context:

```typescript
// lookupApiKey returns device info, not just boolean
async function lookupApiKey(db: D1Database, apiKey: string): Promise<{ device_id: string; role: string } | null> {
  const keyHash = await hashApiKey(apiKey);
  const row = await db.prepare(
    'SELECT device_id, role FROM device_keys WHERE key_hash = ?1'
  ).bind(keyHash).first<{ device_id: string; role: string }>();
  return row ?? null;
}

// Middleware sets context
const device = await lookupApiKey(c.env.DB, apiKey);
if (device) {
  c.set('deviceId', device.device_id);
  c.set('role', device.role);
  return await next();
}
```

### Fix 2: Heartbeat authentifizieren

**Aktuell:** `/api/heartbeat` ist von der Auth-Middleware ausgenommen (index.ts:2070).

**Soll:** Heartbeat geht durch die normale Auth-Middleware. Ownership-Check: `device_id → person_devices → person_id` muss zur gesendeten `person_id` passen.

### Fix 3: Ownership-Checks auf allen Endpoints

Jeder Endpoint prüft: "Darf dieses Device auf diese Ressource zugreifen?"

| Endpoint | Check |
|---|---|
| `POST /api/heartbeat` | `device_id` besitzt `person_id` via `person_devices` |
| `GET /api/person/:id` | Device besitzt Person ODER Watcher mit aktiver `watch_relation` |
| `GET /api/person/:id/watchers` | Device besitzt Person |
| `GET /api/person/:id/devices` | Device besitzt Person |
| `POST /api/person/:id/devices` | Device besitzt Person |
| `DELETE /api/person/:id/devices` | Device besitzt Person |
| `POST /api/watch` | Device besitzt `watcher_id` (aus `device_keys`) |
| `PUT /api/watch` | Device besitzt `watcher_id` |
| `DELETE /api/watch` | Device besitzt `watcher_id` ODER `person_id` |
| `GET /api/watcher/:id/persons` | Device besitzt `watcher_id` |

Hilfsfunktion:

```typescript
async function deviceOwnsPerson(db: D1Database, deviceId: string, personId: string): Promise<boolean> {
  const row = await db.prepare(
    'SELECT 1 FROM person_devices WHERE device_id = ?1 AND person_id = ?2'
  ).bind(deviceId, personId).first();
  return !!row;
}

async function deviceOwnsWatcher(db: D1Database, deviceId: string, watcherId: string): Promise<boolean> {
  const row = await db.prepare(
    'SELECT 1 FROM device_keys WHERE device_id = ?1 AND watcher_id = ?2'
  ).bind(deviceId, watcherId).first();
  return !!row;
}
```

### Fix 4: `POST /api/watcher` — watcher_id in device_keys setzen

Nach dem Erstellen eines Watchers muss die `watcher_id` im `device_keys`-Eintrag des Geräts gespeichert werden:

```typescript
await db.prepare(
  'UPDATE device_keys SET watcher_id = ?1 WHERE device_id = ?2'
).bind(watcherId, deviceId).run();
```

**DB-Schema-Änderung nötig:** `device_keys` braucht eine `watcher_id`-Spalte:
```sql
ALTER TABLE device_keys ADD COLUMN watcher_id TEXT;
```

### Fix 5: CORS einschränken

```typescript
origin: ['https://ibinda.app', 'https://www.ibinda.app']
```

### Fix 6: Error-Details entfernen

`details: String(e)` aus allen Error-Responses entfernen (index.ts:2066, 2324).

### Fix 7: Input-Validierung

- `push_token`: Längen-Check
- `person_id`, `watcher_id`: UUID-Validierung (existiert schon für `person_id`, auf alle IDs ausweiten)
- `check_interval_minutes`: Bounds 1–10080 (1 Min bis 1 Woche)

---

## Pairing-Flow (vereinfacht, ohne Crypto)

### Konzept

Person und Watcher verbinden sich über einen kurzlebigen Pairing-Token. Kein Client-seitiges Verschlüsseln nötig — Watcher-Name wird als Plaintext über TLS geschickt und serverseitig gespeichert.

### Neue Tabelle

```sql
CREATE TABLE IF NOT EXISTS pairing_requests (
  pairing_token TEXT PRIMARY KEY,
  person_id TEXT NOT NULL,
  watcher_name TEXT,
  watcher_device_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','completed','expired')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  FOREIGN KEY (person_id) REFERENCES persons(id)
);
```

### Endpoints

**`POST /api/pair/create`** (Person-Device)
- Auth: Device besitzt `person_id`
- Erstellt `pairing_requests` mit `pairing_token = crypto.randomUUID()`
- Return: `{ pairing_token }`

**`POST /api/pair/respond`** (Watcher-Device)
- Prüft: Token existiert, pending, < 5 Min alt
- Speichert `watcher_name`, `watcher_device_id`
- Erstellt Watch-Relation automatisch
- Setzt `status = 'completed'`

**`GET /api/pair/:token`** (Person-Device, Polling)
- Auth: Device besitzt `person_id` des Pairings
- Return: `{ status, watcher_name? }`

### QR-Code Inhalt

```json
{ "person_id": "...", "pairing_token": "..." }
```

Einfach, kein AES-Key, kein Crypto im QR.

### Cron-Cleanup

```sql
DELETE FROM pairing_requests WHERE created_at < datetime('now', '-10 minutes');
```

---

## Implementierungsreihenfolge

1. DB-Migration: `watcher_id`-Spalte in `device_keys` + `pairing_requests`-Tabelle
2. `lookupApiKey()` umbauen → gibt `{ device_id, role }` zurück
3. Auth-Middleware: setzt `deviceId` + `role` in Context
4. Heartbeat durch Auth-Middleware schicken
5. Ownership-Hilfsfunktionen (`deviceOwnsPerson`, `deviceOwnsWatcher`)
6. Ownership-Checks auf allen Endpoints
7. `POST /api/watcher` → `watcher_id` in `device_keys` setzen
8. Pairing-Endpoints
9. CORS einschränken
10. Error-Details entfernen
11. Input-Validierung
12. Frontend: QR-Code auf neues Pairing-Format umstellen
13. Cron-Cleanup für abgelaufene Pairing-Requests

---

## Verifikation

1. `wrangler dev` → Person registrieren → API-Key in Cookie prüfen
2. Request ohne Auth an `/api/heartbeat` → 401
3. IDOR: Mit Device A auf Person B's Daten → 403
4. Pairing E2E: Person QR → Watcher scannt → Name eingeben → Watch-Relation erstellt
5. 5+ Min. warten → Pairing "expired"
6. CORS: Request von fremder Origin → geblockt
7. `check_interval_minutes = -1` → 400
8. Error-Response enthält keine Stack-Traces
