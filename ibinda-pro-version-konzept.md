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

## 8) Pairing- und Schlüsselkonzept (für spätere Konfiguration festgehalten)

### Ziel
Sicheres Pairing zwischen **Person** und **Watcher**, ohne dass jemals ein Private Key das Ursprungsgerät verlässt.

### Grundregeln
- Keypair wird **lokal auf dem Person-Gerät** erzeugt.
- Nur der **Public Key** wird an den Server übertragen.
- Private Keys werden **nie** über QR, API oder Datenbank geteilt.
- Der Name ist **niemals** Schlüsselmaterial.

### Empfohlener Ablauf
1. Person-Gerät erzeugt lokal Keypair (z. B. X25519/Ed25519 je nach Protokoll).
2. Person sendet `person_public_key` + `fingerprint` an den Server.
3. Person erzeugt einen QR-Code mit:
   - `person_id`
   - `person_public_key`
   - `pairing_token` (TTL 30 Sekunden, **single-use**)
4. Watcher scannt den QR-Code.
5. Watcher verschlüsselt seinen Namen (oder Profilpayload) mit `person_public_key`.
6. Watcher sendet an den Server: `pairing_token` + `watcher_public_key` + `ciphertext` + `nonce` + `timestamp`.
7. Server validiert:
   - Token noch gültig (30s)
   - Token noch nicht verwendet
   - Replay-Schutz (Nonce/Timestamp)
8. Server speichert nur Public Keys + Ciphertext + Beziehungsdaten.
9. Person liest den verschlüsselten Namen lokal mit eigenem Private Key aus.

### Sicherheitsanforderungen
- Pairing-Token an `person_id` (optional zusätzlich an `watcher_device_id`) binden.
- Token nur einmalig verwendbar, danach sofort invalidieren.
- Serverseitige Rate-Limits auf Pairing-Endpunkte.
- Geräteverlust-Strategie: Key-Rotation + Re-Pairing-Flow.
- Audit-Log für Pairing-Vorgänge (ohne unnötige Klardaten).

## Kurzfazit
Ja, ein Setup mit mehreren Datenbanken ist sinnvoll und professionell:
- **Cloudflare D1** für schnellen, günstigen Runtime-Core
- **Postgres/Supabase** für Mandanten-Dashboard, Rollen, Stammdaten, Audit & Compliance

Mit der oben beschriebenen Trennung bleibt die Lösung skalierbar, wartbar und DSGVO-fähig.
