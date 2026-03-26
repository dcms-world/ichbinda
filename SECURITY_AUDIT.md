# Security Audit – iBinda

Erstellt: 2026-03-21
Aktualisiert: 2026-03-26
Status: offen

---

## Kritisch

- [x] **1. API-Token in `.env.bak` exponiert**
  Cloudflare API-Token lag im Klartext in `.env.bak`. Token rotiert, Datei entfernt und zu `.gitignore` hinzugefügt.

- [~] **2. Keine Authentifizierung auf API-Endpoints**
  Auth-Middleware mit Turnstile + API-Key (Cookie/Bearer) wurde implementiert (index.ts:1988–2020).
  **Aber:** `/api/heartbeat` ist bewusst ausgenommen und weiterhin **komplett unauthentifiziert** (index.ts:2070).
  Jeder mit einer gültigen `person_id` kann falsche "Ich bin da"-Meldungen senden, Standortdaten überschreiben oder löschen.
  **Das unterminiert den Kernzweck der App.**
  Heartbeat muss authentifiziert werden.

- [ ] **3. Keine Autorisierung / IDOR auf allen Endpoints**
  Die Auth-Middleware prüft nur, ob *irgendein* gültiger API-Key existiert – nicht *wem* er gehört. Jeder authentifizierte User kann:
  - `GET /api/person/:id` – Daten **jeder** Person lesen inkl. Standort (index.ts:2188)
  - `GET /api/person/:id/watchers` – Watcher-IDs jeder Person lesen (index.ts:2212)
  - `GET /api/person/:id/devices` – Geräte jeder Person einsehen (index.ts:2225)
  - `DELETE /api/person/:id/devices` – Geräte fremder Personen löschen (index.ts:2266)
  - `POST /api/watch` – sich als Watcher für beliebige Personen eintragen (index.ts:2309)
  - `PUT /api/watch` – Intervalle fremder Relations ändern (index.ts:2329)
  - `DELETE /api/watch` – Watch-Relations anderer löschen (index.ts:2339)
  - `GET /api/watcher/:id/persons` – Daten + Standort aller Personen eines fremden Watchers sehen (index.ts:2349)
  Das `role`-Feld in `device_keys` wird gespeichert aber **nie geprüft**.
  Middleware muss den authentifizierten User identifizieren und gegen die angefragte Ressource prüfen.

- [ ] **4. CORS `origin: '*'`**
  Jede Website kann die API aufrufen. (index.ts:1986)
  In Kombination mit Bearer-Token-Auth können fremde Websites API-Requests auslösen.
  Origin auf die eigene Domain beschränken (z.B. `origin: 'https://ibinda.app'`).

---

## Hoch

- [ ] **5. Vorhersehbarer Device-ID-Fallback**
  `createDeviceId()` fällt auf `Date.now() + Math.random()` zurück wenn `crypto.randomUUID()` fehlt. (index.ts:550)
  Fallback durch `crypto.getRandomValues()` ersetzen.

- [x] **6. `person_id` nur auf Länge geprüft, nicht auf UUID-Format**
  UUID-Regex-Validierung wurde implementiert. (index.ts:1768–1771, 2087)

- [ ] **7. Jeder kann beliebige Watch-Relations erstellen**
  `POST /api/watch` erlaubt beliebige person_id + watcher_id Kombinationen ohne Autorisierung. (index.ts:2309–2326)
  Verknüpfung nur nach Bestätigung durch die Person oder Ownership-Prüfung erlauben.

- [ ] **8. Fehlende Ownership-Prüfung bei DELETE**
  `DELETE /api/person/:id/devices` prüft nicht ob der Requester die Person besitzt. (index.ts:2266–2297)
  Autorisierung vor dem Löschen erzwingen.

- [ ] **9. Rate-Limiting nur per Device/Person, nicht per IP**
  Rate-Limiting wurde auf Device-ID-basiert umgestellt (index.ts:2115), aber ein Angreifer kann beliebig viele device_ids generieren.
  Zusätzlich IP-basiertes Rate-Limiting implementieren (z.B. Cloudflare Rate Limiting Rules).

- [ ] **10. Error-Details in Produktion exponiert**
  Stack-Traces und interne Fehlermeldungen werden an den Client gesendet:
  - `POST /api/person` → `details: String(e)` (index.ts:2066)
  - `POST /api/watch` → `details: String(e)` (index.ts:2324)
  `details` nur im Dev-Modus zurückgeben.

- [ ] **11. Input-Validierung fehlt auf mehreren Endpoints**
  - `POST /api/watcher`: `push_token` ohne Längen-/Format-Validierung (index.ts:2301)
  - `POST /api/watch`: `person_id`, `watcher_id` nicht als UUID validiert (index.ts:2311)
  - `PUT /api/watch`: `check_interval_minutes` ohne Bounds-Check (index.ts:2330)
  - `GET /api/person/:id`: `:id` nicht als UUID validiert (index.ts:2188)

---

## Mittel

- [ ] **12. `check_interval_minutes` ohne Min/Max-Validierung**
  Negative Werte, 0 oder extrem große Zahlen werden akzeptiert. (index.ts:2311, 2330)
  Der Wert wird in SQL via String-Konkatenation verwendet: `'+' || wr.check_interval_minutes || ' minutes'` (index.ts:2360).
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
  person_id, watcher_id, Namen und Fotos liegen in localStorage – bei XSS sofort kompromittiert. (index.ts:547–549, 929–937)
  Kritische IDs nur in HttpOnly-Cookies speichern (API-Key ist bereits als HttpOnly-Cookie gelöst).

- [ ] **15. Unbegrenzte Geräte pro Person (Resource Exhaustion)**
  Keine Obergrenze für Devices pro Person implementiert. (index.ts:2240–2264)
  Maximum (z.B. 10 Geräte) einführen.

- [ ] **16. Kein Key-Rotation / Kein Key-Revocation**
  API-Keys sind 1 Jahr gültig (Cookie Max-Age, index.ts:2045), es gibt keinen Endpoint zum Invalidieren oder Rotieren.
  Kompromittierte Keys können nicht widerrufen werden.
  Revocation-Endpoint und kürzere Key-Laufzeit implementieren.

- [ ] **17. Turnstile nur bei Registrierung**
  Einmalige Bot-Prüfung bei Device-Registrierung. Danach ist der API-Key unbegrenzt nutzbar.
  Akzeptabel, aber in Kombination mit fehlendem Key-Revocation ein Risiko.

- [ ] **18. XSS – `innerHTML` wird verwendet**
  `escapeHtml()` ist vorhanden und deckt `& < > " '` korrekt ab (index.ts:552, 1130).
  Wird an den meisten `innerHTML`-Stellen konsequent eingesetzt.
  Kein akutes XSS-Risiko erkennbar, aber `textContent`/DOM-APIs wären sicherer.
  Alle innerHTML-Stellen regelmäßig auditieren.

---

## Niedrig

- [ ] **19. Kein Datenlösch-Endpoint (DSGVO)**
  Es gibt kein `DELETE /api/person/:id`. Nutzerdaten können nicht vollständig gelöscht werden.
  Endpoint + Datenlöschroutine implementieren (inkl. Devices, Watch-Relations, Rate-Limits).

- [ ] **20. Push-Tokens unverschlüsselt in DB**
  Expo Push Tokens werden als Klartext in der `watchers`-Tabelle gespeichert. (index.ts:2304)
  Tokens verschlüsselt ablegen.

- [ ] **21. Kein Audit-Log**
  Keine Protokollierung von sicherheitsrelevanten Aktionen (Registrierung, Watch-Änderungen, Device-Löschungen).
  Minimales Audit-Log für kritische Endpoints einführen.

- [ ] **22. Dev-Token als Query-Parameter**
  Dev-Token in URL wird nur akzeptiert wenn `DEV_TOKEN` gesetzt ist (index.ts:1993–1997).
  Token kann in Server-Logs, Browser-History und Referrer-Headern landen.
  Nur in Dev-Umgebung relevant, aber Header-basierte Lösung wäre sicherer.

- [ ] **23. Geolocation-Spoofing möglich**
  Koordinaten werden nur auf Wertebereich geprüft (-90/90, -180/180), nicht auf Plausibilität. (index.ts:2096–2109)
  Akzeptierte Limitierung – serverseitige Plausibilitätsprüfung optional.

- [ ] **24. User-Agent für Device-Modell leicht spoofbar**
  Device-Modell wird aus User-Agent geparst – trivial zu fälschen. (index.ts:1786–1793)
  Akzeptierte Limitierung, rein kosmetisch.

- [ ] **25. Expo Access Token könnte in Logs landen**
  `Authorization: Bearer ${expoToken}` wird in Fetch-Requests an Expo verwendet. (index.ts:2388)
  Bei Cloudflare Worker Logs potenziell sichtbar. Token-Redaction prüfen.

---

## Fortschritt seit letztem Audit (2026-03-21)

| Maßnahme | Status |
|----------|--------|
| `.env.bak` Token rotiert + entfernt | erledigt |
| Auth-Middleware (Turnstile + API-Key) | implementiert |
| UUID-Validierung für `person_id` | implementiert |
| Rate-Limiting auf Device-ID umgestellt | implementiert |
| API-Key als SHA-256-Hash gespeichert | implementiert |
| Cookie: HttpOnly + Secure + SameSite=Strict | implementiert |
| Constant-Time-Vergleich für Dev-Token | implementiert |

---

## Statistik

| Schweregrad | Anzahl | Davon offen |
|-------------|--------|-------------|
| Kritisch    | 4      | 3           |
| Hoch        | 7      | 6           |
| Mittel      | 7      | 7           |
| Niedrig     | 7      | 7           |
| **Gesamt**  | **25** | **23**      |
