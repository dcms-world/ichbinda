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

- **Fortschritt:** Frontend seit 2026-03-29 vollständig auf Pairing umgestellt. Personen erzeugen beim Öffnen der Einstellungen einen kurzlebigen QR-Code mit `pairing_token`; die Watcher-Seite akzeptiert nur noch Pairing-Daten und sendet damit eine Verbindungsanfrage über `POST /api/pair/respond`. Die Person sieht danach im offenen QR-Sheet eine explizite Abfrage mit Annehmen/Ablehnen; erst `POST /api/pair/confirm` legt die Verbindung tatsächlich an. Der direkte Legacy-Flow über reine `person_id` ist aus der UI entfernt. Nach einer Scan-Regression am 2026-03-29 wurde der Personen-QR zusaetzlich wieder scannerfreundlicher gemacht: kompakteres Pairing-Format (`p`/`t`/`n` statt lange JSON-Keys), groessere Renderflaeche (`240px`) und mittlere Fehlerkorrektur; der Watcher-Parser akzeptiert sowohl das kompakte als auch das bisherige Format. Ebenfalls am 2026-03-29 wurden beide Kamera-Scanner robuster gegen sehr nahe QR-Codes gemacht: pro Frame laufen jetzt mehrere Decode-Varianten mit Downscaling und Center-Crop, damit auch uebergrosse Codes im Bild besser erkannt werden.
- **Erledigt am:** 2026-03-29

---

## Free: Gerätewechsel und Watcher-Multi-Device klären
- **Status:** in Bearbeitung
- **Priorität:** mittel
- **Beschreibung:** Phase 11 aus `docs/MASTERPLAN.md` konkretisieren und umsetzbar machen.

- [x] Device-Transfer-QR-Flow für Person finalisieren (eigener QR-Payload fuer `switch`/`add`)
- [ ] Device-Transfer-QR-Flow für Watcher designen
- [x] `persons.max_devices` einführen und serverseitig erzwingen
- [x] Person-UI zwischen `Auf anderes Gerät wechseln` und `Neues Gerät hinzufügen` unterscheiden
- [ ] Multi-Device-Regeln für Watcher auf Basis von `watcher_devices` entscheiden
- [ ] Cleanup-Mechanismus für verwaiste Watch-Relations (ungültige Push-Tokens)
- [ ] Person: einzelne Watcher entfernen können (siehe eigenes TODO unten)
- [ ] Reset-Funktion für Person: vollständiges Zurücksetzen (Person-ID, Geräte, Verbindungen) mit zweistufiger Bestätigung und erklärendem Text was das bedeutet (Daten weg, Watcher verlieren Verbindung); Watcher-Geräte erhalten Trennungs-Meldung mit Personen-Name
- [ ] Reset-Funktion für Watcher: analoges vollständiges Zurücksetzen mit zweistufiger Bestätigung; verbundene Person erhält Disconnect-Event mit Watcher-Name (bereits vorhandener Disconnect-Event-Mechanismus nutzen)
- [ ] Bei Reset des Person-Geräts: alle verbundenen Watcher per Disconnect-Event benachrichtigen (Name der Person mitsenden)
- [ ] Bei Reset des Watcher-Geräts: verbundene Personen per Disconnect-Event informieren (Name des Watchers mitsenden)

- **Fortschritt:** Am 2026-03-29 konkretisiert und teilweise umgesetzt: `persons.max_devices` wurde analog zu `watchers.max_persons` ins Schema aufgenommen (Default `1`), `POST /api/person/:id/devices` erzwingt jetzt serverseitig `mode = switch | add`, blockiert Watcher-Geräte und liefert bei `add` ohne freien Slot einen `409`. `GET /api/person/:id/devices` liefert zusätzlich `max_devices`, `device_count` und die abgeleitete UI-Aktion `switch | add | full`. Das Personen-Frontend zeigt bei `max_devices = 1` jetzt `Auf anderes Gerät wechseln`, bei freiem Multi-Device-Slot `Neues Gerät hinzufügen` und blendet den Scan-Button aus, wenn das Mehrgeräte-Limit voll ist. Am 2026-03-30 wurde der Person-Transfer-Flow erst auf Geräte-QR + Claim umgestellt und danach gezielt gehärtet: `mode = add` darf weiter direkt abschließen, aber `mode = switch` läuft jetzt zweistufig über `create -> claim -> confirm`. Das neue Gerät stellt nach dem Scan nur noch die Anfrage; das alte Gerät muss den Wechsel explizit bestätigen und wird danach lokal zurückgesetzt. Wenn das alte Gerät nicht mehr verfügbar ist, bleibt die Produktregel bewusst simpel: Watcher trennt die alte Verbindung und verbindet sich anschließend neu. Danach folgten mehrere Frontend-Stabilisierungen fuer echte Tests auf iPhone/Safari: HTML-Routen liefern `Cache-Control: no-store`, das neue Gerät zeigt waehrend des wartenden Wechsels ein eigenes Modal statt den normalen Personenfluss weiterlaufen zu lassen, der alte Personenname wird nach dem Transfer wieder korrekt uebernommen, und nach Abschluss startet das neue Gerät sauber in die uebernommene `person_id` neu statt im temporären Zustand weiterzulaufen. Zusaetzlich blendet die Personen-Geraeteliste den Loeschen-Button jetzt immer fuer das aktuelle Geraet und bei nur einem verbleibenden Geraet aus. `scripts/smoke-test.sh` deckt den neuen Bestätigungsfluss inzwischen mit ab.
- **Erledigt am:** -

---

## Free: Person kann einzelne Watcher entfernen
- **Status:** offen
- **Priorität:** mittel
- **Beschreibung:** Die Person soll verbundene Watcher einzeln trennen können (verwaiste Verbindungen aufräumen, Beziehungsänderungen, Selbstbestimmung/DSGVO). **Wichtig:** Trennung darf nie still passieren — der Watcher muss immer benachrichtigt werden.

### Backend
- [ ] `DELETE /api/person/:id/watchers/:watcher_id` — Person trennt einen Watcher
  - Ownership-Check: Device besitzt Person
  - `watch_relations.removed_at` setzen
  - `watcher_disconnect_events` anlegen (umgekehrte Richtung: Person trennt Watcher)
- [ ] Push-Notification an den Watcher senden: „[Personen-Name] hat die Verbindung getrennt"
  - Push-Token aus `watcher_devices` lesen
  - Personen-Name muss mitgeliefert werden (aus localStorage des Frontends oder als Body-Parameter)
- [ ] Fallback wenn Push fehlschlägt: Watcher sieht beim nächsten Polling, dass die Person aus seiner Liste verschwunden ist

### Frontend (Person)
- [ ] In der Watcher-Liste pro Eintrag ein „Entfernen"-Button
- [ ] Bestätigungsdialog mit Watcher-Name: „Möchtest du [Name] wirklich entfernen? [Name] wird darüber informiert."
- [ ] Kein „Alle entfernen"-Button — nur einzeln, um versehentliches Löschen des gesamten Sicherheitsnetzes zu verhindern
- [ ] Nach Entfernung: Liste aktualisieren

### Frontend (Watcher)
- [ ] Polling erkennt entfernte Person und aktualisiert die Liste
- [ ] Optional: lokale Benachrichtigung wenn Push-Notification ankommt

- **Fortschritt:** Nicht gestartet. Zusammengeführt aus zwei früheren Punkten (Watcher trennen + alte Watcher entfernen) im Gerätewechsel-TODO.
- **Erledigt am:** -

---

## Free: Kleine Regression-Testbasis für Pairing und Auth
- **Status:** erledigt
- **Priorität:** mittel
- **Beschreibung:** Nach den offenen Security-Restpunkten eine kleine, stabile Regression-Testbasis für kritische Flows aufbauen, bevor die Modularisierung beginnt.

- [x] Happy Path für Geräte-Registrierung abdecken
- [x] Regression für `register-device`-Konfliktfall (`409` bei fremder bestehender `device_id`) abdecken
- [x] Pairing-Flow minimal abdecken: `create` → `respond` → `confirm` → Status `completed`
- [x] Negative Cases abdecken: ungültiger/abgelaufener Pairing-Token, unautorisierter Zugriff auf Pairing-Status

- **Fortschritt:** `scripts/smoke-test.sh` deckt jetzt stabil den Geräte-Registrierungs-Happy-Path, den `409`-Konfliktfall bei wiederverwendeter `device_id`, den minimalen Pairing-Flow (`create` → `respond` → `confirm` → `completed`) sowie negative Fälle für ungültigen Pairing-Token (`400`), abgelaufenen Pairing-Token (`410`) und unautorisierten Pairing-Status-Zugriff (`403`) ab. Dafür nutzt der Test-Harness einen gemeinsamen Wrangler-`--persist-to`-Pfad für Worker und lokales D1 sowie einen vorab gesäten, 6 Minuten alten Pending-Token; so wird der `410`-Pfad reproduzierbar über die echte API geprüft statt über nachträgliche Live-Manipulationen an der laufenden DB. Die Registrierung holt sich weiterhin echte API-Keys per `Set-Cookie` aus `POST /api/auth/register-device` statt vorab DB-Hashes zu seeden. Kritischer Pfad danach: `Free: Codebasis wartbar machen`.
- **Erledigt am:** 2026-03-29

---

## Free: Codebasis wartbar machen
- **Status:** erledigt
- **Priorität:** mittel
- **Beschreibung:** `src/index.ts` in saubere Module aufteilen und E2E-Tests ergänzen.

- [x] Backend zuerst modularisieren (`routes`, Middleware, Helpers, Typen)
- [x] Danach Frontend-HTML/Inline-Skripte in eigene Module ziehen
- [x] E2E-Tests im Browser (Person + Watcher Flow komplett, inklusive Regression: nach Personen-Bestaetigung erscheint die Verbindung beim Watcher sofort in der Liste und nicht nur als Statusmeldung)

- **Fortschritt:** Bewusst nach dem Security-Kern eingeordnet. Reihenfolge für den Umbau: erst offene Security-Restpunkte schließen, dann kleine Regression-Testbasis für Auth/Pairing, danach Backend modularisieren und Frontend-HTML zuletzt herauslösen. Backend-Modularisierung am 2026-03-29 gestartet und im ersten Schritt abgeschlossen: `src/index.ts` ist jetzt wieder ein schlanker Worker-Einstieg mit statischen HTML-Routen, während API-Middleware und `/api/*`-Routen in `src/app/api.ts` liegen und gemeinsame Backend-Helfer/Typen/Konstanten unter `src/app/` ausgelagert sind. Am 2026-03-29 folgte der Frontend-Split: Landing-, Person- und Watcher-HTML inklusive Inline-Skripten liegen jetzt unter `src/frontend/`, `src/index.ts` verdrahtet nur noch die drei HTML-Routen plus API/Cron. Ebenfalls am 2026-03-29 wurden die bislang extern geladenen QR-Runtime-Abhängigkeiten (`qrcodejs`, `jsQR`) lokal in die Render-Schicht eingebettet und die Google-Font-Abhängigkeit aus der Person-Ansicht entfernt; externe Runtime-Requests bleiben damit im Frontend auf Turnstile beschränkt. Verifikation nach den Splits: `npx tsc --noEmit` und `npm run test:smoke` grün. Am 2026-03-29 kam die erste Browser-E2E-Basis dazu: Playwright-Setup mit lokalem Wrangler-Testserver (`scripts/e2e-server.sh`), npm-Script `test:e2e` und ein echter Pairing-Spec fuer den kritischen Person/Watcher-Flow inklusive der Regression "nach Bestaetigung sofort in der Watcher-Liste sichtbar". Nach Installation der fehlenden Playwright-Systembibliotheken laeuft jetzt auch der volle Browserlauf gruen: `npm run test:e2e` deckt den echten Person/Watcher-Flow vom Registrieren ueber QR-Pairing bis zur sofort aktualisierten Watcher-Liste nach Personen-Bestaetigung erfolgreich ab.
- **Erledigt am:** 2026-03-29

---

## Security-Restpunkte triagieren
- **Status:** offen
- **Priorität:** niedrig
- **Beschreibung:** Offene Audit-Punkte außerhalb des Free-Kerns bewerten: umsetzen, einplanen oder bewusst akzeptieren.

- [ ] IP-basiertes Rate-Limiting — **Security #9**
- [~] Sensitive Daten aus localStorage → HttpOnly-Cookies — **Security #14** — won't fix (Web test-only); Capacitor-App löst das via `@capacitor/preferences` (Phase B)
- [x] Obergrenze Geräte pro Person — **Security #15**
- [ ] API-Key Revocation — **Security #16**
- [ ] DSGVO-Lösch-Endpoint — **Security #19**
- [ ] innerHTML-Audit — **Security #18**

- **Fortschritt:** Details in `docs/SECURITY_AUDIT.md`.
- **Erledigt am:** -

---

# Nächste Produktphasen

## Gamification: Check-in-Motivation für Persons
- **Status:** offen
- **Priorität:** niedrig
- **Beschreibung:** Die Person bekommt selbst keinen direkten Nutzen aus dem Check-in — sie tut es rein für ihre Watcher. Gamification schließt diese Motivationslücke durch kleine persönliche Belohnungen und soziale Anerkennung.

### Streak-System
- [ ] Streak-Zähler serverseitig tracken (aufeinanderfolgende Tage mit Heartbeat)
- [ ] Nach dem Check-in Streak anzeigen: „Alles gut! Tag 37 in Folge."
- [ ] Milestone-Animationen bei runden Zahlen (7, 30, 100, 365 Tage)
- [ ] Streak für Watcher sichtbar machen: „Oma checkt seit 37 Tagen täglich ein" — erzeugt soziale Motivation auf Seiten der Person
- [ ] Push-Notification an Watcher bei großen Milestones (optional, opt-in)

### Belohnungsmoment nach dem Check-in (Variable Reward)
- [ ] Nach erfolgreichem Check-in optionale Belohnung anbieten: „Danke fürs Bescheid geben — möchtest den Witz des Tages?"
- [ ] Ja/Nein-Auswahl — kein Zwang, kein Autoplay
- [ ] Inhalts-Pool rotierend, z. B.:
  - Tageswitz (extern via API oder lokale Sammlung)
  - Mini-Sudoku
  - Kurzes Rätsel / Trivia-Frage
  - Motivierender Spruch
- [ ] Inhaltstyp variiert täglich → hält den Moment frisch (Variable-Reward-Effekt)
- [ ] Technisch: n8n (oder ähnlicher Workflow-Automatisierer) sammelt täglich Inhalte aus externen Quellen und schreibt sie in eine D1-Tabelle (`daily_rewards` o.ä.); Worker liefert den Tagesinhalt direkt aus D1 — keine Abhängigkeit von externen APIs zur Laufzeit, kein Ausfall-Risiko beim Check-in

### Designprinzipien
- Belohnung ist immer optional — nie aufdringlich
- Kein Streak-Druck: kein „Streak verloren!"-Guilt-Screen, kein Push-Reminder nur wegen Streak
- Ton: warm und persönlich, nicht spielerisch-kindisch
- Watcher-sichtbarer Streak als stärkste Mechanic — soziale Motivation schlägt Punkte

- **Fortschritt:** Nicht gestartet. Sinnvoll nach nativer App angehen, wenn echte Nutzer da sind und der Check-in-Flow stabil läuft.
- **Erledigt am:** -

---

## Native App (Capacitor)
- **Status:** offen
- **Priorität:** mittel
- **Beschreibung:** Capacitor-App für iOS und Android bauen. Bestehende Web-UI (`src/frontend/`) als Basis, beide Modi (Person + Watcher) in einer App, persistente Rollenwahl, dieselbe Worker-API als Backend. Entscheidung Capacitor: `docs/DECISIONS.md`.

### Phase A: Projekt-Setup
- [ ] Capacitor-Projekt unter `mobile/` anlegen (Monorepo)
- [ ] `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android` installieren
- [ ] Web-Frontend als Capacitor-Webroot einbinden (`src/frontend/`)
- [ ] `capacitor.config.ts` konfigurieren (App-ID `app.ibinda`, Webroot)

### Phase B: Native Plugins
- [ ] `@capacitor/preferences` — persistente Rollenwahl + Device-ID + API-Key
- [ ] `@capacitor/push-notifications` — FCM/APNs Push
- [ ] `@capacitor/camera` / QR-Scanner-Plugin für nativen Kamerazugriff
- [ ] `@capacitor/app` — App-Lifecycle (Foreground/Background)

### Phase C: Person-Modus
- [ ] Registrierung + Heartbeat-Button (Web-UI bereits vorhanden)
- [ ] QR-Code anzeigen (Pairing) — läuft bereits im Browser
- [ ] Pairing-Flow: Polling, Annehmen/Ablehnen
- [ ] Watcher-Liste + Disconnect-Events
- [ ] Gerätewechsel-Flow

### Phase D: Watcher-Modus
- [ ] Registrierung
- [ ] QR-Code scannen (natives Kamera-Plugin statt WebRTC)
- [ ] Personen-Liste + Status
- [ ] Überfälligkeits-Anzeige

### Phase E: Push Notifications
- [ ] Firebase-Projekt anlegen (FCM für Android + APNs für iOS)
- [ ] `@capacitor/push-notifications` integrieren, Push-Token bei Registrierung an Backend senden
- [ ] Backend: Expo-Abhängigkeiten entfernen, Push auf FCM/APNs direkt umstellen (`src/app/helpers/db.ts`, `src/app/types.ts`, `wrangler.toml`)
- [ ] Foreground + Background Notification Handling

### Phase F: Store-Vorbereitung
- [ ] App Icon + Splash Screen
- [ ] Deep Links: QR-Code öffnet direkt App
- [ ] Testen auf echten Geräten (Android + iOS)
- [ ] Codemagic CI/CD aufsetzen (automatische Builds bei Branch-Push)

- **Fortschritt:** Nicht gestartet. Entscheidung auf Capacitor geändert am 2026-04-16 (vorher kurzzeitig Flutter).
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

### CI/CD für Store-Deployments (Notiz)
Wenn es soweit ist: **Codemagic** für iOS/Android-Builds (hat nativen Capacitor-Support, eigene macOS-Runner, günstiger als GitHub Actions macOS). Triggert via Branch-Push aus GitHub. Für reine JS-Änderungen **Capawesome Live Update** evaluieren — spart Store-Wartezeiten da kein Review nötig. Native Shell-Änderungen weiter über Store.

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

## Free: Person bei Verbindungsabbrüchen aktiv informieren
- **Status:** erledigt
- **Priorität:** mittel
- **Beschreibung:** Wenn sich eine verbundene Person abmeldet, soll die betroffene Person explizit sehen, wer nicht mehr verbunden ist, und die Meldung bestaetigen.
- **Fortschritt:** Am 2026-03-29 umgesetzt: neue persistente Tabelle `watcher_disconnect_events` inkl. Migration `006_watcher_disconnect_events.sql`, Backend-Auslieferung offener Disconnect-Events ueber `GET /api/person/:id/watchers`, bestaetigender Ack-Endpoint `POST /api/person/:id/disconnect-events/ack` und Personen-Modal mit Text wie „Max Muster ist nicht mehr mit dir verbunden. Bitte prüfe, ob noch jemand deinen Status sehen kann.“. Der Personen-Client pollt die Verbindungen jetzt leichtgewichtig im Hintergrund und zeigt Disconnect-Hinweise nach Rueckkehr in den Vordergrund ebenfalls an. `scripts/smoke-test.sh` deckt den neuen Trenn- und Bestaetigungsfluss ab.
- **Erledigt am:** 2026-03-29

## Security-Basismaßnahmen
- **Status:** erledigt
- **Priorität:** hoch
- **Beschreibung:** Erste Sicherheitsmaßnahmen aus dem Audit.
- **Fortschritt:** Security #1 und #6 erledigt. Auth-Middleware, Device-basiertes Rate-Limiting, API-Key-Hashing, HttpOnly-Cookie und Constant-Time-Vergleich eingeführt.
- **Erledigt am:** 2026-03-28
