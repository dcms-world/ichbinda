# iBinda – Editions- und Preismodell (Free + Pro)

Erstellt: 2026-03-26  
Status: Entwurf (für Produkt- und Architekturabgleich)

---

## 1) Zielbild

iBinda wird als **zweistufiges Produktmodell** definiert:

1. **iBinda Free (Privat)**  
   Kostenlos für den privaten Einsatz mit **1 Person + 1 Watcher** und **Basic-Funktionen**.

2. **iBinda Pro (Institution)**  
   Kostenpflichtige B2B-Version für Institutionen mit **mehreren betreuten Personen**, **erweiterten Watcher-/Team-Funktionen** sowie **eigenem Dashboard mit Login und separater Datenhaltung**.

Dieses Modell ermöglicht:
- niedrige Einstiegshürde im Privatbereich
- klare Upgrade-Logik für professionelle Nutzung
- saubere Trennung von Basic-Use-Case und institutionellen Anforderungen

---

## 2) Editionen im Überblick

## iBinda Free (Privat)

**Zielgruppe:** Einzelhaushalte / private Nutzung  
**Preis:** Kostenlos

**Rahmenbedingungen (hart):**
- maximal **1 beobachtete Person**
- **unbegrenzt Watcher** (Familie/Angehörige können sich frei verbinden)
- nur **Basic-Funktionen**

**Basic-Funktionen (MVP-orientiert):**
- Heartbeat-Status für eine Person
- einfacher Online/Offline-Status
- grundlegende Alarm-Logik
- minimale Konfiguration

**Nicht enthalten:**
- Multi-User-Teams
- Rollen-/Rechteverwaltung
- Institutions-Dashboard
- erweiterte Eskalationsketten
- umfangreiche Reporting-/Audit-Funktionen

---

## iBinda Pro (Institution)

**Zielgruppe:** Pflege-/Betreuungseinrichtungen, Organisationen  
**Preis:** Kostenpflichtig (B2B, abrechnende Einheit = Institution)

**Kernmerkmale:**
- Betreuung von **mehreren Personen**
- **mehrere Watcher / Teamstrukturen**
- **eigenes Dashboard** mit Login
- **Rollen und Berechtigungen**
- Speicherung von **personenbezogenen Stammdaten** (im institutionellen Kontext)

**Pro-Funktionen (laut Zielarchitektur):**
- Mandantenfähigkeit (Organization/Tenant)
- Nutzerverwaltung (z. B. Org-Owner, Care-Manager, Watcher, Read-Only)
- erweiterte Eskalations- und Benachrichtigungsregeln
- Monitoring-Zentrale über mehrere Personen/Geräte
- Audit-Logs / Reporting
- perspektivisch Schichtlogik, Exporte, API-Integrationen

---

## 3) Daten- und Systemtrennung (wichtig)

Zur Vermeidung von Vermischung wird eine **klare Systemgrenze** definiert:

- **Runtime/Core (Cloudflare Workers + D1):**
  - Heartbeat-Ereignisse
  - Device-Liveness
  - operative Alarm-Events

- **Pro-Dashboard-DB (Postgres/Supabase o. ä.):**
  - Institutionen (Mandanten)
  - User/Rollen/Rechte
  - personenbezogene Stammdaten
  - Zuordnungen, Regeln, Audit-Informationen

Prinzip:
- **Single Source of Truth pro Domäne**
- keine unnötige Doppelhaltung identischer Daten
- Event-basierte Synchronisation statt unklarer Querabhängigkeiten

---

## 4) Auth- und Security-Einordnung

Die bereits geplante API-Auth (Dev-Token / Bearer API-Key) bleibt für den API-Zugriff relevant.  
Für Pro-Funktionen kommen zusätzlich Login-/Rollen-Mechanismen im Dashboard-Kontext hinzu.

Wichtig:
- API-Zugriffsschutz und Institutions-Login sind **ergänzende Schichten**, kein Widerspruch.
- Sensitive Daten nur dort speichern, wo sie fachlich notwendig sind.

---

## 5) Upgrade-Logik Free → Pro

Empfohlener Produktfluss:

1. Privatnutzer startet in Free (1 beobachtete Person, unbegrenzt Watcher, Basic).
2. Bei Bedarf an Team-/Institutionsfunktionen erfolgt Upgrade auf Pro.
3. Pro-Setup erstellt Institution, Nutzerkonten, Rollen und Dashboard-Zugänge.
4. Erweiterte Daten- und Prozessfunktionen werden erst in Pro aktiviert.

---

## 6) Offene Produktentscheidungen

- Konkrete Preisstruktur Pro (pro Einrichtung / pro Person / hybrid)
- exakte Feature-Grenze Free vs Pro (was bleibt dauerhaft free?)
- Onboarding-Flow für Institutionen
- Vertrags-/Abrechnungsmodell (monatlich/jährlich)
- rechtliche Texte (AVV, Datenschutz, Nutzungsbedingungen)

---

## 7) Kurzfazit

iBinda sollte offiziell als **Free + Pro** positioniert werden:
- **Free:** kostenlos, privat, 1 beobachtete Person + unbegrenzt Watcher, Basic only
- **Pro:** kostenpflichtig, institutionell, Dashboard + Login + erweiterte Team-/Datenfunktionen

Damit ist die Produktlinie verständlich, technisch umsetzbar und wirtschaftlich skalierbar.
