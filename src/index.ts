import { Hono } from 'hono';

import { registerApiRoutes } from './app/api';
import { cleanupPairingRequests, checkOverduePersons } from './app/helpers/db';
import { applySecurityHeaders, resolveTurnstileSiteKey } from './app/helpers/security';
import type { AppBindings, AppEnv } from './app/types';

// HTML Templates (embedded for Cloudflare Worker)
const PERSON_HTML = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
<title>iBinda - Ich bin okay</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600;700&display=swap" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js"></script>
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
<style>
:root {
  --system-blue: #007AFF;
  --system-green: #248A3D;
  --system-red: #FF3B30;
  --system-orange: #FF9500;
  --system-gray: #8E8E93;
  --system-background: #F2F2F7;
  --system-secondary-background: #FFFFFF;
  --system-label: #000000;
  --system-secondary-label: #3C3C4399;
  --system-separator: #C6C6C8;
  --system-fill: #7878801F;
}

@media (prefers-color-scheme: dark) {
  :root {
    --system-background: #000000;
    --system-secondary-background: #1C1C1E;
    --system-label: #FFFFFF;
    --system-secondary-label: #EBEBF599;
    --system-separator: #38383A;
    --system-fill: #7878805C;
  }
}

* { margin:0; padding:0; box-sizing:border-box; -webkit-tap-highlight-color: transparent; }

body {
  font-family: "Nunito", -apple-system, BlinkMacSystemFont, "SF Pro Rounded", ui-rounded, "SF Pro Text", system-ui, sans-serif;
  font-weight: 300;
  background-color: var(--system-background);
  color: var(--system-label);
  line-height: 1.4;
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
  overflow: hidden;
}

/* Main Screen */
.container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  position: relative;
  max-width: 500px;
  margin: 0 auto;
  width: 100%;
}

h1 {
  font-size: 34px;
  font-weight: 800;
  letter-spacing: -0.5px;
  margin-bottom: 40px;
  text-align: center;
}

.btn-okay {
  width: 260px;
  height: 260px;
  border-radius: 50%;
  border: none;
  background: var(--system-green);
  color: #fff;
  font-size: 64px;
  font-weight: 800;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  box-shadow: 0 10px 40px rgba(36, 138, 61, 0.4);
  transition: transform 0.15s cubic-bezier(0.17, 0.67, 0.83, 0.67), background 0.2s, box-shadow 0.15s;
  cursor: pointer;
  z-index: 10;
}

.btn-okay:active {
  transform: scale(0.92);
  background: #1e6d31;
  box-shadow: 0 4px 15px rgba(36, 138, 61, 0.3);
}

.btn-okay .btn-sub {
  font-size: 24px;
  font-weight: 600;
  opacity: 0.95;
}

.btn-okay:disabled {
  background: var(--system-gray);
  box-shadow: none;
  opacity: 0.6;
}

.btn-okay.error {
  background: var(--system-red);
  box-shadow: 0 10px 40px rgba(255, 59, 48, 0.4);
}

.status {
  margin-top: 40px;
  font-size: 20px;
  font-weight: 600;
  color: var(--system-secondary-label);
  text-align: center;
  min-height: 2em;
}

.status.success { color: var(--system-green); }
.status.error { color: var(--system-red); }

.last-checkin {
  font-size: 15px;
  color: var(--system-secondary-label);
  margin-top: 10px;
  text-align: center;
}

.no-watcher-warning {
  display: none;
  margin-top: 24px;
  padding: 12px 16px;
  background: var(--system-secondary-background);
  border: 1px solid var(--system-orange);
  border-radius: 12px;
  color: var(--system-orange);
  font-size: 15px;
  font-weight: 600;
  text-align: center;
}
.no-watcher-warning.visible { display: block; }
.no-watcher-warning-text { margin-bottom: 10px; }
.no-watcher-action {
  width: 100%;
  border: none;
  border-radius: 10px;
  padding: 12px 16px;
  background: var(--system-orange);
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
}

/* Menu Button */
.menu-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: var(--system-fill);
  color: var(--system-blue);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 100;
}

/* Settings Sheet */
.settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s;
  z-index: 200;
}
.settings-overlay.open { opacity: 1; visibility: visible; }

.settings-panel {
  position: fixed;
  top: 44px;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--system-background);
  border-radius: 14px 14px 0 0;
  transform: translateY(100%);
  transition: transform 0.4s cubic-bezier(0.2, 1, 0.3, 1);
  z-index: 300;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.settings-panel.open { transform: translateY(0); }

.settings-header {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: var(--system-secondary-background);
  border-bottom: 0.5px solid var(--system-separator);
  flex-shrink: 0;
}

.settings-header h2 { font-size: 17px; font-weight: 600; }

.btn-done {
  color: var(--system-blue);
  font-weight: 600;
  background: none;
  border: none;
  font-size: 17px;
  cursor: pointer;
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 0 40px;
}

.settings-section {
  margin-bottom: 24px;
}

.settings-section h3, .name-label, .settings-group-title {
  font-size: 13px;
  color: var(--system-secondary-label);
  text-transform: uppercase;
  margin: 0 32px 8px;
  font-weight: 400;
}

.settings-list {
  background: var(--system-secondary-background);
  margin: 0 16px;
  border-radius: 10px;
  overflow: hidden;
}

.settings-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  min-height: 44px;
}
.settings-item:not(:last-child) { border-bottom: 0.5px solid var(--system-separator); }

.name-display { font-size: 17px; color: var(--system-label); font-weight: 400; }

.qr-container { padding: 20px; text-align: center; }
#qrcode { display: inline-block; padding: 10px; background: #fff; border-radius: 12px; }
.qr-copy-btn {
  margin-top: 16px;
  padding: 8px 16px;
  background: var(--system-fill);
  color: var(--system-blue);
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}
.qr-copy-status {
  display: block;
  min-height: 20px;
  margin-top: 12px;
  font-size: 14px;
  color: var(--system-secondary-label);
}
.qr-copy-status.error { color: var(--system-red); }

.settings-help {
  font-size: 13px;
  color: var(--system-secondary-label);
  margin: 8px 32px 0;
}

/* Location Toggle */
.location-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}
.location-toggle-label { font-size: 17px; }

.toggle-switch {
  width: 51px;
  height: 31px;
  background: #E9E9EA;
  border-radius: 16px;
  position: relative;
  transition: background 0.2s;
  cursor: pointer;
}
@media (prefers-color-scheme: dark) { .toggle-switch { background: #39393D; } }
.toggle-switch.active { background: var(--system-green); }
.toggle-switch::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 27px;
  height: 27px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 3px 8px rgba(0,0,0,0.15);
  transition: transform 0.2s;
}
.toggle-switch.active::after { transform: translateX(20px); }

/* Device List */
.device-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
}
.device-row:not(:last-child) { border-bottom: 0.5px solid var(--system-separator); }
.device-title { font-size: 17px; font-weight: 500; }
.device-meta { font-size: 13px; color: var(--system-secondary-label); }
.device-delete-btn { color: var(--system-red); font-size: 15px; background: none; border: none; cursor: pointer; }
.device-delete-btn:disabled { color: var(--system-gray); opacity: 0.5; }

.qr-scan-btn {
  display: block;
  margin: 10px 16px;
  padding: 12px;
  background: var(--system-secondary-background);
  color: var(--system-blue);
  border: none;
  border-radius: 10px;
  font-size: 17px;
  font-weight: 500;
  text-align: center;
  cursor: pointer;
}

/* Modals */
.name-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  backdrop-filter: blur(4px);
}
.name-modal-overlay.open { display: flex; }
.name-modal {
  background: var(--system-secondary-background);
  border-radius: 14px;
  padding: 24px;
  width: 100%;
  max-width: 320px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
}
.name-modal h2 { font-size: 20px; font-weight: 700; margin-bottom: 8px; }
.name-modal p { font-size: 15px; color: var(--system-secondary-label); margin-bottom: 20px; }
.name-modal input {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--system-separator);
  border-radius: 10px;
  background: var(--system-background);
  color: var(--system-label);
  font-size: 17px;
  margin-bottom: 16px;
}
.name-modal button {
  width: 100%;
  padding: 12px;
  background: var(--system-blue);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 17px;
  font-weight: 600;
  cursor: pointer;
}
.pairing-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.55);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 1200;
  padding: 20px;
  backdrop-filter: blur(8px);
}
.pairing-modal-overlay.open { display: flex; }
.pairing-modal {
  width: 100%;
  max-width: 360px;
  background: var(--system-secondary-background);
  color: var(--system-label);
  border-radius: 18px;
  padding: 24px 20px 20px;
  text-align: center;
  box-shadow: 0 18px 50px rgba(0,0,0,0.28);
}
.pairing-modal h2 {
  font-size: 22px;
  font-weight: 800;
  margin-bottom: 8px;
}
.pairing-modal p {
  font-size: 15px;
  color: var(--system-secondary-label);
  margin-bottom: 20px;
}
.pairing-modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}
.pairing-modal-actions button {
  flex: 1;
  min-width: 0;
  margin: 0;
}
.pairing-primary-btn,
.pairing-secondary-btn {
  border: none;
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
}
.pairing-primary-btn {
  background: var(--system-blue);
  color: #fff;
}
.pairing-secondary-btn {
  background: var(--system-fill);
  color: var(--system-label);
}
.pairing-danger-btn {
  background: #FFE5E2;
  color: var(--system-red);
}
@media (prefers-color-scheme: dark) {
  .pairing-danger-btn {
    background: rgba(255,59,48,0.18);
  }
}

/* Cooldown */
.cooldown-container {
  display: none;
  margin-top: 24px;
  width: 100%;
  max-width: 280px;
}
.cooldown-container.active { display: block; }
.cooldown-text { font-size: 15px; color: var(--system-secondary-label); margin-bottom: 8px; text-align: center; }
.cooldown-bar { height: 6px; background: var(--system-fill); border-radius: 3px; overflow: hidden; }
.cooldown-progress { height: 100%; background: var(--system-blue); width: 0%; transition: width 1s linear; }
.cooldown-countdown { font-size: 24px; font-weight: 700; color: var(--system-blue); margin-top: 8px; text-align: center; }

/* Turnstile / Auth Overlay */
#authOverlay {
  display: none;
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0,0,0,0.6);
  align-items: center;
  justify-content: center;
  padding: 24px;
  backdrop-filter: blur(10px);
}
.auth-modal {
  background: var(--system-secondary-background);
  border-radius: 20px;
  padding: 32px 24px;
  max-width: 340px;
  width: 100%;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0,0,0,0.3);
}
.auth-modal h2 { font-size: 22px; font-weight: 700; color: var(--system-label); margin-bottom: 8px; }
.auth-modal p { color: var(--system-secondary-label); font-size: 15px; margin-bottom: 24px; }

/* QR Scanner */
.qr-scanner-container { margin-top: 10px; display: none; text-align: center; }
.qr-video { width: 100%; border-radius: 12px; background: #000; margin-bottom: 10px; }
.qr-scan-cancel { padding: 8px 16px; background: var(--system-fill); color: var(--system-red); border: none; border-radius: 8px; font-weight: 600; }

</style>
</head>
<body>
<div class="name-modal-overlay" id="nameModalOverlay">
<form class="name-modal" id="nameModalForm" role="dialog" aria-modal="true" aria-labelledby="nameModalTitle">
<h2 id="nameModalTitle">Wie heißt du?</h2>
<p>Bitte gib deinen Namen einmal ein.</p>
<input id="personNameInput" type="text" maxlength="35" placeholder="z.B. Oma Erna" required>
<button type="submit">Speichern</button>
</form>
</div>

<div class="pairing-modal-overlay" id="pairingQrModalOverlay">
<div class="pairing-modal" role="dialog" aria-modal="true" aria-labelledby="pairingQrTitle">
<h2 id="pairingQrTitle">QR-Code anzeigen</h2>
<p>Jemand kann diesen Code scannen, um sich mit dir zu verbinden.</p>
<div class="qr-container">
  <div id="qrcode"></div>
  <button type="button" class="qr-copy-btn" onclick="copyQrPayload(event)">QR kopieren</button>
  <small id="qrCopyStatus" class="qr-copy-status" aria-live="polite"></small>
</div>
<div class="pairing-modal-actions">
  <button type="button" class="pairing-secondary-btn" onclick="closePairingQrModal()">Schließen</button>
</div>
</div>
</div>

<div class="pairing-modal-overlay" id="pairingRequestModalOverlay">
<div class="pairing-modal" role="dialog" aria-modal="true" aria-labelledby="pairingRequestTitle">
<h2 id="pairingRequestTitle">Verbindungsanfrage</h2>
<p id="pairingRequestText">Mit jemandem verbinden?</p>
<small id="pairingRequestStatus" class="qr-copy-status" aria-live="polite"></small>
<div class="pairing-modal-actions">
  <button type="button" class="pairing-secondary-btn pairing-danger-btn" id="pairingRejectBtn" onclick="respondToPairingRequest('reject')">Ablehnen</button>
  <button type="button" class="pairing-primary-btn" id="pairingApproveBtn" onclick="respondToPairingRequest('approve')">Annehmen</button>
</div>
</div>
</div>

<button class="menu-btn" onclick="openSettings()" title="Menü" aria-label="Menü öffnen">
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
</button>

<div class="settings-overlay" id="settingsOverlay" onclick="closeSettings()"></div>

<div class="settings-panel" id="settingsPanel" role="dialog" aria-modal="true" aria-labelledby="settingsTitle">
<div class="settings-header">
  <h2 id="settingsTitle">Einstellungen</h2>
  <button class="btn-done" onclick="closeSettings()">Fertig</button>
</div>

<div class="settings-content">
  <div class="settings-section">
    <span class="name-label">Dein Name</span>
    <div class="settings-list">
      <div class="settings-item">
        <div class="name-display" id="personNameDisplay">-</div>
      </div>
    </div>
  </div>

  <div class="settings-section">
    <h3>QR-Code zum Verbinden</h3>
    <button type="button" class="qr-scan-btn" onclick="openPairingQrModal()">QR-Code anzeigen</button>
    <small class="settings-help">Weitere Watcher können sich über dieses Fenster direkt mit dir verbinden.</small>
  </div>

  <div class="settings-section">
    <h3>Standort</h3>
    <div class="settings-list">
      <div class="settings-item">
        <div class="location-toggle">
          <div class="location-toggle-label">Standort mitteilen</div>
          <div class="toggle-switch" id="locationToggle" onclick="toggleLocation()"></div>
        </div>
      </div>
    </div>
    <small class="settings-help">Bei jedem OK senden wir deinen Standort mit.</small>
  </div>

  <div class="settings-section">
    <h3>Verbindungen</h3>
    <div id="watcherInfo"></div>
  </div>

  <div class="settings-section">
    <h3>Geräte</h3>
    <div class="settings-list" id="deviceList">
      <div class="settings-item"><div class="device-empty">Wird geladen...</div></div>
    </div>
    <small class="settings-help">Verknüpfte Geräte für diese Person.</small>
  </div>

  <div class="settings-section">
    <h3>Neues Gerät hinzufügen</h3>
    <button type="button" class="qr-scan-btn" onclick="startDeviceQrScan()">QR-Code scannen</button>
    <div id="deviceQrScanner" class="qr-scanner-container"></div>
  </div>
</div>
</div>

<div id="authOverlay">
<div class="auth-modal">
<div style="font-size:48px;margin-bottom:12px">🔐</div>
<h2>Einmalige Einrichtung</h2>
<p>Bitte kurz bestätigen, dass du kein Bot bist.</p>
<div class="cf-turnstile" data-sitekey="__TURNSTILE_SITE_KEY__" data-callback="onTurnstileSuccess"></div>
<p id="authStatus" style="margin-top:16px;color:var(--system-red);font-size:14px;min-height:20px"></p>
</div>
</div>

<div class="container">
<h1>iBinda</h1>
<button class="btn-okay" id="btnOkay" onclick="sendHeartbeat()" aria-label="Okay senden">OK<span class="btn-sub">Alles gut</span></button>
<div id="status" class="status" aria-live="polite">Einmal tippen: Alles okay</div>
<div id="sendErrorCard" class="send-error-card" role="alert"></div>
<div class="cooldown-container" id="cooldownContainer">
<div class="cooldown-text">Bitte kurz warten...</div>
<div class="cooldown-bar"><div class="cooldown-progress" id="cooldownProgress"></div></div>
<div class="cooldown-countdown" id="cooldownCountdown">5:00</div>
</div>
<div class="last-checkin" id="lastCheckin"></div>
<div id="noWatcherWarning" class="no-watcher-warning">
  <div class="no-watcher-warning-text">⚠️ Keine Verbindung eingerichtet</div>
  <button type="button" class="no-watcher-action" onclick="openPairingQrModal()">QR-Code anzeigen</button>
</div>
</div>

<script>
const API_URL='/api';
const PERSON_NAME_KEY='ibinda_person_name';
const DEVICE_ID_KEY='ibinda_device_id';
let currentPersonId=null;
let currentPersonName='';
let currentDeviceId='';

function isRegistered(){return localStorage.getItem('ibinda_registered_person')==='1'}
function setRegistered(){localStorage.setItem('ibinda_registered_person','1')}
const MAX_DISPLAY_NAME_LENGTH=35;
function normalizeDisplayName(name){return String(name||'').trim().slice(0,MAX_DISPLAY_NAME_LENGTH)}
function isLetterChar(char){return !!char&&char.toLocaleLowerCase()!==char.toLocaleUpperCase()}
function hasTwoLetterStart(name){const chars=[...String(name||'').trim()];return chars.length>=2&&isLetterChar(chars[0])&&isLetterChar(chars[1])}
function getDisplayNameValidationError(name){const trimmed=String(name||'').trim();if(trimmed.length<2)return'name-too-short';if(trimmed.length>MAX_DISPLAY_NAME_LENGTH)return'name-too-long';if(!hasTwoLetterStart(trimmed))return'name-invalid-start';return''}
function showDisplayNameValidationError(errorCode){if(errorCode==='name-too-short'){alert('Der Name muss mindestens 2 Zeichen lang sein.')}else if(errorCode==='name-too-long'){alert('Der Name darf maximal 35 Zeichen lang sein.')}else if(errorCode==='name-invalid-start'){alert('Die ersten 2 Zeichen des Namens müssen Buchstaben sein.')}} 

let resolveRegistered=null;
async function onTurnstileSuccess(token){const statusEl=document.getElementById('authStatus');if(statusEl)statusEl.textContent='Registrierung läuft...';try{const res=await fetch(API_URL+'/auth/register-device',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({device_id:getOrCreateDeviceId(),turnstile_token:token,role:'person'})});if(!res.ok)throw new Error('Fehler '+res.status);setRegistered();const overlay=document.getElementById('authOverlay');if(overlay)overlay.style.display='none';if(statusEl)statusEl.textContent='';if(resolveRegistered){resolveRegistered();resolveRegistered=null}}catch(e){if(statusEl)statusEl.textContent='❌ '+e.message+' – Bitte Seite neu laden.'}}
async function ensureRegistered(){if(isRegistered())return;const overlay=document.getElementById('authOverlay');if(overlay)overlay.style.display='flex';return new Promise(resolve=>{resolveRegistered=resolve})}

function getPersonId(){return localStorage.getItem('ibinda_person_id')}
function getPersonName(){return(localStorage.getItem(PERSON_NAME_KEY)||'').trim()}
function setPersonName(name){localStorage.setItem(PERSON_NAME_KEY,normalizeDisplayName(name))}
function createDeviceId(){if(window.crypto&&typeof window.crypto.randomUUID==='function')return window.crypto.randomUUID();if(window.crypto&&typeof window.crypto.getRandomValues==='function'){const bytes=new Uint8Array(16);window.crypto.getRandomValues(bytes);bytes[6]=bytes[6]&15|64;bytes[8]=bytes[8]&63|128;const hex=[...bytes].map(byte=>byte.toString(16).padStart(2,'0')).join('');return hex.slice(0,8)+'-'+hex.slice(8,12)+'-'+hex.slice(12,16)+'-'+hex.slice(16,20)+'-'+hex.slice(20,32)}throw new Error('Secure random device id generation unavailable')}
function getOrCreateDeviceId(){const existing=(localStorage.getItem(DEVICE_ID_KEY)||'').trim();if(existing)return existing;const created=createDeviceId();localStorage.setItem(DEVICE_ID_KEY,created);return created}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,(char)=>{if(char==='&')return'&amp;';if(char==='<')return'&lt;';if(char==='>')return'&gt;';if(char==='"')return'&quot;';return'&#39;'})}
function formatLastSeen(iso){const time=Date.parse(iso||'');if(Number.isNaN(time))return 'Unbekannt';return new Date(time).toLocaleString('de-DE')}
function isDisplayNameTooLong(name){return String(name||'').trim().length>MAX_DISPLAY_NAME_LENGTH}

async function createPerson(existingPersonId){const options={method:'POST'};if(existingPersonId){options.headers={'Content-Type':'application/json'};options.body=JSON.stringify({id:existingPersonId})}const res=await fetch(API_URL+'/person',options);if(!res.ok)throw new Error('Person init failed: '+res.status);const data=await res.json();localStorage.setItem('ibinda_person_id',data.id);return data.id}

let currentPairingToken='';
let pairingPollInterval=null;
let pairingRefreshTimeout=null;
let currentPairingRequestName='';

function clearPairingTimers(){if(pairingPollInterval){clearInterval(pairingPollInterval);pairingPollInterval=null}if(pairingRefreshTimeout){clearTimeout(pairingRefreshTimeout);pairingRefreshTimeout=null}}
function isSettingsOpen(){const panel=document.getElementById('settingsPanel');return !!panel&&panel.classList.contains('open')}
function isPairingQrModalOpen(){const overlay=document.getElementById('pairingQrModalOverlay');return !!overlay&&overlay.classList.contains('open')}
function isPairingRequestModalOpen(){const overlay=document.getElementById('pairingRequestModalOverlay');return !!overlay&&overlay.classList.contains('open')}
function setPairingRequestStatus(message,isError){const statusEl=document.getElementById('pairingRequestStatus');if(!statusEl)return;statusEl.textContent=message||'';statusEl.classList.toggle('error',!!isError)}
function openPairingQrModal(forceRefresh){const overlay=document.getElementById('pairingQrModalOverlay');if(!overlay||!currentPersonId)return;overlay.classList.add('open');setQrCopyStatus('',false);renderQrCode(!!forceRefresh)}
function clearQrCodeElement(id){const qrEl=document.getElementById(id);if(qrEl)qrEl.innerHTML=''}
function closePairingQrModal(resetState=true){const overlay=document.getElementById('pairingQrModalOverlay');if(overlay)overlay.classList.remove('open');clearQrCodeElement('qrcode');if(resetState&&!isSettingsOpen()&&!isPairingRequestModalOpen()){clearPairingTimers();currentPairingToken=''}setQrCopyStatus('',false)}
function hidePairingRequest(){const overlay=document.getElementById('pairingRequestModalOverlay');const text=document.getElementById('pairingRequestText');const approveBtn=document.getElementById('pairingApproveBtn');const rejectBtn=document.getElementById('pairingRejectBtn');currentPairingRequestName='';if(overlay)overlay.classList.remove('open');if(text)text.textContent='Mit jemandem verbinden?';setPairingRequestStatus('',false);if(approveBtn)approveBtn.disabled=false;if(rejectBtn)rejectBtn.disabled=false}
function showPairingRequest(name){const overlay=document.getElementById('pairingRequestModalOverlay');const text=document.getElementById('pairingRequestText');const displayName=(name||'jemandem');closePairingQrModal(false);currentPairingRequestName=displayName;if(text)text.textContent='Mit '+displayName+' verbinden?';setPairingRequestStatus('',false);if(overlay)overlay.classList.add('open')}
function buildQrPayload(){if(!currentPersonId||!currentPairingToken)return'';return JSON.stringify({person_id:currentPersonId,pairing_token:currentPairingToken,name:currentPersonName||getPersonName()})}
let qrCopyStatusTimeout=null;
function setQrCopyStatus(message,isError){const statusEl=document.getElementById('qrCopyStatus');if(!statusEl)return;statusEl.textContent=message||'';statusEl.classList.toggle('error',!!isError);if(qrCopyStatusTimeout){clearTimeout(qrCopyStatusTimeout);qrCopyStatusTimeout=null}if(message){qrCopyStatusTimeout=setTimeout(()=>{statusEl.textContent='';statusEl.classList.remove('error');qrCopyStatusTimeout=null},1600)}}
async function copyQrPayload(event){if(event&&typeof event.stopPropagation==='function')event.stopPropagation();if(!currentPersonId)return;const qrPayload=buildQrPayload();if(!qrPayload){setQrCopyStatus('QR-Code wird vorbereitet',true);return}if(!navigator.clipboard||typeof navigator.clipboard.writeText!=='function'){setQrCopyStatus('Kopieren nicht verfügbar',true);return}try{await navigator.clipboard.writeText(qrPayload);setQrCopyStatus('Kopiert!',false)}catch(e){console.error('QR payload copy failed',e);setQrCopyStatus('Kopieren fehlgeschlagen',true)}}
async function createPairingToken(){if(!currentPersonId)throw new Error('Keine Person ID');const res=await fetch(API_URL+'/pair/create',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({person_id:currentPersonId})});if(!res.ok)throw new Error('Pairing create failed: '+res.status);const data=await res.json();if(!data.pairing_token)throw new Error('Pairing token missing');return data.pairing_token}
async function respondToPairingRequest(action){if(!currentPairingToken)return;const approveBtn=document.getElementById('pairingApproveBtn');const rejectBtn=document.getElementById('pairingRejectBtn');if(approveBtn)approveBtn.disabled=true;if(rejectBtn)rejectBtn.disabled=true;setPairingRequestStatus('',false);try{const res=await fetch(API_URL+'/pair/confirm',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pairing_token:currentPairingToken,action})});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||('Pairing confirm failed: '+res.status));hidePairingRequest();if(action==='approve'){currentPairingToken='';clearPairingTimers();if(currentPersonId)loadWatchers(currentPersonId);return}openPairingQrModal(true)}catch(e){console.error('Pairing confirm failed',e);setPairingRequestStatus(e&&e.message?e.message:'Bestätigung fehlgeschlagen',true);if(approveBtn)approveBtn.disabled=false;if(rejectBtn)rejectBtn.disabled=false}}
async function pollPairingStatus(pairingToken){if(!currentPersonId||!pairingToken)return;try{const res=await fetch(API_URL+'/pair/'+encodeURIComponent(pairingToken));if(!res.ok){if(res.status===404)return;throw new Error('Pairing poll failed: '+res.status)}const data=await res.json();if(data.status==='requested'){showPairingRequest(data.watcher_name||'jemandem');return}hidePairingRequest();if(data.status==='completed'){clearPairingTimers();currentPairingToken='';closePairingQrModal(false);loadWatchers(currentPersonId);return}if(data.status==='expired'){setQrCopyStatus('QR-Code wird erneuert...',false);await renderQrCode(true)}}catch(e){console.error('Pairing poll failed',e)}}
function startPairingPolling(pairingToken){clearPairingTimers();pollPairingStatus(pairingToken);pairingPollInterval=setInterval(()=>{pollPairingStatus(pairingToken)},5000);pairingRefreshTimeout=setTimeout(()=>{renderQrCode(true)},300000)}
function renderQrCodeInto(id,qrPayload){const qrEl=document.getElementById(id);if(!qrEl)return;qrEl.innerHTML='';new QRCode(qrEl,{text:qrPayload,width:180,height:180});qrEl.onclick=copyQrPayload}
async function renderQrCode(forceRefresh){if(!currentPersonId)return;clearPairingTimers();hidePairingRequest();if(forceRefresh||!currentPairingToken){try{currentPairingToken=await createPairingToken()}catch(e){console.error('QR render failed',e);setQrCopyStatus('QR-Code konnte nicht erstellt werden',true);return}}const qrPayload=buildQrPayload();if(!qrPayload)return;renderQrCodeInto('qrcode',qrPayload);startPairingPolling(currentPairingToken)}
function renderPersonName(){document.getElementById('personNameDisplay').textContent=currentPersonName||getPersonName()||'-'}
function openSettings(){console.log('openSettings called');document.getElementById('settingsPanel').classList.add('open');document.getElementById('settingsOverlay').classList.add('open');renderPersonName();loadDevices();if(currentPersonId)loadWatchers(currentPersonId);const doneBtn=document.querySelector('#settingsPanel .btn-done');if(doneBtn)doneBtn.focus()}

function closeSettings(){document.getElementById('settingsPanel').classList.remove('open');document.getElementById('settingsOverlay').classList.remove('open');if(!isPairingQrModalOpen()&&!isPairingRequestModalOpen()){clearPairingTimers();currentPairingToken='';clearQrCodeElement('qrcode');setQrCopyStatus('',false)}}

function askForPersonName(){return new Promise((resolve)=>{const overlay=document.getElementById('nameModalOverlay');const form=document.getElementById('nameModalForm');const input=document.getElementById('personNameInput');overlay.classList.add('open');input.focus();const onSubmit=(event)=>{event.preventDefault();const rawName=input.value;const errorCode=getDisplayNameValidationError(rawName);if(errorCode){showDisplayNameValidationError(errorCode);return}const name=normalizeDisplayName(rawName);setPersonName(name);overlay.classList.remove('open');resolve(name)};form.addEventListener('submit',onSubmit,{once:true})})}

async function ensurePersonName(){const savedName=getPersonName();if(savedName)return savedName;return askForPersonName()}

const LOCATION_ENABLED_KEY='ibinda_location_enabled';
const LOCATION_CLEAR_PENDING_KEY='ibinda_location_clear_pending';

function isLocationEnabled(){return localStorage.getItem(LOCATION_ENABLED_KEY)==='true'}
function isLocationClearPending(){return localStorage.getItem(LOCATION_CLEAR_PENDING_KEY)==='true'}
function setLocationClearPending(pending){localStorage.setItem(LOCATION_CLEAR_PENDING_KEY,pending?'true':'false')}
function setLocationEnabled(enabled){localStorage.setItem(LOCATION_ENABLED_KEY,enabled?'true':'false');if(enabled){setLocationClearPending(false)}updateLocationToggleUi()}

function updateLocationToggleUi(){const toggle=document.getElementById('locationToggle');if(!toggle)return;toggle.classList.toggle('active',isLocationEnabled())}

async function toggleLocation(){const currentlyEnabled=isLocationEnabled();if(!currentlyEnabled){const confirmed=confirm('Möchtest du deinen Standort bei jedem "Okay" mitteilen? Deine verbundenen Personen sehen dann, wo du dich befindest.');if(!confirmed)return;try{await getCurrentPosition();setLocationEnabled(true)}catch(e){console.log('Location permission denied',e);setLocationEnabled(false);alert('Standort nicht verfügbar. Bitte Standortzugriff im Browser erlauben.')}}else{setLocationEnabled(false);setLocationClearPending(true)}}

function getCurrentPosition(){return new Promise((resolve,reject)=>{if(!navigator.geolocation){reject(new Error('Geolocation not supported'));return}navigator.geolocation.getCurrentPosition(pos=>resolve({lat:pos.coords.latitude,lng:pos.coords.longitude}),err=>reject(err),{enableHighAccuracy:true,timeout:10000,maximumAge:60000})})}

async function init(){try{currentPersonName=await ensurePersonName();await ensureRegistered();let personId=getPersonId();if(!personId){personId=await createPerson()}else{try{personId=await createPerson(personId)}catch(error){console.error('Stored person ID unusable, creating new person',error);personId=await createPerson()}}currentPersonId=personId;currentDeviceId=getOrCreateDeviceId();await registerCurrentDevice(personId).catch((error)=>{console.error('Initial device registration failed',error)});renderPersonName();updateLocationToggleUi();const url=new URL(window.location);url.searchParams.set('id',personId);window.history.replaceState({},'',url);loadStatus(personId);loadWatchers(personId)}catch(e){console.error('Init error:',e);document.getElementById('status').textContent='Fehler beim Laden. Bitte Seite neu laden.';document.getElementById('status').className='status error'}}

let cooldownInterval=null;let cooldownEndTime=null;

function formatCountdown(seconds){const mins=Math.floor(seconds/60);const secs=seconds%60;return mins+':'+(secs<10?'0':'')+secs}

function resetStatus(){const status=document.getElementById('status');status.textContent='Einmal tippen: Alles okay';status.className='status idle'}

function setButtonError(){const btn=document.getElementById('btnOkay');const card=document.getElementById('sendErrorCard');if(btn){btn.classList.add('error');btn.innerHTML='!<span class="btn-sub">Nochmal</span>'}if(card){card.innerHTML='Meldung konnte nicht gesendet werden.<div class="error-sub">Bitte nochmal versuchen oder direkt bei einer verbundenen Person melden.</div>';card.classList.add('visible')}}
function clearButtonError(){const btn=document.getElementById('btnOkay');const card=document.getElementById('sendErrorCard');if(btn){btn.classList.remove('error');btn.innerHTML='OK<span class="btn-sub">Alles gut</span>'}if(card)card.classList.remove('visible')}

function startCooldown(seconds){const btn=document.getElementById('btnOkay');const status=document.getElementById('status');if(cooldownInterval)return;cooldownEndTime=Date.now()+seconds*1000;btn.disabled=true;status.className='status rate-limit';status.textContent='ℹ️ Bereits gemeldet. Noch '+seconds+' Sekunden warten.';cooldownInterval=setInterval(()=>{const remaining=Math.ceil((cooldownEndTime-Date.now())/1000);if(remaining<=0){clearInterval(cooldownInterval);cooldownInterval=null;btn.disabled=false;setTimeout(resetStatus,2000);return}status.textContent='ℹ️ Bereits gemeldet. Noch '+remaining+' Sekunden warten.'},1000)}

async function sendHeartbeat(){console.log('sendHeartbeat called');const btn=document.getElementById('btnOkay');const status=document.getElementById('status');const personId=getPersonId();if(!personId){console.error('No person ID');status.className='status error';status.textContent='❌ Fehler: Keine Person ID';return}if(cooldownInterval){console.log('Cooldown active');return}status.className='status';status.textContent='Wird gesendet...';const payload={person_id:personId,device_id:currentDeviceId||getOrCreateDeviceId(),loc:isLocationEnabled()};if(isLocationEnabled()){try{const pos=await getCurrentPosition();const lat=Number(pos.lat);const lng=Number(pos.lng);if(!Number.isFinite(lat)||!Number.isFinite(lng))throw new Error('Invalid coordinates');payload.lat=lat;payload.lng=lng;console.log('Location added',pos)}catch(e){console.log('Could not get location',e);status.className='status error';status.textContent='❌ Standort nicht verfügbar. Bitte Standortzugriff erlauben.';setTimeout(()=>status.textContent='',5000);return}}try{console.log('Sending payload',payload);const res=await fetch(API_URL+'/heartbeat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});console.log('Response',res.status);if(res.ok){if(cooldownInterval){clearInterval(cooldownInterval);cooldownInterval=null}btn.disabled=false;clearButtonError();const data=await res.json();status.className='status success';status.textContent='✅ Gemeldet!';document.getElementById('lastCheckin').textContent='Letzte Meldung: '+new Date(data.timestamp).toLocaleString('de-DE');if(currentPersonId)loadWatchers(currentPersonId);setTimeout(resetStatus,3000)}else if(res.status===429){const data=await res.json().catch(()=>({}));const retrySeconds=data.retry_after_seconds||20;startCooldown(retrySeconds)}else{const text=await res.text();console.error('Server error',res.status,text);throw new Error('Server error: '+res.status)}}catch(err){console.error('sendHeartbeat error',err);if(!cooldownInterval){setButtonError();status.className='status';status.textContent='';btn.disabled=false}}}

async function loadStatus(personId){try{const res=await fetch(API_URL+'/person/'+personId);if(res.ok){const data=await res.json();if(data.last_heartbeat){document.getElementById('lastCheckin').textContent='Letzte Meldung: '+new Date(data.last_heartbeat).toLocaleString('de-DE')}}}catch(e){}}

const WATCHER_NAMES_KEY='ibinda_watcher_names';
function getCachedWatcherNames(){try{return JSON.parse(localStorage.getItem(WATCHER_NAMES_KEY)||'{}')}catch{return{}}}
function cacheWatcherNames(updates){const names=getCachedWatcherNames();Object.assign(names,updates);localStorage.setItem(WATCHER_NAMES_KEY,JSON.stringify(names))}
function getWatcherDisplayName(id){const name=getCachedWatcherNames()[id];return name||id.slice(0,8)+'…'}
async function loadWatchers(personId){try{const res=await fetch(API_URL+'/person/'+encodeURIComponent(personId)+'/watchers');if(!res.ok)return;const data=await res.json();const el=document.getElementById('watcherInfo');const warn=document.getElementById('noWatcherWarning');if(!data.watcher_count){if(el){el.innerHTML='<div class="settings-list"><div class="settings-item"><div class="device-meta">Keine Verbindung</div><button type="button" class="device-delete-btn" id="watcherQrEntryBtn">QR-Code anzeigen</button></div></div>';const qrEntryBtn=document.getElementById('watcherQrEntryBtn');if(qrEntryBtn)qrEntryBtn.onclick=()=>openPairingQrModal()}if(warn)warn.classList.add('visible')}else{const nameUpdates={};(data.watchers||[]).forEach(w=>{if(w.name)nameUpdates[w.id]=w.name});if(Object.keys(nameUpdates).length)cacheWatcherNames(nameUpdates);const count=data.watcher_count;const label=count===1?'1 Verbindung':count+' Verbindungen';const items=(data.watchers||[]).map(w=>'<div class="device-meta" style="padding:4px 0">'+escapeHtml(getWatcherDisplayName(w.id))+'</div>').join('');el.innerHTML='<div class="settings-list"><div class="settings-item" style="cursor:pointer" id="watcherToggle"><div>'+label+'</div><div style="color:var(--system-green)">✓</div></div><div id="watcherIds" style="display:none;padding:0 16px 12px">'+items+'</div></div>';document.getElementById('watcherToggle').onclick=()=>{const idsEl=document.getElementById('watcherIds');idsEl.style.display=idsEl.style.display==='none'?'block':'none'};if(warn)warn.classList.remove('visible')}}catch(e){}}

async function registerCurrentDevice(personId){const deviceId=currentDeviceId||getOrCreateDeviceId();currentDeviceId=deviceId;const res=await fetch(API_URL+'/person/'+encodeURIComponent(personId)+'/devices',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({device_id:deviceId})});if(!res.ok){const text=await res.text().catch(()=>'');throw new Error('Device registration failed: '+res.status+' '+text)}}

async function deleteDevice(deviceId){if(!currentPersonId)return;const confirmed=confirm('Gerät wirklich entfernen?');if(!confirmed)return;try{const res=await fetch(API_URL+'/person/'+encodeURIComponent(currentPersonId)+'/devices',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({device_id:deviceId})});if(res.ok){await loadDevices();return}const data=await res.json().catch(()=>({}));if(res.status===409){alert(data.error||'Das letzte Gerät kann nicht gelöscht werden.');return}throw new Error(data.error||'Löschen fehlgeschlagen')}catch(e){console.error('Delete device failed',e);alert('Gerät konnte nicht gelöscht werden. Bitte erneut versuchen.')}}

function renderDeviceList(devices){const listEl=document.getElementById('deviceList');if(!listEl)return;if(!Array.isArray(devices)||devices.length===0){listEl.innerHTML='<div class="device-empty">Keine Geräte vorhanden.</div>';return}listEl.innerHTML=devices.map((device)=>{const isCurrent=device.device_id===currentDeviceId;const badges=[];if(isCurrent)badges.push('<span class="device-badge current">Dieses Gerät</span>');const model=escapeHtml(device.device_model||'Desktop');const lastSeen=escapeHtml(formatLastSeen(device.last_seen));return '<div class="device-row"><div class="device-main"><div class="device-title">'+model+'</div><div class="device-meta">Zuletzt aktiv: '+lastSeen+'</div><div class="device-badges">'+badges.join('')+'</div></div>'+(isCurrent?'':'<button type="button" class="device-delete-btn" data-device-id="'+escapeHtml(device.device_id)+'">Löschen</button>')+'</div>'}).join('');listEl.querySelectorAll('.device-delete-btn').forEach((button)=>{button.addEventListener('click',(event)=>{const target=event.currentTarget;if(!target)return;const deviceId=target.getAttribute('data-device-id');if(!deviceId||target.disabled)return;deleteDevice(deviceId)})})}

async function loadDevices(){if(!currentPersonId)return;const listEl=document.getElementById('deviceList');if(!listEl)return;listEl.innerHTML='<div class="device-empty">Geräte werden geladen...</div>';try{await registerCurrentDevice(currentPersonId);const res=await fetch(API_URL+'/person/'+encodeURIComponent(currentPersonId)+'/devices');if(!res.ok){const text=await res.text().catch(()=>'');throw new Error('Device list failed: '+res.status+' '+text)}const devicesRaw=await res.json();const devices=Array.isArray(devicesRaw)?devicesRaw:[];renderDeviceList(devices)}catch(e){console.error('Failed to load devices',e);listEl.innerHTML='<div class="device-error">Geräte konnten nicht geladen werden.</div>'}}

// QR Scanner für neues Gerät (verbesserte Version aus watcher.html)
let deviceCameraStream = null;
let deviceScanFrameRequestId = 0;
let deviceScanContext = null;

function stopDeviceQrScanner() {
  if (deviceScanFrameRequestId) {
    cancelAnimationFrame(deviceScanFrameRequestId);
    deviceScanFrameRequestId = 0;
  }
  deviceScanContext = null;
  if (deviceCameraStream) {
    deviceCameraStream.getTracks().forEach((track) => track.stop());
    deviceCameraStream = null;
  }
  const container = document.getElementById('deviceQrScanner');
  if (container) {
    container.style.display = 'none';
    container.innerHTML = '';
  }
}

async function scanDeviceQrFrame() {
  const video = document.getElementById('deviceQrVideo');
  const canvas = document.getElementById('deviceQrCanvas');
  if (!video || !canvas || !deviceCameraStream) return;
  
  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    if (!deviceScanContext) {
      deviceScanContext = canvas.getContext('2d', { willReadFrequently: true });
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    deviceScanContext.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const imageData = deviceScanContext.getImageData(0, 0, canvas.width, canvas.height);
    const result = window.jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth'
    });
    
    if (result && result.data) {
      try {
        const data = JSON.parse(result.data);
        if (typeof data?.name === 'string') {
          const nameError = getDisplayNameValidationError(data.name);
          if (nameError) {
            stopDeviceQrScanner();
            showDisplayNameValidationError(nameError);
            return;
          }
        }
        if (data.id) {
          stopDeviceQrScanner();
          handleNewDeviceScanned(data.id);
          return;
        }
      } catch (e) {
        // Kein gültiger JSON QR Code, weiter scannen
      }
    }
  }
  
  deviceScanFrameRequestId = requestAnimationFrame(scanDeviceQrFrame);
}

async function startDeviceQrScan() {
  const container = document.getElementById('deviceQrScanner');
  if (!container) return;
  
  if (deviceCameraStream) {
    stopDeviceQrScanner();
    return;
  }
  
  if (typeof window.jsQR !== 'function') {
    alert('QR-Scanner nicht verfügbar. Bitte Seite neu laden.');
    return;
  }
  
  container.innerHTML = '<video id="deviceQrVideo" class="qr-video" autoplay playsinline muted></video><canvas id="deviceQrCanvas" class="qr-canvas" style="display:none;"></canvas><button type="button" class="qr-scan-cancel" onclick="stopDeviceQrScanner()">Abbrechen</button>';
  container.style.display = 'block';
  
  try {
    deviceCameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    });
    const video = document.getElementById('deviceQrVideo');
    video.srcObject = deviceCameraStream;
    video.onloadedmetadata = () => {
      video.play();
      scanDeviceQrFrame();
    };
  } catch (err) {
    console.error('QR scan failed', err);
    alert('Kamera konnte nicht gestartet werden. Bitte Kamera-Zugriff erlauben.');
    stopDeviceQrScanner();
  }
}

async function handleNewDeviceScanned(personId) {
  if (!personId) return;
  
  // Prüfe ob Person bereits existiert und ein Name gesetzt ist
  try {
    const personRes = await fetch(API_URL + '/person/' + encodeURIComponent(personId));
    if (personRes.ok) {
      const personData = await personRes.json();
      
      // Wenn die Person bereits existiert, übernehme ihren Namen
      if (personData.id) {
        // Prüfe ob dieses Gerät bereits einer anderen Person zugeordnet ist
        // (durch Abgleich mit localStorage - jedes Gerät kennt nur seine eigene person_id)
        const existingPersonId = localStorage.getItem('ibinda_person_id');
        if (existingPersonId && existingPersonId !== personId) {
          alert('Dieses Gerät ist bereits mit einer anderen Person verknüpft und kann nicht übertragen werden.');
          return;
        }
        
        // Name aus der bestehenden Person übernehmen
        if (personData.name && personData.name !== getPersonName()) {
          const confirmed = confirm('Diese Person existiert bereits mit dem Namen "' + personData.name + '"\. Möchtest du diesen Namen übernehmen?');
          if (confirmed) {
            setPersonName(personData.name);
          }
        }
      }
    }
  } catch (e) {
    console.error('Person check failed', e);
    // Bei Fehler trotzdem fortfahren
  }
  
  // Speichere person_id
  localStorage.setItem('ibinda_person_id', personId);
  currentPersonId = personId;
  
  // Update URL
  const url = new URL(window.location);
  url.searchParams.set('id', personId);
  window.history.replaceState({}, '', url);
  
  // Registriere dieses Gerät
  try {
    await registerCurrentDevice(personId);
    alert('Gerät erfolgreich hinzugefügt!');
    loadDevices();
    renderPersonName();
  } catch (e) {
    alert('Fehler beim Verbinden: ' + e.message);
  }
}

init();
</script>
</body>
</html>`;

const WATCHER_HTML = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>I bin da - Verbundene Personen</title>
<script src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js"></script>
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;min-height:100vh;background:#f5f7fa;padding:20px}
.container{max-width:800px;margin:0 auto}
h1{color:#333;margin-bottom:10px}
.subtitle{color:#666;margin-bottom:30px}
.card{background:white;border-radius:12px;padding:20px;margin-bottom:20px;box-shadow:0 2px 8px rgba(0,0,0,0.1)}
.add-header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
.person-counter{font-size:13px;font-weight:600;color:#475467}
.add-person{display:flex;gap:10px;margin-bottom:20px}
.limit-message{display:none;margin-top:10px;color:#b42318;font-size:13px;font-weight:600}
.limit-message.show{display:block}
.limit-hide{display:none !important}
input[type="text"]{flex:1;padding:12px 16px;border:2px solid #e0e0e0;border-radius:8px;font-size:16px}
input[type="text"]:focus{outline:none;border-color:#667eea}
button{padding:12px 24px;background:#667eea;color:white;border:none;border-radius:8px;font-size:16px;cursor:pointer}
button:hover{background:#5a6fd6}
.person-list{list-style:none}
.person-item{display:flex;justify-content:space-between;align-items:center;padding:16px;border-bottom:1px solid #eee}
.person-main{flex:1}
.person-head{display:flex;align-items:center;gap:10px}
.person-avatar{display:inline-flex;align-items:center;justify-content:center;border-radius:50%;overflow:hidden;flex-shrink:0;object-fit:cover;background:#d0d5dd;color:#475467;font-weight:600}
.person-avatar-thumb{width:36px;height:36px;font-size:14px}
.person-avatar-large{width:96px;height:96px;font-size:32px}
.person-avatar-placeholder{background:#d0d5dd;color:#667085}
.person-id{font-family:monospace;color:#666;font-size:14px}
.person-name{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#2f3b59;font-weight:600}
.person-status{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;text-transform:uppercase}
.status-ok{background:#d4edda;color:#155724}
.status-overdue{background:#f8d7da;color:#721c24}
.status-never{background:#fff3cd;color:#856404}
.last-seen{color:#666;font-size:14px;margin-top:4px}
.person-actions{display:flex;align-items:center;gap:10px}
.edit-btn{padding:8px 10px;font-size:16px;line-height:1}
.remove-btn{padding:8px 12px;background:#fff;color:#b42318;border:1px solid #fda29b;border-radius:8px;font-size:14px;cursor:pointer}
.remove-btn:hover{background:#fee4e2}
.secondary-btn{padding:8px 12px;background:#fff;color:#344054;border:1px solid #d0d5dd;border-radius:8px;font-size:14px;cursor:pointer}
.secondary-btn:hover{background:#f9fafb}
.empty-state{text-align:center;padding:40px;color:#666}
.scan-hint{display:block;color:#666;font-size:12px;margin-top:8px}
.camera-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.66);display:none;align-items:center;justify-content:center;padding:16px;z-index:2000}
.camera-overlay.open{display:flex}
.camera-modal{width:100%;max-width:540px;background:#fff;border-radius:14px;padding:16px}
.camera-title{margin-bottom:10px}
.camera-status{color:#556;font-size:14px;margin-bottom:12px}
.camera-status.error{color:#b42318}
.camera-video{display:block;width:100%;max-height:70vh;border-radius:10px;background:#111;object-fit:cover}
.camera-actions{display:flex;justify-content:flex-end;margin-top:14px}
.camera-canvas{display:none}
.edit-overlay{position:fixed;inset:0;background:rgba(16,24,40,0.66);display:none;align-items:center;justify-content:center;padding:16px;z-index:2100}
.edit-overlay.open{display:flex}
.edit-modal{width:100%;max-width:540px;background:#fff;border-radius:14px;padding:20px;box-shadow:0 8px 28px rgba(0,0,0,0.2)}
.edit-title{margin-bottom:16px}
.edit-field{margin-bottom:14px}
.edit-label{font-size:13px;color:#666;margin-bottom:4px}
.edit-value{font-size:15px;color:#101828}
.edit-interval{width:100%;padding:10px 12px;border:1px solid #d0d5dd;border-radius:8px;font-size:15px}
.edit-photo-row{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.edit-photo-input{max-width:100%}
.edit-photo-help{margin-top:6px;font-size:12px;color:#667085}
.edit-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:20px}
@media (max-width:640px){
  body{padding:12px}
  .add-person{flex-direction:column}
  .add-person button{width:100%}
  .camera-actions button{width:100%}
  .edit-actions{flex-direction:column-reverse}
  .edit-actions button{width:100%}
}
.name-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.4);display:none;align-items:center;justify-content:center;z-index:1000;padding:20px;backdrop-filter:blur(4px)}
.name-modal-overlay.open{display:flex}
.name-modal{background:#fff;border-radius:14px;padding:24px;width:100%;max-width:320px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,0.2)}
.name-modal h2{font-size:20px;font-weight:700;margin-bottom:8px}
.name-modal p{font-size:15px;color:#666;margin-bottom:20px}
.name-modal input{width:100%;padding:12px;border:1px solid #d0d5dd;border-radius:10px;font-size:17px;margin-bottom:16px;box-sizing:border-box}
.name-modal button{width:100%;padding:12px;background:#667eea;color:#fff;border:none;border-radius:10px;font-size:16px;cursor:pointer}
.watcher-name{color:#475467;font-size:14px;margin-top:2px;cursor:pointer;display:inline-block}
.watcher-name:hover{text-decoration:underline}
</style>
</head>
<body>
<div id="authOverlay" style="display:none;position:fixed;inset:0;z-index:1000;background:rgba(15,23,42,0.85);align-items:center;justify-content:center;padding:24px">
<div style="background:#fff;border-radius:20px;padding:32px 28px;max-width:360px;width:100%;text-align:center">
<div style="font-size:48px;margin-bottom:12px">🔐</div>
<h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a">Einmalige Einrichtung</h2>
<p style="margin:0 0 24px;color:#475569;font-size:15px">Bitte kurz bestätigen, dass du kein Bot bist.</p>
<div class="cf-turnstile" data-sitekey="__TURNSTILE_SITE_KEY__" data-callback="onTurnstileSuccess"></div>
<p id="authStatus" style="margin-top:16px;color:#ef4444;font-size:14px;min-height:20px"></p>
</div>
</div>
<div class="name-modal-overlay" id="nameModalOverlay">
<form class="name-modal" id="nameModalForm" role="dialog" aria-modal="true" aria-labelledby="nameModalTitle">
<h2 id="nameModalTitle">Wie heißt du?</h2>
<p>Bitte gib deinen Namen ein.</p>
<input id="watcherNameInput" type="text" maxlength="35" placeholder="z.B. Max Mustermann" required>
<button type="submit">Speichern</button>
</form>
</div>
<div class="container">
<h1>iBinda <span id="watcherNameDisplay" class="watcher-name" onclick="askForWatcherName()" title="Namen ändern">-</span></h1>
<p class="subtitle">Verbundene Personen im Blick behalten</p>
<div class="card">
<div class="add-header">
<h3>➕ Verbindung hinzufügen</h3>
<span id="personCounter" class="person-counter">0/- Personen</span>
</div>
<div id="addPersonControls" class="add-person">
<input type="text" id="personId" placeholder="QR-Code oder Pairing-Daten">
<button id="addPersonBtn" onclick="addPerson()">Verbindung hinzufügen</button>
<button type="button" id="openQrScannerBtn" onclick="openQrScanner()">QR scannen</button>
</div>
<div id="personLimitMessage" class="limit-message">Maximal 2 Personen möglich.</div>
<small id="addPersonScanHint" class="scan-hint">QR-Code live mit der Kamera scannen oder die Pairing-Daten einfügen.</small>
</div>
<div class="card">
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:15px">
<h3 style="margin:0">📋 Verbundene Personen</h3>
<button onclick="loadPersons()" style="background:none;border:1px solid #d0d5dd;border-radius:8px;padding:5px 10px;font-size:13px;cursor:pointer;color:#475467">↻ Aktualisieren</button>
</div>
<ul class="person-list" id="personList">
<li class="empty-state">Noch keine verbundenen Personen.</li>
</ul>
</div>
</div>
<div id="cameraOverlay" class="camera-overlay" onclick="handleCameraOverlayClick(event)">
  <div class="camera-modal">
    <h3 class="camera-title">📷 QR-Code scannen</h3>
    <p id="cameraStatus" class="camera-status">Kamera wird gestartet...</p>
    <video id="cameraVideo" class="camera-video" autoplay playsinline muted></video>
    <canvas id="cameraCanvas" class="camera-canvas"></canvas>
    <div class="camera-actions">
      <button type="button" onclick="closeQrScanner()">Abbrechen</button>
    </div>
  </div>
</div>
<div id="personEditOverlay" class="edit-overlay" onclick="handleEditOverlayClick(event)">
  <div class="edit-modal">
    <h3 class="edit-title">Person bearbeiten</h3>
    <div class="edit-field">
      <div class="edit-label">Person ID</div>
      <div id="editPersonId" class="edit-value person-id"></div>
    </div>
    <div class="edit-field">
      <div class="edit-label">Name</div>
      <div id="editPersonName" class="edit-value"></div>
    </div>
    <div class="edit-field">
      <div class="edit-label">Letzter Standort</div>
      <div id="editPersonLocation" class="edit-value"></div>
    </div>
    <div class="edit-field">
      <div class="edit-label">Foto</div>
      <div class="edit-photo-row">
        <div id="editPhotoPreview"></div>
        <input type="file" id="editPhotoInput" class="edit-photo-input" accept="image/*" onchange="handleEditPhotoChange(event)">
      </div>
      <div class="edit-photo-help">Wird nur lokal im Browser gespeichert.</div>
    </div>
    <div class="edit-field">
      <label for="editIntervalSelect" class="edit-label">Alarmintervall</label>
      <select id="editIntervalSelect" class="edit-interval">
        <option value="1">1 Min</option>
        <option value="60">1 Std</option>
        <option value="360">6 Std</option>
        <option value="720">12 Std</option>
        <option value="1440">24 Std</option>
        <option value="2880">48 Std</option>
        <option value="4320">72 Std</option>
      </select>
    </div>
    <div class="edit-actions">
      <button type="button" class="secondary-btn" onclick="closeEditModal()">Abbrechen</button>
      <button type="button" class="remove-btn" onclick="removePersonFromModal()">Entfernen</button>
      <button type="button" id="editSaveBtn" onclick="saveEditedPerson()">Speichern</button>
    </div>
  </div>
</div>
<script>
const API_URL = '/api';
const MAX_DISPLAY_NAME_LENGTH = 35;
function normalizeDisplayName(name){return String(name||'').trim().slice(0,MAX_DISPLAY_NAME_LENGTH)}
function isLetterChar(char){return !!char&&char.toLocaleLowerCase()!==char.toLocaleUpperCase()}
function hasTwoLetterStart(name){const chars=[...String(name||'').trim()];return chars.length>=2&&isLetterChar(chars[0])&&isLetterChar(chars[1])}
function getDisplayNameValidationError(name){const trimmed=String(name||'').trim();if(trimmed.length<2)return'name-too-short';if(trimmed.length>MAX_DISPLAY_NAME_LENGTH)return'name-too-long';if(!hasTwoLetterStart(trimmed))return'name-invalid-start';return''}
function isDisplayNameTooLong(name){return String(name||'').trim().length>MAX_DISPLAY_NAME_LENGTH}
function showDisplayNameValidationError(errorCode){if(errorCode==='name-too-short'){alert('Der Name muss mindestens 2 Zeichen lang sein.')}else if(errorCode==='name-too-long'){alert('Der Name darf maximal 35 Zeichen lang sein.')}else if(errorCode==='name-invalid-start'){alert('Die ersten 2 Zeichen des Namens müssen Buchstaben sein.')}else if(errorCode==='invalid-json'){alert('Die Eingabe enthält kein gültiges Pairing-Format.')}else if(errorCode==='invalid-person-id'){alert('Die Eingabe enthält keine gültige Personen-ID.')}else if(errorCode==='invalid-pairing-token'){alert('Die Eingabe enthält kein gültiges Pairing-Token.')}else if(errorCode==='pairing-required'){alert('Zum Verbinden wird ein gültiger Pairing-Code benötigt. Bitte den aktuellen QR-Code der Person scannen.')}} 

function isRegistered(){return localStorage.getItem('ibinda_registered_watcher')==='1'}
function setRegistered(){localStorage.setItem('ibinda_registered_watcher','1')}
let resolveRegistered=null;
function createWatcherDeviceId(){if(window.crypto&&typeof window.crypto.randomUUID==='function')return window.crypto.randomUUID();if(window.crypto&&typeof window.crypto.getRandomValues==='function'){const bytes=new Uint8Array(16);window.crypto.getRandomValues(bytes);bytes[6]=bytes[6]&15|64;bytes[8]=bytes[8]&63|128;const hex=[...bytes].map(byte=>byte.toString(16).padStart(2,'0')).join('');return hex.slice(0,8)+'-'+hex.slice(8,12)+'-'+hex.slice(12,16)+'-'+hex.slice(16,20)+'-'+hex.slice(20,32)}throw new Error('Secure random device id generation unavailable')}
async function onTurnstileSuccess(token){const statusEl=document.getElementById('authStatus');if(statusEl)statusEl.textContent='Registrierung läuft...';try{const deviceId=localStorage.getItem('ibinda_watcher_device')||(()=>{const id=createWatcherDeviceId();localStorage.setItem('ibinda_watcher_device',id);return id})();const res=await fetch(API_URL+'/auth/register-device',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({device_id:deviceId,turnstile_token:token,role:'watcher'})});if(!res.ok)throw new Error('Fehler '+res.status);setRegistered();const overlay=document.getElementById('authOverlay');if(overlay)overlay.style.display='none';if(statusEl)statusEl.textContent='';if(resolveRegistered){resolveRegistered();resolveRegistered=null}}catch(e){if(statusEl)statusEl.textContent='❌ '+e.message+' – Bitte Seite neu laden.'}}
async function ensureRegistered(){if(isRegistered())return;const overlay=document.getElementById('authOverlay');if(overlay)overlay.style.display='flex';return new Promise(resolve=>{resolveRegistered=resolve})}

const PERSON_NAMES_KEY = 'ibinda_person_names';
const PERSON_NAME_HISTORY_KEY = 'ibinda_person_name_history';
const PERSON_PHOTOS_KEY = 'ibinda_person_photos';
const WATCHED_PERSON_IDS_KEY = 'ibinda_watched_person_ids';
const HIDDEN_PERSON_IDS_KEY = 'ibinda_hidden_person_ids';
let MAX_WATCHED_PERSONS = 2;
function getPersonLimitAlertText() { return 'Maximal ' + MAX_WATCHED_PERSONS + ' ' + (MAX_WATCHED_PERSONS === 1 ? 'Person kann' : 'Personen können') + ' überwacht werden.'; }
const INTERVALS = [
  { min: 1, label: '1 Min' },
  { min: 60, label: '1 Std' },
  { min: 360, label: '6 Std' },
  { min: 720, label: '12 Std' },
  { min: 1440, label: '24 Std' },
  { min: 2880, label: '48 Std' },
  { min: 4320, label: '72 Std' }
];
let cameraStream = null;
let scanFrameRequestId = 0;
let scanContext = null;
let visiblePersonsById = {};
let activeEditPersonId = '';
let currentPersonCount = 0;
let outgoingPairingPollInterval = null;
let outgoingPairingTimeout = null;

function getWatcherId() {
  return localStorage.getItem('ibinda_watcher_id');
}

function clearOutgoingPairingTimers() {
  if (outgoingPairingPollInterval) {
    clearInterval(outgoingPairingPollInterval);
    outgoingPairingPollInterval = null;
  }
  if (outgoingPairingTimeout) {
    clearTimeout(outgoingPairingTimeout);
    outgoingPairingTimeout = null;
  }
}

const WATCHER_NAME_KEY = 'ibinda_watcher_name';
function getWatcherName(){return(localStorage.getItem(WATCHER_NAME_KEY)||'').trim()}
function setWatcherName(name){localStorage.setItem(WATCHER_NAME_KEY,normalizeDisplayName(name))}
function renderWatcherName(){const el=document.getElementById('watcherNameDisplay');if(el)el.textContent=getWatcherName()||'Name eingeben'}
function askForWatcherName(){return new Promise((resolve)=>{const overlay=document.getElementById('nameModalOverlay');const form=document.getElementById('nameModalForm');const input=document.getElementById('watcherNameInput');input.value=getWatcherName()||'';overlay.classList.add('open');input.focus();const onSubmit=(event)=>{event.preventDefault();const rawName=input.value;const errorCode=getDisplayNameValidationError(rawName);if(errorCode){showDisplayNameValidationError(errorCode);return}const name=normalizeDisplayName(rawName);setWatcherName(name);overlay.classList.remove('open');renderWatcherName();announceWatcherName();resolve(name)};form.addEventListener('submit',onSubmit,{once:true})})}
async function ensureWatcherName(){const savedName=getWatcherName();if(savedName)return savedName;return askForWatcherName()}
async function announceWatcherName(){const watcherId=getWatcherId();const name=getWatcherName();if(!watcherId||!name)return;try{await fetch(API_URL+'/watcher/'+watcherId+'/announce',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name})})}catch(e){console.error('Name announce failed',e)}}
const PERSON_ID_REGEX=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidFrontendPersonId(value){return PERSON_ID_REGEX.test(String(value||'').trim())}
function isValidFrontendPairingToken(value){return PERSON_ID_REGEX.test(String(value||'').trim())}

function getStoredList(key) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value) => typeof value === 'string' && value.trim()).map((value) => value.trim());
  } catch (err) {
    return [];
  }
}

function setStoredList(key, values) {
  const uniqueValues = Array.from(new Set((values || []).filter((value) => typeof value === 'string' && value.trim()).map((value) => value.trim())));
  localStorage.setItem(key, JSON.stringify(uniqueValues));
}

function addToStoredList(key, value) {
  if (!value) return;
  const existing = getStoredList(key);
  existing.push(value);
  setStoredList(key, existing);
}

function removeFromStoredList(key, value) {
  if (!value) return;
  const existing = getStoredList(key);
  setStoredList(key, existing.filter((entry) => entry !== value));
}

function getPersonNames() {
  try {
    const raw = localStorage.getItem(PERSON_NAMES_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (err) {
    return {};
  }
}

function setPersonNames(personNames) {
  localStorage.setItem(PERSON_NAMES_KEY, JSON.stringify(personNames));
}

function getPersonNameHistory() {
  try {
    const raw = localStorage.getItem(PERSON_NAME_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (err) {
    return {};
  }
}

function setPersonNameHistory(personNames) {
  localStorage.setItem(PERSON_NAME_HISTORY_KEY, JSON.stringify(personNames));
}

function getPersonPhotos() {
  try {
    const raw = localStorage.getItem(PERSON_PHOTOS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (err) {
    return {};
  }
}

function setPersonPhotos(personPhotos) {
  localStorage.setItem(PERSON_PHOTOS_KEY, JSON.stringify(personPhotos));
}

function getPersonPhoto(personId) {
  const personPhotos = getPersonPhotos();
  const photo = personPhotos[personId];
  return typeof photo === 'string' && photo.startsWith('data:image/') ? photo : '';
}

function storePersonPhoto(personId, photoDataUrl) {
  if (!personId || !photoDataUrl) return;
  const personPhotos = getPersonPhotos();
  personPhotos[personId] = photoDataUrl;
  setPersonPhotos(personPhotos);
}

function getPersonInitial(personId) {
  const base = (getPersonName(personId) || getRememberedPersonName(personId) || personId || '?').trim();
  return base ? base.charAt(0).toUpperCase() : '?';
}

function buildPersonAvatarMarkup(personId, sizeClass) {
  const photo = getPersonPhoto(personId);
  if (photo) {
    return '<img src="' + escapeHtml(photo) + '" alt="" class="person-avatar ' + sizeClass + '">';
  }
  return '<div class="person-avatar person-avatar-placeholder ' + sizeClass + '">' + escapeHtml(getPersonInitial(personId)) + '</div>';
}

function renderEditPhotoPreview(personId) {
  const preview = document.getElementById('editPhotoPreview');
  if (!preview) return;
  preview.innerHTML = buildPersonAvatarMarkup(personId, 'person-avatar-large');
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result.startsWith('data:image/')) {
        reject(new Error('invalid-image'));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(new Error('read-failed'));
    reader.readAsDataURL(file);
  });
}

function storePersonName(personId, name) {
  const safeName = normalizeDisplayName(name);
  if (!personId || !safeName) return;
  const personNames = getPersonNames();
  personNames[personId] = safeName;
  setPersonNames(personNames);
  const historyNames = getPersonNameHistory();
  historyNames[personId] = safeName;
  setPersonNameHistory(historyNames);
}

function getPersonName(personId) {
  const personNames = getPersonNames();
  const name = personNames[personId];
  return typeof name === 'string' ? name : '';
}

function getRememberedPersonName(personId) {
  const personNames = getPersonNameHistory();
  const name = personNames[personId];
  return typeof name === 'string' ? name : '';
}

function removePersonName(personId) {
  const personNames = getPersonNames();
  const existingName = personNames[personId];
  if (typeof existingName === 'string' && existingName.trim()) {
    const historyNames = getPersonNameHistory();
    historyNames[personId] = existingName.trim();
    setPersonNameHistory(historyNames);
  }
  delete personNames[personId];
  setPersonNames(personNames);
}

function getHiddenPersonIds() {
  return getStoredList(HIDDEN_PERSON_IDS_KEY);
}

function hidePersonFromLocalView(personId) {
  addToStoredList(HIDDEN_PERSON_IDS_KEY, personId);
  removeFromStoredList(WATCHED_PERSON_IDS_KEY, personId);
}

function unhidePersonInLocalView(personId) {
  removeFromStoredList(HIDDEN_PERSON_IDS_KEY, personId);
  addToStoredList(WATCHED_PERSON_IDS_KEY, personId);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function toFiniteNumber(value) {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getLastLocation(person) {
  if (!person || typeof person !== 'object') return null;
  const lat = toFiniteNumber(person.last_location_lat);
  const lng = toFiniteNumber(person.last_location_lng);
  if (lat === null || lng === null) return null;
  return { lat, lng };
}

function buildMapsLinkHtml(lat, lng) {
  const mapsUrl = 'https://www.google.com/maps?q=' + encodeURIComponent(lat + ',' + lng);
  return '<a href="' + escapeHtml(mapsUrl) + '" target="_blank" rel="noopener noreferrer" style="color:#667eea;text-decoration:none;">Standort</a>';
}

function buildPersonLocationHtml(person) {
  const location = getLastLocation(person);
  if (!location) return '';
  return '<div style="margin-top:6px;font-size:12px;">📍 ' + buildMapsLinkHtml(location.lat, location.lng) + '</div>';
}

function buildEditLocationHtml(person) {
  const location = getLastLocation(person);
  if (!location) return 'Ohne Standort';
  return '📍 ' + buildMapsLinkHtml(location.lat, location.lng);
}

function parsePersonInput(rawValue) {
  const value = rawValue.trim();
  if (!value) return null;
  const looksLikeJson = value.startsWith('{') || value.startsWith('[');

  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object') {
      const personId = String(parsed.id || parsed.person_id || '').trim();
      const pairingToken = String(parsed.pairing_token || '').trim();
      const name = typeof parsed.name === 'string' ? parsed.name.trim() : '';
      if (name) {
        const nameError = getDisplayNameValidationError(name);
        if (nameError) return { personId, pairingToken: '', name: '', error: nameError };
      }
      if (!personId) return { personId: '', pairingToken: '', name: '', error: 'invalid-json' };
      if (!pairingToken) return { personId, pairingToken: '', name: '', error: 'pairing-required' };
      if (!isValidFrontendPersonId(personId)) return { personId, pairingToken, name: '', error: 'invalid-person-id' };
      if (!isValidFrontendPairingToken(pairingToken)) return { personId, pairingToken, name: '', error: 'invalid-pairing-token' };
      if (personId) return { personId, pairingToken, name };
    }
  } catch (err) {
    if (looksLikeJson) return { personId: '', pairingToken: '', name: '', error: 'invalid-json' };
  }

  try {
    const parsedUrl = new URL(value);
      const personIdFromUrl = (parsedUrl.searchParams.get('id') || parsedUrl.searchParams.get('person_id') || '').trim();
    const pairingTokenFromUrl = (parsedUrl.searchParams.get('pairing_token') || '').trim();
    if (personIdFromUrl && !isValidFrontendPersonId(personIdFromUrl)) return { personId: '', pairingToken: '', name: '', error: 'invalid-person-id' };
    if (pairingTokenFromUrl && !isValidFrontendPairingToken(pairingTokenFromUrl)) return { personId: personIdFromUrl, pairingToken: pairingTokenFromUrl, name: '', error: 'invalid-pairing-token' };
    if (personIdFromUrl && !pairingTokenFromUrl) return { personId: personIdFromUrl, pairingToken: '', name: '', error: 'pairing-required' };
    if (personIdFromUrl) return { personId: personIdFromUrl, pairingToken: pairingTokenFromUrl, name: '' };
  } catch (err) {}

  if (!isValidFrontendPersonId(value)) return { personId: '', pairingToken: '', name: '', error: 'invalid-person-id' };
  return { personId: value, pairingToken: '', name: '', error: 'pairing-required' };
}

function applyPersonCount(count) {
  const safeCount = Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : 0;
  currentPersonCount = safeCount;
  updatePersonLimitUi();
  return currentPersonCount;
}

function updatePersonLimitUi() {
  const isLimitReached = currentPersonCount >= MAX_WATCHED_PERSONS;
  const counter = document.getElementById('personCounter');
  const addControls = document.getElementById('addPersonControls');
  const personInput = document.getElementById('personId');
  const addButton = document.getElementById('addPersonBtn');
  const qrButton = document.getElementById('openQrScannerBtn');
  const limitMessage = document.getElementById('personLimitMessage');
  const scanHint = document.getElementById('addPersonScanHint');

  if (counter) {
    counter.textContent = String(currentPersonCount) + '/' + String(MAX_WATCHED_PERSONS) + ' Personen';
  }
  if (addControls) {
    addControls.classList.toggle('limit-hide', isLimitReached);
  }
  if (personInput) {
    personInput.disabled = isLimitReached;
    personInput.classList.toggle('limit-hide', isLimitReached);
  }
  if (addButton) {
    addButton.disabled = isLimitReached;
    addButton.classList.toggle('limit-hide', isLimitReached);
  }
  if (qrButton) {
    qrButton.disabled = isLimitReached;
    qrButton.classList.toggle('limit-hide', isLimitReached);
  }
  if (limitMessage) {
    limitMessage.textContent = 'Maximal ' + MAX_WATCHED_PERSONS + ' ' + (MAX_WATCHED_PERSONS === 1 ? 'Person' : 'Personen') + ' möglich.';
    limitMessage.classList.toggle('show', isLimitReached);
  }
  if (scanHint) {
    scanHint.classList.toggle('limit-hide', isLimitReached);
  }
}

function showPersonLimitAlert() {
  alert(getPersonLimitAlertText());
}

async function refreshPersonCount() {
  try {
    const response = await fetch(API_URL + '/watcher/' + getWatcherId() + '/persons');
    if (!response.ok) throw new Error('count-fetch-failed');
    const personsRaw = await response.json();
    const persons = Array.isArray(personsRaw) ? personsRaw : [];
    const hiddenPersonIds = new Set(getHiddenPersonIds());
    const visibleCount = persons.filter((person) => !hiddenPersonIds.has(person.id)).length;
    return applyPersonCount(visibleCount);
  } catch (err) {
    updatePersonLimitUi();
    return currentPersonCount;
  }
}

async function ensureCanAddPerson() {
  const count = await refreshPersonCount();
  if (count >= MAX_WATCHED_PERSONS) {
    showPersonLimitAlert();
    return false;
  }
  return true;
}

function setCameraStatus(message, isError) {
  const statusElement = document.getElementById('cameraStatus');
  statusElement.textContent = message;
  statusElement.className = isError ? 'camera-status error' : 'camera-status';
}

function stopQrScanner() {
  if (scanFrameRequestId) {
    cancelAnimationFrame(scanFrameRequestId);
    scanFrameRequestId = 0;
  }
  const video = document.getElementById('cameraVideo');
  if (video) {
    video.pause();
    video.srcObject = null;
  }
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  }
  scanContext = null;
}

function closeQrScanner() {
  stopQrScanner();
  document.getElementById('cameraOverlay').classList.remove('open');
}

function handleCameraOverlayClick(event) {
  if (event.target === event.currentTarget) closeQrScanner();
}

function scanQrFrame() {
  if (!cameraStream) return;
  const video = document.getElementById('cameraVideo');
  const canvas = document.getElementById('cameraCanvas');
  if (!video || !canvas) return;

  if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    if (!scanContext) scanContext = canvas.getContext('2d', { willReadFrequently: true });
    if (scanContext) {
      scanContext.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = scanContext.getImageData(0, 0, canvas.width, canvas.height);
      const result = window.jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth'
      });
      const qrText = result && typeof result.data === 'string' ? result.data.trim() : '';
      if (qrText) {
        closeQrScanner();
        ensureCanAddPerson().then((canAdd) => {
          if (!canAdd) return;
          const parsedInput = parsePersonInput(qrText);
          if (parsedInput?.error) {
            showDisplayNameValidationError(parsedInput.error);
            return;
          }
          if (!parsedInput?.personId) return;
          if (parsedInput.name) storePersonName(parsedInput.personId, parsedInput.name);
          document.getElementById('personId').value = qrText;
          addPerson();
        });
        return;
      }
    }
  }

  scanFrameRequestId = requestAnimationFrame(scanQrFrame);
}

async function openQrScanner() {
  const canAdd = await ensureCanAddPerson();
  if (!canAdd) return;
  const overlay = document.getElementById('cameraOverlay');
  overlay.classList.add('open');
  setCameraStatus('Kamera wird gestartet...', false);

  if (typeof window.jsQR !== 'function') {
    setCameraStatus('QR-Scanner konnte nicht geladen werden.', true);
    return;
  }
  if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
    setCameraStatus('Dieser Browser unterstützt keine Kamera im Web.', true);
    return;
  }

  stopQrScanner();
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    });
    const video = document.getElementById('cameraVideo');
    video.srcObject = cameraStream;
    await video.play();
    setCameraStatus('QR-Code vor die Kamera halten.', false);
    scanQrFrame();
  } catch (err) {
    stopQrScanner();
    const errorName = err && err.name ? err.name : '';
    if (errorName === 'NotAllowedError') {
      setCameraStatus('Kamerazugriff verweigert. Bitte Berechtigung im Browser erlauben.', true);
    } else if (errorName === 'NotFoundError' || errorName === 'OverconstrainedError') {
      setCameraStatus('Keine geeignete Kamera gefunden.', true);
    } else {
      setCameraStatus('Kamera konnte nicht gestartet werden.', true);
    }
  }
}

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  closeQrScanner();
  closeEditModal();
});

async function init() {
  await ensureRegistered();
  await ensureWatcherName();
  renderWatcherName();
  updatePersonLimitUi();
  if (!getWatcherId()) {
    const res = await fetch(API_URL + '/watcher', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ push_token: 'web-' + crypto.randomUUID() })
    });
    const data = await res.json();
    localStorage.setItem('ibinda_watcher_id', data.id);
  }
  await announceWatcherName();
  const watcherMeta = await fetch(API_URL + '/watcher/' + getWatcherId()).then(r => r.ok ? r.json() : null).catch(() => null);
  if (watcherMeta?.max_persons) MAX_WATCHED_PERSONS = watcherMeta.max_persons;
  updatePersonLimitUi();
  loadPersons();
}

async function pollOutgoingPairing(pairingToken, personId, personName) {
  try {
    const response = await fetch(API_URL + '/pair/' + encodeURIComponent(pairingToken));
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || ('Pairing status failed: ' + response.status));
    if (data.status === 'requested' || data.status === 'pending') return;
    clearOutgoingPairingTimers();
    if (data.status === 'completed') {
      if (personName) {
        storePersonName(personId, personName);
      } else {
        const rememberedName = getRememberedPersonName(personId);
        if (rememberedName) storePersonName(personId, rememberedName);
      }
      unhidePersonInLocalView(personId);
      await loadPersons();
      alert('Verbindung bestätigt.');
      return;
    }
    if (data.status === 'rejected') {
      alert('Die Person hat die Verbindung abgelehnt.');
      return;
    }
    if (data.status === 'expired') {
      alert('Die Verbindungsanfrage ist abgelaufen.');
      return;
    }
  } catch (err) {
    console.error('Outgoing pairing poll failed', err);
    clearOutgoingPairingTimers();
  }
}

function startOutgoingPairingPolling(pairingToken, personId, personName) {
  clearOutgoingPairingTimers();
  pollOutgoingPairing(pairingToken, personId, personName);
  outgoingPairingPollInterval = setInterval(() => {
    pollOutgoingPairing(pairingToken, personId, personName);
  }, 3000);
  outgoingPairingTimeout = setTimeout(() => {
    clearOutgoingPairingTimers();
  }, 300000);
}

async function addPerson() {
  const canAdd = await ensureCanAddPerson();
  if (!canAdd) return;
  const inputValue = document.getElementById('personId').value.trim();
  if (!inputValue) return;
  const parsedInput = parsePersonInput(inputValue);
  if (parsedInput?.error) {
    showDisplayNameValidationError(parsedInput.error);
    return;
  }
  if (!parsedInput) return;
  const personId = parsedInput.personId;
  const pairingToken = parsedInput.pairingToken;
  if (!personId) return;
  if (!pairingToken) {
    showDisplayNameValidationError('pairing-required');
    return;
  }
  
  try {
    const watchRes = await fetch(API_URL + '/pair/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pairing_token: pairingToken, watcher_name: getWatcherName() })
    });
    const responseData = await watchRes.json().catch(() => ({}));
    if (!watchRes.ok) throw new Error(responseData.error || ('Verbindung konnte nicht hinzugefügt werden (Status ' + watchRes.status + ')'));
    document.getElementById('personId').value = '';
    alert('Anfrage gesendet. Die Person muss die Verbindung jetzt bestätigen.');
    startOutgoingPairingPolling(pairingToken, personId, parsedInput.name || '');
  } catch (err) {
    alert('Fehler: ' + err.message);
  }
}

async function updateInterval(personId, minutes) {
  const response = await fetch(API_URL + '/watch', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ person_id: personId, watcher_id: getWatcherId(), check_interval_minutes: parseInt(minutes, 10) })
  });
  if (!response.ok) {
    throw new Error('Intervall konnte nicht gespeichert werden.');
  }
}

function getIntervalLabel(minutes) {
  const match = INTERVALS.find((interval) => interval.min === Number(minutes));
  return match ? match.label : String(minutes) + ' Min';
}

function openEditModal(personId) {
  const person = visiblePersonsById[personId];
  if (!person) return;
  activeEditPersonId = personId;
  const personName = getPersonName(personId) || getRememberedPersonName(personId);
  document.getElementById('editPersonId').textContent = personId;
  document.getElementById('editPersonName').textContent = personName || 'Nicht gesetzt';
  document.getElementById('editPersonLocation').innerHTML = buildEditLocationHtml(person);
  const intervalSelect = document.getElementById('editIntervalSelect');
  intervalSelect.value = String(person.check_interval_minutes);
  if (intervalSelect.value !== String(person.check_interval_minutes)) {
    intervalSelect.value = '1440';
  }
  renderEditPhotoPreview(personId);
  const photoInput = document.getElementById('editPhotoInput');
  if (photoInput) photoInput.value = '';
  document.getElementById('personEditOverlay').classList.add('open');
}

function closeEditModal() {
  activeEditPersonId = '';
  const photoInput = document.getElementById('editPhotoInput');
  if (photoInput) photoInput.value = '';
  document.getElementById('personEditOverlay').classList.remove('open');
}

function handleEditOverlayClick(event) {
  if (event.target === event.currentTarget) closeEditModal();
}

async function saveEditedPerson() {
  if (!activeEditPersonId) return;
  const personId = activeEditPersonId;
  const saveButton = document.getElementById('editSaveBtn');
  const intervalSelect = document.getElementById('editIntervalSelect');
  const selectedMinutes = intervalSelect.value;
  saveButton.disabled = true;
  try {
    await updateInterval(personId, selectedMinutes);
    closeEditModal();
    await loadPersons();
  } catch (err) {
    alert(err && err.message ? err.message : 'Intervall konnte nicht gespeichert werden.');
  } finally {
    saveButton.disabled = false;
  }
}

async function removePersonFromModal() {
  if (!activeEditPersonId) return;
  const personId = activeEditPersonId;
  const removed = await removePersonFromLocalView(personId);
  if (removed) closeEditModal();
}

async function handleEditPhotoChange(event) {
  if (!activeEditPersonId) return;
  const input = event && event.target ? event.target : null;
  const file = input && input.files && input.files[0] ? input.files[0] : null;
  if (!file) return;
  if (typeof file.type === 'string' && !file.type.startsWith('image/')) {
    alert('Bitte eine Bilddatei auswählen.');
    if (input) input.value = '';
    return;
  }

  try {
    const photoDataUrl = await fileToDataUrl(file);
    storePersonPhoto(activeEditPersonId, photoDataUrl);
    renderEditPhotoPreview(activeEditPersonId);
    await loadPersons();
  } catch (err) {
    alert('Foto konnte nicht gespeichert werden.');
  } finally {
    if (input) input.value = '';
  }
}

function buildPersonRow(p) {
  const lastSeen = p.last_heartbeat 
    ? 'Letzte Meldung: ' + new Date(p.last_heartbeat).toLocaleString('de-DE')
    : 'Noch nie gemeldet';
  const personName = getPersonName(p.id);
  const idLabel = personName
    ? '<span class="person-name">' + escapeHtml(personName) + '</span>'
    : '<span class="person-id">' + escapeHtml(p.id) + '</span>';
  const locationHtml = buildPersonLocationHtml(p);
  
  return '<li class="person-item">' +
    '<div class="person-main">' +
      '<div class="person-head">' +
        buildPersonAvatarMarkup(p.id, 'person-avatar-thumb') +
        '<div>' + idLabel + '</div>' +
      '</div>' +
      '<div class="last-seen">' + lastSeen + '</div>' +
      locationHtml +
      '<div style="margin-top:8px;font-size:12px;color:#888">' +
        '⏰ Alarm nach: ' + escapeHtml(getIntervalLabel(p.check_interval_minutes)) +
      '</div>' +
    '</div>' +
    '<div class="person-actions">' +
      '<span class="person-status status-' + p.status + '">' + p.status + '</span>' +
      '<button type="button" class="edit-btn" data-person-id="' + escapeHtml(p.id) + '" aria-label="Bearbeiten" title="Bearbeiten">✏️</button>' +
    '</div>' +
  '</li>';
}

async function removePersonFromLocalView(personId) {
  if (!personId) return false;
  const watcherId = getWatcherId();
  if (!watcherId) return false;
  const personName = getPersonName(personId) || getRememberedPersonName(personId);
  const label = personName ? personName + ' (' + personId + ')' : personId;
  const confirmed = confirm('Verbindung mit "' + label + '" entfernen?');
  if (!confirmed) return false;
  try {
    const res = await fetch(API_URL + '/watch', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ person_id: personId, watcher_id: watcherId })
    });
    if (!res.ok) throw new Error('Server error ' + res.status);
  } catch (e) {
    alert('Entfernen fehlgeschlagen. Bitte erneut versuchen.');
    return false;
  }
  removePersonName(personId);
  hidePersonFromLocalView(personId);
  const visiblePersonIds = Object.keys(visiblePersonsById);
  const recalculatedCount = visiblePersonIds.includes(personId)
    ? visiblePersonIds.length - 1
    : visiblePersonIds.length;
  applyPersonCount(recalculatedCount);
  loadPersons();
  return true;
}

async function loadPersons() {
  const res = await fetch(API_URL + '/watcher/' + getWatcherId() + '/persons');
  const personsRaw = await res.json();
  const persons = Array.isArray(personsRaw) ? personsRaw : [];
  const hiddenPersonIds = new Set(getHiddenPersonIds());
  const STATUS_ORDER = { overdue: 0, never: 1, ok: 2 };
  const visiblePersons = persons
    .filter((person) => !hiddenPersonIds.has(person.id))
    .sort((a, b) => (STATUS_ORDER[a.status] ?? 2) - (STATUS_ORDER[b.status] ?? 2));
  applyPersonCount(visiblePersons.length);
  visiblePersonsById = {};
  for (const person of visiblePersons) visiblePersonsById[person.id] = person;
  const watchedPersonIds = getStoredList(WATCHED_PERSON_IDS_KEY);
  for (const person of visiblePersons) watchedPersonIds.push(person.id);
  setStoredList(WATCHED_PERSON_IDS_KEY, watchedPersonIds);
  const list = document.getElementById('personList');
  if (visiblePersons.length === 0) {
    list.innerHTML = '<li class="empty-state">Noch keine verbundenen Personen.</li>';
    closeEditModal();
    return;
  }
  list.innerHTML = visiblePersons.map(buildPersonRow).join('');
  if (activeEditPersonId && !visiblePersonsById[activeEditPersonId]) {
    closeEditModal();
  }
  list.querySelectorAll('.edit-btn').forEach((button) => {
    button.addEventListener('click', (event) => {
      const target = event.currentTarget;
      const personId = target ? target.getAttribute('data-person-id') : '';
      if (!personId) return;
      openEditModal(personId);
    });
  });
}

init();
setInterval(loadPersons, 30000);
</script>
</body>
</html>`;

const app = new Hono<AppEnv>();

app.get('/', (c) =>
  c.html(`<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>I bin da</title>
<style>
:root{
  --ios-bg:#f2f2f7;
  --ios-card:#ffffff;
  --ios-text:#111111;
  --ios-sub:#6b7280;
  --green:#34c759;
  --blue:#0a84ff;
}
*{box-sizing:border-box}
body{
  margin:0;
  min-height:100vh;
  font-family:"SF Pro Text","SF Pro Display",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  background:var(--ios-bg);
  color:var(--ios-text);
}
.wrap{
  max-width:980px;
  margin:0 auto;
  padding:28px 18px 34px;
}
.header{
  text-align:center;
  margin-bottom:18px;
}
.logo{
  width:74px;
  height:74px;
  border-radius:22px;
  margin:0 auto 12px;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:36px;
  background:linear-gradient(135deg,#ffffff 0%,#e5e7eb 100%);
  box-shadow:0 10px 24px rgba(0,0,0,0.12);
}
h1{
  margin:0;
  font-size:34px;
  line-height:1.1;
  font-weight:800;
  letter-spacing:-0.02em;
}
.subtitle{
  margin:8px 0 0;
  font-size:17px;
  color:var(--ios-sub);
}
.tiles{
  margin-top:20px;
  display:grid;
  grid-template-columns:1fr;
  gap:14px;
}
.tile{
  display:block;
  text-decoration:none;
  min-height:180px;
  background:var(--ios-card);
  border-radius:18px;
  padding:18px;
  box-shadow:0 8px 22px rgba(17,24,39,0.1);
  border:1px solid rgba(17,24,39,0.06);
  transition:transform 140ms ease,box-shadow 140ms ease;
}
.tile:active{
  transform:scale(0.985);
}
.tile-inner{
  min-height:144px;
  display:flex;
  flex-direction:column;
  justify-content:center;
  gap:8px;
}
.icon{
  width:64px;
  height:64px;
  border-radius:16px;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:30px;
  color:#fff;
}
.icon.person{background:linear-gradient(180deg,#52d769 0%,var(--green) 100%)}
.icon.watcher{background:linear-gradient(180deg,#3d98ff 0%,var(--blue) 100%)}
.title{
  margin:0;
  font-size:28px;
  font-weight:760;
  line-height:1.15;
  letter-spacing:-0.01em;
}
.desc{
  margin:0;
  color:var(--ios-sub);
  font-size:16px;
  line-height:1.35;
}
.tile:focus-visible{
  outline:3px solid #ff9f0a;
  outline-offset:3px;
}
@media (min-width:760px){
  .wrap{padding:46px 26px 46px}
  .tiles{grid-template-columns:1fr 1fr;gap:18px}
  .tile:hover{
    transform:translateY(-2px);
    box-shadow:0 12px 28px rgba(17,24,39,0.14);
  }
}
</style>
</head>
<body>
  <main class="wrap">
    <header class="header">
      <div class="logo" aria-hidden="true">📍</div>
      <h1>I bin da</h1>
      <p class="subtitle">Wähle deine Ansicht, um direkt loszulegen.</p>
    </header>
    <section class="tiles" aria-label="Startoptionen">
      <a class="tile" href="/person.html">
        <div class="tile-inner">
          <div class="icon person" aria-hidden="true">👋</div>
          <h2 class="title">Ich bin da</h2>
          <p class="desc">Für Personen: schnell den aktuellen Status senden.</p>
        </div>
      </a>
      <a class="tile" href="/watcher.html">
        <div class="tile-inner">
          <div class="icon watcher" aria-hidden="true">👁️</div>
          <h2 class="title">Betreuer</h2>
          <p class="desc">Für Betreuende: Status und letzte Meldung einsehen.</p>
        </div>
      </a>
    </section>
  </main>
</body>
</html>`)
);
app.get('/person.html', (c) => c.html(PERSON_HTML.replace('__TURNSTILE_SITE_KEY__', resolveTurnstileSiteKey(c.req.url, c.env.TURNSTILE_SITE_KEY, c.req.header('host')))));
app.get('/watcher.html', (c) => c.html(WATCHER_HTML.replace('__TURNSTILE_SITE_KEY__', resolveTurnstileSiteKey(c.req.url, c.env.TURNSTILE_SITE_KEY, c.req.header('host')))));

app.use('*', async (c, next) => {
  await next();
  applySecurityHeaders(c);
});

registerApiRoutes(app);

export default {
  async fetch(request: Request, env: AppBindings, ctx: ExecutionContext) {
    return app.fetch(request, env, ctx);
  },
  async scheduled(event: ScheduledEvent, env: AppBindings, ctx: ExecutionContext) {
    ctx.waitUntil(Promise.all([
      checkOverduePersons(env.DB, env.EXPO_ACCESS_TOKEN),
      cleanupPairingRequests(env.DB),
    ]));
  },
};
