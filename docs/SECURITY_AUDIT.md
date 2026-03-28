# Security Audit – iBinda

Erstellt: 2026-03-21
Aktualisiert: 2026-03-28
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

- [ ] **4. CORS `origin: '*'`**
  Jede Website kann die API aufrufen.
  In Kombination mit Bearer-Token-Auth können fremde Websites API-Requests auslösen.
  Origin auf die eigene Domain beschränken (z.B. `origin: 'https://ibinda.app'`).

---

## Hoch

- [ ] **5. Vorhersehbarer Device-ID-Fallback**
  `createDeviceId()` fällt auf `Date.now() + Math.random()` zurück wenn `crypto.randomUUID()` fehlt.
  Fallback durch `crypto.getRandomValues()` ersetzen.

- [x] **6. `person_id` nur auf Länge geprüft, nicht auf UUID-Format**
  UUID-Regex-Validierung wurde implementiert.

- [ ] **7. Jeder kann beliebige Watch-Relations erstellen**
  `POST /api/watch` erlaubt beliebige person_id + watcher_id Kombinationen ohne Autorisierung.
  Verknüpfung nur nach Bestätigung durch die Person oder Ownership-Prüfung erlauben.

- [x] **8. Fehlende Ownership-Prüfung bei DELETE**
  `DELETE /api/person/:id/devices` prüft jetzt via `deviceOwnsPerson()` ob der Requester die Person besitzt.

- [ ] **9. Rate-Limiting nur per Device/Person, nicht per IP**
  Rate-Limiting wurde auf Device-ID-basiert umgestellt, aber ein Angreifer kann beliebig viele device_ids generieren.
  Zusätzlich IP-basiertes Rate-Limiting implementieren (z.B. Cloudflare Rate Limiting Rules).

- [~] **10. Error-Details in Produktion exponiert**
  Stack-Traces und interne Fehlermeldungen werden an den Client gesendet.
  `POST /api/person` → `details: String(e)` wurde entfernt.
  `POST /api/watch` → `details: String(e)` noch offen.

- [ ] **11. Input-Validierung fehlt auf mehreren Endpoints**
  - `POST /api/watcher`: `push_token` ohne Längen-/Format-Validierung
  - `POST /api/watch`: `person_id`, `watcher_id` nicht als UUID validiert
  - `PUT /api/watch`: `check_interval_minutes` ohne Bounds-Check
  - `GET /api/person/:id`: `:id` nicht als UUID validiert

---

## Mittel

- [ ] **12. `check_interval_minutes` ohne Min/Max-Validierung**
  Negative Werte, 0 oder extrem große Zahlen werden akzeptiert.
  Der Wert wird in SQL via String-Konkatenation verwendet: `'+' || wr.check_interval_minutes || ' minutes'`.
  Da der Wert ein INTEGER aus der DB ist, besteht kein SQL-Injection-Risiko, aber logische Fehler bei negativen/extremen Werten.
  Sinnvolle Grenzen erzwingen (z.B. 1–10080 Minuten).

- [ ] **13. Fehlende HTTP Security Headers**
  Folgende Header werden nicht gesetzt:
  - `Content-Security-Policy`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Strict-Transport-Security`
  Security-Header-Middleware hinzufügen (z.B. Hono `secureHeaders()`).

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
  Expo Push Tokens werden als Klartext in der `watchers`-Tabelle gespeichert.
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

---

## Statistik

| Schweregrad | Anzahl | Davon offen |
|-------------|--------|-------------|
| Kritisch    | 5      | 1             |
| Hoch        | 7      | 5             |
| Mittel      | 7      | 7             |
| Niedrig     | 7      | 7             |
| **Gesamt**  | **26** | **20**        |
