# iBinda — Projektdateien Übersicht

Dieses Dokument beschreibt alle relevanten Dateien im Projekt.
Lies die Dateien, die für deine aktuelle Aufgabe relevant sind — nicht alle auf einmal.

---

## Dokumentation (`docs/`)

| Datei | Wann lesen | Inhalt |
|---|---|---|
| `docs/MASTERPLAN.md` | Immer zuerst | Architektur-Entscheidungen, DB-Strategie, Produkt-Roadmap |
| `docs/SPECS.md` | Bei API- oder Feature-Arbeit | Technische Spezifikationen, API-Endpunkte, Datenstrukturen |
| `docs/AUTH_PLAN.md` | Bei Auth, Sicherheit, Device Keys | Auth-Flow, Device Key Konzept, offene Auth-Tasks |
| `docs/SECURITY_AUDIT.md` | Bei Sicherheitsrelevanz | Bekannte Schwachstellen, Status der Fixes |
| `docs/PRICING_AND_EDITIONS.md` | Bei Feature-Entscheidungen (Free vs. Pro) | Welche Features in welchem Tier, Preismodell |
| `docs/PRO_VERSION.md` | Bei Pro-Feature-Entwicklung | Pro-Version Konzept, Organisations-Features, Dashboard |
| `docs/DB_ARCHITEKTUR.md` | Bei DB-Fragen | Entscheidungsgrundlage für D1 + Postgres Hybrid |
| `docs/TODOS.md` | Vor jeder Aufgabe | Aktuelle TODOs, offene Tasks, Fortschritt |
| `docs/DECISIONS.md` | Bei Architektur-/Design-Fragen | Getroffene Entscheidungen mit Begründung |
| `docs/CONVENTIONS.md` | Bei Code-Arbeit | Code-Stil, Namenskonventionen, Commit-Format |

---

## Code

| Datei | Wann lesen | Inhalt |
|---|---|---|
| `src/index.ts` | Bei jeder Code-Aufgabe | Hauptdatei: alle Routen, Middleware, Business-Logik |
| `schema.sql` | Bei DB-Änderungen | Aktuelles D1-Datenbankschema |
| `wrangler.toml` | Bei Deployment/Config | Cloudflare Workers Konfiguration, Bindings (D1, KV) |

---

## Wichtige Fakten

- App ist **nicht produktiv** — Breaking Changes sind OK, kein Legacy-Support
- Stack: **Cloudflare Workers + TypeScript + Hono + D1 + KV**
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
2. `docs/TODOS.md` lesen — was ist offen, was ist in Arbeit?
3. `docs/DECISIONS.md` lesen — was wurde bereits entschieden?
4. `docs/CONVENTIONS.md` lesen — wie wird Code geschrieben?
5. Dann die für die Aufgabe relevanten Dateien aus der Tabelle oben

### Informationen persistent halten

- **Vor dem Erstellen einer neuen Datei immer prüfen**, ob es bereits eine passende Datei gibt, in die der Inhalt hineinpasst.
- Neue Erkenntnisse, Entscheidungen, Analysen → in die thematisch passende Datei unter `docs/` schreiben.
- Gibt es keine passende Datei → neue Datei unter `docs/` anlegen und hier in `PROJECT_FILES.md` eintragen.
- **Entscheidungen** immer in `docs/DECISIONS.md` dokumentieren — nicht nur im Chat treffen und vergessen.

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
