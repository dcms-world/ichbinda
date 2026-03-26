# iBinda Masterplan

## Context

Die iBinda-App hat kritische Sicherheitslücken (siehe `SECURITY_AUDIT.md`). Die App ist **nicht produktiv** – keine Migration nötig, kein Legacy-Support. Alte API-Key-Auth wird komplett ersetzt.

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
Jetzt:       Free fertig bauen (D1 + ECDSA + Pairing)
Wenn Pro:    Postgres aufsetzen (Neon Frankfurt), Dashboard bauen
Wenn nötig:  D1 als Edge-Cache vor Postgres (Optimierung, nicht Architektur)
```

---

## Free: Dateien

- `src/index.ts` – Monolithische App (Backend + Frontend)
- `schema.sql` – Kanonisches Schema (komplett neu schreiben)
- `migrations/002_ecdsa_and_pairing.sql` – **Neu**: Schema-Änderungen

---

## Phase 1: DB-Schema

### `migrations/002_ecdsa_and_pairing.sql`

`device_keys` erweitern:
```sql
ALTER TABLE device_keys ADD COLUMN public_key TEXT;     -- JWK JSON (ECDSA P-256)
ALTER TABLE device_keys ADD COLUMN watcher_id TEXT;     -- Device → Watcher Verknüpfung
```

Neue Tabelle:
```sql
CREATE TABLE IF NOT EXISTS pairing_requests (
  pairing_token TEXT PRIMARY KEY,
  person_id TEXT NOT NULL,
  encrypted_name TEXT,
  iv TEXT,
  watcher_device_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','completed','expired')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  FOREIGN KEY (person_id) REFERENCES persons(id)
);
CREATE INDEX IF NOT EXISTS idx_pairing_created ON pairing_requests(created_at);
```

### `schema.sql` aktualisieren
- `device_keys`: `key_hash` entfernen, `public_key TEXT NOT NULL` und `watcher_id TEXT` hinzufügen
- `pairing_requests` Tabelle hinzufügen

---

## Phase 2: Backend – Hilfsfunktionen (src/index.ts)

Neue Funktionen (nach `hashApiKey`, ~Zeile 1669):

1. **`verifyEcdsaSignature(publicKeyJwk, signatureBase64, payload)`**
   - `crypto.subtle.importKey('jwk')` → `crypto.subtle.verify('ECDSA', hash: 'SHA-256')`

2. **`base64ToArrayBuffer(b64)` / `arrayBufferToBase64(buf)`**

3. **`hashApiKey` + `lookupApiKey` entfernen** – wird nicht mehr gebraucht

4. **`lookupDeviceByPublicKey(db, deviceId)` → `{ device_id, role, public_key, watcher_id } | null`**
   - Query: `SELECT * FROM device_keys WHERE device_id = ?1`

---

## Phase 3: Backend – Auth-Middleware komplett ersetzen (Zeile 1988-2020)

### Nur noch ECDSA + Dev-Token:

1. **Skip** für `/api/auth/register-device` (einzige Ausnahme)
2. **Dev-Token** (unverändert, Query-Parameter)
3. **ECDSA-Signatur**:
   - Client sendet Headers: `X-Device-Id`, `X-Timestamp`, `X-Signature`
   - Server: `device_keys` lookup via `device_id` → `public_key` holen
   - Payload verifizieren: `${timestamp}\n${method}\n${path}`
   - Timestamp > 60 Sek. alt → reject (Replay-Schutz)
   - `c.set('deviceId', deviceId)` + `c.set('role', role)` in Context

### Cookie/Bearer-Auth komplett entfernen
- `lookupApiKey` löschen
- Cookie-Parsing löschen
- `Set-Cookie` bei Registrierung entfernen

---

## Phase 4: Backend – Registrierung vereinfachen (Zeile 2022-2052)

### `POST /api/auth/register-device` – Nur noch ECDSA:

```
Body: { device_id, turnstile_token, role, public_key (JWK) }
```

- Turnstile verifizieren
- Public Key validieren via `crypto.subtle.importKey` (wirft bei ungültigem Key)
- `INSERT OR REPLACE INTO device_keys (device_id, public_key, created_at, role)`
- Kein API-Key, kein Cookie
- Return: `{ registered: true }`

---

## Phase 5: Backend – Autorisierung auf allen Endpoints

### Person-Endpoints: `deviceId → person_devices → person_id`
### Watcher-Endpoints: `deviceId → device_keys.watcher_id`

| Endpoint | Auth-Check |
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

## Phase 6: Backend – Pairing-Endpoints (neu)

### `POST /api/pair/create` (Person)
- Prüft Device besitzt `person_id`
- Erstellt `pairing_requests` mit `pairing_token = crypto.randomUUID()`
- Return: `{ pairing_token }`

### `POST /api/pair/respond` (Watcher)
- Prüft `pairing_token` existiert, pending, < 5 Min.
- Speichert `encrypted_name`, `iv`, `watcher_device_id`
- Erstellt automatisch Watch-Relation
- Setzt `status = 'completed'`

### `GET /api/pair/:token` (Person)
- Prüft Device besitzt `person_id` des Pairings
- Return: `{ status, encrypted_name?, iv? }`

### Cron-Cleanup:
```sql
DELETE FROM pairing_requests WHERE created_at < datetime('now', '-10 minutes')
```

---

## Phase 7: Backend – CORS + Kleinigkeiten

### CORS (Zeile 1986):
```typescript
origin: ['https://ibinda.app', 'https://www.ibinda.app']
allowHeaders: ['Content-Type', 'X-Device-Id', 'X-Timestamp', 'X-Signature']
```

### `createDeviceId()` Fallback fixen (Zeile 550):
`Date.now() + Math.random()` → `crypto.getRandomValues()`

### Error-Details entfernen:
- Zeile 2066, 2324: `details: String(e)` raus

---

## Phase 8: Frontend – Shared Crypto-Code (in beide HTML-Templates)

### IndexedDB Key-Storage
- `openKeyStore()` → IndexedDB `ibinda_keys`
- `getOrCreateKeyPair()` → ECDSA P-256, **non-extractable**
- `getPublicKeyJwk()` → Export Public Key als JWK

### `signedFetch(path, options)` – Ersetzt alle `fetch(API_URL + ...)` Aufrufe
- Keypair aus IndexedDB
- Payload: `timestamp\nmethod\npath`
- Signiert mit `crypto.subtle.sign('ECDSA', ...)`
- Headers: `X-Device-Id`, `X-Timestamp`, `X-Signature`

### Registrierung (`onTurnstileSuccess`):
- Keypair generieren → Public Key exportieren → an Server senden
- Kein Cookie mehr

---

## Phase 9: Frontend – Person (QR + Pairing)

### Neuer QR-Payload (ersetzt `buildQrPayload`):
```json
{ "person_id": "...", "pairing_token": "...", "key": "<base64 AES-256>" }
```
- `signedFetch('/pair/create')` → `pairing_token`
- AES-256-GCM Key client-seitig generiert (extractable, für QR)
- AES-Key lokal im Speicher halten

### Polling:
- Alle 5 Sek. `GET /api/pair/:token`
- Bei `completed` → `encrypted_name` mit AES-Key entschlüsseln → Watcher-Name anzeigen
- Timeout 5 Min., QR regenerieren

---

## Phase 10: Frontend – Watcher (QR-Scan + Response)

### `parsePersonInput()` anpassen:
- Neues Format: `{ person_id, pairing_token, key }` erkennen
- Legacy `{ id, name }` kann entfernt werden (keine produktiven User)

### `addPerson()` anpassen:
- Watcher-Name abfragen (Input-Feld)
- AES-Key aus QR importieren → Name verschlüsseln (AES-256-GCM)
- `signedFetch('/pair/respond')` mit `{ pairing_token, encrypted_name, iv }`

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

1. Migration-Datei (002)
2. Backend: Hilfsfunktionen (ECDSA-Verify, Base64)
3. Backend: Registrierung (nur ECDSA)
4. Backend: Auth-Middleware (ECDSA, Cookie/Bearer entfernen)
5. Backend: CORS-Fix
6. Backend: Autorisierung auf allen Endpoints
7. Backend: `POST /api/watcher` → `watcher_id` in `device_keys`
8. Backend: Pairing-Endpoints
9. Backend: Cron-Cleanup
10. Frontend: Shared Crypto (IndexedDB, signedFetch) in beide Templates
11. Frontend Person: QR + Polling
12. Frontend Watcher: QR-Scan + Verschlüsselung
13. Cleanup: `createDeviceId()` Fallback, Error-Details, `schema.sql`

---

## Free: Verifikation

1. `wrangler dev` → Person-Seite → Turnstile → Public Key in DB prüfen
2. DevTools Network → `X-Device-Id`, `X-Timestamp`, `X-Signature` Headers vorhanden
3. Request ohne Signatur an `/api/heartbeat` → 401
4. IDOR: Mit Device A auf Person B's Daten → 403
5. Pairing E2E: Person QR → Watcher scannt → Name eingeben → Person sieht entschlüsselten Namen
6. D1 prüfen: `pairing_requests.encrypted_name` ist kein Klartext
7. 5+ Min. warten → Pairing "expired"
8. CORS: Request von fremder Origin → geblockt

---
---

# Pro: Überblick (wird gebaut wenn Free stabil ist)

## Pro: Auth-System

- **Dashboard-Login:** Email/Passwort + MFA (kein Device-Keypair)
- **Mitarbeiter-Smartphone:** ECDSA Device-Auth (wie Free) PLUS Org-Zugehörigkeit über Dashboard-Zuweisung
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

- [ ] ECDSA Auth implementieren (Phasen 1-4 dieses Plans)
- [ ] Autorisierung auf allen Endpoints (Phase 5)
- [ ] Verschlüsseltes QR-Pairing (Phasen 6, 9, 10)
- [ ] CORS + Security Headers + Input-Validierung (Phase 7)
- [ ] Gerätewechsel-Flow (Phase 11)
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
