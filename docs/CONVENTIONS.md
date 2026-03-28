# iBinda — Code- & Projekt-Konventionen

Damit alle Agenten einheitlich arbeiten.

---

## Sprache

- **Code:** Englisch (Variablen, Funktionen, Typen, API-Endpunkte)
- **Kommentare im Code:** Englisch
- **Dokumentation in `docs/`:** Deutsch
- **Commit-Messages:** Deutsch, mit englischem Typ-Prefix

## Commit-Messages

Format: `typ: Kurzbeschreibung`

Typen:
- `feat:` — Neues Feature
- `fix:` — Bugfix
- `docs:` — Nur Dokumentation
- `refactor:` — Code-Umbau ohne Funktionsänderung
- `chore:` — Tooling, Config, Dependencies

Keine Co-Authored-By oder Modell-Hinweise in der Git-History.

## Code-Stil

- TypeScript strict
- Hono-Framework-Patterns verwenden
- Kein Node.js-only Code — alles muss im Cloudflare Workers Runtime laufen
- Error-Responses als JSON: `{ error: string, status: number }`
- Keine unnötigen Abstraktionen — einfach halten

## Dateinamen in `docs/`

- **UPPERCASE_MIT_UNDERSCORES.md** (z.B. `AUTH_PLAN.md`, `PRO_VERSION.md`)
- Kurz und beschreibend
- Neue Dateien immer in `PROJECT_FILES.md` eintragen

## Dokumentation

- **Single Source of Truth:** Jede Information wird genau in **einer** Doku-Datei gepflegt
- Vor neuen Doku-Änderungen immer prüfen, ob der Inhalt bereits in einer anderen Datei vorhanden ist
- Wenn es bereits eine kanonische Stelle gibt: dort aktualisieren und an anderen Stellen nur kurz verweisen
- Keine zweite Aufgabenliste, keine zweite Roadmap, keine zweite Architektur- oder Security-Zusammenfassung anlegen
- Wenn eine Datei nur noch Kontext liefert, das explizit dazuschreiben statt operative Inhalte zu spiegeln

### Zuordnung: Welche Info gehört wohin?

| Thema | Kanonische Datei | Andere Dateien dürfen nur... |
|---|---|---|
| Technische Phasen, Code-Snippets, Architektur | `MASTERPLAN.md` | kurz verweisen |
| DB-Varianten-Analyse (A/B/C) | `DB_ARCHITEKTUR.md` | kurz verweisen |
| Security-Befunde, Fortschritt, Statistik | `SECURITY_AUDIT.md` | Nummern referenzieren (z.B. "Security #3") |
| Getroffene Entscheidungen + Begründung | `DECISIONS.md` | Ergebnis nennen + verweisen |
| Free vs Pro Produktgrenzen, Preismodell | `PRICING_AND_EDITIONS.md` | kurz verweisen |
| Pro-Anforderungen, DSGVO, Dashboard-Module | `PRO_VERSION.md` | kurz verweisen |
| Arbeits-Backlog, Fortschritt, Checkboxen | `TODOS.md` | nicht duplizieren |
| Code-Konventionen, Doku-Regeln | `CONVENTIONS.md` | nicht duplizieren |

**Wichtig:** Wenn du eine Information in einer Datei findest und sie auch in einer anderen steht — lösche das Duplikat und setze einen Verweis. Nicht beides pflegen.

## API-Responses

- Erfolg: `{ data: ... }`
- Fehler: `{ error: "Beschreibung", status: 4xx/5xx }`
- Immer JSON, kein Plain-Text
