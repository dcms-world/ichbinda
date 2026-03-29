# Security Audit – iBinda

Erstellt: 2026-03-21
Aktualisiert: 2026-03-29
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

- [ ] **9. Rate-Limiting nur per Device/Person, nicht per IP**
  Rate-Limiting wurde auf Device-ID-basiert umgestellt, aber ein Angreifer kann beliebig viele device_ids generieren.
  Zusätzlich IP-basiertes Rate-Limiting implementieren (z.B. Cloudflare Rate Limiting Rules).

- [x] **10. Error-Details in Produktion exponiert**
  Die frueheren `details: String(e)`-Leaks wurden entfernt.
  `POST /api/watch` erzeugt keine interne Exception-Response mehr, sondern liefert nur noch einen festen `410`-Fehlertext fuer den deaktivierten Legacy-Pfad.

- [x] **11. Input-Validierung fehlt auf mehreren Endpoints**
  Die betroffenen Endpoints validieren jetzt konsistent:
  - `POST /api/watcher`: `push_token` auf gueltige String-Laenge und Steuerzeichen
  - `GET /api/person/:id`, `GET /api/person/:id/has-watcher`, `GET /api/person/:id/watchers`, `GET/POST/DELETE /api/person/:id/devices`: UUID-Validierung fuer `person_id`
  - `GET /api/watcher/:id`, `GET /api/watcher/:id/persons`, `POST /api/watcher/:id/announce`: UUID-Validierung fuer `watcher_id`
  - `PUT /api/watch` und `DELETE /api/watch`: UUID-Validierung fuer `person_id` und `watcher_id`, plus robuste JSON-Fehlerbehandlung
  - `POST /api/watcher/:id/announce`: robuste JSON-Fehlerbehandlung fuer `name`

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
  Die CSP ist auf die aktuell benoetigten externen Quellen fuer Fonts, QR-Libs und Turnstile begrenzt.

- [ ] **14. Sensitive Daten in `localStorage`**
  person_id, watcher_id, Namen und Fotos liegen in localStorage – bei XSS sofort kompromittiert.
  Kritische IDs nur in HttpOnly-Cookies speichern (API-Key ist bereits als HttpOnly-Cookie gelöst).

- [ ] **15. Unbegrenzte Geräte pro Person (Resource Exhaustion)**
  Keine Obergrenze für Devices pro Person implementiert.
  Maximum (z.B. 10 Geräte) einführen.

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

- [ ] **19. Kein Datenlösch-Endpoint (DSGVO)**
  Es gibt kein `DELETE /api/person/:id`. Nutzerdaten können nicht vollständig gelöscht werden.
  Endpoint + Datenlöschroutine implementieren (inkl. Devices, Watch-Relations, Rate-Limits).

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

---

## Statistik

| Schweregrad | Anzahl | Davon offen |
|-------------|--------|-------------|
| Kritisch    | 5      | 0             |
| Hoch        | 7      | 1             |
| Mittel      | 7      | 5             |
| Niedrig     | 7      | 7             |
| **Gesamt**  | **26** | **13**        |
