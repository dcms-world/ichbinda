# iBinda

Welfare-Check-App fuer Senioren, Kinder oder Menschen, die Unterstuetzung brauchen.

## Status

- Nicht produktiv, Breaking Changes sind aktuell erlaubt
- Free-Version laeuft als Cloudflare-Worker mit Web-UI
- Native App ist spaeter als Capacitor-Verpackung der Web-UI geplant

## Konzept

- Die betreute Person meldet sich regelmaessig per Button
- Watcher bekommen Push-Benachrichtigungen, wenn keine Meldung erfolgt
- In der Cloud liegen nur anonyme IDs, Heartbeats und technische Betriebsdaten

## Aktueller Stack

- Backend: Cloudflare Workers + Hono + TypeScript + D1
- Frontend: Plain HTML/JS aus `src/index.ts`
- Push: Expo Push Notifications
- Native spaeter: Capacitor

## Schnellstart

### 1. Abhaengigkeiten installieren

```bash
npm install
```

### 2. D1-Datenbank erstellen

```bash
npm run db:create
```

Danach die ausgegebene `database_id` in `wrangler.toml` eintragen.

### 3. Schema anwenden

```bash
npm run db:schema
```

Lokales Schema fuer `wrangler dev`:

```bash
npm run db:schema:local
```

### 4. Secrets setzen

Pflicht:

```bash
wrangler secret put TURNSTILE_SECRET_KEY
```

Optional fuer Push-Versand:

```bash
wrangler secret put EXPO_ACCESS_TOKEN
```

Hinweis fuer lokale Entwicklung:
- `localhost` nutzt automatisch die offiziellen Cloudflare-Turnstile-Testwerte.
- `POST /api/auth/register-device` laesst sich lokal mit `XXXX.DUMMY.TOKEN.XXXX` testen.
- API-CORS erlaubt nur denselben Host, lokales Dev und spaetere Capacitor-Origins (`capacitor://localhost`, `https://localhost`).

### 5. Lokal starten

```bash
npm run dev
```

### Smoke-Test

```bash
npm run test:smoke
```

Testet den lokalen Worker-Flow fuer Startseiten, Auth, Person, Watcher, Pairing, deaktivierten Legacy-`POST /api/watch`-Pfad und Heartbeat-Rate-Limit.

### 6. Deploy

```bash
npm run deploy
```

## Verfuegbare Seiten

- Start: `/`
- Person: `/person.html`
- Watcher: `/watcher.html`

## Aktuelle API-Basis

Alle API-Routen liegen unter `/api`.

Wichtige aktuell vorhandene Endpoints:

- `POST /api/auth/register-device`
- `POST /api/person`
- `POST /api/heartbeat`
- `GET /api/person/:id`
- `GET /api/person/:id/has-watcher`
- `GET /api/person/:id/watchers`
- `GET /api/person/:id/devices`
- `POST /api/person/:id/devices`
- `DELETE /api/person/:id/devices`
- `POST /api/pair/create`
- `POST /api/pair/respond`
- `POST /api/pair/confirm`
- `GET /api/pair/:token`
- `POST /api/watcher`
- `POST /api/watch`
- `PUT /api/watch`
- `DELETE /api/watch`
- `GET /api/watcher/:id/persons`

## Doku-Einstieg

- Projektuebersicht: `docs/PROJECT_FILES.md`
- Aktueller Umsetzungsplan: `docs/MASTERPLAN.md`
- Offene Arbeit: `docs/TODOS.md`
- Entscheidungen: `docs/DECISIONS.md`
- Konventionen: `docs/CONVENTIONS.md`

## Hinweise

- `db:migrate` und `db:migrate:local` fuehren die vorhandenen Incremental-Migrationen `001` bis `005` in Reihenfolge aus
- Neue Verbindungen laufen ueber den Pairing-Flow mit expliziter Personen-Bestätigung; `POST /api/watch` ist nur noch fuer bestehende Bearbeitungs-/Loeschpfade relevant und nimmt keine neuen Verbindungen mehr an
