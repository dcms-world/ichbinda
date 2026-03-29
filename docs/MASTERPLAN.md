# iBinda Masterplan

## Context

Die iBinda-App hat Sicherheitsluecken (siehe `SECURITY_AUDIT.md`). Die App ist **nicht produktiv** - keine Ruecksicht auf Legacy-Kompatibilitaet noetig. Gezielte Schema-Migrationen fuer neue Free-Features sind weiterhin OK. Die bestehende API-Key-Auth wird beibehalten und um Ownership-Pruefungen ergaenzt (ECDSA wurde als Overkill verworfen, siehe `DECISIONS.md`).

Langfristig gibt es zwei Produkt-Stufen (Details in `docs/PRICING_AND_EDITIONS.md`):
- **iBinda Free** – privat, anonym
- **iBinda Pro** – institutionell, kostenpflichtig

---

## Datenbank-Architektur: Option C (Hybrid ohne Sync)

### Entscheidung
D1 für den anonymen operativen Core, Postgres (Neon Frankfurt) kommt erst wenn Pro gebaut wird. Kein Sync zwischen den Systemen.

### Warum
- Heartbeats brauchen keine Edge-Performance (1x pro Stunde, 5ms vs 40ms egal)
- Kein Sync = keine Sync-Bugs, kein Event-Bus, kein Lag-Monitoring
- DSGVO-Vorteil: Anonyme operative Daten (D1) physisch getrennt von Personaldaten (Postgres)
- Free kann sofort fertig gebaut werden ohne auf DB-Entscheidung zu warten
- Postgres wird erst eingeführt wenn Pro-Kunden (und damit Einnahmen) da sind

### Architektur

```
D1 (operativ, anonym):              Postgres (Pro, personenbezogen):
├── persons (UUID + Heartbeat)      ├── organizations (Mandanten)
├── watchers (UUID + Push-Token)    ├── users + roles + permissions
├── watch_relations                 ├── person_profiles (Name, Geb., Adresse)
├── device_keys (API-Key Hashes)    ├── person_photos (verschlüsselt)
├── person_devices                  ├── alert_rules / Eskalation
├── device_rate_limits              ├── audit_logs
└── pairing_requests                └── notification_policies

         │                                    │
         └──── Verbindung: person_id (UUID) ──┘
              (kein Sync – Dashboard ruft Worker-API auf)
```

### Datenfluss Pro-Dashboard
- Dashboard zeigt Personenliste aus **Postgres** (Name, Adresse, Stammdaten)
- Dashboard ruft **Worker-API** auf für Live-Status: `GET /api/person/:id` → Heartbeat aus D1
- Kein Daten-Duplikat, keine Synchronisation
- Worker-API bleibt Single Source of Truth für operative Daten

### Fotos
- **Free:** localStorage (verlassen nie das Gerät)
- **Pro:** Cloudflare R2, verschlüsselt mit Org-spezifischem Key
  - Server speichert nur verschlüsselte Blobs
  - Dashboard entschlüsselt client-seitig
  - Crypto-Shredding bei Org-Löschung (Key vernichten → Fotos unwiederbringlich weg)

### Zeitleiste
```
Jetzt:       Free fertig bauen (D1 + API-Key-Auth mit Ownership + Pairing)
Wenn Pro:    Postgres aufsetzen (Neon Frankfurt), Dashboard bauen
Wenn nötig:  D1 als Edge-Cache vor Postgres (Optimierung, nicht Architektur)
```

---

## Free: Dateien

- `src/index.ts` – Monolithische App (Backend + Frontend)
- `schema.sql` – Kanonisches Schema (aktualisieren)
- `migrations/005_pairing_requests.sql` – Migration fuer `pairing_requests`

---

## Zielbild Client-Architektur

### Heute
- Web-Frontend liegt direkt im Worker und ist aktuell in zwei Einstiege getrennt: Person und Watcher
- Beide Einstiege sprechen dasselbe Cloudflare-Backend an

### Ziel fuer die native App
- Eine gemeinsame Capacitor-App fuer iOS und Android
- Beim ersten Start waehlt das Geraet einmalig den Modus `person` oder `watcher`
- Die gewaehlte Rolle bleibt lokal persistent gespeichert und wird bei spaeteren App-Starts direkt wiederverwendet
- Die App bootet danach direkt in die passende UI fuer diesen Modus
- Beide Modi verwenden weiterhin dieselbe Worker-API auf Cloudflare als Backend

### Konsequenz fuer die Codebasis
- Die heutige Trennung in Person-/Watcher-Frontend bleibt fachlich sinnvoll, soll spaeter aber unter einem gemeinsamen App-Shell-Einstieg zusammengefuehrt werden
- Routing und Bootstrapping sollen perspektivisch von "zwei HTML-Seiten" zu "eine App, zwei persistente Modi" migrieren
- Backend-Endpoints bleiben rollengetrennt, auch wenn der Client spaeter als eine einzige App ausgeliefert wird

---

## Phase 1: DB-Migration

### `migrations/005_pairing_requests.sql`

Neue Tabelle:
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
CREATE INDEX IF NOT EXISTS idx_pairing_requests_person_status ON pairing_requests(person_id, status);
CREATE INDEX IF NOT EXISTS idx_pairing_requests_created ON pairing_requests(created_at);
```

### `schema.sql` aktualisieren
- `pairing_requests` Tabelle hinzufügen

---

## Phase 2: Backend – Auth-Middleware fixen

### `lookupApiKey()` umbauen (gibt Device-Info zurück statt boolean):

```typescript
async function lookupApiKey(db: D1Database, apiKey: string): Promise<{ device_id: string; role: string } | null> {
  const keyHash = await hashApiKey(apiKey);
  const row = await db.prepare(
    'SELECT device_id, role FROM device_keys WHERE key_hash = ?1'
  ).bind(keyHash).first<{ device_id: string; role: string }>();
  return row ?? null;
}
```

### Middleware setzt Device-Context:

```typescript
const device = await lookupApiKey(c.env.DB, apiKey);
if (device) {
  c.set('deviceId', device.device_id);
  c.set('role', device.role);
  return await next();
}
```

### Heartbeat authentifizieren:
- `/api/heartbeat` nicht mehr von Auth-Middleware ausgenommen
- Ownership-Check: `device_id → person_devices → person_id`

---

## Phase 3: Backend – Ownership-Checks auf allen Endpoints

### Hilfsfunktionen:

```typescript
async function deviceOwnsPerson(db: D1Database, deviceId: string, personId: string): Promise<boolean> {
  const row = await db.prepare(
    'SELECT 1 FROM person_devices WHERE device_id = ?1 AND person_id = ?2'
  ).bind(deviceId, personId).first();
  return !!row;
}

async function deviceOwnsWatcher(db: D1Database, deviceId: string, watcherId: string): Promise<boolean> {
  const row = await db.prepare(
    'SELECT 1 FROM watcher_devices WHERE device_id = ?1 AND watcher_id = ?2'
  ).bind(deviceId, watcherId).first();
  return !!row;
}
```

### Ownership-Matrix:

| Endpoint | Check |
|---|---|
| `POST /api/heartbeat` | Device besitzt `person_id` via `person_devices` |
| `GET /api/person/:id` | Device besitzt Person |
| `GET /api/person/:id/watchers` | Device besitzt Person |
| `GET /api/person/:id/devices` | Device besitzt Person |
| `POST /api/person/:id/devices` | Device besitzt Person |
| `DELETE /api/person/:id/devices` | Device besitzt Person |
| `POST /api/pair/create` | Device besitzt `person_id` |
| `GET /api/pair/:token` | Device besitzt Pairing-Person oder ist das anfragende Watcher-Geraet |
| `POST /api/pair/confirm` | Device besitzt `person_id` des Pairings |
| `PUT /api/watch` | Device besitzt `watcher_id` |
| `DELETE /api/watch` | Device besitzt `watcher_id` |
| `GET /api/watcher/:id/persons` | Device besitzt `watcher_id` |

### `POST /api/watcher`
- Legt die Watcher-Geraet-Bindung direkt in `watcher_devices` an
- Keine zusaetzliche `device_keys.watcher_id`-Spalte noetig

---

## Phase 4: Backend – Pairing-Endpoints (neu)

### `POST /api/pair/create` (Person)
- Auth: Device besitzt `person_id`
- Erstellt `pairing_requests` mit `pairing_token = crypto.randomUUID()`
- Return: `{ pairing_token }`

### `POST /api/pair/respond` (Watcher)
- Prüft `pairing_token` existiert, pending, < 5 Min alt
- Speichert `watcher_name`, `watcher_device_id`
- Return: `{ status: 'requested' }`

### `POST /api/pair/confirm` (Person)
- Auth: Device besitzt `person_id` des Pairings
- `action = approve | reject`
- Bei `approve`: legt Watch-Relation an oder reaktiviert sie
- Bei `reject`: markiert das Pairing als abgelehnt/abgelaufen

### `GET /api/pair/:token` (Person oder anfragender Watcher)
- Auth: Device besitzt `person_id` des Pairings oder ist `watcher_device_id`
- Return: `{ status, watcher_name? }`
- Status-Verlauf: `pending -> requested -> completed`
- Bei Ablehnung: `rejected`

### Cron-Cleanup:
```sql
DELETE FROM pairing_requests WHERE created_at < datetime('now', '-10 minutes');
```

---

## Phase 5: Backend – CORS + Security + Cleanup

### CORS einschränken:
```typescript
erlaubte Origins:
- gleicher Host wie der aktuelle Request
- lokales Dev: `http://localhost`, `http://127.0.0.1`, `https://localhost`
- Capacitor: `capacitor://localhost`, `https://localhost`
- fremde Origins mit `Origin`-Header aktiv mit `403` blockieren
```

### `createDeviceId()` Fallback fixen (Zeile 550):
`Date.now() + Math.random()` → `crypto.getRandomValues()`

### Error-Details entfernen:
- `details: String(e)` aus allen Error-Responses raus

### Input-Validierung:
- `push_token`: Längen-Check
- `person_id`, `watcher_id`: UUID-Validierung überall
- `check_interval_minutes`: Bounds 1–10080
- `watcher_name`, lokale Person-/Watcher-Namen: auf 2–35 Zeichen begrenzen; die ersten 2 Zeichen müssen Buchstaben sein

---

## Phase 6: Frontend – QR-Pairing anpassen

### Person-Seite: Neuer QR-Payload
```json
{ "person_id": "...", "pairing_token": "..." }
```
- `fetch('/api/pair/create')` → `pairing_token`
- Polling: Alle 5 Sek. `GET /api/pair/:token`
- Bei `completed` → Watcher-Name anzeigen
- Timeout 5 Min., QR regenerieren

### Watcher-Seite: QR-Scan + Response
- `parsePersonInput()`: Neues Format `{ person_id, pairing_token }` erkennen
- Watcher-Name abfragen (Input-Feld)
- `fetch('/api/pair/respond')` mit `{ pairing_token, watcher_name }`
- Legacy `{ id, name }` Format entfernen (keine produktiven User)

---

## Phase 11: Gerätewechsel

### Szenario: Person bekommt neues Gerät
- Altes Gerät verloren/kaputt → API-Key/Cookie und lokale Gerätebindung weg → person_id nicht mehr zugreifbar
- **Lösung:** Person registriert sich auf neuem Gerät neu (neue person_id, neuer API-Key)
- Watcher muss einmalig neu scannen (neuer QR-Code mit neuer person_id)
- Akzeptabler Aufwand – Person zeigt neuen QR, Watcher scannt

### Szenario: Watcher bekommt neues Gerät
- Altes Gerät verloren/kaputt → API-Key/Cookie und lokale Watcher-Zuordnung weg → watcher_id nicht mehr zugreifbar
- **Lösung:** Watcher registriert sich auf neuem Gerät neu (neue watcher_id, neuer API-Key)
- Person muss **nicht** neu scannen – Watcher scannt einfach erneut den QR der Person
- Neues Pairing erstellt neue Watch-Relation mit neuer watcher_id
- **Aber:** Alte Watch-Relations (mit alter watcher_id) bleiben als Leichen in der DB
  - Cron sendet weiter Notifications an alten Push-Token → schlägt fehl (Token ungültig)
  - Braucht Cleanup: Person sollte alte Watcher entfernen können, ODER
  - Automatischer Cleanup: Watch-Relations mit ungültigem Push-Token nach X fehlgeschlagenen Notifications deaktivieren

### Szenario: Gerät noch funktionsfähig (Upgrade)
- Multi-Device ist bereits über `person_devices` unterstützt
- Person: Neues Gerät hinzufügen → neues Gerät registrieren, eigenen API-Key erhalten → gleiche person_id verknüpfen via `POST /api/person/:id/devices`
- **Problem:** Neues Gerät muss beweisen, dass es zur gleichen Person gehört
  - Lösung: Device-Transfer-QR vom alten Gerät → enthält kurzlebiges Transfer-Token + person_id
  - Neues Gerät sendet dieses Transfer-Token bei Registrierung mit
- Watcher: Analog ueber bestehendes `watcher_devices`-Konzept
  - **TODO:** Transfer- und Recovery-Flow fuer mehrere Watcher-Geraete designen

### Offene Punkte für den Plan:
- [ ] Device-Transfer-QR-Flow für Person (altes Gerät → neues Gerät, per Transfer-Token)
- [ ] Device-Transfer-QR-Flow für Watcher (per Transfer-Token)
- [ ] Multi-Device-Regeln für Watcher auf Basis von `watcher_devices` konkretisieren
- [ ] Cleanup-Mechanismus für verwaiste Watch-Relations (ungültige Push-Tokens)
- [ ] Person: Möglichkeit alte/unbekannte Watcher zu entfernen

---

## Free: Implementierungsreihenfolge

1. DB-Migration: `pairing_requests`-Tabelle
2. Backend: `lookupApiKey()` umbauen → gibt `{ device_id, role }` zurück
3. Backend: Auth-Middleware setzt `deviceId` + `role` in Context
4. Backend: Heartbeat durch Auth-Middleware schicken
5. Backend: Ownership-Hilfsfunktionen + Checks auf allen Endpoints
6. Backend: `POST /api/watcher` bleibt auf `watcher_devices`
7. Backend: Pairing-Endpoints + Cron-Cleanup
8. Backend: CORS + Error-Details + Input-Validierung
9. Frontend: QR-Pairing auf neues Format umstellen (Person + Watcher)
10. Cleanup: `createDeviceId()` Fallback, `schema.sql` aktualisieren

---

## Free: Verifikation

1. `wrangler dev` → Person registrieren → API-Key in Cookie prüfen
2. Request ohne Auth an `/api/heartbeat` → 401
3. IDOR: Mit Device A auf Person B's Daten → 403
4. Pairing E2E: Person QR → Watcher scannt → Name eingeben → Person bestaetigt → Watch-Relation erstellt
5. Pairing mit Personen-Bestaetigung: Watcher sendet Anfrage → Person nimmt an → Watcher sieht die Person danach ohne manuellen Reload in seiner Personenliste; Regression "verbunden/angefragt, aber Person erscheint nicht in der Watcher-App" darf nicht mehr auftreten
6. 5+ Min. warten → Pairing "expired"
7. CORS: Request von fremder Origin → geblockt
8. `check_interval_minutes = -1` → 400
9. Error-Response enthält keine Stack-Traces

---
---

# Pro: Überblick

Pro wird erst angegangen, wenn Free stabil läuft und echte Nutzung vorliegt.

Für Pro gilt weiterhin:
- operative Free-Daten bleiben im Core
- personenbezogene Institutionsdaten kommen erst mit Pro in Postgres
- Dashboard und Institutionslogik werden getrennt vom Free-Core gedacht

Die Details sind absichtlich ausgelagert:
- Editionen und Produktgrenzen: `docs/PRICING_AND_EDITIONS.md`
- Detaillierte Pro-Anforderungen: `docs/PRO_VERSION.md`
- Bindende Entscheidungen: `docs/DECISIONS.md`

---
---

# Ausführung und Tracking

Die technische Zielarchitektur und die Phasen für Free/Pro stehen in diesem Dokument.

Der aktuelle Arbeitsstand und die Reihenfolge der Umsetzung werden in `docs/TODOS.md` gepflegt, damit es nur eine operative Backlog-Quelle gibt.
