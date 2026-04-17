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
- Institutions-Login (Web-Portal)
- Admin-Dashboard zur Mitarbeiter- und Personenverwaltung

### Mitarbeiter-Onboarding (Watcher)
- **Flow:** Admin generiert im Web-Portal einen Einladungs-QR-Code.
- Der Mitarbeiter (Pfleger) scannt diesen mit der Standard iBinda-App.
- Das Gerät wird als "Pro-Mitarbeiter" der Institution markiert.
- Alle Free-Limits (z.B. max. 2 beobachtete Personen) werden für dieses Konto serverseitig aufgehoben.

### Personen-Management
- Stammdaten (Name, Zimmer, Adresse) werden im Portal angelegt.
- **Verschlüsselung:** Daten werden im Browser verschlüsselt, bevor sie in D1 gespeichert werden.
- Verknüpfung mit der anonymen `person_id` (nach Scan des QR-Codes durch das Personal).

### Rollenmodell (Vereinfacht)
- **Admin:** Darf Mitarbeiter einladen, Rollen vergeben, Rechnungen/Org-Stammdaten verwalten.
- **Care-Manager:** Darf Stammdaten von betreuten Personen bearbeiten und Regeln anlegen.
- **Pfleger (Watcher):** Live-Monitoring, Alarme quittieren, Zugriff auf freigegebene Stammdaten.

---

## Datenmodell Pro (Cloudflare D1)

- `organizations` (Name, Plan, Org-Master-Key-Hash)
- `user_org_roles` (Zuordnung von Watcher-IDs zu Orgs + Rolle)
- `person_profiles` (verschlüsselte Blobs: Name, Adresse, etc.)
- `person_contacts` (verschlüsselte Notfallkontakte)
- `alert_rules` / `notification_policies`
- `alert_events` (Historie der Alarme)
- `audit_logs` (Wer hat wann welche Daten eingesehen/geändert)

---

## DSGVO & Verschlüsselung

### End-to-End-Ansatz für PII
- **Stammdaten (PII):** Namen, Zimmernummern und Adressen verlassen das Endgerät des Nutzers (Browser/App) nur in verschlüsselter Form.
- **Schlüsselverwaltung:** Die Institution besitzt einen Master-Key, der nicht im Klartext auf dem Server liegt.
- **Verschlüsselung at-rest:** D1 speichert nur verschlüsselte Blobs für alle sensiblen Felder.

### Fotos
- Speicherung in **Cloudflare R2**.
- Ebenfalls verschlüsselt mit dem Org-Key.
- **Crypto-Shredding:** Bei Löschung der Organisation wird der Key vernichtet → alle gespeicherten Daten (D1 & R2) sind unwiederbringlich nutzlos.

### Mandantentrennung
- Strenge Trennung über `organization_id` auf DB-Ebene.
- Zugriff auf verschlüsselte Daten nur mit gültigem Session-Token der jeweiligen Organisation.

---

## Pro-MVP

### Phase 1
- Admin-Portal: Mitarbeiter einladen (QR-Code-Flow).
- Personen-Profile (Stammdaten) anlegen + Verschlüsselungs-Logik.
- Live-Monitoring Dashboard (Glanceable UI).
- Quittierung von Alarmen ("Übernommen durch...").

### Phase 2
- Stationen/Teams (Gruppierung von Personen).
- Erweiterte Eskalationsketten.
- PDF-Exporte und Reporting für QM.

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
