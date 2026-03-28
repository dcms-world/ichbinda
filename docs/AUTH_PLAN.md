# Auth-Plan – iBinda

Erstellt: 2026-03-22
Aktualisiert: 2026-03-28
Status: konsolidiert

Dieses Dokument ist bewusst **kein zweiter Implementierungsplan** mehr.

---

## Zuständigkeit

- `docs/DECISIONS.md` enthält die bindende Auth-Entscheidung
- `docs/SECURITY_AUDIT.md` enthält offene Auth-/Security-Befunde
- `docs/MASTERPLAN.md` enthält die technische Umsetzung, Phasen und Verifikation
- `docs/TODOS.md` enthält den aktuellen Arbeitsstand

---

## Auth-Leitplanken

- Device-Auth bleibt API-Key-basiert mit SHA-256-Hash in D1
- Authentifizierung identifiziert das Gerät; Autorisierung prüft Ownership auf jedem betroffenen Endpoint
- `device_keys.watcher_id` ist die aktuelle einfache Zuordnung, bis ein echtes Watcher-Multi-Device-Konzept entschieden ist
- ECDSA, Client-Crypto und signierte Requests sind für Free verworfen

---

## Pflegehinweis

Neue Informationen nur dann hier ergänzen, wenn sie **auth-spezifisch** sind und weder besser in `DECISIONS`, `SECURITY_AUDIT`, `MASTERPLAN` noch `TODOS` passen.
