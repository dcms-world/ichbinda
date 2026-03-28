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
