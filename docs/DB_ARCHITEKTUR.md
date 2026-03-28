# iBinda – Datenbankarchitektur-Analyse

Erstellt: 2026-03-26
Aktualisiert: 2026-03-28
Status: archivierte Entscheidungsanalyse

Dieses Dokument enthält die **Variantenanalyse**, die zur DB-Entscheidung geführt hat.
Die bindende Entscheidung steht in `docs/DECISIONS.md`.
Die aktuelle technische Zielarchitektur steht in `docs/MASTERPLAN.md`.

Neue operative Architekturdetails werden **nicht** hier gepflegt.

---

## Das Kernproblem mit 2 DBs

Der Sync zwischen D1 und Postgres ist **der teuerste Teil** der ganzen Pro-Architektur. Was im Konzept als "Event-driven Sync" steht, bedeutet konkret:

- Cloudflare Queues oder eigener Webhook-Mechanismus
- Idempotenz-Logik (was passiert bei doppelter Zustellung?)
- Fehlerbehandlung + Dead-Letter-Queue
- Lag-Monitoring (Dashboard zeigt veralteten Status)
- Zwei Schemas synchron halten bei Änderungen
- Debugging über zwei Systeme hinweg

Für ein kleines Team ist das ein enormer Overhead — und eine dauerhafte Fehlerquelle.

---

## Die drei Optionen

### Option A: Nur D1 (alles auf Cloudflare)

| Aspekt | Bewertung |
|--------|-----------|
| Heartbeats | Perfekt, edge-nah, schnell |
| Multi-Tenancy | Machbar, aber manuell (kein nativer RLS) |
| Rollen/Auth | Geht, aber alles selbst bauen |
| Komplexe Queries | SQLite-Limitierungen (kein JSONB, keine Window Functions in älteren Versionen) |
| DSGVO | Cloudflare hat EU-Datenresidenz, AVV vorhanden |
| Kosten | Sehr günstig |
| Skalierung | 10 GB Limit pro DB, max 25k Writes/s |

**Fazit:** Reicht für MVP und moderate Nutzerzahlen. Wird eng, wenn ihr komplexes Reporting oder viele Mandanten braucht.

### Option B: Nur Postgres (z.B. Neon Serverless)

| Aspekt | Bewertung |
|--------|-----------|
| Heartbeats | Funktioniert via HTTP-Driver aus dem Worker heraus |
| Multi-Tenancy | Native RLS, bewährt |
| Rollen/Auth | Postgres + RLS = Industriestandard |
| Komplexe Queries | Volle SQL-Power |
| DSGVO | EU-Region wählbar (Neon: Frankfurt) |
| Kosten | Free Tier reicht für MVP, danach ca. 19+ USD/Monat |
| Skalierung | Praktisch unbegrenzt |

**Fazit:** Ein System, kein Sync, volle Power. Die Heartbeat-Latenz ist minimal höher (~20-50ms statt ~5ms), aber für einen Heartbeat alle paar Minuten völlig irrelevant.

### Option C: Hybrid ohne Vollsync (wie im Konzept)

Als sofort voll ausgebautes Zwei-DB-System waere das fuer die Free-Phase zu schwergewichtig. Als gestufte Zielarchitektur ist es jedoch sinnvoll: D1 bleibt der anonyme operative Core, Postgres kommt erst mit Pro dazu, ohne Vollsync.

---

## Ergebnis

Entschieden wurde **Option C (Hybrid ohne Sync)** - aber explizit als gestufte Architektur. D1 bleibt zunaechst alleiniger operativer Core; Postgres kommt erst mit Pro dazu, ohne Sync dazwischen.

Begründung und technische Zielarchitektur: `docs/MASTERPLAN.md` Abschnitt "Datenbank-Architektur".
