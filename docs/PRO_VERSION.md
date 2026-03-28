# iBinda Pro Version – Anforderungen

Erstellt: 2026-03-26
Aktualisiert: 2026-03-28
Status: konzeptionell

Dieses Dokument beschreibt die **detaillierten Anforderungen der Pro-Version**.
Die übergreifende Architekturentscheidung selbst lebt in `docs/MASTERPLAN.md`.

---

## Ziel

Ein Institutions-Dashboard für iBinda, mit dem Einrichtungen Personen, Geräte, Alarmregeln und Eskalationen zentral verwalten können.

---

## Funktionsmodule

### Login und Mandantenbereich
- Institutions-Login
- Rollen wie Org-Owner, Care-Manager, Watcher, Read-Only

### Personenverwaltung
- Stammdaten je Person
- Kontakte (Angehörige, Notfallkontakt, Arzt)
- sensible Zusatzinfos mit restriktiver Sichtbarkeit

### Device-Management
- Gerätezuordnung je Person
- letzter Kontakt und Status
- Gerätewechsel und Historie

### Monitoring-Zentrale
- Gesamtübersicht mit Status (OK/Warnung/Alarm)
- Verlauf letzter Aktivität
- Filter nach Team, Bereich oder Institution

### Eskalations- und Benachrichtigungsregeln
- Regeln pro Person oder per Template
- zeitbasierte Eskalationen
- mehrere Benachrichtigungskanäle (Push, E-Mail, SMS, ggf. Anruf)
- Quittierung von Alarmen ("Alarm übernommen")

### Audit und Reporting
- Nachvollziehbarkeit von Einsicht, Änderung und Export
- Reports für Organisation und Qualitätssicherung

---

## Datenmodell Pro

- `organizations`
- `users`
- `user_org_roles`
- `person_profiles`
- `person_contacts`
- `devices`
- `person_device_links`
- `alert_rules`
- `notification_policies`
- `alert_events`
- `audit_logs`

---

## DSGVO-Anforderungen

### Datenschutz by Design & by Default
- Datenminimierung strikt umsetzen
- klare Zweckbindung pro Datenfeld
- standardmäßig restriktive Sichtbarkeit

### Mandantentrennung
- technische Trennung per Tenant-ID + Row-Level Security
- keine tenant-übergreifenden Queries

### Zugriffsschutz
- rollenbasiertes Berechtigungssystem (Need-to-know)
- MFA für Institutions-Accounts
- Session-Timeouts, IP-/Rate-Limits

### Verschlüsselung
- Transportverschlüsselung (TLS)
- Verschlüsselung at-rest
- zusätzliche Feldverschlüsselung für besonders sensible Daten (Geburtsdatum, Adresse)

### Protokollierung & Nachvollziehbarkeit
- Audit-Logs für Lesen/Ändern/Exportieren personenbezogener Daten
- manipulationsarme Speicherung + definierte Aufbewahrung

### Betroffenenrechte
- Auskunft (Export)
- Berichtigung
- Löschung
- Einschränkung der Verarbeitung
- klare interne Bearbeitungsprozesse

### Lösch- & Aufbewahrungskonzept
- Heartbeat-Rohdaten mit klarer Retention
- Stammdaten nur solange erforderlich
- Backup-/Restore-Prozess mit DSGVO-konformer Löschstrategie
- Crypto-Shredding für Fotos (Key vernichten → Daten unwiederbringlich weg)

### Auftragsverarbeitung & Region
- AVV/DPA mit allen Auftragsverarbeitern (Cloudflare, Neon)
- bevorzugte Verarbeitung in EU/EWR
- Drittlandtransfers nur mit geeigneten Garantien (z.B. SCC)

### Risikoanalyse / DSFA
- bei Gesundheits-/Pflegekontext frühzeitig DSFA einplanen
- TOMs dokumentieren
- **Empfehlung:** Frühzeitig Datenschutzberater einbinden bevor Pro live geht

---

## Pro-MVP

### Phase 1
- Institutions-Login und Rollenmodell
- Personenstammdaten und Device-Zuordnung
- Monitoring-Übersicht
- erste Eskalationslogik
- Audit-Log Basis

### Phase 2
- Schichtplanung
- komplexere Eskalationsketten
- Exporte und Reporting
- Integrationen

---

## Offene Entscheidungen

- Dashboard-Framework (Next.js? Remix? SvelteKit?)
- finale Benachrichtigungskanäle (Push + E-Mail + SMS + Telefonie?)
- Retention-Fristen pro Datentyp
- Umfang medizinischer Zusatzdaten im MVP
- genauer DSFA-Startzeitpunkt
- Onboarding-Flow für Institutionen
- Upgrade-Flow Free → Pro (Person in Org überführen)

---

## Dokumentgrenzen

Editionen und Preislogik: `docs/PRICING_AND_EDITIONS.md`
Technische Zielarchitektur: `docs/MASTERPLAN.md`
Bindende Entscheidungen: `docs/DECISIONS.md`
