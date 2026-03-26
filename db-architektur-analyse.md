# iBinda – Datenbankarchitektur-Analyse

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

### Option C: Beide (wie im Konzept)

Nur sinnvoll wenn ihr **tausende Geräte** habt und die Edge-Latenz für Heartbeats wirklich braucht. Für die Planungsphase jetzt: Nein.

---

## Klare Empfehlung: Option B — ein Postgres

Warum:

1. **Heartbeats brauchen keine Edge-Performance.** Ein Gerät sendet alle 5-30 Minuten einen Ping. Ob der 5ms oder 40ms dauert, ist egal.

2. **Kein Sync = keine Sync-Bugs.** Das allein spart Wochen an Entwicklungszeit und dauerhaften Wartungsaufwand.

3. **Pro-Features werden trivial.** RLS, Rollen, Audit-Logs, komplexe Queries — alles nativ.

4. **Migration von D1 ist einfach.** Euer Schema ist klein und sauber, das ist ein Nachmittag Arbeit.

5. **Cloudflare Worker bleibt.** Nur die DB-Anbindung ändert sich — Neon hat einen Serverless HTTP-Driver, der perfekt mit Workers funktioniert.

---

## Architektur-Diagramm

```
+-------------------------+
|   Cloudflare Worker     |   <- bleibt wie bisher (Hono, Cron, Push)
|   (Hono API + HTML)     |
+-----------+-------------+
            |
            | HTTP (neon serverless driver)
            v
+-------------------------+
|   Neon Postgres         |   <- Frankfurt Region
|   (alles in einer DB)   |
|                         |
|   - heartbeats          |
|   - devices             |
|   - persons/watchers    |
|   - organizations       |   <- Pro
|   - users/roles         |   <- Pro
|   - audit_logs          |   <- Pro
|   - alert_rules         |   <- Pro
+-------------------------+
```

**D1 könnt ihr später immer noch als Edge-Cache davorschalten**, falls ihr wirklich an Performance-Grenzen stosst. Aber das ist Optimierung, nicht Architektur.

---

## Empfohlene Umsetzungsreihenfolge

1. Security-Fixes im Core (Pflicht vor allem anderen)
2. Code aufteilen (Routen/Templates) — Wartbarkeit schaffen
3. Auth-System implementieren (AUTH_PLAN.md umsetzen)
4. DB-Entscheidung treffen: Supabase vs. Neon vs. self-hosted
5. Dann erst Pro-Dashboard MVP Phase 1

---

*Erstellt am 26.03.2026 — iBinda Architektur-Review*
