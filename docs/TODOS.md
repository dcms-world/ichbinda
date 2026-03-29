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
- [x] `pairing_requests`-Tabelle erstellen
- [x] `schema.sql` aktualisieren
- [x] Migration `migrations/005_pairing_requests.sql` erstellen

### Phase 2: Auth-Middleware fixen
- [x] `lookupApiKey()` umbauen → gibt `{ device_id, role }` zurück — **Security #2**
- [x] Auth-Middleware setzt `deviceId` + `role` in Hono-Context
- [x] `/api/heartbeat` durch Auth-Middleware schicken — **Security #2**
- [x] Heartbeat: Ownership-Check `device_id → person_devices → person_id`
- [x] Device-Registrierung gegen fremde `device_id`-Übernahme härten — **Security #26**
- [x] Live verifizieren: `register-device` blockiert fremde bestehende `device_id` mit `409` bei gültigem Turnstile-Token

### Phase 3: Ownership-Checks
- [x] `deviceOwnsPerson()` implementiert — **Security #3, #8**
- [x] Ownership auf allen Person-Endpoints — **Security #3, #8**
- [x] `POST /api/person` legt automatisch Ownership-Bindung an
- [x] Ownership auf Watcher-Endpoints — **Security #3** — direkter `watcher_devices`-Check (kein separates `deviceOwnsWatcher()` nötig)
- [x] `POST /api/watcher` bindet das anfragende Gerät direkt in `watcher_devices`

### Phase 4: Pairing-Endpoints
- [x] `POST /api/pair/create` — Person erstellt Pairing-Token
- [x] `POST /api/pair/respond` — Watcher löst Token ein
- [x] `POST /api/pair/confirm` — Person nimmt Anfrage an oder lehnt ab
- [x] `GET /api/pair/:token` — Person pollt Status
- [x] Cron-Cleanup abgelaufener `pairing_requests`

### Phase 5: CORS + Security + Validierung
- [x] CORS auf erlaubte Origins begrenzen: gleicher Host, lokales Dev und Capacitor-Origins — **Security #4**
- [x] `createDeviceId()` Fallback fixen — **Security #5**
- [x] Error-Responses ohne `details: String(e)` — **Security #10**
- [x] Input-Validierung: `push_token`, UUIDs, `check_interval_minutes` — **Security #11, #12**
- [x] `POST /api/person`: bei ungültiger `id` mit `400` ablehnen statt stillschweigend neue UUID zu erzeugen
- [x] `check_interval_minutes` strikt auf 1–10080 begrenzen (aktuell akzeptiert API auch `0` und sehr große Werte)
- [x] Namensfelder (`watcher_name`, lokale Person-/Watcher-Namen) auf 2–35 Zeichen begrenzen; die ersten 2 Zeichen müssen Buchstaben sein
- [x] HTTP Security Headers — **Security #13**

- **Fortschritt:** Phase 2+3 vollständig am 2026-03-28 implementiert. Person- und Watcher-Ownership gesichert. Watcher-Endpoints laufen direkt über `watcher_devices`; die frueher geplante `device_keys.watcher_id`-Migration ist damit obsolet. `register-device` ist inzwischen gegen fremde `device_id`-Übernahme gehärtet: bestehende Geräte können nur noch ihr eigenes API-Key-Material rotieren. CORS akzeptiert jetzt nur noch denselben Host, lokale Dev-Origins und die späteren Capacitor-Origins `capacitor://localhost` sowie `https://localhost`; fremde Origins mit `Origin`-Header werden mit `403` blockiert. Worker live auf Cloudflare deployed; allgemeine Smoke-Tests ok. `POST /api/person` lehnt ungültige `id` jetzt mit `400` ab; das Personen-Frontend fällt bei kaputter lokaler `person_id` automatisch auf eine neue Person zurück. Namensfelder für Person/Watcher sind auf 2–35 Zeichen mit Buchstaben-Start begrenzt. Pairing seit 2026-03-29 end-to-end vorhanden: `pairing_requests` in Schema + Migration `005_pairing_requests.sql`, neue Endpoints `POST /api/pair/create`, `POST /api/pair/respond`, `GET /api/pair/:token`, `POST /api/pair/confirm`, Cron-Cleanup, QR-Payload `{ person_id, pairing_token }`, Polling im Personen-Frontend und explizite Personen-Bestätigung mit Annehmen/Ablehnen vor dem Erstellen der Verbindung. Der direkte Legacy-Pfad `POST /api/watch` ist serverseitig deaktiviert (`410`), damit Security #7 nicht mehr über einen manuellen API-Call offen bleibt. Error-Responses enthalten keine `details: String(e)` mehr; `POST /api/watch` liefert nur noch einen festen `410`-Fehlertext. Am 2026-03-29 wurden die verbleibenden Restpunkte aus Phase 5 in `src/index.ts` geschlossen: sicherer Device-ID-Fallback via `crypto.getRandomValues()`, Bounds-Checks für `check_interval_minutes` (1–10080), Push-Token-/UUID-Validierung auf den betroffenen Person- und Watcher-Routen sowie globale HTTP Security Headers inkl. CSP, `nosniff`, `DENY` und HSTS auf HTTPS. `npx tsc --noEmit` und `npm run test:smoke` laufen grün. Der zuvor offene `409`-Pfad von `register-device` wurde am 2026-03-29 reproduzierbar selbst verifiziert: lokaler Worker auf `localhost` mit offiziellem Turnstile-Testtoken und Remote-D1-Binding auf Cloudflare; erster `POST /api/auth/register-device` mit `device_id=remote-409-verified-id` ergab `201`, der zweite direkte Wiederholungs-Call ohne bestehende Auth-Cookies ergab `409 {"error":"device_id bereits registriert"}`. Nächster Schritt auf dem kritischen Pfad ist damit die kleine Regression-Testbasis für Auth und Pairing.
- **Erledigt am:** -

---

## Free: QR-Pairing im Frontend umstellen
- **Status:** erledigt
- **Priorität:** hoch
- **Beschreibung:** Phase 6 aus `docs/MASTERPLAN.md` umsetzen.

- [x] Person-Seite: `POST /api/pair/create` → QR mit `{ person_id, pairing_token }`
- [x] Person-Seite: Polling alle 5 Sek., Timeout 5 Min., QR regenerieren
- [x] Watcher-Seite: `parsePersonInput()` auf neues Format umstellen
- [x] Watcher-Seite: Watcher-Name-Eingabe + `POST /api/pair/respond`
- [x] Legacy-Format `{ id, name }` entfernen

- **Fortschritt:** Frontend seit 2026-03-29 vollständig auf Pairing umgestellt. Personen erzeugen beim Öffnen der Einstellungen einen kurzlebigen QR-Code mit `pairing_token`; die Watcher-Seite akzeptiert nur noch Pairing-Daten und sendet damit eine Verbindungsanfrage über `POST /api/pair/respond`. Die Person sieht danach im offenen QR-Sheet eine explizite Abfrage mit Annehmen/Ablehnen; erst `POST /api/pair/confirm` legt die Verbindung tatsächlich an. Der direkte Legacy-Flow über reine `person_id` ist aus der UI entfernt.
- **Erledigt am:** 2026-03-29

---

## Free: Gerätewechsel und Watcher-Multi-Device klären
- **Status:** offen
- **Priorität:** mittel
- **Beschreibung:** Phase 11 aus `docs/MASTERPLAN.md` konkretisieren und umsetzbar machen.

- [ ] Device-Transfer-QR-Flow für Person designen (per Transfer-Token)
- [ ] Device-Transfer-QR-Flow für Watcher designen
- [ ] Multi-Device-Regeln für Watcher auf Basis von `watcher_devices` entscheiden
- [ ] Cleanup-Mechanismus für verwaiste Watch-Relations (ungültige Push-Tokens)
- [ ] Person: Möglichkeit alte/unbekannte Watcher zu entfernen

- **Fortschritt:** Plan grob beschrieben, nicht in technische Schritte zerlegt.
- **Erledigt am:** -

---

## Free: Kleine Regression-Testbasis für Pairing und Auth
- **Status:** in Bearbeitung
- **Priorität:** mittel
- **Beschreibung:** Nach den offenen Security-Restpunkten eine kleine, stabile Regression-Testbasis für kritische Flows aufbauen, bevor die Modularisierung beginnt.

- [x] Happy Path für Geräte-Registrierung abdecken
- [x] Regression für `register-device`-Konfliktfall (`409` bei fremder bestehender `device_id`) abdecken
- [x] Pairing-Flow minimal abdecken: `create` → `respond` → `confirm` → Status `completed`
- [ ] Negative Cases abdecken: ungültiger/abgelaufener Pairing-Token, unautorisierter Zugriff auf Pairing-Status

- **Fortschritt:** `scripts/smoke-test.sh` deckt jetzt stabil den Geräte-Registrierungs-Happy-Path, den `409`-Konfliktfall bei wiederverwendeter `device_id`, den minimalen Pairing-Flow (`create` → `respond` → `confirm` → `completed`) sowie negative Fälle für ungültigen Pairing-Token (`400`) und unautorisierten Pairing-Status-Zugriff (`403`) ab. Dafür wurde der Test-Harness auf eine temporäre Wrangler-Config ohne `.dev.vars` umgestellt; die Registrierung holt sich echte API-Keys per `Set-Cookie` aus `POST /api/auth/register-device` statt vorab DB-Hashes zu seeden. Offen bleibt für diese Aufgabe noch ein sauber reproduzierbarer Test des abgelaufenen Pairing-Tokens (`410`), weil der aktuelle lokale D1-Harness gezielte Zeit-/Status-Manipulationen außerhalb des laufenden Workers nicht konsistent übernimmt.
- **Erledigt am:** -

---

## Free: Codebasis wartbar machen
- **Status:** offen
- **Priorität:** mittel
- **Beschreibung:** `src/index.ts` in saubere Module aufteilen und E2E-Tests ergänzen.

- [ ] Backend zuerst modularisieren (`routes`, Middleware, Helpers, Typen)
- [ ] Danach Frontend-HTML/Inline-Skripte in eigene Module ziehen
- [ ] E2E-Tests im Browser (Person + Watcher Flow komplett, inklusive Regression: nach Personen-Bestaetigung erscheint die Verbindung beim Watcher sofort in der Liste und nicht nur als Statusmeldung)

- **Fortschritt:** Bewusst nach dem Security-Kern eingeordnet. Reihenfolge für den Umbau: erst offene Security-Restpunkte schließen, dann kleine Regression-Testbasis für Auth/Pairing, danach Backend modularisieren und Frontend-HTML zuletzt herauslösen.
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
