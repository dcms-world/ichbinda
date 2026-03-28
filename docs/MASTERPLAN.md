# iBinda Masterplan

## Context

Die iBinda-App hat Sicherheitslücken (siehe `SECURITY_AUDIT.md`). Die App ist **nicht produktiv** – keine Migration nötig, kein Legacy-Support. Die bestehende API-Key-Auth wird beibehalten und um Ownership-Prüfungen ergänzt (ECDSA wurde als Overkill verworfen, siehe `DECISIONS.md`).

Langfristig gibt es zwei Produkt-Stufen:
- **iBinda Free** – privat, anonym, 1 Person + unbegrenzt Watcher
- **iBinda Pro** – Institution, Dashboard, personenbezogene Daten, DSGVO-kritisch

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
├── device_keys (ECDSA Public Keys) ├── person_photos (verschlüsselt)
├── person_devices                  ├── alert_rules / Eskalation
├── rate_limits                     ├── audit_logs
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
- `migrations/002_pairing.sql` – **Neu**: `watcher_id`-Spalte + `pairing_requests`-Tabelle

---

## Phase 1: DB-Migration

### `migrations/002_pairing.sql`

`device_keys` erweitern:
```sql
ALTER TABLE device_keys ADD COLUMN watcher_id TEXT;
```

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
CREATE INDEX IF NOT EXISTS idx_pairing_created ON pairing_requests(created_at);
```

### `schema.sql` aktualisieren
- `device_keys`: `watcher_id TEXT` Spalte hinzufügen
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
    'SELECT 1 FROM device_keys WHERE device_id = ?1 AND watcher_id = ?2'
  ).bind(deviceId, watcherId).first();
  return !!row;
}
```

### Ownership-Matrix:

| Endpoint | Check |
|---|---|
| `POST /api/heartbeat` | Device besitzt `person_id` via `person_devices` |
| `GET /api/person/:id` | Device besitzt Person ODER Watcher mit aktiver `watch_relation` |
| `GET /api/person/:id/watchers` | Device besitzt Person |
| `GET /api/person/:id/devices` | Device besitzt Person |
| `POST /api/person/:id/devices` | Device besitzt Person |
| `DELETE /api/person/:id/devices` | Device besitzt Person |
| `POST /api/watch` | Device besitzt `watcher_id` |
| `PUT /api/watch` | Device besitzt `watcher_id` |
| `DELETE /api/watch` | Device besitzt `watcher_id` ODER `person_id` |
| `GET /api/watcher/:id/persons` | Device besitzt `watcher_id` |

### `POST /api/watcher` anpassen:
- Nach Erstellen des Watchers → `UPDATE device_keys SET watcher_id = ? WHERE device_id = ?`

---

## Phase 4: Backend – Pairing-Endpoints (neu)

### `POST /api/pair/create` (Person)
- Auth: Device besitzt `person_id`
- Erstellt `pairing_requests` mit `pairing_token = crypto.randomUUID()`
- Return: `{ pairing_token }`

### `POST /api/pair/respond` (Watcher)
- Prüft `pairing_token` existiert, pending, < 5 Min alt
- Speichert `watcher_name`, `watcher_device_id`
- Erstellt automatisch Watch-Relation
- Setzt `status = 'completed'`

### `GET /api/pair/:token` (Person, Polling)
- Auth: Device besitzt `person_id` des Pairings
- Return: `{ status, watcher_name? }`

### Cron-Cleanup:
```sql
DELETE FROM pairing_requests WHERE created_at < datetime('now', '-10 minutes');
```

---

## Phase 5: Backend – CORS + Security + Cleanup

### CORS einschränken:
```typescript
origin: ['https://ibinda.app', 'https://www.ibinda.app']
```

### `createDeviceId()` Fallback fixen (Zeile 550):
`Date.now() + Math.random()` → `crypto.getRandomValues()`

### Error-Details entfernen:
- `details: String(e)` aus allen Error-Responses raus

### Input-Validierung:
- `push_token`: Längen-Check
- `person_id`, `watcher_id`: UUID-Validierung überall
- `check_interval_minutes`: Bounds 1–10080

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
- Altes Gerät verloren/kaputt → Private Key weg → person_id nicht mehr zugreifbar
- **Lösung:** Person registriert sich auf neuem Gerät neu (neue person_id, neues Keypair)
- Watcher muss einmalig neu scannen (neuer QR-Code mit neuer person_id)
- Akzeptabler Aufwand – Person zeigt neuen QR, Watcher scannt

### Szenario: Watcher bekommt neues Gerät
- Altes Gerät verloren/kaputt → Private Key weg → watcher_id nicht mehr zugreifbar
- **Lösung:** Watcher registriert sich auf neuem Gerät neu (neue watcher_id, neues Keypair)
- Person muss **nicht** neu scannen – Watcher scannt einfach erneut den QR der Person
- Neues Pairing erstellt neue Watch-Relation mit neuer watcher_id
- **Aber:** Alte Watch-Relations (mit alter watcher_id) bleiben als Leichen in der DB
  - Cron sendet weiter Notifications an alten Push-Token → schlägt fehl (Token ungültig)
  - Braucht Cleanup: Person sollte alte Watcher entfernen können, ODER
  - Automatischer Cleanup: Watch-Relations mit ungültigem Push-Token nach X fehlgeschlagenen Notifications deaktivieren

### Szenario: Gerät noch funktionsfähig (Upgrade)
- Multi-Device ist bereits über `person_devices` unterstützt
- Person: Neues Gerät hinzufügen → neues Keypair registrieren → gleiche person_id verknüpfen via `POST /api/person/:id/devices`
- **Problem:** Neues Gerät muss beweisen, dass es zur gleichen Person gehört
  - Lösung: Device-Transfer-QR vom alten Gerät → enthält signierte Erlaubnis + person_id
  - Neues Gerät sendet diese Erlaubnis bei Registrierung mit
- Watcher: Analog, aber `watcher_devices`-Konzept fehlt noch im Plan
  - **TODO:** Multi-Device für Watcher designen (analog zu person_devices)

### Offene Punkte für den Plan:
- [ ] Device-Transfer-QR-Flow für Person (altes Gerät → neues Gerät)
- [ ] Device-Transfer-QR-Flow für Watcher
- [ ] Multi-Device-Tabelle für Watcher (`watcher_devices` oder `device_keys` erweitern?)
- [ ] Cleanup-Mechanismus für verwaiste Watch-Relations (ungültige Push-Tokens)
- [ ] Person: Möglichkeit alte/unbekannte Watcher zu entfernen

---

## Free: Implementierungsreihenfolge

1. DB-Migration: `watcher_id` in `device_keys` + `pairing_requests`-Tabelle
2. Backend: `lookupApiKey()` umbauen → gibt `{ device_id, role }` zurück
3. Backend: Auth-Middleware setzt `deviceId` + `role` in Context
4. Backend: Heartbeat durch Auth-Middleware schicken
5. Backend: Ownership-Hilfsfunktionen + Checks auf allen Endpoints
6. Backend: `POST /api/watcher` → `watcher_id` in `device_keys` setzen
7. Backend: Pairing-Endpoints + Cron-Cleanup
8. Backend: CORS + Error-Details + Input-Validierung
9. Frontend: QR-Pairing auf neues Format umstellen (Person + Watcher)
10. Cleanup: `createDeviceId()` Fallback, `schema.sql` aktualisieren

---

## Free: Verifikation

1. `wrangler dev` → Person registrieren → API-Key in Cookie prüfen
2. Request ohne Auth an `/api/heartbeat` → 401
3. IDOR: Mit Device A auf Person B's Daten → 403
4. Pairing E2E: Person QR → Watcher scannt → Name eingeben → Watch-Relation erstellt
5. 5+ Min. warten → Pairing "expired"
6. CORS: Request von fremder Origin → geblockt
7. `check_interval_minutes = -1` → 400
8. Error-Response enthält keine Stack-Traces

---
---

# Pro: Überblick (wird gebaut wenn Free stabil ist)

## Pro: Auth-System

- **Dashboard-Login:** Email/Passwort + MFA
- **Mitarbeiter-Smartphone:** API-Key Device-Auth (wie Free) PLUS Org-Zugehörigkeit über Dashboard-Zuweisung
- **Rollen:** Org-Owner, Care-Manager, Watcher, Read-Only/Audit
- Dashboard-Auth und Device-Auth sind ergänzende Schichten

## Pro: Datenbank (Postgres / Neon Frankfurt)

### Schema (vereinfacht)
```
organizations         -- Mandanten/Institutionen
users                 -- Dashboard-Nutzer mit Login
user_org_roles        -- Rollen pro User pro Organisation
person_profiles       -- Stammdaten (Name, Geburtsdatum, Adresse, Kontakte)
person_photo_refs     -- Referenzen auf R2-verschlüsselte Fotos
alert_rules           -- Eskalationsregeln pro Person oder Template
notification_policies -- Kanäle (Push, E-Mail, SMS)
audit_logs            -- Wer hat wann was gelesen/geändert/exportiert
```

### Sicherheit
- **Row-Level Security (RLS):** Mandantentrennung, kein tenant-übergreifender Zugriff
- **Encryption at Rest:** Neon-native Verschlüsselung
- **Feld-Verschlüsselung (Phase 2):** Besonders sensible Felder (Geburtsdatum, Adresse) zusätzlich verschlüsselt
- **Audit-Logs:** Jeder Lese-/Schreib-/Exportzugriff auf Personaldaten protokolliert

## Pro: Gerätewechsel

- **Pro-Watcher (Mitarbeiter):** Bekommt Personen via Dashboard zugewiesen. Neues Gerät = neu einloggen. Zuweisung ist server-seitig, kein QR nötig.
- **Pro-Person:** Institution kann Re-Pairing über Dashboard auslösen. Kein Datenverlust.
- Deutlich einfacher als bei Free, weil die Institution die Kontrolle hat.

## Pro: DSGVO

- Art. 9 DSGVO relevant (Gesundheitsdaten im weiteren Sinne) → **DSFA Pflicht**
- AVV/DPA mit Cloudflare UND Neon
- Löschkonzept: Crypto-Shredding für Fotos, CASCADE DELETE für Stammdaten
- Betroffenenrechte: Auskunft, Berichtigung, Löschung, Einschränkung
- Retention-Fristen pro Datentyp definieren
- **Empfehlung:** Frühzeitig Datenschutzberater einbinden bevor Pro live geht

## Pro: Dashboard

- **Separates Projekt/Repo** (nicht im Worker-Monolith)
- Frontend: React/Next.js (oder ähnlich)
- Kommuniziert mit:
  - Postgres direkt (Stammdaten, Rollen, Audit)
  - Worker-API (Live-Status, Heartbeats aus D1)
- Hosted: Cloudflare Pages oder Vercel

## Pro: Offene Entscheidungen

- [ ] Preisstruktur (pro Institution / pro Person / hybrid)
- [ ] Dashboard-Framework (Next.js? Remix? SvelteKit?)
- [ ] Benachrichtigungskanäle (Push + E-Mail + SMS + Telefonie?)
- [ ] Retention-Fristen pro Datentyp
- [ ] Umfang medizinischer Zusatzdaten im MVP
- [ ] DSFA-Startzeitpunkt
- [ ] Onboarding-Flow für Institutionen
- [ ] Upgrade-Flow Free → Pro (Person in Org überführen)

---
---

# Gesamtübersicht: Schritt-für-Schritt-Roadmap

## Schritt 1: Free Web-UI fertigstellen
**Ziel:** Stabile, sichere Web-App unter ibinda.app

- [ ] Auth-Middleware fixen: Device-Identifikation + Ownership (Phasen 2-3)
- [ ] Heartbeat authentifizieren (Phase 2)
- [ ] QR-Pairing mit Pairing-Tokens (Phasen 4, 6)
- [ ] CORS + Security + Input-Validierung (Phase 5)
- [ ] Gerätewechsel-Flow (Phase 7)
- [ ] Cleanup verwaister Watch-Relations
- [ ] Code aufteilen (2400-Zeilen-Monolith → saubere Module)
- [ ] E2E-Tests im Browser (Person + Watcher Flow komplett durchspielen)

## Schritt 2: Native App bauen (Capacitor)
**Ziel:** iOS + Android App die die Web-UI wrapped

- [ ] Capacitor-Projekt aufsetzen (`npm init @capacitor/app`)
- [ ] Web-UI als Capacitor-App einbinden
- [ ] Push Notifications: Capacitor Push Plugin statt Expo-Placeholder
  - iOS: APNs Zertifikat einrichten
  - Android: Firebase Cloud Messaging (FCM) einrichten
  - Backend: Push-Endpunkt anpassen (APNs/FCM statt Expo)
- [ ] IndexedDB/Crypto prüfen (WebView-Kompatibilität)
- [ ] Splash Screen + App Icon
- [ ] Deep Links (QR-Code öffnet direkt die App)
- [ ] Lokales Testen auf echten Geräten (iOS Simulator + Android Emulator)

## Schritt 3: App Store Vorbereitung
**Ziel:** Alles was Apple/Google verlangen

- [ ] Apple Developer Account (99 USD/Jahr)
- [ ] Google Play Developer Account (25 USD einmalig)
- [ ] Datenschutzerklärung schreiben (URL auf ibinda.app/privacy)
- [ ] Impressum (gesetzlich vorgeschrieben in AT/DE)
- [ ] App Store Listing: Screenshots, Beschreibung, Keywords
- [ ] Privacy Nutrition Labels (Apple) ausfüllen
- [ ] Data Safety Section (Google) ausfüllen
- [ ] TestFlight (iOS Beta) + Internal Testing Track (Android Beta)

## Schritt 4: Beta mit echten Usern
**Ziel:** Feedback von Familie/Bekannten vor dem öffentlichen Release

- [ ] 5-10 Beta-Tester (Familie, Bekannte) einladen
- [ ] TestFlight (iOS) + Google Play Internal Testing
- [ ] Feedback sammeln: UX, Zuverlässigkeit der Notifications, Pairing-Flow
- [ ] Bugs fixen, UX verbessern
- [ ] Overdue-Alarm in der Praxis testen (funktioniert die Notification wirklich?)
- [ ] Gerätewechsel mit echtem User testen

## Schritt 5: App Store Release (Free)
**Ziel:** Kostenlos im App Store verfügbar

- [ ] App Store Review einreichen (Apple: 1-3 Tage, Google: Stunden bis Tage)
- [ ] Landing Page ibinda.app mit App Store Links
- [ ] Grundlegendes Marketing (Social Media, Familie/Freunde teilen)
- [ ] Monitoring aufsetzen (Crash-Reports, API-Fehlerquoten)
- [ ] Support-Kanal (E-Mail oder einfaches Feedback-Formular)

## Schritt 6: Free stabilisieren + wachsen lassen
**Ziel:** Echte Nutzerbasis aufbauen, Stabilität beweisen

- [ ] User-Feedback einarbeiten
- [ ] Performance-Monitoring (D1-Auslastung, Worker-Invocations)
- [ ] Notification-Zuverlässigkeit überwachen
- [ ] Huawei AppGallery evaluieren (wenn Nachfrage)
- [ ] Warten bis die App stabil läuft und echte Nutzer hat

## Schritt 7: Pro Version angehen
**Ziel:** B2B-Produkt für Institutionen

- [ ] Postgres aufsetzen (Neon Frankfurt)
- [ ] Org/User/Rollen-Schema + Row-Level Security
- [ ] Dashboard-MVP (separates Repo): Login, Personenliste, Live-Status
- [ ] Mitarbeiter-Device-Zuweisung über Dashboard
- [ ] Stammdaten (Name, Adresse, Geburtsdatum, Kontakte)
- [ ] Foto-Upload (R2 + Org-spezifische Verschlüsselung)
- [ ] Eskalationsketten + Benachrichtigungsregeln
- [ ] Audit-Logs + Reporting
- [ ] DSGVO: DSFA, AVV mit allen Anbietern, Löschkonzept
- [ ] Datenschutzberater einbinden

## Schritt 8: Pro testen + verkaufen
**Ziel:** Erste zahlende Institution

- [ ] Pilot-Institution finden (Pflegeeinrichtung, betreutes Wohnen)
- [ ] Pilot-Phase mit engem Feedback-Zyklus
- [ ] Preismodell finalisieren
- [ ] Vertragstexte (AVV, AGB, SLA)
- [ ] Onboarding-Flow für neue Institutionen
- [ ] Sales-Material (Demo, Pitch-Deck)
