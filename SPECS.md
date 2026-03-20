# IchBinDa App - Projektübersicht

## Kernkonzept

Eine einfache App, mit der Senioren regelmäßig signalisieren können, dass es ihnen gut geht – ohne komplizierte Bedienung.

**Das Motto:** Ein großer grüner Punkt. Nichts weiter.

---

## User Experience

### Für Senioren (Die zu Betreuenden)
- **Ein Bildschirm, ein Element:** Ein großer, grüner Button
- **Einfache Interaktion:** Draufdrücken = "Ich bin OK"
- **Positive Rückmeldung:** Haptic Feedback + visuelle Bestätigung
- **Keine Entscheidungen:** Kein komplexes Menü, keine Einstellungen
- **KEIN LOGIN:** Kein Passwort, keine Registrierung, keine E-Mail
- **Multi-Device:** Gleiche Person-ID auf verschiedenen Geräten

### Für Betreuer (Angehörige)
- Übersichtliche Liste aller betreuten Personen
- Status: "Letzter Check: heute 08:15 ✅" oder "ÜBERFÄLLIG ⚠️"
- QR-Code generieren für neue Personen
- Einstellbarer Check-Intervall (6h, 12h, 24h, 48h)
- Push-Benachrichtigung bei verpasstem Check
- Standort-Anzeige (optional, wenn aktiviert)

---

## Technische Architektur

### Backend: Cloudflare Workers + D1
- **Datenbank:** Cloudflare D1 (SQLite)
- **Hosting:** Cloudflare Workers (Edge-Deployment)
- **Cron-Jobs:** Cloudflare Cron Triggers (alle 15 Minuten)
- **Push-Notifications:** Expo Push Service

### Datenbank-Schema (D1)

```sql
-- Personen (Senioren)
CREATE TABLE persons (
  id TEXT PRIMARY KEY,
  last_heartbeat TEXT,
  last_location_lat REAL,
  last_location_lng REAL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Betreuer (Watchers)
CREATE TABLE watchers (
  id TEXT PRIMARY KEY,
  push_token TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Verknüpfung Betreuer ↔ Person
CREATE TABLE watch_relations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id TEXT,
  watcher_id TEXT,
  check_interval_minutes INTEGER DEFAULT 1440,
  last_notified_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (person_id) REFERENCES persons(id),
  FOREIGN KEY (watcher_id) REFERENCES watchers(id)
);

-- Rate Limiting (optional)
CREATE TABLE device_rate_limits (
  device_id TEXT PRIMARY KEY,
  last_heartbeat_at TEXT,
  request_count INTEGER DEFAULT 0
);
```

### Authentifizierung: Zwei-Ebenen-System

**Betreuer (mit lokaler Speicherung):**
- Kein traditionelles Login - nur `watcher_id` in localStorage
- Push-Token für Notifications
- Kann mehrere Personen beobachten

**Senioren (OHNE Login - nur ID):**
- **Kein Passwort, keine Registrierung**
- Flow:
  1. Gerät erstellt bei Bedarf neue `person_id` (UUID)
  2. ID wird in localStorage gespeichert
  3. Betreuer fügt Person über ID hinzu oder scannt QR-Code
  4. Checkins werden mit `person_id` markiert

**Multi-Device Unterstützung:**
- Gleiche `person_id` auf mehreren Geräten (via URL-Parameter oder manuelle Eingabe)
- Check auf BELIEBIGEM Gerät zählt
- Standort-Tracking optional pro Gerät

---

## Preismodell

### FREE (1:1 Beziehung)
- 1 Senior + 1 Betreuer
- Unbegrenzte Checks
- Basis-Features

### PREMIUM (~€5/Monat)
- 1 Senior + mehrere Betreuer
- Standort-Tracking
- Erweiterte Einstellungen

### INSTITUTIONEN (B2B)
- Pflegedienste, Seniorenwohnungen
- Dashboard für Pflegekräfte
- Pro Sitzplatz: €2-3/Monat

---

## MVP-Scope (Minimal Viable Product)

### Features
1. ✅ Ein grüner Button zum Drücken
2. ✅ Push-Benachrichtigung beim Check
3. ✅ Person-ID via QR-Code teilbar
4. ✅ Alert bei verpasstem Check
5. ✅ Liste der Checks für Betreuer
6. ✅ Standort-Tracking (optional)

---

## Technische Kosten-Schätzung

### Cloudflare Free Tier
- Workers: 100.000 Requests/Tag
- D1: 5M Lesevorgänge/Tag, 100K Schreibvorgänge/Tag
- **Kosten: €0**

### Production (Cloudflare Paid)
- Workers: $5/Monat (10M Requests)
- D1: ~$5-20/Monat (je nach Nutzung)
- **Kosten: ~€10-25/Monat**

---

## Go-to-Market Strategie

### Phase 1: B2C (Direkt an Familien)
- Content-Marketing
- Testimonials
- Viraler Loop

### Phase 2: B2B (Institutionen)
- Pflegedienste als Multiplikatoren
- White-Label-Lösung

---

## Nächste Schritte

1. ✅ Cloudflare Workers + D1 einrichten
2. ✅ API-Endpunkte implementieren
3. ✅ Frontend (person.html, watcher.html)
4. ✅ Cron-Job für Überfälligkeits-Check
5. ✅ Mit 5 Familien testen
6. **Iterieren** basierend auf Feedback

---

*Zusammengestellt am: 20. März 2026*
*Tech-Stack: Cloudflare Workers, D1 (SQLite), Hono Framework*
