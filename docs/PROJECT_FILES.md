# iBinda — Projektdateien Übersicht

Dieses Dokument beschreibt alle relevanten Dateien im Projekt.
Lies die Dateien, die für deine aktuelle Aufgabe relevant sind — nicht alle auf einmal.

---

## Dokumentation (`docs/`)

| Datei | Wann lesen | Inhalt |
|---|---|---|
| `docs/MASTERPLAN.md` | Immer zuerst | Zielarchitektur, technische Phasen, Verifikation |
| `docs/SPECS.md` | Bei Produkt-/UX-Fragen | Produktbild, Nutzerbild, MVP-Scope |
| `docs/AUTH_PLAN.md` | Bei Auth-Fragen | Dokument-Zuständigkeit und Auth-Leitplanken |
| `docs/SECURITY_AUDIT.md` | Bei Sicherheitsrelevanz | Bekannte Schwachstellen und deren Status |
| `docs/PRICING_AND_EDITIONS.md` | Bei Feature-Entscheidungen (Free vs. Pro) | Editionen, Feature-Grenzen, Upgrade-Logik |
| `docs/PRO_VERSION.md` | Bei Pro-Feature-Entwicklung | Detaillierte Pro-Anforderungen: Dashboard, Datenmodell, DSGVO |
| `docs/DB_ARCHITEKTUR.md` | Bei DB-Fragen | Archivierte Entscheidungsanalyse zur Hybrid-Architektur |
| `docs/TODOS.md` | Vor jeder Aufgabe | Aktuelle Arbeitspakete und Fortschritt |
| `docs/DECISIONS.md` | Bei Architektur-/Design-Fragen | Getroffene Entscheidungen mit Begründung |
| `docs/CONVENTIONS.md` | Bei Code-Arbeit | Code-Stil, Namenskonventionen, Commit-Format |
| `docs/REBUILD_PROMPT.md` | Zum Nachbauen der App | Vollständiger aktueller Projektstand als Prompt |

---

## Root-Dateien

| Datei | Wann lesen | Inhalt |
|---|---|---|
| `README.md` | Bei Setup, lokalem Start oder API-Quickcheck | Einstieg, Quickstart, aktuelle Basis-Routen |
| `AGENTS.md` | Für Codex-Kontext | Rollenverständnis und Pflichtlektüre |
| `CLAUDE.md` | Für Claude-Kontext | Rollenverständnis und Pflichtlektüre |
| `GEMINI.md` | Für Gemini-Kontext | Rollenverständnis und Pflichtlektüre |

---

## Code

| Datei | Wann lesen | Inhalt |
|---|---|---|
| `src/index.ts` | Bei jeder Code-Aufgabe | Worker-Einstieg: Frontend-Routen, API-Registrierung, Cron-Export |
| `src/app/api.ts` | Bei Backend-/API-Aufgaben | Registriert API-Middleware und alle `/api/*`-Routen |
| `src/frontend/*.ts` | Bei Frontend-Web-UI-Aufgaben | HTML-Templates und Inline-Skripte für Landing-, Person- und Watcher-Ansicht |
| `src/app/helpers/*.ts` | Bei Auth-, DB-, Security- oder Validierungs-Aufgaben | Herausgezogene Backend-Helfer für Auth, D1, CORS/Security und Parsing |
| `src/app/types.ts` | Bei Backend-Refactors | Gemeinsame Worker-/D1-Typen für Backend-Module |
| `src/app/constants.ts` | Bei Security-/Validierungs-Änderungen | Kanonische Backend-Konstanten für Limits, CORS, Pairing und Turnstile |
| `schema.sql` | Bei DB-Änderungen | Aktuelles D1-Datenbankschema |
| `wrangler.toml` | Bei Deployment/Config | Cloudflare Workers Konfiguration und D1-Binding |

---

## Wichtige Fakten

- App ist **nicht produktiv** — Breaking Changes sind OK, kein Legacy-Support
- Stack: **Cloudflare Workers + TypeScript + Hono + D1**
- Kein Node.js-only Code — alles muss im Workers-Runtime laufen
- DB-Strategie: D1 für anonymen Core jetzt, Postgres (Neon) erst wenn Pro-Tier kommt

---

## Arbeitsweise für Agenten (Multi-Agent-System)

Dieses Projekt ist als **Multi-Agent-System** konzipiert — verschiedene LLMs arbeiten gemeinsam, jedes bringt seine Stärken ein. Damit alle Agenten auf demselben Stand sind, gelten folgende Regeln:

### Haltung

Jeder Agent soll wie ein **guter Mitarbeiter** agieren:
- **Mitdenken:** Nicht nur stumpf Aufgaben abarbeiten, sondern aktiv Verbesserungen vorschlagen wenn etwas auffällt
- **Kritisch sein:** Wenn etwas nicht in Ordnung ist (Architektur, Sicherheit, Performance, UX), das ansprechen — auch wenn nicht danach gefragt wurde
- **Kreativ sein:** Eigene Ideen einbringen, alternative Ansätze vorschlagen, über den Tellerrand denken
- **Entscheidungen respektieren, aber nicht blind:** `docs/DECISIONS.md` lesen, aber bei guten neuen Argumenten darf und soll eine Entscheidung hinterfragt werden

### Einstieg für jeden Agenten

1. Diese Datei lesen (`docs/PROJECT_FILES.md`)
2. `docs/MASTERPLAN.md` lesen — was ist die aktuelle Zielarchitektur und Reihenfolge?
3. `docs/TODOS.md` lesen — was ist offen, was ist in Arbeit?
4. `docs/DECISIONS.md` lesen — was wurde bereits entschieden?
5. `docs/CONVENTIONS.md` lesen — wie wird Code geschrieben?
6. Dann die für die Aufgabe relevanten Dateien aus der Tabelle oben

### Informationen persistent halten

- **Vor dem Erstellen einer neuen Datei immer prüfen**, ob es bereits eine passende Datei gibt, in die der Inhalt hineinpasst.
- Neue Erkenntnisse, Entscheidungen, Analysen → in die thematisch passende Datei unter `docs/` schreiben.
- Gibt es keine passende Datei → neue Datei unter `docs/` anlegen und hier in `PROJECT_FILES.md` eintragen.
- **Entscheidungen** immer in `docs/DECISIONS.md` dokumentieren — nicht nur im Chat treffen und vergessen.
- Dokumentationsregeln inkl. **Single Source of Truth** stehen in `docs/CONVENTIONS.md` und gelten immer.

### TODOs & Aufgaben

Alle TODOs werden in **`docs/TODOS.md`** verwaltet.

Format pro Eintrag:

```markdown
## [Titel]
- **Status:** offen | in Bearbeitung | erledigt
- **Priorität:** hoch | mittel | niedrig
- **Beschreibung:** Was genau zu tun ist
- **Fortschritt:** (wird laufend ergänzt — kurze Notizen was gemacht wurde)
- **Erledigt am:** (Datum, wenn abgehakt)
```

Regeln:
- Neues TODO → zuerst prüfen ob ein ähnliches TODO bereits existiert, sonst neu anlegen
- Wenn etwas erledigt wurde → Status auf `erledigt` setzen, kurze Notiz unter Fortschritt, Datum eintragen
- Erledigte TODOs **nicht löschen** — sie dienen als Protokoll

### Agent-Handoff

Wenn ein Agent eine Aufgabe **nicht fertigstellen kann** (Kontext-Limit, Unsicherheit, andere Blockade):

1. Aktuellen Stand in `docs/TODOS.md` unter Fortschritt dokumentieren
2. Klar beschreiben: **was ist fertig, was fehlt noch, wo sind offene Fragen**
3. Wenn Code halb-fertig ist: commiten mit `wip:` Prefix oder zumindest den Stand beschreiben
4. Der nächste Agent liest `TODOS.md` und kann nahtlos übernehmen
