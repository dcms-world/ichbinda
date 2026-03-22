# Auth-Plan – Sicherda

Erstellt: 2026-03-22
Status: in Planung

---

## Entscheidung

**Shared Dev-Token als Query-Parameter** für Entwicklung, **API-Key im SecureStore** für Produktion (Expo).

---

## Dev-Workflow

- Alle Testgeräte nutzen denselben Token: `?dev_token=<secret>`
- Token wird in `.dev.vars` (Wrangler) gesetzt, nicht im Code
- Middleware lässt Requests mit gültigem `dev_token` durch – nur wenn `ENVIRONMENT !== production`

## Prod-Workflow

1. **Registrierung:** Client zeigt Cloudflare Turnstile-Widget, User löst es (oft unsichtbar)
2. **Client:** Schickt `POST /api/auth/register-device` mit `device_id` + `cf-turnstile-response` Token
3. **Backend:** Verifiziert Turnstile-Token bei Cloudflare (`/siteverify`) — bei Fehler 400
4. **Backend:** Generiert API-Key (`crypto.randomUUID()`), speichert ihn **gehasht** (SHA-256) in D1
5. **Backend:** Gibt Key einmalig zurück
6. **Client:** Speichert Key in Expo `SecureStore`
7. **Jeder Request:** `Authorization: Bearer <api-key>` Header
8. **Middleware:** Key hashen → mit D1 vergleichen → bei Fehler 401

> **Dev:** Turnstile wird mit Cloudflare Test-Keys überbrückt (immer valid, kein Widget nötig)

---

## Implementierungs-Schritte

- [ ] D1-Tabelle `device_keys` (device_id, key_hash, created_at)
- [ ] Middleware schreiben (prüft Dev-Token oder Bearer-Key)
- [ ] Cloudflare Turnstile einrichten (Site-Key + Secret-Key in `.dev.vars` / Prod-Secrets)
- [ ] `POST /api/auth/register-device` Endpoint mit Turnstile-Verifikation
- [ ] Frontend: Turnstile-Widget einbinden + Key nach Registrierung speichern (sessionStorage Dev / SecureStore Prod)
- [ ] Alle bestehenden Endpoints durch Middleware absichern
