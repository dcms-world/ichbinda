# iBinda — Entscheidungslog

Hier werden getroffene Entscheidungen dokumentiert.
Neue Einträge oben anfügen (neueste zuerst).

**Wichtig:** Entscheidungen sind kein Denkverbot. Wenn ein Agent einen guten Grund sieht, eine Entscheidung in Frage zu stellen, soll er das tun — mit Begründung. Entscheidungen verhindern nur, dass dieselbe Diskussion ohne neue Argumente wiederholt wird.

---

## Format

```markdown
### [Entscheidung kurz beschrieben]
- **Datum:** YYYY-MM-DD
- **Entschieden von:** (User / Agent / gemeinsam)
- **Begründung:** Warum diese Entscheidung getroffen wurde
- **Alternativen verworfen:** Was wurde bewusst nicht gewählt
```

---

### `max_devices` pro Person in DB; bei `1` wird gewechselt statt hinzugefügt
- **Datum:** 2026-03-29
- **Entschieden von:** User + Agent
- **Begründung:** Die Personen-Seite braucht eine klare, einfache Regel für Geräteverwaltung. Ein zusätzliches Feld `persons.max_devices` macht das Limit pro Person serverseitig konfigurierbar und später monetarisierbar, analog zu `watchers.max_persons`. Wenn `max_devices = 1`, ist die fachlich korrekte Aktion kein "Neues Gerät hinzufügen", sondern ein echter Gerätewechsel: dieselbe `person_id` bleibt bestehen, aber das alte Person-Gerät wird aus `person_devices` und `device_keys` entfernt. Wenn `max_devices > 1`, darf nur bis zum freien Slot hinzugefügt werden. Der ursprünglich vergebene Personenname bleibt dabei geräteunabhängig und wird durch Wechsel/Hinzufügen nicht geändert.
- **Alternativen verworfen:** Immer nur "Gerät hinzufügen" nennen obwohl bei `1` effektiv ersetzt wird; unbegrenzte Person-Geräte; komplexer Transfer-Flow als Voraussetzung für jede erste Umsetzung.

### Gerätewechsel: neues Gerät scannt, altes Gerät bestätigt den Wechsel
- **Datum:** 2026-03-30
- **Entschieden von:** User + Agent
- **Begründung:** Der Scan gehört fachlich auf das neue Gerät, nicht auf das bestehende. Das bestehende Person-Gerät besitzt die bestehende `person_id` und erzeugt deshalb einen kurzlebigen Geräte-QR über einen serverseitigen Device-Link-Token. Beim eigentlichen **Wechsel** darf der Claim auf dem neuen Gerät den Transfer aber nicht sofort finalisieren, weil das alte Gerät sonst abrupt ausgesperrt wird. Deshalb läuft `switch` jetzt zweistufig: neues Gerät scannt und stellt nur eine Anfrage, altes Gerät bestätigt explizit und wird danach lokal zurückgesetzt. `add` darf weiterhin direkt abgeschlossen werden, weil dabei kein bestehendes Gerät deaktiviert wird.
- **Alternativen verworfen:** Sofortiger Wechsel direkt nach dem Scan; auf dem bestehenden Person-Gerät weiter "QR-Code scannen" anzeigen; bloßes Weiterreichen der `person_id` ohne serverseitigen Claim-Token; Recovery-Flow ohne altes Gerät. Wenn das alte Gerät nicht mehr verfügbar ist, bleibt die bewusste Produktregel: Watcher trennt die alte Verbindung und verbindet sich danach neu.

### Ohne aktive Verbindung kein Heartbeat, sondern Pairing als Primäraktion
- **Datum:** 2026-03-29
- **Entschieden von:** User + Agent
- **Begründung:** Ein Heartbeat ohne verbundenen Watcher hat keinen Nutzen und wirkt in der Person-UI wie eine falsche Hauptaktion. Solange noch niemand verbunden ist, wird deshalb der große Primärbutton nicht als grünes `OK`, sondern als gelbe Pairing-Aktion dargestellt, die direkt den QR-Code öffnet. Erst mit mindestens einer aktiven Verbindung wird daraus wieder der eigentliche Heartbeat-Button.
- **Alternativen verworfen:** Grünen `OK`-Button immer sichtbar lassen; zusätzlichen QR-Button nur unterhalb des Hinweises anzeigen; Heartbeats ohne Empfänger trotzdem zulassen.

### Watcher-Abmeldungen als bestaetigbare Ereignisse speichern
- **Datum:** 2026-03-29
- **Entschieden von:** User + Agent
- **Begründung:** Wenn eine verbundene Person sich abmeldet, reicht ein stiller Listen-Refresh nicht aus. Die Person soll explizit sehen, wer nicht mehr verbunden ist, und die Information einmalig bestaetigen. Dafuer wird die fachliche Historie in `watch_relations.removed_at` beibehalten und zusaetzlich ein persistentes Disconnect-Ereignis mit `watcher_id` und Namens-Snapshot gespeichert, bis die Person es im UI bestaetigt.
- **Alternativen verworfen:** Nur `watch_relations` passiv auswerten und im Frontend diffen; nur einen fluechtigen Banner ohne Bestaetigung; `watcher_id` nach dem Trennen komplett verwerfen.

### Subdomain-Struktur für ibinda.app
- **Datum:** 2026-03-29
- **Entschieden von:** User + Agent
- **Begründung:** Klare Trennung von API und Pro-Dashboard, konsistentes Schema `dienst.umgebung.ibinda.app`. `portal` wurde für das Dashboard gewählt weil es Behörden und Hilfsorganisationen im DACH-Raum vertraut ist ("Bürgerportal", "Spendenportal") ohne bürokratisch zu klingen.
- **Alternativen verworfen:** `dash.ibinda.app` — zu tech-lastig für institutionelle Zielgruppe; `app.ibinda.app` — doppeltes "app".
- **Konsequenz:**
  - API Prod: `api.ibinda.app`
  - API Staging: `api.staging.ibinda.app`
  - API Dev: `api.dev.ibinda.app`
  - Portal Prod: `portal.ibinda.app`
  - Portal Staging: `portal.staging.ibinda.app`
  - Portal Dev: `portal.dev.ibinda.app`
  - Aktuell läuft alles über `ibinda.johann-zehner.workers.dev`. Subdomains werden erst eingerichtet wenn Custom Domains aktiv benötigt werden.

### Frontend-Runtime-Abhängigkeiten lokal ausliefern, wo möglich
- **Datum:** 2026-03-29
- **Entschieden von:** User + Agent
- **Begründung:** Die Web-App soll zur Laufzeit möglichst wenige Third-Party-Requests auslösen. Das reduziert externe Datenabflüsse, vereinfacht DSGVO-Bewertung und macht das Frontend robuster gegen CDN-Ausfälle. Deshalb werden QR-bezogene JavaScript-Abhängigkeiten lokal aus dem Worker ausgeliefert und die externe Google-Font-Abhängigkeit entfernt.
- **Alternativen verworfen:** QR-Libraries und Webfonts weiter direkt von CDNs laden; Turnstile lokal spiegeln.
- **Konsequenz:** `qrcodejs` und `jsQR` werden lokal eingebettet, die Person-Ansicht nutzt nur noch lokale/systemnahe Schriften. Turnstile bleibt als bewusst externe Sicherheitsabhängigkeit bestehen.

### Eine native App mit persistenter Geraeterolle statt zwei getrennten Apps
- **Datum:** 2026-03-29
- **Entschieden von:** User + Agent
- **Begründung:** Fachlich gibt es zwei Modi (`person` und `watcher`), aber keine Notwendigkeit fuer zwei getrennte native Anwendungen. Eine gemeinsame App mit Rollenauswahl beim ersten Start reduziert Wartungsaufwand, haelt die Codebasis zusammen und passt zur bereits getroffenen Capacitor-Entscheidung. Die gewaehlte Rolle bleibt pro Geraet persistent gespeichert, damit sich die App danach direkt im passenden Modus oeffnet.
- **Alternativen verworfen:** Zwei getrennte native Apps fuer Person und Watcher; jedes Mal beim App-Start die Rolle neu abfragen.
- **Konsequenz:** Die heutige Trennung in `/person.html` und `/watcher.html` ist ein Zwischenstand der Web-Version. Ziel fuer die native App ist ein gemeinsamer Einstieg mit Rollenauswahl, persistentem lokalem Rollenstatus und gemeinsamem Cloudflare-Backend fuer beide Modi.

### CORS strikt auf Same-Host, lokales Dev und Capacitor-Origins begrenzen
- **Datum:** 2026-03-28
- **Entschieden von:** User + Agent
- **Begründung:** Die Web-UI und API laufen im Browser typischerweise auf derselben Origin. Fuer spaetere Native-Apps mit Capacitor muessen zusaetzlich die WebView-Origins `capacitor://localhost` und `https://localhost` erlaubt werden. Eine pauschale Freigabe ganzer Wildcard-Domains wie `*.workers.dev` oder `*.ibinda.app` waere unnoetig weit und oeffnet die API fuer fremde Frontends auf denselben Domainfamilien.
- **Alternativen verworfen:** `origin: '*'` — unsicher mit Bearer-Token-Auth; globale Wildcards fuer `*.johann.zehner.workers.dev` oder `*.ibinda.app` — zu breit; rein auf feste Produktionsdomains begrenzen — blockiert lokale Entwicklung und Capacitor.
- **Konsequenz:** Die API erlaubt nur Requests vom aktuellen Host, lokalen Dev-Origins und den definierten Capacitor-Origins. Fremde Requests mit `Origin`-Header werden mit `403` abgelehnt. Native Clients ohne `Origin`-Header bleiben moeglich und sollen perspektivisch Bearer-Auth nutzen.

### `max_persons` pro Watcher in DB statt hardcoded
- **Datum:** 2026-03-28
- **Entschieden von:** User + Agent
- **Begründung:** Das Personen-Limit pro Watcher (`watchers.max_persons`, Default 2) wird in der DB gespeichert statt im Frontend hardcoded. Damit kann es pro Watcher individuell gesetzt werden — z.B. für eine spätere Pro-Version, wo mehr überwachte Personen als kostenpflichtiges Feature verkauft werden. Free bleibt bei 2, Pro kann höhere Limits bekommen ohne Code-Änderung.
- **Alternativen verworfen:** Hardcoded-Konstante im Frontend — nicht upgrade-fähig; serverseitiger Config-Wert — nicht pro-Watcher granular genug.
- **Konsequenz:** `POST /api/watcher/:id/persons`-Limit-Check liest `max_persons` aus DB. Frontend rendert den Limit-Text dynamisch aus dem API-Response. Migration: `004_watcher_max_persons.sql`.

### Watcher-Ownership direkt via `watcher_devices` statt `device_keys.watcher_id`
- **Datum:** 2026-03-28
- **Entschieden von:** Agent (Codex)
- **Begründung:** Ownership-Check auf Watcher-Endpoints läuft über `SELECT 1 FROM watcher_devices WHERE watcher_id = ? AND device_id = ?` — keine zusätzliche Spalte in `device_keys` nötig. `watcher_devices` ist bereits vorhanden und enthält die Gerät-Watcher-Zuordnung.
- **Alternativen verworfen:** `device_keys.watcher_id`-Spalte (ursprünglich geplant in Phase 1) — unnötige DB-Migration, da `watcher_devices` denselben Check ermöglicht.
- **Konsequenz:** Phase 1 DB-Migration (nur `watcher_id`-Spalte in `device_keys`) entfällt. `POST /api/watcher` setzt noch kein `watcher_id` in `device_keys` — vorerst kein Blocker, da Ownership über `watcher_devices` läuft.

### API-Key statt ECDSA Public/Private Key für Device-Auth
- **Datum:** 2026-03-28 (bestätigt nach erneuter Prüfung)
- **Entschieden von:** User + Claude (gemeinsam)
- **Begründung:** App hat keine User-Accounts, nur anonyme Geräte-Registrierung. ECDSA wurde im Masterplan eingeplant, aber nach Analyse als Overkill bewertet. Die echten Sicherheitslücken (IDOR, fehlende Autorisierung) sind Autorisierungsprobleme, keine Authentifizierungsprobleme — und müssen bei ECDSA genauso gebaut werden. API-Key (SHA-256-gehasht, HttpOnly-Cookie + Bearer) mit Ownership-Prüfung reicht vollständig. ECDSA würde ~500+ Zeilen neuen Code erfordern (Frontend Crypto, IndexedDB, signedFetch) ohne echten Sicherheitsgewinn für den Use-Case "Heartbeat alle paar Stunden".
- **Alternativen verworfen:** ECDSA P-256 Keypairs pro Gerät — eleganter, aber unnötige Komplexität für das Bedrohungsmodell. Replay-Schutz, Zero-Knowledge-Server etc. sind für "Oma drückt grünen Knopf" nicht relevant.
- **Konsequenz:** Masterplan Phasen 1-13 wurden vereinfacht. Kein neues DB-Schema fuer ECDSA/signed Requests, kein Frontend-Crypto, kein signedFetch. Fachliche Schema-Aenderungen fuer Pairing und Ownership bleiben weiterhin moeglich und sind separat zu bewerten. Stattdessen: bestehende Auth-Middleware fixen (Ownership-Pruefung), Heartbeat authentifizieren, CORS einschraenken.

### Capacitor für Native-App-Deployment
- **Datum:** 2026-03-28
- **Entschieden von:** User
- **Begründung:** Web-UI wird als Capacitor-App verpackt. Ermöglicht eine Codebasis für Web + iOS + Android, passt zum bestehenden Web-Stack (Hono/TypeScript).
- **Alternativen verworfen:** React Native, Flutter, Expo — separater Tech-Stack, mehr Aufwand

### D1 jetzt, Postgres erst bei Pro-Tier
- **Datum:** vor 2026-03-27 (aus Masterplan übernommen)
- **Entschieden von:** gemeinsam
- **Begründung:** App ist nicht produktiv, D1 reicht für anonymen Core. Postgres (Neon) wird erst eingeführt wenn Pro-Features mit User-Accounts kommen.
- **Alternativen verworfen:** Sofort Postgres — unnötige Komplexität für aktuellen Stand

### Multi-Agent-System für Entwicklung
- **Datum:** 2026-03-27
- **Entschieden von:** User
- **Begründung:** Verschiedene LLMs (Claude, Gemini, Codex etc.) arbeiten gemeinsam am Projekt, jedes bringt seine Stärken ein. Shared State über `docs/`-Dateien.
- **Alternativen verworfen:** Einzelnes LLM — limitiert auf Stärken eines Modells

### Breaking Changes erlaubt
- **Datum:** vor 2026-03-27 (aus Projektstatus)
- **Entschieden von:** User
- **Begründung:** App ist nicht produktiv, nur Testversion. Kein Legacy-Support nötig, alter Code kann direkt ersetzt werden.
- **Alternativen verworfen:** Migrations-Pfade — unnötiger Aufwand
