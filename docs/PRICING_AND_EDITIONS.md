# iBinda – Editions- und Preismodell

Erstellt: 2026-03-26
Aktualisiert: 2026-03-30
Status: Entwurf

Dieses Dokument beschreibt nur die **Produktgrenzen zwischen Free und Pro**.

---

## Zielbild

iBinda wird als zweistufiges Produkt geführt:
- **iBinda Free:** privat, kostenlos, einfacher Use-Case
- **iBinda Pro:** institutionell, kostenpflichtig, Team- und Dashboard-Funktionen

---

## iBinda Free

**Zielgruppe:** private Nutzung  
**Preis:** kostenlos

**Rahmen:**
- pro Watcher maximal 2 beobachtete Personen (`watchers.max_persons = 2`)
- pro Person standardmäßig maximal 1 aktives eigenes Gerät (`persons.max_devices = 1`)
- eine Person kann von mehreren Watchern beobachtet werden
- nur Basisfunktionen

**Basisfunktionen:**
- Heartbeat-Status
- einfache Alarm-Logik
- minimale Konfiguration
- einfaches Pairing

---

## iBinda Pro

**Zielgruppe:** Institutionen  
**Preis:** kostenpflichtig

**Merkmale:**
- höheres Personen-Limit pro Watcher (`max_persons > 2`, per DB-Feld konfigurierbar)
- optional höheres Geräte-Limit pro Person (`max_devices > 1`, per DB-Feld konfigurierbar)
- mehrere Watcher und Teamstrukturen
- eigenes Dashboard mit Login
- Rollen und Berechtigungen
- personenbezogene Stammdaten im institutionellen Kontext

---

## Upgrade-Logik Free → Pro

1. Privatnutzer startet in Free.
2. Bei Team-, Organisations- oder erweiterten Prozessanforderungen erfolgt Upgrade auf Pro.
3. Pro aktiviert Dashboard, Rollen, Organisationsstruktur und erweiterte Daten-/Prozessfunktionen.

---

## Offene Produktentscheidungen

- konkrete Preisstruktur Pro
- exakte Feature-Grenze Free vs. Pro
- Onboarding-Flow für Institutionen
- Vertrags-/Abrechnungsmodell
- rechtliche Texte

---

## Dokumentgrenzen

Technische Zielarchitektur: `docs/MASTERPLAN.md`
Detaillierte Pro-Anforderungen: `docs/PRO_VERSION.md`
Bindende Entscheidungen: `docs/DECISIONS.md`
