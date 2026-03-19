# IchBinDa 🛡️

Welfare-Check App für Senioren, Kinder oder Menschen, die Unterstützung brauchen.

## Konzept

- **Pflegende Person** meldet sich regelmäßig per Button
- **Betreuer** bekommen Push-Benachrichtigungen, wenn keine Meldung erfolgt
- Anonymisiert: Nur UUIDs in der Cloud, keine Namen

## Tech Stack

- **Backend**: Cloudflare Workers + D1 (SQLite)
- **Frontend**: Plain HTML/JS (später React Native App)
- **Push**: Expo Push Notifications
- **Cron**: Alle 5 Minuten Überfälligkeits-Check

## Schnelleinstieg

### 1. Abhängigkeiten installieren
```bash
npm install
```

### 2. D1 Datenbank erstellen
```bash
npm run db:create
# Datenbank-ID in wrangler.toml eintragen!
```

### 3. Schema anwenden
```bash
npm run db:migrate
```

### 4. Expo Token (für Push)
```bash
wrangler secret put EXPO_ACCESS_TOKEN
# Dein Expo Access Token hier eingeben
```

### 5. Deploy
```bash
npm run deploy
```

## API Endpoints

| Endpoint | Methode | Beschreibung |
|----------|---------|--------------|
| `/person` | POST | Neue Person erstellen |
| `/heartbeat` | POST | Heartbeat senden |
| `/person/:id` | GET | Status abfragen |
| `/watcher` | POST | Betreuer registrieren |
| `/watch` | POST | Person überwachen |
| `/watcher/:id/persons` | GET | Alle Personen eines Betreuers |

## Web UI

Nach dem Deploy:
- **Pflegende**: `https://deine-domain.de/person.html`
- **Betreuer**: `https://deine-domain.de/watcher.html`

## Datenschutz

- Keine personenbezogenen Daten in der Cloud
- Nur UUIDs und Timestamps
- Push-Tokens werden benötigt für Benachrichtigungen

## Lizenz

MIT
