export const PERSON_HTML = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
<title>iBinda - Ich bin okay</title>
<script>__QRCODE_SCRIPT__</script>
<script>__JSQR_SCRIPT__</script>
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
  font-family: "SF Pro Rounded", "Avenir Next Rounded", "Nunito Sans", ui-rounded, -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif;
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

.btn-okay.setup {
  background: var(--system-orange);
  box-shadow: 0 10px 40px rgba(255, 149, 0, 0.35);
  font-size: 34px;
  line-height: 1.05;
  text-align: center;
  padding: 0 24px;
}

.btn-okay.setup:active {
  background: #d67d00;
  box-shadow: 0 4px 15px rgba(255, 149, 0, 0.28);
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
.no-watcher-warning-text { margin-bottom: 0; }

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
<p id="pairingQrDescription">Jemand kann diesen Code scannen, um sich mit dir zu verbinden.</p>
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

<div class="pairing-modal-overlay" id="disconnectModalOverlay">
<div class="pairing-modal" role="dialog" aria-modal="true" aria-labelledby="disconnectModalTitle">
<h2 id="disconnectModalTitle">Verbindung geändert</h2>
<p id="disconnectModalText">Eine Verbindung ist nicht mehr verfügbar.</p>
<small id="disconnectModalStatus" class="qr-copy-status" aria-live="polite"></small>
<div class="pairing-modal-actions">
  <button type="button" class="pairing-primary-btn" id="disconnectModalAcknowledgeBtn" onclick="acknowledgeDisconnectEvents()">Verstanden</button>
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

  <div class="settings-section" id="deviceActionSection">
    <h3 id="deviceActionTitle">Auf anderes Gerät wechseln</h3>
    <button type="button" class="qr-scan-btn" id="deviceActionButton" onclick="startDeviceQrScan()">QR-Code scannen</button>
    <div id="deviceQrScanner" class="qr-scanner-container"></div>
    <small class="settings-help" id="deviceActionHelp">Scanne den QR-Code eines neuen Geräts. Der ursprünglich vergebene Name bleibt unverändert.</small>
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
<button class="btn-okay" id="btnOkay" onclick="handlePrimaryAction()" aria-label="Aktion ausführen">OK<span class="btn-sub">Alles gut</span></button>
<div id="status" class="status" aria-live="polite">Verbindung wird geprüft...</div>
<div id="sendErrorCard" class="send-error-card" role="alert"></div>
<div class="cooldown-container" id="cooldownContainer">
<div class="cooldown-text">Bitte kurz warten...</div>
<div class="cooldown-bar"><div class="cooldown-progress" id="cooldownProgress"></div></div>
<div class="cooldown-countdown" id="cooldownCountdown">5:00</div>
</div>
<div class="last-checkin" id="lastCheckin"></div>
<div id="noWatcherWarning" class="no-watcher-warning">
  <div class="no-watcher-warning-text">⚠️ Noch keine Verbindung eingerichtet</div>
</div>
</div>

<script>
const API_URL='/api';
const PERSON_NAME_KEY='ibinda_person_name';
const DEVICE_ID_KEY='ibinda_device_id';
let currentPersonId=null;
let currentPersonName='';
let currentDeviceId='';
let currentPersonMaxDevices=1;
let currentPersonDeviceCount=0;
let currentPersonDeviceAction='switch';

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
let currentQrModalMode='pairing';
let currentDeviceLinkToken='';
let currentDeviceLinkMode='switch';
let pendingDisconnectEvents=[];
let watcherRefreshInterval=null;
let hasActiveWatcherConnection=false;
let isResettingPersonApp=false;
const WATCHER_REFRESH_INTERVAL_MS=30000;

function clearPairingTimers(){if(pairingPollInterval){clearInterval(pairingPollInterval);pairingPollInterval=null}if(pairingRefreshTimeout){clearTimeout(pairingRefreshTimeout);pairingRefreshTimeout=null}}
function isSettingsOpen(){const panel=document.getElementById('settingsPanel');return !!panel&&panel.classList.contains('open')}
function isPairingQrModalOpen(){const overlay=document.getElementById('pairingQrModalOverlay');return !!overlay&&overlay.classList.contains('open')}
function isPairingRequestModalOpen(){const overlay=document.getElementById('pairingRequestModalOverlay');return !!overlay&&overlay.classList.contains('open')}
function isDisconnectModalOpen(){const overlay=document.getElementById('disconnectModalOverlay');return !!overlay&&overlay.classList.contains('open')}
function setPairingRequestStatus(message,isError){const statusEl=document.getElementById('pairingRequestStatus');if(!statusEl)return;statusEl.textContent=message||'';statusEl.classList.toggle('error',!!isError)}
function setDisconnectModalStatus(message,isError){const statusEl=document.getElementById('disconnectModalStatus');if(!statusEl)return;statusEl.textContent=message||'';statusEl.classList.toggle('error',!!isError)}
function setQrModalCopyButtonLabel(label){const button=document.querySelector('.qr-copy-btn');if(button)button.textContent=label}
function setQrModalContent(title,description){const titleEl=document.getElementById('pairingQrTitle');const descriptionEl=document.getElementById('pairingQrDescription');if(titleEl)titleEl.textContent=title;if(descriptionEl)descriptionEl.textContent=description}
function openPairingQrModal(forceRefresh){const overlay=document.getElementById('pairingQrModalOverlay');if(!overlay||!currentPersonId)return;currentQrModalMode='pairing';setQrModalContent('QR-Code anzeigen','Jemand kann diesen Code scannen, um sich mit dir zu verbinden.');setQrModalCopyButtonLabel('QR kopieren');overlay.classList.add('open');setQrCopyStatus('',false);renderCurrentQrCode(!!forceRefresh)}
function openDeviceLinkQrModal(mode){const overlay=document.getElementById('pairingQrModalOverlay');if(!overlay||!currentPersonId)return;currentQrModalMode='device-link';currentDeviceLinkMode=mode==='add'?'add':'switch';setQrModalContent(currentDeviceLinkMode==='add'?'Neues Gerät hinzufügen':'Auf anderes Gerät wechseln',currentDeviceLinkMode==='add'?'Scanne diesen QR-Code mit dem neuen unverbundenen Gerät, um es zusätzlich hinzuzufügen.':'Scanne diesen QR-Code mit dem neuen unverbundenen Gerät, um dieses Gerät zu ersetzen.');setQrModalCopyButtonLabel('Transfer-QR kopieren');overlay.classList.add('open');setQrCopyStatus('',false);renderCurrentQrCode(true)}
function clearQrCodeElement(id){const qrEl=document.getElementById(id);if(qrEl)qrEl.innerHTML=''}
function closePairingQrModal(resetState=true){const overlay=document.getElementById('pairingQrModalOverlay');if(overlay)overlay.classList.remove('open');clearQrCodeElement('qrcode');if(resetState&&!isSettingsOpen()&&!isPairingRequestModalOpen()){clearPairingTimers();currentPairingToken=''}currentDeviceLinkToken='';currentQrModalMode='pairing';setQrCopyStatus('',false)}
function hideDisconnectModal(){const overlay=document.getElementById('disconnectModalOverlay');const button=document.getElementById('disconnectModalAcknowledgeBtn');if(overlay)overlay.classList.remove('open');setDisconnectModalStatus('',false);if(button)button.disabled=false}
function getDisconnectDisplayNames(events){return events.map((event)=>{if(event&&typeof event.watcher_name==='string'&&event.watcher_name.trim())return event.watcher_name.trim();if(event&&typeof event.watcher_id==='string')return getWatcherDisplayName(event.watcher_id);return'Eine verbundene Person'})}
function buildDisconnectModalMessage(events){const names=getDisconnectDisplayNames(events);if(names.length===0)return'Eine verbundene Person ist nicht mehr mit dir verbunden. Bitte prüfe, ob noch jemand deinen Status sehen kann.';if(names.length===1)return names[0]+' ist nicht mehr mit dir verbunden. Bitte prüfe, ob noch jemand deinen Status sehen kann.';if(names.length===2)return names[0]+' und '+names[1]+' sind nicht mehr mit dir verbunden. Bitte prüfe, ob noch jemand deinen Status sehen kann.';return names[0]+' und '+(names.length-1)+' weitere Personen sind nicht mehr mit dir verbunden. Bitte prüfe, ob noch jemand deinen Status sehen kann.'}
function showDisconnectModal(events){const overlay=document.getElementById('disconnectModalOverlay');const text=document.getElementById('disconnectModalText');pendingDisconnectEvents=Array.isArray(events)?events:[];if(!overlay||pendingDisconnectEvents.length===0)return;setDisconnectModalStatus('',false);if(text)text.textContent=buildDisconnectModalMessage(pendingDisconnectEvents);overlay.classList.add('open')}
function hidePairingRequest(){const overlay=document.getElementById('pairingRequestModalOverlay');const text=document.getElementById('pairingRequestText');const approveBtn=document.getElementById('pairingApproveBtn');const rejectBtn=document.getElementById('pairingRejectBtn');currentPairingRequestName='';if(overlay)overlay.classList.remove('open');if(text)text.textContent='Mit jemandem verbinden?';setPairingRequestStatus('',false);if(approveBtn)approveBtn.disabled=false;if(rejectBtn)rejectBtn.disabled=false;if(pendingDisconnectEvents.length)showDisconnectModal(pendingDisconnectEvents)}
function showPairingRequest(name){const overlay=document.getElementById('pairingRequestModalOverlay');const text=document.getElementById('pairingRequestText');const displayName=(name||'jemandem');closePairingQrModal(false);hideDisconnectModal();currentPairingRequestName=displayName;if(text)text.textContent='Mit '+displayName+' verbinden?';setPairingRequestStatus('',false);if(overlay)overlay.classList.add('open')}
function buildPairingQrPayload(){if(!currentPersonId||!currentPairingToken)return'';return JSON.stringify({person_id:currentPersonId,pairing_token:currentPairingToken,name:currentPersonName||getPersonName()})}
function buildDeviceLinkQrPayload(){if(!currentDeviceLinkToken)return'';return JSON.stringify({type:'person-device-link',link_token:currentDeviceLinkToken,device_mode:currentDeviceLinkMode,person_name:currentPersonName||getPersonName()})}
function buildActiveQrPayload(){return currentQrModalMode==='device-link'?buildDeviceLinkQrPayload():buildPairingQrPayload()}
let qrCopyStatusTimeout=null;
function setQrCopyStatus(message,isError){const statusEl=document.getElementById('qrCopyStatus');if(!statusEl)return;statusEl.textContent=message||'';statusEl.classList.toggle('error',!!isError);if(qrCopyStatusTimeout){clearTimeout(qrCopyStatusTimeout);qrCopyStatusTimeout=null}if(message){qrCopyStatusTimeout=setTimeout(()=>{statusEl.textContent='';statusEl.classList.remove('error');qrCopyStatusTimeout=null},1600)}}
async function copyQrPayload(event){if(event&&typeof event.stopPropagation==='function')event.stopPropagation();const qrPayload=buildActiveQrPayload();if(!qrPayload){setQrCopyStatus('QR-Code wird vorbereitet',true);return}if(!navigator.clipboard||typeof navigator.clipboard.writeText!=='function'){setQrCopyStatus('Kopieren nicht verfügbar',true);return}try{await navigator.clipboard.writeText(qrPayload);setQrCopyStatus('Kopiert!',false)}catch(e){console.error('QR payload copy failed',e);setQrCopyStatus('Kopieren fehlgeschlagen',true)}}
async function createPairingToken(){if(!currentPersonId)throw new Error('Keine Person ID');const res=await fetch(API_URL+'/pair/create',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({person_id:currentPersonId})});if(!res.ok)throw new Error('Pairing create failed: '+res.status);const data=await res.json();if(!data.pairing_token)throw new Error('Pairing token missing');return data.pairing_token}
async function createDeviceLinkToken(mode){if(!currentPersonId)throw new Error('Keine Person ID');const res=await fetch(API_URL+'/person/'+encodeURIComponent(currentPersonId)+'/device-link/create',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode})});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||('Device link create failed: '+res.status));if(!data.link_token)throw new Error('Device link token missing');return data.link_token}
async function acknowledgeDisconnectEvents(){if(!currentPersonId||pendingDisconnectEvents.length===0){hideDisconnectModal();return}const button=document.getElementById('disconnectModalAcknowledgeBtn');const eventIds=pendingDisconnectEvents.map((event)=>Number(event.id)).filter((id)=>Number.isInteger(id)&&id>0);if(eventIds.length===0){pendingDisconnectEvents=[];hideDisconnectModal();return}if(button)button.disabled=true;setDisconnectModalStatus('',false);try{const res=await fetch(API_URL+'/person/'+encodeURIComponent(currentPersonId)+'/disconnect-events/ack',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event_ids:eventIds})});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||('Bestätigung fehlgeschlagen: '+res.status));pendingDisconnectEvents=[];hideDisconnectModal();await loadWatchers(currentPersonId)}catch(e){console.error('Disconnect acknowledge failed',e);setDisconnectModalStatus(e&&e.message?e.message:'Bestätigung fehlgeschlagen',true);if(button)button.disabled=false}}
async function respondToPairingRequest(action){if(!currentPairingToken)return;const approveBtn=document.getElementById('pairingApproveBtn');const rejectBtn=document.getElementById('pairingRejectBtn');if(approveBtn)approveBtn.disabled=true;if(rejectBtn)rejectBtn.disabled=true;setPairingRequestStatus('',false);try{const res=await fetch(API_URL+'/pair/confirm',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pairing_token:currentPairingToken,action})});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||('Pairing confirm failed: '+res.status));hidePairingRequest();if(action==='approve'){currentPairingToken='';clearPairingTimers();if(currentPersonId)loadWatchers(currentPersonId);return}openPairingQrModal(true)}catch(e){console.error('Pairing confirm failed',e);setPairingRequestStatus(e&&e.message?e.message:'Bestätigung fehlgeschlagen',true);if(approveBtn)approveBtn.disabled=false;if(rejectBtn)rejectBtn.disabled=false}}
async function pollPairingStatus(pairingToken){if(!currentPersonId||!pairingToken)return;try{const res=await fetch(API_URL+'/pair/'+encodeURIComponent(pairingToken));if(!res.ok){if(res.status===404)return;throw new Error('Pairing poll failed: '+res.status)}const data=await res.json();if(data.status==='requested'){showPairingRequest(data.watcher_name||'jemandem');return}hidePairingRequest();if(data.status==='completed'){clearPairingTimers();currentPairingToken='';closePairingQrModal(false);loadWatchers(currentPersonId);return}if(data.status==='expired'){setQrCopyStatus('QR-Code wird erneuert...',false);await renderQrCode(true)}}catch(e){console.error('Pairing poll failed',e)}}
function startPairingPolling(pairingToken){clearPairingTimers();pollPairingStatus(pairingToken);pairingPollInterval=setInterval(()=>{pollPairingStatus(pairingToken)},5000);pairingRefreshTimeout=setTimeout(()=>{renderQrCode(true)},300000)}
function renderQrCodeInto(id,qrPayload){const qrEl=document.getElementById(id);if(!qrEl)return;qrEl.innerHTML='';new QRCode(qrEl,{text:qrPayload,width:180,height:180});qrEl.onclick=copyQrPayload}
async function renderQrCode(forceRefresh){if(!currentPersonId)return;clearPairingTimers();hidePairingRequest();if(forceRefresh||!currentPairingToken){try{currentPairingToken=await createPairingToken()}catch(e){console.error('QR render failed',e);setQrCopyStatus('QR-Code konnte nicht erstellt werden',true);return}}const qrPayload=buildPairingQrPayload();if(!qrPayload)return;renderQrCodeInto('qrcode',qrPayload);startPairingPolling(currentPairingToken)}
async function renderCurrentQrCode(forceRefresh){if(currentQrModalMode==='device-link'){clearPairingTimers();hidePairingRequest();if(forceRefresh||!currentDeviceLinkToken){try{currentDeviceLinkToken=await createDeviceLinkToken(currentDeviceLinkMode)}catch(e){console.error('Device link QR render failed',e);setQrCopyStatus('Geräte-QR konnte nicht erstellt werden',true);return}}const qrPayload=buildDeviceLinkQrPayload();if(!qrPayload)return;renderQrCodeInto('qrcode',qrPayload);return}await renderQrCode(forceRefresh)}
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

function startWatcherRefresh(){if(watcherRefreshInterval)return;watcherRefreshInterval=setInterval(()=>{if(currentPersonId&&document.visibilityState==='visible')loadWatchers(currentPersonId)},WATCHER_REFRESH_INTERVAL_MS)}
function isPersonSessionLostStatus(status){return status===401||status===403}
function isLostOwnershipError(error){return !!error&&typeof error.message==='string'&&(error.message.includes(' 401')||error.message.includes(' 403')||error.message.includes(': 401')||error.message.includes(': 403'))}
function clearPersonLocalState(){localStorage.removeItem('ibinda_registered_person');localStorage.removeItem('ibinda_person_id');localStorage.removeItem(PERSON_NAME_KEY);localStorage.removeItem(DEVICE_ID_KEY);localStorage.removeItem(LOCATION_ENABLED_KEY);localStorage.removeItem(LOCATION_CLEAR_PENDING_KEY);localStorage.removeItem(WATCHER_NAMES_KEY)}
function resetPersonApp(reason){if(isResettingPersonApp)return;isResettingPersonApp=true;console.warn('Resetting person app state',reason);if(watcherRefreshInterval){clearInterval(watcherRefreshInterval);watcherRefreshInterval=null}clearPairingTimers();stopDeviceQrScanner();clearPersonLocalState();currentPersonId=null;currentPersonName='';currentDeviceId='';hasActiveWatcherConnection=false;pendingDisconnectEvents=[];setTimeout(()=>{window.location.replace('/person.html')},50)}

async function init(){try{currentPersonName=await ensurePersonName();await ensureRegistered();let personId=getPersonId();if(!personId){personId=await createPerson()}else{try{personId=await createPerson(personId)}catch(error){console.error('Stored person ID unusable, creating new person',error);if(isLostOwnershipError(error)){resetPersonApp('init-lost-ownership-existing');return}personId=await createPerson()}}currentPersonId=personId;currentDeviceId=getOrCreateDeviceId();await registerCurrentDevice(personId).catch((error)=>{console.error('Initial device registration failed',error);if(isLostOwnershipError(error))resetPersonApp('init-register-lost-ownership')});renderPersonName();updateLocationToggleUi();updatePrimaryActionButton();const url=new URL(window.location);url.searchParams.set('id',personId);window.history.replaceState({},'',url);loadStatus(personId);loadWatchers(personId);startWatcherRefresh()}catch(e){console.error('Init error:',e);if(isLostOwnershipError(e)){resetPersonApp('init-lost-ownership');return}setButtonError('Fehler<span class="btn-sub">Neu laden</span>','App konnte nicht geladen werden.<div class="error-sub">Bitte Seite neu laden. Wenn der Fehler bleibt, kurz später erneut versuchen.</div>');const status=document.getElementById('status');if(status){status.textContent='Fehler beim Laden. Bitte Seite neu laden.';status.className='status error'}}}

let cooldownInterval=null;let cooldownEndTime=null;

function formatCountdown(seconds){const mins=Math.floor(seconds/60);const secs=seconds%60;return mins+':'+(secs<10?'0':'')+secs}

function getIdleStatusMessage(){return hasActiveWatcherConnection?'Einmal tippen: Alles okay':'Richte zuerst eine Verbindung ein'}
function updatePrimaryActionButton(){const btn=document.getElementById('btnOkay');const status=document.getElementById('status');if(!btn)return;if(!hasActiveWatcherConnection&&cooldownInterval){clearInterval(cooldownInterval);cooldownInterval=null}btn.classList.remove('error');if(hasActiveWatcherConnection){btn.classList.remove('setup');btn.innerHTML='OK<span class="btn-sub">Alles gut</span>';btn.setAttribute('aria-label','Okay senden');btn.disabled=!!cooldownInterval}else{btn.classList.add('setup');btn.innerHTML='Verbinden<span class="btn-sub">QR-Code anzeigen</span>';btn.setAttribute('aria-label','Verbindung einrichten');btn.disabled=false}if(status&&!cooldownInterval&&!(status.classList.contains('success')||status.classList.contains('error'))){status.className='status idle';status.textContent=getIdleStatusMessage()}}
function resetStatus(){const status=document.getElementById('status');status.textContent=getIdleStatusMessage();status.className='status idle'}
function handlePrimaryAction(){if(!hasActiveWatcherConnection){openPairingQrModal();return}sendHeartbeat()}

function setButtonError(buttonHtml,cardHtml){const btn=document.getElementById('btnOkay');const card=document.getElementById('sendErrorCard');if(btn){btn.classList.remove('setup');btn.classList.add('error');btn.innerHTML=buttonHtml||'!<span class="btn-sub">Nochmal</span>';btn.setAttribute('aria-label','Fehlerzustand')}if(card){card.innerHTML=cardHtml||'Meldung konnte nicht gesendet werden.<div class="error-sub">Bitte nochmal versuchen oder direkt bei einer verbundenen Person melden.</div>';card.classList.add('visible')}}
function clearButtonError(){const card=document.getElementById('sendErrorCard');if(card)card.classList.remove('visible');updatePrimaryActionButton()}

function startCooldown(seconds){const btn=document.getElementById('btnOkay');const status=document.getElementById('status');if(cooldownInterval)return;cooldownEndTime=Date.now()+seconds*1000;btn.disabled=true;status.className='status rate-limit';status.textContent='ℹ️ Bereits gemeldet. Noch '+seconds+' Sekunden warten.';cooldownInterval=setInterval(()=>{const remaining=Math.ceil((cooldownEndTime-Date.now())/1000);if(remaining<=0){clearInterval(cooldownInterval);cooldownInterval=null;btn.disabled=false;setTimeout(resetStatus,2000);return}status.textContent='ℹ️ Bereits gemeldet. Noch '+remaining+' Sekunden warten.'},1000)}

async function sendHeartbeat(){console.log('sendHeartbeat called');const btn=document.getElementById('btnOkay');const status=document.getElementById('status');const personId=getPersonId();if(!hasActiveWatcherConnection){openPairingQrModal();return}if(!personId){console.error('No person ID');status.className='status error';status.textContent='❌ Fehler: Keine Person ID';return}if(cooldownInterval){console.log('Cooldown active');return}status.className='status';status.textContent='Wird gesendet...';const payload={person_id:personId,device_id:currentDeviceId||getOrCreateDeviceId(),loc:isLocationEnabled()};if(isLocationEnabled()){try{const pos=await getCurrentPosition();const lat=Number(pos.lat);const lng=Number(pos.lng);if(!Number.isFinite(lat)||!Number.isFinite(lng))throw new Error('Invalid coordinates');payload.lat=lat;payload.lng=lng;console.log('Location added',pos)}catch(e){console.log('Could not get location',e);status.className='status error';status.textContent='❌ Standort nicht verfügbar. Bitte Standortzugriff erlauben.';setTimeout(resetStatus,5000);return}}try{console.log('Sending payload',payload);const res=await fetch(API_URL+'/heartbeat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});console.log('Response',res.status);if(res.ok){if(cooldownInterval){clearInterval(cooldownInterval);cooldownInterval=null}btn.disabled=false;clearButtonError();const data=await res.json();status.className='status success';status.textContent='✅ Gemeldet!';document.getElementById('lastCheckin').textContent='Letzte Meldung: '+new Date(data.timestamp).toLocaleString('de-DE');if(currentPersonId)loadWatchers(currentPersonId);setTimeout(resetStatus,3000)}else if(res.status===429){const data=await res.json().catch(()=>({}));const retrySeconds=data.retry_after_seconds||20;startCooldown(retrySeconds)}else if(isPersonSessionLostStatus(res.status)){resetPersonApp('heartbeat-lost-ownership');return}else{const text=await res.text();console.error('Server error',res.status,text);throw new Error('Server error: '+res.status)}}catch(err){console.error('sendHeartbeat error',err);if(!cooldownInterval){setButtonError();status.className='status';status.textContent='';btn.disabled=false}}}

async function loadStatus(personId){try{const res=await fetch(API_URL+'/person/'+personId);if(isPersonSessionLostStatus(res.status)){resetPersonApp('status-lost-ownership');return}if(res.ok){const data=await res.json();if(data.last_heartbeat){document.getElementById('lastCheckin').textContent='Letzte Meldung: '+new Date(data.last_heartbeat).toLocaleString('de-DE')}}}catch(e){}}

const WATCHER_NAMES_KEY='ibinda_watcher_names';
function getCachedWatcherNames(){try{return JSON.parse(localStorage.getItem(WATCHER_NAMES_KEY)||'{}')}catch{return{}}}
function cacheWatcherNames(updates){const names=getCachedWatcherNames();Object.assign(names,updates);localStorage.setItem(WATCHER_NAMES_KEY,JSON.stringify(names))}
function getWatcherDisplayName(id){const name=getCachedWatcherNames()[id];return name||id.slice(0,8)+'…'}
async function loadWatchers(personId){try{const res=await fetch(API_URL+'/person/'+encodeURIComponent(personId)+'/watchers');if(isPersonSessionLostStatus(res.status)){resetPersonApp('watchers-lost-ownership');return}if(!res.ok)return;const data=await res.json();const watchers=Array.isArray(data.watchers)?data.watchers:[];const disconnectEvents=Array.isArray(data.disconnect_events)?data.disconnect_events:[];const nameUpdates={};watchers.forEach((watcher)=>{if(watcher&&watcher.name&&watcher.id)nameUpdates[watcher.id]=watcher.name});disconnectEvents.forEach((event)=>{if(event&&event.watcher_name&&event.watcher_id)nameUpdates[event.watcher_id]=event.watcher_name});if(Object.keys(nameUpdates).length)cacheWatcherNames(nameUpdates);pendingDisconnectEvents=disconnectEvents;hasActiveWatcherConnection=watchers.length>0;updatePrimaryActionButton();updateDeviceActionSection({max_devices:currentPersonMaxDevices,device_count:currentPersonDeviceCount,device_action:currentPersonDeviceAction});const el=document.getElementById('watcherInfo');const warn=document.getElementById('noWatcherWarning');if(!watchers.length){if(el){el.innerHTML='<div class="settings-list"><div class="settings-item"><div class="device-meta">Keine Verbindung</div><button type="button" class="device-delete-btn" id="watcherQrEntryBtn">QR-Code anzeigen</button></div></div>';const qrEntryBtn=document.getElementById('watcherQrEntryBtn');if(qrEntryBtn)qrEntryBtn.onclick=()=>openPairingQrModal()}if(warn)warn.classList.add('visible')}else{const count=watchers.length;const label=count===1?'1 Verbindung':count+' Verbindungen';const items=watchers.map((watcher)=>'<div class="device-meta" style="padding:4px 0">'+escapeHtml(getWatcherDisplayName(watcher.id))+'</div>').join('');if(el)el.innerHTML='<div class="settings-list"><div class="settings-item" style="cursor:pointer" id="watcherToggle"><div>'+label+'</div><div style="color:var(--system-green)">✓</div></div><div id="watcherIds" style="display:none;padding:0 16px 12px">'+items+'</div></div>';const watcherToggle=document.getElementById('watcherToggle');if(watcherToggle)watcherToggle.onclick=()=>{const idsEl=document.getElementById('watcherIds');idsEl.style.display=idsEl.style.display==='none'?'block':'none'};if(warn)warn.classList.remove('visible')}if(disconnectEvents.length){if(!isPairingRequestModalOpen())showDisconnectModal(disconnectEvents)}else if(isDisconnectModalOpen()){hideDisconnectModal()}}catch(e){console.error('loadWatchers failed',e)}}

async function registerCurrentDevice(personId,mode){const deviceId=currentDeviceId||getOrCreateDeviceId();currentDeviceId=deviceId;const body={device_id:deviceId};if(mode==='switch'||mode==='add')body.mode=mode;const res=await fetch(API_URL+'/person/'+encodeURIComponent(personId)+'/devices',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(isPersonSessionLostStatus(res.status)){resetPersonApp('register-device-lost-ownership');throw new Error('Device registration failed: '+res.status)}if(!res.ok){const text=await res.text().catch(()=>'');throw new Error('Device registration failed: '+res.status+' '+text)}return await res.json().catch(()=>({}))}

async function deleteDevice(deviceId){if(!currentPersonId)return;const confirmed=confirm('Gerät wirklich entfernen?');if(!confirmed)return;try{const res=await fetch(API_URL+'/person/'+encodeURIComponent(currentPersonId)+'/devices',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({device_id:deviceId})});if(res.ok){await loadDevices();return}const data=await res.json().catch(()=>({}));if(res.status===409){alert(data.error||'Das letzte Gerät kann nicht gelöscht werden.');return}throw new Error(data.error||'Löschen fehlgeschlagen')}catch(e){console.error('Delete device failed',e);alert('Gerät konnte nicht gelöscht werden. Bitte erneut versuchen.')}}

function updateDeviceActionSection(meta){const section=document.getElementById('deviceActionSection');const title=document.getElementById('deviceActionTitle');const button=document.getElementById('deviceActionButton');const help=document.getElementById('deviceActionHelp');if(!section||!title||!button||!help)return;currentPersonMaxDevices=Number(meta&&meta.max_devices)||1;currentPersonDeviceCount=Number(meta&&meta.device_count)||0;const action=meta&&typeof meta.device_action==='string'?meta.device_action:'';currentPersonDeviceAction=action==='add'||action==='full'?action:'switch';button.style.display='inline-flex';button.disabled=false;if(hasActiveWatcherConnection){stopDeviceQrScanner();if(currentPersonDeviceAction==='switch'){title.textContent='Auf anderes Gerät wechseln';button.textContent='QR-Code anzeigen';button.onclick=()=>openDeviceLinkQrModal('switch');help.textContent='Zeige diesen QR-Code auf diesem Gerät an und scanne ihn mit dem neuen unverbundenen Gerät. Danach bleibt nur noch das neue Gerät aktiv. Der ursprünglich vergebene Name bleibt unverändert.';section.style.display='block';return}if(currentPersonDeviceAction==='add'){title.textContent='Neues Gerät hinzufügen';button.textContent='QR-Code anzeigen';button.onclick=()=>openDeviceLinkQrModal('add');help.textContent='Zeige diesen QR-Code auf diesem Gerät an und scanne ihn mit dem neuen unverbundenen Gerät. Der ursprünglich vergebene Name bleibt unverändert.';section.style.display='block';return}title.textContent='Weitere Geräte';help.textContent='Gerätelimit erreicht. Solange alle Plätze belegt sind, kann kein weiteres Gerät hinzugefügt werden.';button.style.display='none';section.style.display='block';return}title.textContent='Bestehende Person übernehmen';button.textContent='QR-Code scannen';button.onclick=()=>startDeviceQrScan();help.textContent='Wenn dieses neue Gerät eine bestehende Person ersetzen oder ergänzen soll, scanne hier den Geräte-QR vom bisherigen Person-Gerät. Das geht nur, solange dieses Gerät noch keinen Watcher hat.';section.style.display='block'}

function renderDeviceList(devices){const listEl=document.getElementById('deviceList');if(!listEl)return;if(!Array.isArray(devices)||devices.length===0){listEl.innerHTML='<div class="device-empty">Keine Geräte vorhanden.</div>';return}listEl.innerHTML=devices.map((device)=>{const isCurrent=device.device_id===currentDeviceId;const badges=[];if(isCurrent)badges.push('<span class="device-badge current">Dieses Gerät</span>');const model=escapeHtml(device.device_model||'Desktop');const lastSeen=escapeHtml(formatLastSeen(device.last_seen));return '<div class="device-row"><div class="device-main"><div class="device-title">'+model+'</div><div class="device-meta">Zuletzt aktiv: '+lastSeen+'</div><div class="device-badges">'+badges.join('')+'</div></div>'+(isCurrent?'':'<button type="button" class="device-delete-btn" data-device-id="'+escapeHtml(device.device_id)+'">Löschen</button>')+'</div>'}).join('');listEl.querySelectorAll('.device-delete-btn').forEach((button)=>{button.addEventListener('click',(event)=>{const target=event.currentTarget;if(!target)return;const deviceId=target.getAttribute('data-device-id');if(!deviceId||target.disabled)return;deleteDevice(deviceId)})})}

async function loadDevices(){if(!currentPersonId)return;const listEl=document.getElementById('deviceList');if(!listEl)return;listEl.innerHTML='<div class="device-empty">Geräte werden geladen...</div>';try{await registerCurrentDevice(currentPersonId);const res=await fetch(API_URL+'/person/'+encodeURIComponent(currentPersonId)+'/devices');if(isPersonSessionLostStatus(res.status)){resetPersonApp('devices-lost-ownership');return}if(!res.ok){const text=await res.text().catch(()=>'');throw new Error('Device list failed: '+res.status+' '+text)}const payload=await res.json();const devices=Array.isArray(payload)?payload:Array.isArray(payload&&payload.devices)?payload.devices:[];const meta=Array.isArray(payload)?{max_devices:1,device_count:devices.length,device_action:'switch'}:payload;updateDeviceActionSection(meta||{max_devices:1,device_count:devices.length,device_action:'switch'});renderDeviceList(devices)}catch(e){console.error('Failed to load devices',e);listEl.innerHTML='<div class="device-error">Geräte konnten nicht geladen werden.</div>'}}

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
        const isDeviceLinkPayload = data?.type === 'person-device-link';
        const scannedLinkToken = isDeviceLinkPayload && typeof data?.link_token === 'string'
          ? data.link_token
          : '';
        const scannedMode = isDeviceLinkPayload && (data?.device_mode === 'switch' || data?.device_mode === 'add')
          ? data.device_mode
          : null;
        const scannedPersonName = isDeviceLinkPayload && typeof data?.person_name === 'string' ? data.person_name : '';
        if (scannedLinkToken) {
          stopDeviceQrScanner();
          handleNewDeviceScanned(scannedLinkToken, scannedMode, scannedPersonName);
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

async function handleNewDeviceScanned(linkToken,mode,personName) {
  if (!linkToken) return;
  try {
    const res=await fetch(API_URL+'/person/device-link/claim',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({link_token:linkToken})});
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(data.error||('Gerätewechsel fehlgeschlagen: '+res.status));
    const personId=typeof data.person_id==='string'?data.person_id:'';
    if(!personId)throw new Error('Person-ID fehlt');
    localStorage.setItem('ibinda_person_id',personId);
    currentPersonId=personId;
    if(personName){setPersonName(personName);currentPersonName=personName}
    const url=new URL(window.location);
    url.searchParams.set('id',personId);
    window.history.replaceState({},'',url);
    alert((mode||data.device_action)==='add'?'Gerät erfolgreich hinzugefügt!':'Gerät erfolgreich gewechselt!');
    renderPersonName();
    loadStatus(personId);
    loadWatchers(personId);
    loadDevices();
  } catch (e) {
    alert('Fehler beim Verbinden: ' + e.message);
  }
}

document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&currentPersonId)loadWatchers(currentPersonId)});

init();
</script>
</body>
</html>`;
