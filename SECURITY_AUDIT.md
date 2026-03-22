# Security Audit – Sicherda

Erstellt: 2026-03-21
Status: offen

---

## Kritisch

- [x] **1. API-Token in `.env.bak` exponiert**
  Cloudflare API-Token liegt im Klartext in `.env.bak`. Token sofort rotieren, Datei aus Git-History entfernen und zu `.gitignore` hinzufügen.

- [ ] **2. Keine Authentifizierung auf API-Endpoints**
  Folgende Endpoints sind ohne Auth öffentlich erreichbar:
  - `POST /api/person` (index.ts:1785)
  - `POST /api/heartbeat` (index.ts:1800)
  - `GET /api/person/:id` (index.ts:1915)
  - `POST /api/watcher` (index.ts:2015)
  - `POST /api/watch` (index.ts:2024)
  - `GET /api/watcher/:id/persons` (index.ts:2052)
  API-Key oder Token-basierte Authentifizierung implementieren.

- [ ] **3. Standortdaten ohne Authorization einsehbar**
  `GET /api/watcher/:id/persons` gibt lat/lng zurück ohne zu prüfen ob der Requester berechtigt ist. Da UUIDs erratbar sind, ist beliebiges Tracking möglich. (index.ts:2052–2072)
  Ownership-Prüfung implementieren.

- [ ] **4. CORS `origin: '*'`**
  Jede Website kann die API aufrufen → CSRF-Angriffe möglich. (index.ts:1782)
  Origin-Whitelist mit erlaubten Domains verwenden.

---

## Hoch

- [ ] **5. Vorhersehbarer UUID-Fallback**
  Fallback-Generierung nutzt `Date.now() + Math.random()` – vorhersehbar. (index.ts:403–404)
  Fallback entfernen oder durch `crypto.getRandomValues()` ersetzen.

- [ ] **6. `person_id` nur auf Länge geprüft, nicht auf UUID-Format**
  Max-Länge ist 255 Zeichen, UUID ist ~36. Kein Format-Check. (index.ts:1805–1806)
  UUID-Format-Validierung mit Regex implementieren.

- [ ] **7. Jeder kann beliebige Watch-Relations erstellen**
  `POST /api/watch` erlaubt beliebige person_id + watcher_id Kombinationen ohne Autorisierung. (index.ts:2024–2039)
  Verknüpfung nur nach Bestätigung durch die Person erlauben.

- [ ] **8. Fehlende Ownership-Prüfung bei DELETE**
  `DELETE /api/person/:id/devices` prüft nicht ob der Requester die Person besitzt. (index.ts:1981–2012)
  Autorisierung vor dem Löschen erzwingen.

- [ ] **9. Rate-Limiting nur per `person_id`, nicht per IP**
  Angreifer kann beliebig viele person_ids durchprobieren. (index.ts:1459, 1495–1536)
  Zusätzlich IP-basiertes Rate-Limiting implementieren.

- [ ] **10. `check_interval_minutes` in SQL-String konkateniert**
  Wert wird direkt in SQL-String eingebaut statt via `.bind()` übergeben. (index.ts:2063)
  Wert validieren (Min/Max) und sicher übergeben.

---

## Mittel

- [ ] **11. XSS – `innerHTML` und `escapeHtml()` nicht einheitlich**
  `escapeHtml()` ist vorhanden aber wird nicht konsequent vor jedem `innerHTML`-Aufruf verwendet. (index.ts:476, 529, 891, 1285, 1416, 1420)
  Alle innerHTML-Stellen auditieren und absichern oder auf `textContent` umstellen.

- [ ] **12. Sensitive Daten in `localStorage`**
  person_id, watcher_id, Namen und Fotos liegen in localStorage – bei XSS sofort kompromittiert. (index.ts:400–404, 562–583, 793–804)
  Kritische IDs nur in sessionStorage oder HttpOnly-Cookies speichern.

- [ ] **13. Keine Watcher-Authentifizierung / kein Server-Side Session**
  watcher_id wird lokal generiert (`'web-' + crypto.randomUUID()`), kein Server-Side Session-Management. (index.ts:1211)
  Server-seitige Session oder JWT einführen.

- [ ] **14. Fehlende HTTP Security Headers**
  Folgende Header werden nicht gesetzt:
  - `Content-Security-Policy`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Strict-Transport-Security`
  Security-Header-Middleware (z.B. Hono secureHeaders) hinzufügen.

- [ ] **15. `check_interval_minutes` ohne Min/Max-Validierung**
  Negative Werte, 0 oder extrem große Zahlen werden akzeptiert. (index.ts:2026)
  Sinnvolle Grenzen erzwingen (z.B. 1–10080 Minuten).

- [ ] **16. Unbegrenzte Geräte pro Person (Resource Exhaustion)**
  Keine Obergrenze für Devices pro Person implementiert. (index.ts:1955–1979)
  Maximum (z.B. 10 Geräte) einführen.

- [ ] **17. Expo Access Token könnte in Logs landen**
  `Authorization: Bearer ${expoToken}` wird direkt in Fetch-Requests verwendet und könnte in Monitoring/Logs erscheinen. (index.ts:2090)
  Token aus Logs herausfiltern / redact.

---

## Niedrig

- [ ] **18. Kein Datenlösch-Endpoint (DSGVO)**
  Es gibt kein `DELETE /api/person/:id`. Nutzerdaten können nicht vollständig gelöscht werden.
  Endpoint + Datenlöschroutine implementieren (inkl. Devices, Watch-Relations, Heartbeats).

- [ ] **19. Push-Tokens unverschlüsselt in DB**
  Expo Push Tokens werden als Klartext gespeichert. (index.ts:2016–2020)
  Tokens verschlüsselt oder gehasht ablegen.

- [ ] **20. Kein Audit-Log**
  Keine Protokollierung von sicherheitsrelevanten Aktionen (wer hat wann was gemacht).
  Minimales Audit-Log für kritische Endpoints einführen.

- [ ] **21. watcher_id kann nicht widerrufen werden**
  Einmal kompromittierte watcher_id ist unbegrenzt gültig, kein Revocation-Mechanismus.
  Revocation-Endpoint + Server-Side Invalidierung implementieren.

- [ ] **22. Geolocation-Spoofing möglich**
  Koordinaten werden nur auf Wertebereich geprüft (-90/90, -180/180), nicht auf Plausibilität. (index.ts:1832–1837)
  Akzeptiert als bekannte Limitierung oder serverseitige Plausibilitätsprüfung ergänzen.

- [ ] **23. User-Agent für Device-Modell leicht spoofbar**
  Device-Modell wird aus User-Agent geparst – trivial zu fälschen. (index.ts:1582–1589)
  Als bekannte Limitierung akzeptieren oder Client-seitige Angabe nutzen.

---

## Statistik

| Schweregrad | Anzahl |
|-------------|--------|
| Kritisch    | 4      |
| Hoch        | 6      |
| Mittel      | 7      |
| Niedrig     | 6      |
| **Gesamt**  | **23** |
