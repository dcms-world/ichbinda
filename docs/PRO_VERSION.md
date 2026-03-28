# iBinda Pro Version – Architektur- & DSGVO-Konzept

## Ziel
Ein professionelles Institutions-Dashboard für iBinda, in dem Einrichtungen zentral alle relevanten Daten der überwachten Personen, Geräte, Alarmregeln und Eskalationsketten verwalten können – mit klarer DSGVO-Konformität.

---

## 1) Architekturvorschlag (Hybrid)

### A. Runtime/Core (Cloudflare Workers + D1)
**Zweck:** performantes, kosteneffizientes Heartbeat-/Monitoring-Backend.

**In D1 speichern (nur operativ notwendig):**
- Heartbeat-Ereignisse
- Device-Liveness/Online-Status
- technische IDs (pseudonymisiert, sofern möglich)
- minimale Alarm-Triggerdaten

**Nicht in D1 speichern:**
- umfangreiche Stammdaten (vollständige Adresse, Kontaktlisten, Freitext-Notizen), sofern nicht zwingend erforderlich.

### B. Professional Dashboard (Supabase/Postgres oder vergleichbar)
**Zweck:** Mandantenverwaltung, Nutzerverwaltung, Pflege-/Institutionsprozesse, Reporting.

**In Postgres speichern:**
- Mandanten (Institutionen)
- Nutzer + Rollen + Berechtigungen
- Personenstammdaten (Name, Adresse, Geburtsdatum, Telefon, E-Mail, Kontakte)
- Device-Zuordnungen
- Alarmregeln / Eskalationspläne / Schichtlogik
- Audit-Logs

### C. Datenfluss zwischen D1 und Postgres
Empfohlen: **Event-driven Sync** statt Live-Querabfragen.

Beispiele für Events aus D1:
- `heartbeat_received`
- `device_offline`
- `alarm_triggered`
- `alarm_resolved`

Diese Events werden in Postgres verarbeitet (idempotent), damit das Dashboard einen stabilen, verständlichen Status hat.

---

## 2) Professional Dashboard – Funktionsmodule

1. **Login & Mandantenbereich**
   - Institution-Login
   - Rollen: Org-Owner, Care-Manager, Watcher, Read-Only/Audit

2. **Personenverwaltung**
   - Stammdaten je Person
   - Kontakte (Angehörige, Notfallkontakt, Arzt)
   - optionale sensible Zusatzinfos mit restriktiver Sichtbarkeit

3. **Device-Management**
   - Gerätezuordnung je Person
   - letzter Kontakt, online/offline, technische Metadaten
   - Gerätewechsel und Historie

4. **Monitoring-Zentrale**
   - Gesamtübersicht mit Status (OK/Warnung/Alarm)
   - letzte Aktivität / Ausfallverlauf
   - Filter nach Team/Bereich/Institution

5. **Eskalations- und Benachrichtigungsregeln**
   - pro Person oder per Template
   - zeitbasierte Eskalationen
   - Kanalwahl (Push, E-Mail, SMS, ggf. Anruf)
   - Quittierung („Alarm übernommen“)

6. **Audit & Reporting**
   - Einsicht/Änderung/Export vollständig protokollieren
   - reports für Qualitätsmanagement / Nachweise

---

## 3) Vorschlag Datenmodell (vereinfacht)

### D1 (Core)
- `heartbeats`
- `device_runtime_status`
- `alarm_runtime_events`

### Postgres (Pro Dashboard)
- `organizations`
- `users`
- `roles`
- `user_org_roles`
- `patients`
- `patient_contacts`
- `devices`
- `patient_device_links`
- `alert_rules`
- `notification_policies`
- `alert_events`
- `audit_logs`

---

## 4) DSGVO-Umsetzung (Pflichtanforderungen)

## 4.1 Datenschutz by Design & by Default
- Datenminimierung strikt umsetzen
- klare Zweckbindung pro Datenfeld
- standardmäßig restriktive Sichtbarkeit

## 4.2 Mandantentrennung
- technische Trennung per Tenant-ID + Row-Level Security
- keine tenant-übergreifenden Queries

## 4.3 Zugriffsschutz
- rollenbasiertes Berechtigungssystem (Need-to-know)
- MFA für Institutions-Accounts
- Session-Timeouts, IP-/Rate-Limits

## 4.4 Verschlüsselung
- Transportverschlüsselung (TLS)
- Verschlüsselung at-rest
- zusätzliche Feldverschlüsselung für besonders sensible Daten

## 4.5 Protokollierung & Nachvollziehbarkeit
- Audit-Logs für Lesen/Ändern/Exportieren personenbezogener Daten
- manipulationsarme Speicherung + definierte Aufbewahrung

## 4.6 Betroffenenrechte
- Auskunft (Export)
- Berichtigung
- Löschung
- Einschränkung der Verarbeitung
- klare interne Bearbeitungsprozesse

## 4.7 Lösch- & Aufbewahrungskonzept
- Heartbeat-Rohdaten mit klarer Retention
- Stammdaten nur solange erforderlich
- Backup-/Restore-Prozess mit DSGVO-konformer Löschstrategie

## 4.8 Auftragsverarbeitung & Region
- AVV/DPA mit allen Auftragsverarbeitern
- bevorzugte Verarbeitung in EU/EWR
- Drittlandtransfers nur mit geeigneten Garantien (z. B. SCC)

## 4.9 Risikoanalyse / DSFA
- bei Gesundheits-/Pflegekontext frühzeitig Datenschutz-Folgenabschätzung (DSFA/DPIA) einplanen
- TOMs dokumentieren

---

## 5) MVP-Umfang (empfohlen)

Phase 1 (schnell lieferbar):
1. Institutions-Login + Rollenmodell
2. Personenstammdaten + Device-Zuordnung
3. Monitoring-Übersicht (Live-Status)
4. 2-stufige Eskalation
5. Audit-Log Basis

Phase 2:
- Schichtplanung
- komplexe Eskalationsketten
- Exporte/Reporting
- API-Integrationen

---

## 6) Technische Leitplanken

- **Single Source of Truth je Domäne**
  - D1 = operative Runtime/Heartbeat-Daten
  - Postgres = institutionelle Stamm-/Dashboard-Daten

- **Idempotente Eventverarbeitung**
  - gleiche Events dürfen keine doppelten Zustände erzeugen

- **Sync-Monitoring**
  - Metriken für Event-Lag, Fehlerraten, Retry/Dead-letter

---

## 7) Offene Entscheidungen

1. Finaler Anbieter für Dashboard-DB (Supabase vs. selbst gehostet Postgres)
2. Benachrichtigungskanäle (E-Mail/SMS/Push/Telefonie)
3. Retention-Fristen pro Datentyp
4. Umfang medizinischer Zusatzdaten in MVP
5. DSFA-Startzeitpunkt und Verantwortlichkeiten

---

## 8) Pairing-Konzept

### Entscheidung
ECDSA/Public-Key-Pairing wurde als Overkill verworfen (siehe `DECISIONS.md`). Stattdessen einfaches Token-basiertes Pairing über TLS.

### Ablauf (Free)
1. Person erstellt Pairing-Request → Server gibt `pairing_token` (UUID, 5 Min. gültig)
2. Person zeigt QR-Code: `{ person_id, pairing_token }`
3. Watcher scannt QR, gibt seinen Namen ein
4. Watcher sendet `POST /api/pair/respond` mit `{ pairing_token, watcher_name }`
5. Server validiert Token (gültig, pending, < 5 Min), erstellt Watch-Relation
6. Person pollt `GET /api/pair/:token` → sieht Watcher-Name bei Completion

### Sicherheit
- Token einmalig verwendbar, danach `completed`
- TTL 5 Minuten, danach `expired` (Cron-Cleanup)
- Rate-Limits auf Pairing-Endpoints
- Gesamte Kommunikation über TLS

### Pro-Erweiterung (später)
Für Pro-Institutionen: Pairing kann über Dashboard ausgelöst werden (kein QR nötig, Zuweisung server-seitig durch Care-Manager).

## Kurzfazit
Ja, ein Setup mit mehreren Datenbanken ist sinnvoll und professionell:
- **Cloudflare D1** für schnellen, günstigen Runtime-Core
- **Postgres/Supabase** für Mandanten-Dashboard, Rollen, Stammdaten, Audit & Compliance

Mit der oben beschriebenen Trennung bleibt die Lösung skalierbar, wartbar und DSGVO-fähig.
