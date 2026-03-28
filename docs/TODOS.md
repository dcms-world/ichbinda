# iBinda — TODOs & Aufgaben

Diese Datei ist das kompakte Arbeits-Backlog.
Details bleiben in den fachlichen Quelldokumenten, damit hier keine Doppelpflege entsteht.

Referenzen:
- `docs/MASTERPLAN.md` für Phasen, Reihenfolge und technische Details
- `docs/SECURITY_AUDIT.md` für Audit-Punkte und Risikobewertung

---

# Aktive Aufgaben

## Free: Security-Kern und Pairing fertigstellen
- **Status:** in Bearbeitung
- **Priorität:** hoch
- **Beschreibung:** Phasen 1 bis 5 aus `docs/MASTERPLAN.md` umsetzen, damit die Free-Web-UI sicher benutzbar ist.

### Phase 1: DB-Migration
- [ ] `device_keys`: Spalte `watcher_id TEXT` hinzufügen
- [ ] `pairing_requests`-Tabelle erstellen
- [ ] `schema.sql` aktualisieren
- [ ] Migration `migrations/002_pairing.sql` erstellen und testen

### Phase 2: Auth-Middleware fixen
- [ ] `lookupApiKey()` umbauen → gibt `{ device_id, role }` zurück — **Security #2**
- [ ] Auth-Middleware setzt `deviceId` + `role` in Hono-Context
- [ ] `/api/heartbeat` durch Auth-Middleware schicken — **Security #2**
- [ ] Heartbeat: Ownership-Check `device_id → person_devices → person_id`

### Phase 3: Ownership-Checks
- [ ] Hilfsfunktionen `deviceOwnsPerson()` und `deviceOwnsWatcher()` — **Security #3**
- [ ] Ownership auf allen Endpoints laut Matrix im Masterplan — **Security #3, #7, #8**
- [ ] `POST /api/watcher` → `watcher_id` in `device_keys` setzen

### Phase 4: Pairing-Endpoints
- [ ] `POST /api/pair/create` — Person erstellt Pairing-Token
- [ ] `POST /api/pair/respond` — Watcher löst Token ein
- [ ] `GET /api/pair/:token` — Person pollt Status
- [ ] Cron-Cleanup abgelaufener `pairing_requests`

### Phase 5: CORS + Security + Validierung
- [ ] CORS auf eigene Domain einschränken — **Security #4**
- [ ] `createDeviceId()` Fallback fixen — **Security #5**
- [ ] `details: String(e)` aus Error-Responses entfernen — **Security #10**
- [ ] Input-Validierung: `push_token`, UUIDs, `check_interval_minutes` — **Security #11, #12**
- [ ] HTTP Security Headers — **Security #13**

- **Fortschritt:** Basis-Auth vorhanden. Code-Check am 2026-03-28 bestaetigt: `device_keys.watcher_id`, `pairing_requests` und die Pairing-Endpoints existieren noch nicht; die geplante Migration bleibt fuer den neuen Pairing-/Ownership-Flow noetig. Offene Kernpunkte: Security #2, #3, #4, #5, #7, #8, #10, #11, #12, #13.
- **Erledigt am:** -

---

## Free: QR-Pairing im Frontend umstellen
- **Status:** offen
- **Priorität:** hoch
- **Beschreibung:** Phase 6 aus `docs/MASTERPLAN.md` umsetzen.

- [ ] Person-Seite: `POST /api/pair/create` → QR mit `{ person_id, pairing_token }`
- [ ] Person-Seite: Polling alle 5 Sek., Timeout 5 Min., QR regenerieren
- [ ] Watcher-Seite: `parsePersonInput()` auf neues Format umstellen
- [ ] Watcher-Seite: Watcher-Name-Eingabe + `POST /api/pair/respond`
- [ ] Legacy-Format `{ id, name }` entfernen

- **Fortschritt:** Wartet auf Backend-Pairing-Endpoints.
- **Erledigt am:** -

---

## Free: Gerätewechsel und Watcher-Multi-Device klären
- **Status:** offen
- **Priorität:** mittel
- **Beschreibung:** Phase 11 aus `docs/MASTERPLAN.md` konkretisieren und umsetzbar machen.

- [ ] Device-Transfer-QR-Flow für Person designen (per Transfer-Token)
- [ ] Device-Transfer-QR-Flow für Watcher designen
- [ ] Multi-Device-Konzept für Watcher entscheiden (`watcher_devices` oder `device_keys` erweitern)
- [ ] Cleanup-Mechanismus für verwaiste Watch-Relations (ungültige Push-Tokens)
- [ ] Person: Möglichkeit alte/unbekannte Watcher zu entfernen

- **Fortschritt:** Plan grob beschrieben, nicht in technische Schritte zerlegt.
- **Erledigt am:** -

---

## Free: Codebasis wartbar machen
- **Status:** offen
- **Priorität:** mittel
- **Beschreibung:** `src/index.ts` in saubere Module aufteilen und E2E-Tests ergänzen.

- [ ] Monolith aufteilen (2400+ Zeilen → Module)
- [ ] E2E-Tests im Browser (Person + Watcher Flow komplett)

- **Fortschritt:** Bewusst nach dem Security-Kern eingeordnet.
- **Erledigt am:** -

---

## Security-Restpunkte triagieren
- **Status:** offen
- **Priorität:** niedrig
- **Beschreibung:** Offene Audit-Punkte außerhalb des Free-Kerns bewerten: umsetzen, einplanen oder bewusst akzeptieren.

- [ ] IP-basiertes Rate-Limiting — **Security #9**
- [ ] Sensitive Daten aus localStorage → HttpOnly-Cookies — **Security #14**
- [ ] Obergrenze Geräte pro Person — **Security #15**
- [ ] API-Key Revocation — **Security #16**
- [ ] DSGVO-Lösch-Endpoint — **Security #19**
- [ ] innerHTML-Audit — **Security #18**

- **Fortschritt:** Details in `docs/SECURITY_AUDIT.md`.
- **Erledigt am:** -

---

# Nächste Produktphasen

## Native App (Capacitor)
- **Status:** offen
- **Priorität:** mittel
- **Beschreibung:** Web-UI als Capacitor-App verpacken, Push auf APNs/FCM umstellen, Deep Links, echte Gerätetests.

- [ ] Capacitor-Projekt aufsetzen
- [ ] Push Notifications: Capacitor Push Plugin (APNs + FCM)
- [ ] Backend: Push-Endpunkt auf APNs/FCM umstellen
- [ ] Cookie-/Storage-Auth in WebViews prüfen
- [ ] Splash Screen + App Icon
- [ ] Deep Links (QR → App)
- [ ] Testen auf echten Geräten

- **Fortschritt:** Nicht gestartet.
- **Erledigt am:** -

---

## App Store Vorbereitung
- **Status:** offen
- **Priorität:** niedrig
- **Beschreibung:** Accounts, Rechtstexte, Listings und Test-Kanäle.

- [ ] Apple Developer Account + Google Play Developer Account
- [ ] Datenschutzerklärung + Impressum
- [ ] App Store Listings + Screenshots
- [ ] Privacy Labels (Apple) + Data Safety (Google)
- [ ] TestFlight + Internal Testing Track

- **Fortschritt:** Wartet auf native App.
- **Erledigt am:** -

---

## Beta mit echten Usern
- **Status:** offen
- **Priorität:** niedrig
- **Beschreibung:** 5–10 Beta-Tester, Feedback zu UX, Notifications, Pairing, Gerätewechsel.
- **Fortschritt:** Wartet auf TestFlight und Internal Testing.
- **Erledigt am:** -

## App Store Release (Free)
- **Status:** offen
- **Priorität:** niedrig
- **Beschreibung:** Store-Review, Landing Page, Monitoring, Support-Kanal.
- **Fortschritt:** Wartet auf erfolgreiche Beta.
- **Erledigt am:** -

## Free stabilisieren
- **Status:** offen
- **Priorität:** niedrig
- **Beschreibung:** Feedback, Performance-Monitoring, Notification-Zuverlässigkeit.
- **Fortschritt:** Wartet auf echte Nutzer.
- **Erledigt am:** -

## Pro-Version vorbereiten
- **Status:** offen
- **Priorität:** niedrig
- **Beschreibung:** Erst wenn Free stabil. Details in `docs/MASTERPLAN.md` und `docs/PRO_VERSION.md`.
- **Fortschritt:** Absichtlich nicht weiter ausdetailliert.
- **Erledigt am:** -

---

# Erledigte Aufgaben

## Security-Basismaßnahmen
- **Status:** erledigt
- **Priorität:** hoch
- **Beschreibung:** Erste Sicherheitsmaßnahmen aus dem Audit.
- **Fortschritt:** Security #1 und #6 erledigt. Auth-Middleware, Device-basiertes Rate-Limiting, API-Key-Hashing, HttpOnly-Cookie und Constant-Time-Vergleich eingeführt.
- **Erledigt am:** 2026-03-28
