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

## API-Responses

- Erfolg: `{ data: ... }`
- Fehler: `{ error: "Beschreibung", status: 4xx/5xx }`
- Immer JSON, kein Plain-Text
