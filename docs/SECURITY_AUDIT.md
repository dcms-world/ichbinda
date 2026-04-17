# Security Audit – iBinda

Erstellt: 2026-03-21
Aktualisiert: 2026-04-16
Status: offen

---

## Kritisch

- [x] **1. API-Token in `.env.bak` exponiert**
  Cloudflare API-Token lag im Klartext in `.env.bak`. Token rotiert, Datei entfernt und zu `.gitignore` hinzugefügt.

- [x] **2. Keine Authentifizierung auf API-Endpoints**
  Auth-Middleware mit Turnstile + API-Key (Cookie/Bearer) wurde implementiert.
  Alle `/api/*`-Routen sind jetzt authentifiziert, nur `/api/auth/register-device` ist ausgenommen.
  `/api/heartbeat` geht ebenfalls durch die Auth-Middleware.
  `lookupApiKey()` gibt jetzt `{ device_id, role }` zurück, Middleware setzt `deviceId` + `role` im Hono-Context.

- [x] **26. Device-ID-Übernahme über `register-device`**
  `POST /api/auth/register-device` überschreibt bestehende `device_id`s nicht mehr blind.
  Re-Registration/Key-Rotation ist nur noch erlaubt, wenn im Request bereits ein gültiger API-Key genau dieses Geräts mitgeschickt wird.
  Fremde `device_id`s liefern jetzt `409` statt ein bestehendes Gerät zu übernehmen.
  Rest-Risiko: Verliert ein Gerät seinen API-Key komplett, gibt es aktuell keinen Recovery-/Transfer-Flow; das ist funktional unschön, aber keine Übernahme-Lücke mehr.

- [x] **3. Keine Autorisierung / IDOR auf allen Endpoints**
  **Person-Endpoints: behoben.** `deviceOwnsPerson()` prüft via `person_devices`-Tabelle. `POST /api/person` legt automatisch Ownership-Bindung an. Alle Person-Endpoints (`GET/POST/DELETE /api/person/:id/*`, `POST /api/heartbeat`) geben 403 bei fehlendem Ownership.
  **Watcher-Endpoints: behoben (2026-03-28).** Direkter `watcher_devices`-Check auf allen betroffenen Endpoints (kein `device_keys.watcher_id` nötig). `POST/PUT/DELETE /api/watch` und `GET /api/watcher/:id/persons` prüfen via `SELECT 1 FROM watcher_devices WHERE watcher_id = ? AND device_id = ?` und geben 403 bei fehlendem Ownership.

- [x] **27. Heartbeat `device_id` aus Request-Body — IDOR + Rate-Limit-Bypass**
  `device_id` wird im Heartbeat-Body nicht mehr akzeptiert. Rate-Limiting und `upsertPersonDevice` verwenden ausschließlich `authDeviceId` aus der Auth-Middleware. Der Body-Parameter `device_id` wurde aus dem Handler und der OpenAPI-Spec entfernt.

- [x] **4. CORS `origin: '*'`**
  API akzeptiert jetzt nur noch erlaubte Origins:
  - gleicher Host wie der aktuelle Request
  - lokale Dev-Origins (`http://localhost`, `http://127.0.0.1`, `https://localhost`)
  - spätere Capacitor-Origins (`capacitor://localhost`, `https://localhost`)
  Requests mit fremdem `Origin`-Header werden mit `403` blockiert.

---

## Hoch

- [x] **5. Vorhersehbarer Device-ID-Fallback**
  Der fruehere Fallback `Date.now() + Math.random()` wurde entfernt.
  Person- und Watcher-Frontend erzeugen Device-IDs jetzt auch ohne `crypto.randomUUID()` ueber `crypto.getRandomValues()` als RFC-4122-kompatible UUID.

- [x] **6. `person_id` nur auf Länge geprüft, nicht auf UUID-Format**
  UUID-Regex-Validierung wurde implementiert.

- [x] **7. Watch-Relations ohne Bestätigung der Person möglich**
  Pairing-Flow mit `pairing_requests`, `POST /api/pair/create`, `POST /api/pair/respond`, `GET /api/pair/:token` und `POST /api/pair/confirm` wurde implementiert.
  Der direkte Legacy-Pfad `POST /api/watch` für das Anlegen neuer Verbindungen ist serverseitig deaktiviert (`410`).
  Neue Verbindungen entstehen nur noch über ein kurzlebiges Pairing-Token, das die Person aktiv erzeugt, plus explizite Bestätigung durch die Person.

- [x] **8. Fehlende Ownership-Prüfung bei DELETE**
  `DELETE /api/person/:id/devices` prüft jetzt via `deviceOwnsPerson()` ob der Requester die Person besitzt.

- [x] **28. `watchers.max_persons` wird serverseitig nicht durchgesetzt**
  `POST /api/pair/confirm` prüft jetzt vor dem Anlegen einer neuen `watch_relation`, ob der Watcher sein `max_persons`-Limit bereits erreicht hat. Bei Überschreitung wird `422` zurückgegeben. Die Prüfung findet vor dem Status-Update der `pairing_requests` statt, sodass kein inkonsistenter Zustand entsteht. Bereits aktive Verbindungen (idempotenter Re-Confirm) werden nicht nochmal gezählt.

- [x] **29. `POST /api/watcher` — push_token nicht validiert**
  `parsePushToken()` wird jetzt in `POST /api/watcher` aufgerufen. Ist `push_token` angegeben aber ungültig (leer, zu kurz, Steuerzeichen), antwortet der Endpoint mit 400. Fehlt `push_token` komplett (Web-Client ohne Push-Support), wird `null` gespeichert. `watcher_devices.push_token` wurde von `NOT NULL` auf nullable umgestellt.

- [ ] **9. Rate-Limiting nur per Device/Person, nicht per IP**
  Rate-Limiting wurde auf Device-ID-basiert umgestellt, aber ein Angreifer kann beliebig viele device_ids generieren.
  Zusätzlich IP-basiertes Rate-Limiting implementieren (z.B. Cloudflare Rate Limiting Rules).

- [x] **10. Error-Details in Produktion exponiert**
  Die frueheren `details: String(e)`-Leaks wurden entfernt.
  `POST /api/watch` erzeugt keine interne Exception-Response mehr, sondern liefert nur noch einen festen `410`-Fehlertext fuer den deaktivierten Legacy-Pfad.

- [x] **11. Input-Validierung fehlt auf mehreren Endpoints**
  Die betroffenen Endpoints validieren jetzt konsistent:
  - `GET /api/person/:id`, `GET /api/person/:id/has-watcher`, `GET /api/person/:id/watchers`, `GET/POST/DELETE /api/person/:id/devices`: UUID-Validierung fuer `person_id`
  - `GET /api/watcher/:id`, `GET /api/watcher/:id/persons`, `POST /api/watcher/:id/announce`: UUID-Validierung fuer `watcher_id`
  - `PUT /api/watch` und `DELETE /api/watch`: UUID-Validierung fuer `person_id` und `watcher_id`, plus robuste JSON-Fehlerbehandlung
  - `POST /api/watcher/:id/announce`: robuste JSON-Fehlerbehandlung fuer `name`
  **Hinweis:** `POST /api/watcher` ruft `parsePushToken()` nicht auf — siehe #29.

---

## Mittel

- [x] **12. `check_interval_minutes` ohne Min/Max-Validierung**
  `PUT /api/watch` akzeptiert `check_interval_minutes` jetzt nur noch als Integer im Bereich `1–10080`.
  Damit werden `0`, negative und unrealistisch große Werte vor dem Schreiben in `watch_relations` abgefangen.

- [x] **13. Fehlende HTTP Security Headers**
  Eine globale Middleware setzt jetzt:
  - `Content-Security-Policy`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Strict-Transport-Security` fuer HTTPS-Requests
  Die CSP ist auf die verbleibenden benoetigten Quellen begrenzt. QR-Libraries werden lokal ausgeliefert, die externe Google-Font-Abhaengigkeit wurde entfernt; bewusst extern bleibt nur Turnstile.

- [ ] **14. Sensitive Daten in `localStorage`**
  person_id, watcher_id, Namen und Fotos liegen in localStorage – bei XSS sofort kompromittiert.
  Kritische IDs nur in HttpOnly-Cookies speichern (API-Key ist bereits als HttpOnly-Cookie gelöst).

- [x] **15. Unbegrenzte Geräte pro Person (Resource Exhaustion)**
  `persons.max_devices` wurde eingeführt (Default `1`) und wird serverseitig in `POST /api/person/:id/devices` erzwungen.
  `mode = add` liefert ohne freien Slot einen `409`, `mode = switch` ersetzt bei Ein-Gerät-Setups die alte Person-Gerätebindung kontrolliert.

- [ ] **30. Soft-Delete Person unvollständig**
  `DELETE /api/person/:id` setzt nur `deleted_at` auf `persons`. Danach bleiben aktiv:
  `device_keys` (Device authentifiziert sich weiter), `person_devices` (Ownership bestehen), `watch_relations` (Watcher bekommen weiter Notifications), `device_rate_limits`, `pairing_requests`, `device_link_requests`.
  Die Person ist "gelöscht", aber funktional passiert nichts.
  **Fix:** Beim Soft-Delete auch `device_keys` löschen (oder invalidieren), `person_devices` aufräumen und `watch_relations` soft-deleten. Alternativ: Hard-Delete mit kaskadiertem Cleanup.

- [ ] **31. XSS über localStorage-Photo in `buildPersonAvatarMarkup`**
  `src/frontend/watcher.ts:704`: `'<img src="' + photo + '" ...>'` — `photo` aus localStorage wird nicht escaped.
  Bei Zugriff auf localStorage (z.B. über andere XSS-Lücke, Shared Device, DevTools) kann eine bösartige Photo-URL eingeschleust werden (`" onerror="alert(1)`).
  Steht im Zusammenhang mit #14 (Sensitive Daten in localStorage) und #18 (innerHTML).
  **Fix:** `photo` durch `escapeHtml()` laufen lassen oder `img.src` via DOM-API setzen.

- [ ] **32. Race Condition bei Pairing-Confirm — doppelte watch_relations**
  `POST /api/pair/confirm`: Zwei gleichzeitige Requests können beide `status = 'pending'` sehen, beide die Prüfung passieren und doppelte `watch_relations`-Einträge erzeugen (kein UNIQUE-Constraint auf `person_id + watcher_id`).
  Niedrigeres Risiko (kurze Zeitfenster, aktive User-Interaktion nötig).
  **Fix:** UNIQUE-Index auf `watch_relations(person_id, watcher_id) WHERE removed_at IS NULL` oder atomares INSERT mit Conflict-Handling.

- [x] **33. `device_link_requests` Cleanup fehlt**
  `cleanupDeviceLinkRequests()` wurde analog zu `cleanupPairingRequests()` implementiert und im Cron-Handler registriert. Abgelaufene Einträge werden nach 60 Minuten gelöscht (`DEVICE_LINK_CLEANUP_AFTER_MINUTES`).

- [x] **34. `DELETE /api/person/:id/devices` ohne `device_keys` Cleanup**
  `DELETE /api/person/:id/devices` löscht jetzt in einem Batch sowohl den `person_devices`- als auch den `device_keys`-Eintrag (`role = 'person'`) für die entfernte `device_id`. Kein Zombie-Device mehr möglich.

- [ ] **35. `showConfirmModal` setzt `innerHTML` mit fragiler Escape-Kette**
  `src/frontend/watcher.ts:621`: `confirmModalMessage.innerHTML = message` — die Message wird als HTML interpretiert.
  Aktuelle Aufrufer (Zeile 649: statischer String; Zeile 1181: `escapeHtml()` + `<strong>`) sind sicher.
  Das Pattern ist aber fragil: ein zukünftiger Aufrufer ohne `escapeHtml()` erzeugt sofort XSS.
  Steht im Zusammenhang mit #18 (innerHTML) und #31 (localStorage-Daten in HTML).
  **Fix:** `textContent` verwenden und HTML-Formatierung durch DOM-API ersetzen, oder sicherstellen dass die Funktion selbst escaped und nur explizit erlaubte Tags durchlässt.

- [ ] **36. CSP erlaubt `'unsafe-inline'` fuer Scripts**
  `src/app/constants.ts:18`: `script-src 'self' 'unsafe-inline'` schwächt den XSS-Schutz der CSP erheblich.
  Wenn ein Angreifer eine Injection-Stelle findet (z.B. #31, #35), kann er beliebiges JS ausführen — die CSP blockiert das nicht.
  Bewusstes Trade-off: Das Frontend nutzt Inline-Scripts, daher ist `unsafe-inline` aktuell notwendig.
  Langfristig Inline-Scripts in separate Dateien auslagern und `unsafe-inline` entfernen, oder Nonce-basierte CSP verwenden.

- [ ] **16. Kein Key-Rotation / Kein Key-Revocation**
  API-Keys sind 1 Jahr gültig (Cookie Max-Age), es gibt keinen Endpoint zum Invalidieren oder Rotieren.
  Kompromittierte Keys können nicht widerrufen werden.
  Revocation-Endpoint und kürzere Key-Laufzeit implementieren.

- [ ] **17. Turnstile nur bei Registrierung**
  Einmalige Bot-Prüfung bei Device-Registrierung. Danach ist der API-Key unbegrenzt nutzbar.
  Akzeptabel, aber in Kombination mit fehlendem Key-Revocation ein Risiko.

- [ ] **18. XSS – `innerHTML` wird verwendet**
  `escapeHtml()` ist vorhanden und deckt `& < > " '` korrekt ab.
  Wird an den meisten `innerHTML`-Stellen konsequent eingesetzt.
  Kein akutes XSS-Risiko erkennbar, aber `textContent`/DOM-APIs wären sicherer.
  Alle innerHTML-Stellen regelmäßig auditieren.

---

## Niedrig

- [ ] **19. Unvollständige Datenlöschung (DSGVO)**
  `DELETE /api/person/:id` existiert (seit 2026-03-29), führt aber nur ein Soft-Delete aus (setzt `deleted_at`).
  Personenbezogene Daten werden nicht vollständig entfernt — siehe #30 für Details.
  Vollständige Datenlöschroutine implementieren (inkl. `device_keys`, `person_devices`, `watch_relations`, `device_rate_limits`, `pairing_requests`, `device_link_requests`).

- [ ] **20. Push-Tokens unverschlüsselt in DB**
  Expo Push Tokens werden als Klartext in der `watcher_devices`-Tabelle gespeichert.
  Die Spalte `watchers.push_token` ist nur noch ein Legacy-Überbleibsel und wird faktisch nicht mehr genutzt.
  Tokens verschlüsselt ablegen.

- [ ] **21. Kein Audit-Log**
  Keine Protokollierung von sicherheitsrelevanten Aktionen (Registrierung, Watch-Änderungen, Device-Löschungen).
  Minimales Audit-Log für kritische Endpoints einführen.

- [ ] **22. Dev-Token als Query-Parameter**
  Dev-Token in URL wird nur akzeptiert wenn `DEV_TOKEN` gesetzt ist.
  Token kann in Server-Logs, Browser-History und Referrer-Headern landen.
  Nur in Dev-Umgebung relevant, aber Header-basierte Lösung wäre sicherer.

- [ ] **23. Geolocation-Spoofing möglich**
  Koordinaten werden nur auf Wertebereich geprüft (-90/90, -180/180), nicht auf Plausibilität.
  Akzeptierte Limitierung – serverseitige Plausibilitätsprüfung optional.

- [ ] **24. User-Agent für Device-Modell leicht spoofbar**
  Device-Modell wird aus User-Agent geparst – trivial zu fälschen.
  Akzeptierte Limitierung, rein kosmetisch.

- [ ] **26. Namen werden dauerhaft in DB gespeichert ohne Cleanup**
  `watcher_name` in `pairing_requests` bleibt nach erfolgreichem Pairing erhalten (completed-Requests werden nicht gelöscht).
  `name` in `watcher_name_announcements` und `watcher_name_snapshot` in `watcher_disconnect_events` haben keinen Ablauf-Mechanismus.
  Namen sollten nach Zweckerfüllung entfernt oder maskiert werden. Zwei Optionen:
  - **Löschen:** Feld auf `NULL` setzen wenn nicht mehr benötigt (z.B. `pairing_requests.watcher_name` nach Abschluss, `watcher_disconnect_events.watcher_name_snapshot` nach Bestätigung, `watcher_name_announcements.name` bei Verbindungstrennung).
  - **Maskieren:** Name auf erstes + letztes Zeichen reduzieren, Mitte durch `*` ersetzen (z.B. `Max Mustermann` → `M************n`) — bleibt als Referenz erkennbar, ist aber kein personenbezogenes Datum mehr. Sinnvoll wo der Eintrag selbst (z.B. Disconnect-Event) erhalten bleiben soll.

- [ ] **37. `watcher_name_announcements` Endpoint fehlt**
  `schema.sql` definiert die Tabelle `watcher_name_announcements`, das Watcher-Frontend referenziert `/api/watcher/:id/announce`.
  Dieser Endpoint ist in `api.ts` nicht registriert — der Name-Announce-Flow ist serverseitig unvollständig.
  Kein Security-Risiko, aber funktionale Lücke. Endpoint implementieren oder toten Code entfernen.

- [ ] **25. Expo Access Token könnte in Logs landen**
  `Authorization: Bearer ${expoToken}` wird in Fetch-Requests an Expo verwendet.
  Bei Cloudflare Worker Logs potenziell sichtbar. Token-Redaction prüfen.

---

## Fortschritt seit letztem Audit (2026-03-21)

| Maßnahme | Status |
|----------|--------|
| `.env.bak` Token rotiert + entfernt | erledigt |
| Auth-Middleware (Turnstile + API-Key) | implementiert |
| Heartbeat authentifiziert | implementiert |
| UUID-Validierung für `person_id` | implementiert |
| Rate-Limiting auf Device-ID umgestellt | implementiert |
| API-Key als SHA-256-Hash gespeichert | implementiert |
| Cookie: HttpOnly + Secure + SameSite=Strict | implementiert |
| Constant-Time-Vergleich für Dev-Token | implementiert |
| Ownership-Checks auf Person-Endpoints (IDOR) | implementiert |
| Ownership-Checks auf Watcher-Endpoints (IDOR) | implementiert |
| `POST /api/person` legt Ownership-Bindung an | implementiert |
| `register-device` blockiert fremde `device_id` | implementiert |
| `details: String(e)` aus `POST /api/person` entfernt | implementiert |
| Pairing mit Personen-Bestaetigung (`/api/pair/*`, `POST /api/pair/confirm`) | implementiert |
| Direkter Legacy-Pfad `POST /api/watch` deaktiviert | implementiert |
| Sicherer Device-ID-Fallback via `crypto.getRandomValues()` | implementiert |
| Input-Validierung fuer `push_token`, UUID-Routen und `check_interval_minutes` | implementiert |
| HTTP Security Headers inkl. CSP/HSTS | implementiert |
| Geräteobergrenze pro Person via `persons.max_devices` | implementiert |

---

## Statistik

| Schweregrad | Anzahl | Davon offen |
|-------------|--------|-------------|
| Kritisch    | 6      | 0           |
| Hoch        | 9      | 1           |
| Mittel      | 14     | 9           |
| Niedrig     | 9      | 9           |
| **Gesamt**  | **38** | **19**      |
