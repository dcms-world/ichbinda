# Senior-Check App - Projektübersicht

## Kernkonzept

Eine einfache App, mit der Senioren regelmäßig signalisieren können, dass es ihnen gut geht – ohne komplizierte Bedienung.

**Das Motto:** Ein großer grüner Punkt. Nichts weiter.

---

## User Experience

### Für Senioren (Die zu Betreuenden)
- **Ein Bildschirm, ein Element:** Ein großer, pulsierender grüner Punkt (70% des Bildschirms)
- **Einfache Interaktion:** Draufdrücken = "Ich bin OK"
- **Positive Rückmeldung:** Freundlicher Sound + Bestätigung
- **Keine Entscheidungen:** Kein Menü, keine Einstellungen, kein Text
- **KEIN LOGIN:** Kein Passwort, keine Registrierung, keine E-Mail
- **Multi-Device:** Gleicher Room auf iPhone, iPad, Tablet – egal auf welchem Gerät Oma checkt, es zählt

### Für Betreuer (Angehörige)
- Login mit E-Mail/Passwort oder Magic Link
- Übersichtliche Liste aller betreuten Personen
- Status: "Letzter Check: heute 08:15 ✅" oder "CHECK VERPASST ⚠️"
- QR-Code generieren für neue Geräte
- Push-Benachrichtigung bei verpasstem Check
- Geräte verwalten (einzelne Geräte entkoppeln bei Verlust)

---

## Technische Architektur

### Backend: Supabase
- **Datenbank:** PostgreSQL mit einer einfachen Tabelle `checkins`
- **Cron-Jobs:** pg_cron prüft alle 15 Minuten auf verpasste Checks
- **Push-Notifications:** Integriert über Supabase Edge Functions
- **Hosting:** Supabase Cloud (Free für Dev, Pro für Production)

### Authentifizierung: Zwei-Ebenen-System

**Betreuer (mit Login):**
- Authentifizierung via Supabase Auth (E-Mail/Passwort oder Magic Link)
- Kann mehrere "Räume" erstellen und verwalten
- Vollzugriff auf Dashboard, Historie, Einstellungen

**Senioren (OHNE Login - nur QR-Code):**
- **Kein Passwort, keine Registrierung, keine persönlichen Daten auf dem Gerät**
- Flow:
  1. Betreuer erstellt in seiner App einen "Raum" (z.B. "Oma Erna")
  2. QR-Code wird generiert (enthält `room_id` und `room_secret`)
  3. Senior scannt QR-Code mit Kamera (oder Betreuer scannt Senior-Bildschirm)
  4. Gerät speichert lokal: `room_id`, `device_id`, `push_token`
  5. Verbindung steht – Checkins werden anonym mit `room_id` markiert

**Multi-Device Unterstützung:**
- Ein Room kann mehrere Geräte haben (iPhone, iPad Wohnzimmer, iPad Küche)
- Check auf BELIEBIGEM Gerät zählt für den ganzen Room
- Alle gekoppelten Geräte zeigen synchronisierten Status
- Push-Benachrichtigungen bei Verpasstem Check gehen an ALLE Geräte

**Gerätewechsel / Verlust:**
- Gerät verloren: Kein Problem – nur anonymes Token auf dem Gerät
- Neues Gerät: Einfach QR-Code neu scannen – altes Gerät wird automatisch deaktiviert
- Betreuer kann einzelne Geräte remote entkoppeln
- Keine Daten gehen verloren (alles in der Cloud unter `room_id`)

### Sicherheit
- E2E-Verschlüsselung möglich (Daten in Supabase nur als verschlüsselter Blob)
- DSGVO-konform: Keine personenbezogenen Daten auf Senior-Geräten
- QR-Code enthält Secret – bei Verdacht einfach neu generieren
- Anonyme Checkins: Nur `room_id` + Timestamp, keine Namen oder Adressen in der Check-Tabelle

---

## Preismodell

### FREE (1:1 Beziehung)
- 1 Senior + 1 Betreuer
- 3 Checks pro Tag (z.B. Morgen, Mittag, Abend)
- Kein Standort (DSGVO-einfacher)
- Push-Benachrichtigungen
- **Ziel:** Viraler Einstieg, Bindung aufbauen

### PREMIUM FAMILIE (~€9.99/Monat oder €99/Jahr)
- 1 Senior + mehrere Betreuer (Kinder, Enkel, Nachbarn)
- Unbegrenzte Checks
- Standort-Tracking mit Geofencing
- Notfallkette (wenn Betreuer 1 nicht reagiert → Betreuer 2 → Nachbar)
- Medikamenten-Erinnerung

### INSTITUTIONEN (B2B White-Label)
- Pflegedienste, Seniorenwohnungen, Betreutes Wohnen
- Dashboard für Pflegekräfte
- Pro Sitzplatz: €3-5/Monat
- Integration in bestehende Pflegesoftware

---

## MVP-Scope (Minimal Viable Product)

**Ziel:** Mit 5 Familien testen, ob Senioren wirklich den Knopf drücken

### Features
1. ✅ Ein grüner Punkt zum Drücken
2. ✅ Push-Benachrichtigung beim Check
3. ✅ QR-Code-Kopplung
4. ✅ Alert bei verpasstem Check (nach z.B. 30 Minuten)
5. ✅ Liste der Checks für Betreuer

### Kein
- ❌ Standort (erst in Premium)
- ❌ Mehrere Betreuer (erst in Premium)
- ❌ Historie/Statistiken
- ❌ Chat-Funktion
- ❌ Medikamenten-Erinnerung

---

## Datenbank-Schema (Multi-Device Architektur)

```
┌─────────────────┐
│   caregivers    │  ← Authentifizierte Betreuer
│  - id (auth)    │
│  - email        │
│  - name         │
└────────┬────────┘
         │ 1:n
         ▼
┌─────────────────┐
│     rooms       │  ← Ein Room = Ein Senior (anonym)
│  - room_id      │
│  - caregiver_id │
│  - name         │  z.B. "Oma Erna" (nur für Betreuer sichtbar)
│  - created_at   │
└────────┬────────┘
         │ 1:n
         ▼
┌─────────────────┐
│    devices      │  ← Alle Geräte eines Seniors
│  - device_id    │
│  - room_id      │  → Fremdschlüssel zu rooms
│  - push_token   │  Für Push-Notifications
│  - device_name  │  "iPhone", "iPad Wohnzimmer"
│  - last_seen    │
└─────────────────┘
         │
         │ Checkins sind ROOM-basiert, nicht DEVICE-basiert!
         ▼
┌─────────────────┐
│    checkins     │  ← Anonyme Check-Events
│  - id           │
│  - room_id      │  → Wer hat gecheckt (anonym)
│  - timestamp    │  → Wann
└─────────────────┘
```

**Wichtig:** Checkins gehören zum `room`, nicht zum `device`! 
- Oma checkt auf iPad Wohnzimmer → Checkin wird dem Room zugeordnet
- Alle ihre Geräte zeigen: "✅ Gecheckt um 08:15"
- Betreuer sieht: "Oma Erna - letzter Check: heute 08:15"

---

## Technische Kosten-Schätzung

### Entwicklung (Supabase Free Tier)
- Datenbank: 500 MB
- MAUs: Bis 50.000
- Push-Notifications: Inkludiert
- **Kosten: €0**

### Production Start (Supabase Pro)
- €25/Monat Basis
- 8 GB Speicher
- 100.000 MAUs
- **Kosten: ~€25-50/Monat** (bei moderatem Traffic)

### Scale (100.000+ aktive Senioren)
- Basis: €25
- Extra MAUs: ~€325 (100.000 × €0.00325)
- Traffic: ~€20-50
- **Kosten: ~€370-400/Monat**

---

## Go-to-Market Strategie

### Phase 1: B2C (Direkt an Familien)
- Content-Marketing: "Wissen Sie, dass Mama heute aufgestanden ist?"
- Testimonials von erwachsenen Kindern (45-60 Jahre)
- Viraler Loop: Enkel installiert für Oma → erzählt es Geschwistern → Upgrade auf Premium

### Phase 2: B2B (Institutionen)
- Pflegedienste als Multiplikatoren
- White-Label-Lösung
- Integration in Pflege-Software

### Marketing-Botschaften
- **Für Familien:** "Endlich wieder beruhigt schlafen"
- **Für Institutionen:** "Digitaler Check zwischen den Hausbesuchen"

---

## Nächste Schritte

1. **Supabase-Projekt anlegen** (Free Tier)
2. **Datenbank-Schema designen:**
   - `caregivers`: Betreuer (Auth via Supabase)
   - `rooms`: Ein Room pro Senior (name, caregiver_id)
   - `devices`: Mehrere Geräte pro Room (push_token, device_name, last_seen)
   - `checkins`: Check-Events (room_id, timestamp – anonym, kein device_id!)
3. **pg_cron einrichten** für die Überprüfung verpasster Checks (prüft: wann war letzter Check pro Room?)
4. **Prototyp bauen:**
   - Senior-View: Ein grüner Punkt, QR-Scanner für erstmalige Kopplung
   - Betreuer-View: Login, Raum erstellen, QR-Code anzeigen, Geräte verwalten
5. **Mit 5 Familien testen** (2 Wochen)
6. **Iterieren** basierend auf Feedback

---

## Offene Fragen

- [ ] Wie lange soll der Toleranz-Zeitraum sein? (15 Min? 30 Min? 1 Stunde?)
- [ ] Soll es einen "Notfall-Modus" geben (z.B. roter Button für wirkliche Notfälle)?
- [ ] Push-Notifications: Expo Notifications (einfacher) oder Firebase Cloud Messaging (robuster)?
- [ ] Framework: React Native + Expo (KI-freundlicher) oder Flutter (bessere Performance)?
- [ ] QR-Code Gültigkeit: Unbegrenzt oder zeitlich begrenzt (z.B. 24 Stunden)?
- [ ] Max Geräte pro Room begrenzen? (z.B. max 5 Geräte)

---

*Zusammengestellt am: 12. März 2026*
