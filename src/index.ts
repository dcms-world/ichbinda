import { Hono } from 'hono';
import { cors } from 'hono/cors';

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
<input id="personNameInput" type="text" maxlength="80" placeholder="z.B. Oma Erna" required>
<button type="submit">Speichern</button>
</form>
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
    <h3>QR-Code für Betreuung</h3>
    <div class="qr-container" id="qrContainer">
      <div id="qrcode"></div>
      <button type="button" class="qr-copy-btn" onclick="copyQrPayload(event)">QR kopieren</button>
      <small id="qrCopyStatus" class="qr-copy-status" aria-live="polite"></small>
    </div>
    <small class="settings-help">Die Betreuungsperson kann diesen Code scannen.</small>
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
    <h3>Betreuung</h3>
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
<div id="noWatcherWarning" class="no-watcher-warning">⚠️ Keine Betreuungsperson verbunden</div>
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

let resolveRegistered=null;
async function onTurnstileSuccess(token){const statusEl=document.getElementById('authStatus');if(statusEl)statusEl.textContent='Registrierung läuft...';try{const res=await fetch(API_URL+'/auth/register-device',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({device_id:getOrCreateDeviceId(),turnstile_token:token,role:'person'})});if(!res.ok)throw new Error('Fehler '+res.status);setRegistered();const overlay=document.getElementById('authOverlay');if(overlay)overlay.style.display='none';if(statusEl)statusEl.textContent='';if(resolveRegistered){resolveRegistered();resolveRegistered=null}}catch(e){if(statusEl)statusEl.textContent='❌ '+e.message+' – Bitte Seite neu laden.'}}
async function ensureRegistered(){if(isRegistered())return;const overlay=document.getElementById('authOverlay');if(overlay)overlay.style.display='flex';return new Promise(resolve=>{resolveRegistered=resolve})}

function getPersonId(){return localStorage.getItem('ibinda_person_id')}
function getPersonName(){return(localStorage.getItem(PERSON_NAME_KEY)||'').trim()}
function setPersonName(name){localStorage.setItem(PERSON_NAME_KEY,name)}
function createDeviceId(){if(window.crypto&&typeof window.crypto.randomUUID==='function')return window.crypto.randomUUID();return 'device-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10)}
function getOrCreateDeviceId(){const existing=(localStorage.getItem(DEVICE_ID_KEY)||'').trim();if(existing)return existing;const created=createDeviceId();localStorage.setItem(DEVICE_ID_KEY,created);return created}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,(char)=>{if(char==='&')return'&amp;';if(char==='<')return'&lt;';if(char==='>')return'&gt;';if(char==='"')return'&quot;';return'&#39;'})}
function formatLastSeen(iso){const time=Date.parse(iso||'');if(Number.isNaN(time))return 'Unbekannt';return new Date(time).toLocaleString('de-DE')}

async function createPerson(){const res=await fetch(API_URL+'/person',{method:'POST'});const data=await res.json();localStorage.setItem('ibinda_person_id',data.id);return data.id}

function buildQrPayload(){return JSON.stringify({id:currentPersonId,name:currentPersonName||getPersonName()})}
let qrCopyStatusTimeout=null;
function setQrCopyStatus(message,isError){const statusEl=document.getElementById('qrCopyStatus');if(!statusEl)return;statusEl.textContent=message||'';statusEl.classList.toggle('error',!!isError);if(qrCopyStatusTimeout){clearTimeout(qrCopyStatusTimeout);qrCopyStatusTimeout=null}if(message){qrCopyStatusTimeout=setTimeout(()=>{statusEl.textContent='';statusEl.classList.remove('error');qrCopyStatusTimeout=null},1600)}}
async function copyQrPayload(event){if(event&&typeof event.stopPropagation==='function')event.stopPropagation();if(!currentPersonId)return;const qrPayload=buildQrPayload();if(!navigator.clipboard||typeof navigator.clipboard.writeText!=='function'){setQrCopyStatus('Kopieren nicht verfügbar',true);return}try{await navigator.clipboard.writeText(qrPayload);setQrCopyStatus('Kopiert!',false)}catch(e){console.error('QR payload copy failed',e);setQrCopyStatus('Kopieren fehlgeschlagen',true)}}
function renderQrCode(){if(!currentPersonId)return;const qrPayload=buildQrPayload();const qrEl=document.getElementById('qrcode');qrEl.innerHTML='';new QRCode(qrEl,{text:qrPayload,width:180,height:180});qrEl.onclick=copyQrPayload}
function renderPersonName(){document.getElementById('personNameDisplay').textContent=currentPersonName||getPersonName()||'-'}
function openSettings(){console.log('openSettings called');document.getElementById('settingsPanel').classList.add('open');document.getElementById('settingsOverlay').classList.add('open');renderPersonName();renderQrCode();loadDevices();if(currentPersonId)loadWatchers(currentPersonId);const doneBtn=document.querySelector('#settingsPanel .btn-done');if(doneBtn)doneBtn.focus()}

function closeSettings(){document.getElementById('settingsPanel').classList.remove('open');document.getElementById('settingsOverlay').classList.remove('open')}

function askForPersonName(){return new Promise((resolve)=>{const overlay=document.getElementById('nameModalOverlay');const form=document.getElementById('nameModalForm');const input=document.getElementById('personNameInput');overlay.classList.add('open');input.focus();const onSubmit=(event)=>{event.preventDefault();const name=input.value.trim();if(!name)return;setPersonName(name);overlay.classList.remove('open');resolve(name)};form.addEventListener('submit',onSubmit,{once:true})})}

async function ensurePersonName(){const savedName=getPersonName();if(savedName)return savedName;return askForPersonName()}

const LOCATION_ENABLED_KEY='ibinda_location_enabled';
const LOCATION_CLEAR_PENDING_KEY='ibinda_location_clear_pending';

function isLocationEnabled(){return localStorage.getItem(LOCATION_ENABLED_KEY)==='true'}
function isLocationClearPending(){return localStorage.getItem(LOCATION_CLEAR_PENDING_KEY)==='true'}
function setLocationClearPending(pending){localStorage.setItem(LOCATION_CLEAR_PENDING_KEY,pending?'true':'false')}
function setLocationEnabled(enabled){localStorage.setItem(LOCATION_ENABLED_KEY,enabled?'true':'false');if(enabled){setLocationClearPending(false)}updateLocationToggleUi()}

function updateLocationToggleUi(){const toggle=document.getElementById('locationToggle');if(!toggle)return;toggle.classList.toggle('active',isLocationEnabled())}

async function toggleLocation(){const currentlyEnabled=isLocationEnabled();if(!currentlyEnabled){const confirmed=confirm('Möchtest du deinen Standort bei jedem "Okay" mitteilen? Der Betreuer sieht dann, wo du dich befindest.');if(!confirmed)return;try{await getCurrentPosition();setLocationEnabled(true)}catch(e){console.log('Location permission denied',e);setLocationEnabled(false);alert('Standort nicht verfügbar. Bitte Standortzugriff im Browser erlauben.')}}else{setLocationEnabled(false);setLocationClearPending(true)}}

function getCurrentPosition(){return new Promise((resolve,reject)=>{if(!navigator.geolocation){reject(new Error('Geolocation not supported'));return}navigator.geolocation.getCurrentPosition(pos=>resolve({lat:pos.coords.latitude,lng:pos.coords.longitude}),err=>reject(err),{enableHighAccuracy:true,timeout:10000,maximumAge:60000})})}

async function init(){try{currentPersonName=await ensurePersonName();await ensureRegistered();let personId=getPersonId();if(!personId){personId=await createPerson()}else{await fetch(API_URL+'/person',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:personId})}).catch(()=>{})}currentPersonId=personId;currentDeviceId=getOrCreateDeviceId();await registerCurrentDevice(personId).catch((error)=>{console.error('Initial device registration failed',error)});renderPersonName();updateLocationToggleUi();const url=new URL(window.location);url.searchParams.set('id',personId);window.history.replaceState({},'',url);loadStatus(personId);loadWatchers(personId)}catch(e){console.error('Init error:',e);document.getElementById('status').textContent='Fehler beim Laden. Bitte Seite neu laden.';document.getElementById('status').className='status error'}}

let cooldownInterval=null;let cooldownEndTime=null;

function formatCountdown(seconds){const mins=Math.floor(seconds/60);const secs=seconds%60;return mins+':'+(secs<10?'0':'')+secs}

function resetStatus(){const status=document.getElementById('status');status.textContent='Einmal tippen: Alles okay';status.className='status idle'}

function setButtonError(){const btn=document.getElementById('btnOkay');const card=document.getElementById('sendErrorCard');if(btn){btn.classList.add('error');btn.innerHTML='!<span class="btn-sub">Nochmal</span>'}if(card){card.innerHTML='Meldung konnte nicht gesendet werden.<div class="error-sub">Bitte nochmal versuchen oder direkt bei deiner Betreuungsperson melden.</div>';card.classList.add('visible')}}
function clearButtonError(){const btn=document.getElementById('btnOkay');const card=document.getElementById('sendErrorCard');if(btn){btn.classList.remove('error');btn.innerHTML='OK<span class="btn-sub">Alles gut</span>'}if(card)card.classList.remove('visible')}

function startCooldown(seconds){const btn=document.getElementById('btnOkay');const status=document.getElementById('status');if(cooldownInterval)return;cooldownEndTime=Date.now()+seconds*1000;btn.disabled=true;status.className='status rate-limit';status.textContent='ℹ️ Bereits gemeldet. Noch '+seconds+' Sekunden warten.';cooldownInterval=setInterval(()=>{const remaining=Math.ceil((cooldownEndTime-Date.now())/1000);if(remaining<=0){clearInterval(cooldownInterval);cooldownInterval=null;btn.disabled=false;setTimeout(resetStatus,2000);return}status.textContent='ℹ️ Bereits gemeldet. Noch '+remaining+' Sekunden warten.'},1000)}

async function sendHeartbeat(){console.log('sendHeartbeat called');const btn=document.getElementById('btnOkay');const status=document.getElementById('status');const personId=getPersonId();if(!personId){console.error('No person ID');status.className='status error';status.textContent='❌ Fehler: Keine Person ID';return}if(cooldownInterval){console.log('Cooldown active');return}status.className='status';status.textContent='Wird gesendet...';const payload={person_id:personId,device_id:currentDeviceId||getOrCreateDeviceId(),loc:isLocationEnabled()};if(isLocationEnabled()){try{const pos=await getCurrentPosition();const lat=Number(pos.lat);const lng=Number(pos.lng);if(!Number.isFinite(lat)||!Number.isFinite(lng))throw new Error('Invalid coordinates');payload.lat=lat;payload.lng=lng;console.log('Location added',pos)}catch(e){console.log('Could not get location',e);status.className='status error';status.textContent='❌ Standort nicht verfügbar. Bitte Standortzugriff erlauben.';setTimeout(()=>status.textContent='',5000);return}}try{console.log('Sending payload',payload);const res=await fetch(API_URL+'/heartbeat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});console.log('Response',res.status);if(res.ok){if(cooldownInterval){clearInterval(cooldownInterval);cooldownInterval=null}btn.disabled=false;clearButtonError();const data=await res.json();status.className='status success';status.textContent='✅ Gemeldet!';document.getElementById('lastCheckin').textContent='Letzte Meldung: '+new Date(data.timestamp).toLocaleString('de-DE');if(currentPersonId)loadWatchers(currentPersonId);setTimeout(resetStatus,3000)}else if(res.status===429){const data=await res.json().catch(()=>({}));const retrySeconds=data.retry_after_seconds||20;startCooldown(retrySeconds)}else{const text=await res.text();console.error('Server error',res.status,text);throw new Error('Server error: '+res.status)}}catch(err){console.error('sendHeartbeat error',err);if(!cooldownInterval){setButtonError();status.className='status';status.textContent='';btn.disabled=false}}}

async function loadStatus(personId){try{const res=await fetch(API_URL+'/person/'+personId);if(res.ok){const data=await res.json();if(data.last_heartbeat){document.getElementById('lastCheckin').textContent='Letzte Meldung: '+new Date(data.last_heartbeat).toLocaleString('de-DE')}}}catch(e){}}

const WATCHER_NAMES_KEY='ibinda_watcher_names';
function getCachedWatcherNames(){try{return JSON.parse(localStorage.getItem(WATCHER_NAMES_KEY)||'{}')}catch{return{}}}
function cacheWatcherNames(updates){const names=getCachedWatcherNames();Object.assign(names,updates);localStorage.setItem(WATCHER_NAMES_KEY,JSON.stringify(names))}
function getWatcherDisplayName(id){const name=getCachedWatcherNames()[id];return name||id.slice(0,8)+'…'}
async function loadWatchers(personId){try{const res=await fetch(API_URL+'/person/'+encodeURIComponent(personId)+'/watchers');if(!res.ok)return;const data=await res.json();const el=document.getElementById('watcherInfo');const warn=document.getElementById('noWatcherWarning');if(!data.watcher_count){if(el)el.innerHTML='<div class="settings-list"><div class="settings-item"><div class="device-meta">Keine Verbindung</div></div></div>';if(warn)warn.classList.add('visible')}else{const nameUpdates={};(data.watchers||[]).forEach(w=>{if(w.name)nameUpdates[w.id]=w.name});if(Object.keys(nameUpdates).length)cacheWatcherNames(nameUpdates);const count=data.watcher_count;const label=count===1?'1 Betreuer':count+' Betreuer';const items=(data.watchers||[]).map(w=>'<div class="device-meta" style="padding:4px 0">'+escapeHtml(getWatcherDisplayName(w.id))+'</div>').join('');el.innerHTML='<div class="settings-list"><div class="settings-item" style="cursor:pointer" id="watcherToggle"><div>'+label+'</div><div style="color:var(--system-green)">✓</div></div><div id="watcherIds" style="display:none;padding:0 16px 12px">'+items+'</div></div>';document.getElementById('watcherToggle').onclick=()=>{const idsEl=document.getElementById('watcherIds');idsEl.style.display=idsEl.style.display==='none'?'block':'none'};if(warn)warn.classList.remove('visible')}}catch(e){}}

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
    alert('Fehler beim Hinzufügen: ' + e.message);
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
<title>I bin da - Betreuer Dashboard</title>
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
<input id="watcherNameInput" type="text" maxlength="80" placeholder="z.B. Max Mustermann" required>
<button type="submit">Speichern</button>
</form>
</div>
<div class="container">
<h1>iBinda <span id="watcherNameDisplay" class="watcher-name" onclick="askForWatcherName()" title="Namen ändern">-</span></h1>
<p class="subtitle">Überwachte Personen im Blick behalten</p>
<div class="card">
<div class="add-header">
<h3>➕ Person hinzufügen</h3>
<span id="personCounter" class="person-counter">0/2 Personen</span>
</div>
<div id="addPersonControls" class="add-person">
<input type="text" id="personId" placeholder="Person ID oder QR-Daten">
<button id="addPersonBtn" onclick="addPerson()">Hinzufügen</button>
<button type="button" id="openQrScannerBtn" onclick="openQrScanner()">QR scannen</button>
</div>
<div id="personLimitMessage" class="limit-message">Maximal 2 Personen möglich.</div>
<small id="addPersonScanHint" class="scan-hint">QR-Code live mit der Kamera scannen oder JSON direkt einfügen.</small>
</div>
<div class="card">
<h3 style="margin-bottom:15px">📋 Meine Personen</h3>
<ul class="person-list" id="personList">
<li class="empty-state">Noch keine Personen.</li>
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

function isRegistered(){return localStorage.getItem('ibinda_registered_watcher')==='1'}
function setRegistered(){localStorage.setItem('ibinda_registered_watcher','1')}
let resolveRegistered=null;
async function onTurnstileSuccess(token){const statusEl=document.getElementById('authStatus');if(statusEl)statusEl.textContent='Registrierung läuft...';try{const deviceId=localStorage.getItem('ibinda_watcher_device')||(()=>{const id=crypto.randomUUID();localStorage.setItem('ibinda_watcher_device',id);return id})();const res=await fetch(API_URL+'/auth/register-device',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({device_id:deviceId,turnstile_token:token,role:'watcher'})});if(!res.ok)throw new Error('Fehler '+res.status);setRegistered();const overlay=document.getElementById('authOverlay');if(overlay)overlay.style.display='none';if(statusEl)statusEl.textContent='';if(resolveRegistered){resolveRegistered();resolveRegistered=null}}catch(e){if(statusEl)statusEl.textContent='❌ '+e.message+' – Bitte Seite neu laden.'}}
async function ensureRegistered(){if(isRegistered())return;const overlay=document.getElementById('authOverlay');if(overlay)overlay.style.display='flex';return new Promise(resolve=>{resolveRegistered=resolve})}

const PERSON_NAMES_KEY = 'ibinda_person_names';
const PERSON_NAME_HISTORY_KEY = 'ibinda_person_name_history';
const PERSON_PHOTOS_KEY = 'ibinda_person_photos';
const WATCHED_PERSON_IDS_KEY = 'ibinda_watched_person_ids';
const HIDDEN_PERSON_IDS_KEY = 'ibinda_hidden_person_ids';
const MAX_WATCHED_PERSONS = 2;
const PERSON_LIMIT_ALERT_TEXT = 'Maximal 2 Personen können überwacht werden.';
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

function getWatcherId() {
  return localStorage.getItem('ibinda_watcher_id');
}

const WATCHER_NAME_KEY = 'ibinda_watcher_name';
function getWatcherName(){return(localStorage.getItem(WATCHER_NAME_KEY)||'').trim()}
function setWatcherName(name){localStorage.setItem(WATCHER_NAME_KEY,name)}
function renderWatcherName(){const el=document.getElementById('watcherNameDisplay');if(el)el.textContent=getWatcherName()||'Name eingeben'}
function askForWatcherName(){return new Promise((resolve)=>{const overlay=document.getElementById('nameModalOverlay');const form=document.getElementById('nameModalForm');const input=document.getElementById('watcherNameInput');input.value=getWatcherName()||'';overlay.classList.add('open');input.focus();const onSubmit=(event)=>{event.preventDefault();const name=input.value.trim();if(!name)return;setWatcherName(name);overlay.classList.remove('open');renderWatcherName();announceWatcherName();resolve(name)};form.addEventListener('submit',onSubmit,{once:true})})}
async function ensureWatcherName(){const savedName=getWatcherName();if(savedName)return savedName;return askForWatcherName()}
async function announceWatcherName(){const watcherId=getWatcherId();const name=getWatcherName();if(!watcherId||!name)return;try{await fetch(API_URL+'/watcher/'+watcherId+'/announce',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name})})}catch(e){console.error('Name announce failed',e)}}

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
  const safeName = (name || '').trim();
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

  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object') {
      const personId = String(parsed.id || '').trim();
      const name = typeof parsed.name === 'string' ? parsed.name.trim() : '';
      if (personId) return { personId, name };
    }
  } catch (err) {}

  try {
    const parsedUrl = new URL(value);
    const personIdFromUrl = (parsedUrl.searchParams.get('id') || '').trim();
    if (personIdFromUrl) return { personId: personIdFromUrl, name: '' };
  } catch (err) {}

  return { personId: value, name: '' };
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
    limitMessage.classList.toggle('show', isLimitReached);
  }
  if (scanHint) {
    scanHint.classList.toggle('limit-hide', isLimitReached);
  }
}

function showPersonLimitAlert() {
  alert(PERSON_LIMIT_ALERT_TEXT);
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
  loadPersons();
}

async function addPerson() {
  const canAdd = await ensureCanAddPerson();
  if (!canAdd) return;
  const inputValue = document.getElementById('personId').value.trim();
  if (!inputValue) return;
  const parsedInput = parsePersonInput(inputValue);
  if (!parsedInput) return;
  const personId = parsedInput.personId;
  if (!personId) return;
  if (parsedInput.name) {
    storePersonName(personId, parsedInput.name);
  } else {
    const rememberedName = getRememberedPersonName(personId);
    if (rememberedName) storePersonName(personId, rememberedName);
  }
  
  try {
    const watchRes = await fetch(API_URL + '/watch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ person_id: personId, watcher_id: getWatcherId(), check_interval_minutes: 1440 })
    });
    if (!watchRes.ok) throw new Error('Person nicht gefunden oder Fehler beim Hinzufügen (Status ' + watchRes.status + ')');
    unhidePersonInLocalView(personId);
    document.getElementById('personId').value = '';
    await loadPersons();
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
  const confirmed = confirm('Person "' + label + '" aus der Betreuung entfernen?');
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
  const visiblePersons = persons.filter((person) => !hiddenPersonIds.has(person.id));
  applyPersonCount(visiblePersons.length);
  visiblePersonsById = {};
  for (const person of visiblePersons) visiblePersonsById[person.id] = person;
  const watchedPersonIds = getStoredList(WATCHED_PERSON_IDS_KEY);
  for (const person of visiblePersons) watchedPersonIds.push(person.id);
  setStoredList(WATCHED_PERSON_IDS_KEY, watchedPersonIds);
  const list = document.getElementById('personList');
  if (visiblePersons.length === 0) {
    list.innerHTML = '<li class="empty-state">Noch keine Personen.</li>';
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

// Types
interface AppBindings {
  DB: D1Database;
  EXPO_ACCESS_TOKEN?: string;
  TURNSTILE_SITE_KEY: string;
  TURNSTILE_SECRET_KEY: string;
  DEV_TOKEN?: string;  // Nur in Dev gesetzt – ermöglicht ?dev_token=... Bypass
}

type AppEnv = {
  Bindings: AppBindings;
  Variables: { deviceId: string; role: string };
};

interface RateLimitRow {
  last_heartbeat_at: string;
}

interface PersonDeviceRow {
  id: number;
  person_id: string;
  device_id: string;
  device_model: string;
  last_seen: string;
}

const RATE_LIMIT_WINDOW_MS = 2 * 1000; // 2 seconds (for testing)

// Security: Constant-time string comparison to prevent timing attacks
function constantTimeEquals(left: string, right: string): boolean {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  const maxLength = Math.max(leftBytes.length, rightBytes.length);
  let mismatch = leftBytes.length === rightBytes.length ? 0 : 1;

  for (let index = 0; index < maxLength; index += 1) {
    mismatch |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }

  return mismatch === 0;
}

// Security: SHA-256 Hash eines API-Keys
async function hashApiKey(key: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Security: Turnstile-Token serverseitig bei Cloudflare verifizieren
async function verifyTurnstileToken(token: string, secret: string): Promise<boolean> {
  try {
    const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token }),
    });
    const data = await resp.json<{ success: boolean }>();
    return data.success === true;
  } catch {
    return false;
  }
}

// Security: API-Key (als Hash) in D1 nachschlagen — gibt Device-Info zurück
async function lookupApiKey(db: D1Database, apiKey: string): Promise<{ device_id: string; role: string } | null> {
  const hash = await hashApiKey(apiKey);
  const row = await db.prepare(
    'SELECT device_id, role FROM device_keys WHERE key_hash = ?1'
  ).bind(hash).first<{ device_id: string; role: string }>();
  return row ?? null;
}

// Security: Check rate limit per device (max 1 per 5 minutes)
async function checkRateLimit(
  db: D1Database,
  deviceKey: string
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const now = new Date();
  const nowIso = now.toISOString();
  const cutoffIso = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS).toISOString();

  // Get previous rate limit entry
  const previousRateLimit = await db.prepare(
    "SELECT last_heartbeat_at FROM device_rate_limits WHERE device_id = ?1"
  )
    .bind(deviceKey)
    .first<RateLimitRow>();

  // Try to update rate limit atomically (only if enough time passed)
  const rateLimitResult = await db.prepare(
    `
      INSERT INTO device_rate_limits (device_id, last_heartbeat_at)
      VALUES (?1, ?2)
      ON CONFLICT(device_id) DO UPDATE SET last_heartbeat_at = excluded.last_heartbeat_at
      WHERE unixepoch(device_rate_limits.last_heartbeat_at) <= unixepoch(?3)
    `
  )
    .bind(deviceKey, nowIso, cutoffIso)
    .run();

  const rateLimitUpdated = (rateLimitResult.meta?.changes ?? 0) > 0;

  if (!rateLimitUpdated) {
    // Calculate retry-after
    const lastHeartbeatMs = previousRateLimit?.last_heartbeat_at
      ? Date.parse(previousRateLimit.last_heartbeat_at)
      : 0;
    const retryAfterMs = lastHeartbeatMs + RATE_LIMIT_WINDOW_MS - now.getTime();
    const retryAfterSeconds = retryAfterMs > 0 ? Math.ceil(retryAfterMs / 1000) : 0;

    return { allowed: false, retryAfterSeconds };
  }

  return { allowed: true };
}

// Rollback rate limit on DB error (best effort)
async function rollbackRateLimit(
  db: D1Database,
  deviceKey: string,
  previousTimestamp: string | null,
  currentTimestamp: string
): Promise<void> {
  try {
    if (previousTimestamp) {
      await db.prepare(
        `
          UPDATE device_rate_limits
          SET last_heartbeat_at = ?1
          WHERE device_id = ?2 AND last_heartbeat_at = ?3
        `
      )
        .bind(previousTimestamp, deviceKey, currentTimestamp)
        .run();
      return;
    }

    await db.prepare(
      "DELETE FROM device_rate_limits WHERE device_id = ?1 AND last_heartbeat_at = ?2"
    )
      .bind(deviceKey, currentTimestamp)
      .run();
  } catch (rollbackError) {
    console.error("Failed to rollback rate limit state", rollbackError);
  }
}

// Ownership: Prüft ob ein Gerät einer Person zugeordnet ist
async function deviceOwnsPerson(db: D1Database, deviceId: string, personId: string): Promise<boolean> {
  const row = await db.prepare(
    'SELECT 1 FROM person_devices WHERE device_id = ?1 AND person_id = ?2'
  ).bind(deviceId, personId).first();
  return !!row;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

function parseCoordinate(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function detectDeviceModel(userAgent: string | null): string {
  const agent = (userAgent || '').toLowerCase();
  if (!agent) return 'Desktop';
  if (agent.includes('iphone')) return 'iPhone';
  if (agent.includes('ipad') || (agent.includes('macintosh') && agent.includes('mobile'))) return 'iPad';
  if (agent.includes('android')) return 'Android';
  return 'Desktop';
}

async function ensurePersonDevicesTable(db: D1Database): Promise<void> {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS person_devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id TEXT NOT NULL,
      device_id TEXT NOT NULL UNIQUE,
      device_model TEXT NOT NULL,
      last_seen DATETIME NOT NULL,
      FOREIGN KEY (person_id) REFERENCES persons(id)
    )`
  ).run();
  await db.prepare(
    'CREATE INDEX IF NOT EXISTS idx_person_devices_person_id_last_seen ON person_devices(person_id, last_seen DESC)'
  ).run();
}

async function upsertPersonDevice(
  db: D1Database,
  personId: string,
  deviceId: string,
  deviceModel: string,
  lastSeenIso: string
): Promise<void> {
  if (!deviceId) return;
  await db.prepare(
    `INSERT INTO person_devices (person_id, device_id, device_model, last_seen)
     VALUES (?1, ?2, ?3, ?4)
     ON CONFLICT(device_id) DO UPDATE SET
       person_id = excluded.person_id,
       device_model = excluded.device_model,
       last_seen = excluded.last_seen`
  ).bind(personId, deviceId, deviceModel, lastSeenIso).run();
}

const app = new Hono<AppEnv>();

// Static HTML routes
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
app.get('/person.html', (c) => c.html(PERSON_HTML.replace('__TURNSTILE_SITE_KEY__', c.env.TURNSTILE_SITE_KEY ?? '')));
app.get('/watcher.html', (c) => c.html(WATCHER_HTML.replace('__TURNSTILE_SITE_KEY__', c.env.TURNSTILE_SITE_KEY ?? '')));

// API routes with CORS
app.use('/api/*', cors({ origin: '*', allowMethods: ['GET', 'POST', 'PUT', 'DELETE'] }));

// Auth-Middleware – alle /api/* Routen außer /api/auth/register-device
app.use('/api/*', async (c, next) => {
  if (c.req.path === '/api/auth/register-device') return await next();

  // Dev-Modus: ?dev_token=... Query-Parameter akzeptieren (nur wenn DEV_TOKEN gesetzt)
  if (c.env.DEV_TOKEN) {
    const devToken = new URL(c.req.url).searchParams.get('dev_token');
    if (devToken && constantTimeEquals(devToken, c.env.DEV_TOKEN)) {
      c.set('deviceId', 'dev');
      c.set('role', 'person');
      return await next();
    }
  }

  const setDeviceContext = (device: { device_id: string; role: string }) => {
    c.set('deviceId', device.device_id);
    c.set('role', device.role);
  };

  // Cookie (Web/PWA) — prüfe role-spezifische und Legacy-Cookies
  const cookieStr = c.req.header('Cookie') ?? '';
  const cookies: Record<string, string> = {};
  for (const part of cookieStr.split(';')) {
    const eqIdx = part.indexOf('=');
    if (eqIdx === -1) continue;
    cookies[part.slice(0, eqIdx).trim()] = part.slice(eqIdx + 1).trim();
  }

  // Bestimme passenden Cookie anhand des Request-Pfads
  const isWatcherRoute = c.req.path.startsWith('/api/watcher') || c.req.path.startsWith('/api/watch');
  const preferredCookie = isWatcherRoute ? 'api_key_watcher' : 'api_key_person';
  const cookiesToTry = [preferredCookie, 'api_key'];

  for (const name of cookiesToTry) {
    const value = cookies[name];
    if (value) {
      const device = await lookupApiKey(c.env.DB, value);
      if (device) {
        setDeviceContext(device);
        return await next();
      }
    }
  }

  // Bearer Token (Native App)
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const apiKey = authHeader.slice(7);
    const device = await lookupApiKey(c.env.DB, apiKey);
    if (device) {
      setDeviceContext(device);
      return await next();
    }
  }

  return c.json({ error: 'Unauthorized' }, 401);
});

// POST /api/auth/register-device – Turnstile-Check, dann einmalig API-Key ausgeben
app.post('/api/auth/register-device', async (c) => {
  try {
    const body = await c.req.json<{ device_id?: string; turnstile_token?: string; role?: string }>();
    const { device_id, turnstile_token } = body;
    const role = body.role === 'watcher' ? 'watcher' : 'person';

    if (!device_id || !turnstile_token) {
      return c.json({ error: 'device_id und turnstile_token erforderlich' }, 400);
    }

    const valid = await verifyTurnstileToken(turnstile_token, c.env.TURNSTILE_SECRET_KEY);
    if (!valid) {
      return c.json({ error: 'Bot-Check fehlgeschlagen' }, 400);
    }

    const apiKey = crypto.randomUUID() + '-' + crypto.randomUUID();
    const keyHash = await hashApiKey(apiKey);

    await c.env.DB.prepare(
      'INSERT OR REPLACE INTO device_keys (device_id, key_hash, created_at, role) VALUES (?1, ?2, ?3, ?4)'
    ).bind(device_id, keyHash, new Date().toISOString(), role).run();

    const cookieMaxAge = 60 * 60 * 24 * 365; // 1 Jahr
    const cookieName = role === 'watcher' ? 'api_key_watcher' : 'api_key_person';
    c.header('Set-Cookie', `${cookieName}=${apiKey}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${cookieMaxAge}`);
    return c.json({ registered: true }, 201);
  } catch (e) {
    console.error('Error registering device:', e);
    return c.json({ error: 'Interner Fehler' }, 500);
  }
});

// API: Neue Person erstellen (oder bestehende zurückgeben)
app.post('/api/person', async (c) => {
  try {
    const body = await c.req.json<{ id?: string }>().catch((): { id?: string } => ({}));
    const providedId = typeof body.id === 'string' ? body.id.trim() : '';
    const personId = (providedId && isValidUUID(providedId)) ? providedId : crypto.randomUUID();
    const deviceId = c.get('deviceId');

    await ensurePersonDevicesTable(c.env.DB);

    // Prüfen ob Person bereits existiert und einem anderen Gerät gehört
    const existingPerson = await c.env.DB.prepare(
      'SELECT 1 FROM persons WHERE id = ?1'
    ).bind(personId).first();

    if (existingPerson) {
      // Person existiert — prüfen ob sie bereits einem Gerät gehört
      const ownerCount = await c.env.DB.prepare(
        'SELECT COUNT(*) as count FROM person_devices WHERE person_id = ?1'
      ).bind(personId).first<{ count: number | string }>();
      const hasOwner = Number(ownerCount?.count ?? 0) > 0;

      if (hasOwner && !await deviceOwnsPerson(c.env.DB, deviceId, personId)) {
        // Person gehört einem anderen Gerät → blockieren
        return c.json({ error: 'Forbidden' }, 403);
      }
      // Person ohne Owner (Legacy) oder eigenes Gerät → Ownership anlegen/bestätigen
    }

    await c.env.DB.prepare(
      'INSERT OR IGNORE INTO persons (id) VALUES (?)'
    ).bind(personId).run();

    // Ownership-Bindung: Gerät wird automatisch der Person zugeordnet
    const nowIso = new Date().toISOString();
    await upsertPersonDevice(c.env.DB, personId, deviceId, detectDeviceModel(c.req.header('user-agent') ?? ''), nowIso);

    return c.json({ id: personId }, 201);
  } catch (e) {
    console.error('Error creating person:', e);
    return c.json({ error: 'Failed to create person' }, 500);
  }
});

// API: Heartbeat senden (mit Auth-Middleware + Rate Limiting)
app.post('/api/heartbeat', async (c) => {
  // 1. Parse and validate request body
  const body = await c.req
    .json<{ person_id?: string; status?: string; lat?: unknown; lng?: unknown; loc?: boolean; device_id?: string }>()
    .catch((): { person_id?: string; status?: string; lat?: unknown; lng?: unknown; loc?: boolean; device_id?: string } => ({}));
  const person_id = typeof body.person_id === 'string' ? body.person_id.trim() : '';
  const status = typeof body.status === 'string' ? body.status.trim() : 'ok';
  const device_id = typeof body.device_id === 'string' ? body.device_id.trim() : '';
  const locEnabled = body.loc === true;
  const hasLat = Object.prototype.hasOwnProperty.call(body, 'lat');
  const hasLng = Object.prototype.hasOwnProperty.call(body, 'lng');
  const lat = hasLat ? parseCoordinate(body.lat) : null;
  const lng = hasLng ? parseCoordinate(body.lng) : null;
  // If loc is explicitly false, clear location data
  const clearLocationRequested = body.loc === false;

  if (!person_id || !isValidUUID(person_id)) {
    return c.json({ error: 'Ungültige person_id' }, 400);
  }

  if (status.length > 64 || device_id.length > 255) {
    return c.json({ error: 'person_id, status or device_id is too long' }, 400);
  }

  // Ownership-Check: Gerät muss der Person zugeordnet sein
  const authDeviceId = c.get('deviceId');
  if (!await deviceOwnsPerson(c.env.DB, authDeviceId, person_id)) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  // Validate coordinates only if location is enabled and coordinates are provided
  if (locEnabled) {
    if (hasLat !== hasLng) {
      return c.json({ error: 'lat and lng must be provided together' }, 400);
    }
    if ((hasLat && lat === null) || (hasLng && lng === null)) {
      return c.json({ error: 'Invalid coordinates' }, 400);
    }
    if (lat !== null && (lat < -90 || lat > 90)) {
      return c.json({ error: 'Invalid latitude' }, 400);
    }
    if (lng !== null && (lng < -180 || lng > 180)) {
      return c.json({ error: 'Invalid longitude' }, 400);
    }
  }

  const now = new Date();
  const nowIso = now.toISOString();

  // 2. Check rate limit (max 1 per 5 minutes per device, fallback to person_id)
  const rateLimitKey = device_id || person_id;
  const rateLimitCheck = await checkRateLimit(c.env.DB, rateLimitKey);
  if (!rateLimitCheck.allowed) {
    return c.json({
      error: 'Too many requests',
      retry_after_seconds: rateLimitCheck.retryAfterSeconds
    }, 429);
  }

  // 3. Store heartbeat with optional location
  try {
    if (clearLocationRequested) {
      await c.env.DB.prepare(
        `INSERT INTO persons (id, last_heartbeat, last_location_lat, last_location_lng) VALUES (?, ?, NULL, NULL)
         ON CONFLICT(id) DO UPDATE SET 
         last_heartbeat = excluded.last_heartbeat,
         last_location_lat = NULL,
         last_location_lng = NULL`
      ).bind(person_id, nowIso).run();
    } else if (lat !== null && lng !== null) {
      await c.env.DB.prepare(
        `INSERT INTO persons (id, last_heartbeat, last_location_lat, last_location_lng) VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET 
         last_heartbeat = excluded.last_heartbeat,
         last_location_lat = excluded.last_location_lat,
         last_location_lng = excluded.last_location_lng`
      ).bind(person_id, nowIso, lat, lng).run();
    } else {
      await c.env.DB.prepare(
        `INSERT INTO persons (id, last_heartbeat) VALUES (?, ?)
         ON CONFLICT(id) DO UPDATE SET last_heartbeat = excluded.last_heartbeat`
      ).bind(person_id, nowIso).run();
    }

    if (device_id) {
      await ensurePersonDevicesTable(c.env.DB);
      await upsertPersonDevice(
        c.env.DB,
        person_id,
        device_id,
        detectDeviceModel(c.req.header('user-agent') ?? ''),
        nowIso
      );
    }

    return c.json({
      success: true,
      person_id,
      device_id: device_id || null,
      status,
      timestamp: nowIso,
      location: lat !== null && lng !== null ? { lat, lng } : null,
      location_cleared: clearLocationRequested
    });
  } catch (error) {
    // Rollback rate limit on error (best effort)
    const previousRateLimit = await c.env.DB.prepare(
      "SELECT last_heartbeat_at FROM device_rate_limits WHERE device_id = ?1"
    ).bind(rateLimitKey).first<RateLimitRow>();

    await rollbackRateLimit(
      c.env.DB,
      rateLimitKey,
      previousRateLimit?.last_heartbeat_at ?? null,
      nowIso
    );

    console.error('Error storing heartbeat:', error);
    return c.json({ error: 'Failed to store heartbeat' }, 500);
  }
});

// API: Status einer Person abfragen
app.get('/api/person/:id', async (c) => {
  const personId = c.req.param('id');
  if (!await deviceOwnsPerson(c.env.DB, c.get('deviceId'), personId)) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  const person = await c.env.DB.prepare('SELECT * FROM persons WHERE id = ?').bind(personId).first();
  if (!person) return c.json({ error: 'Person not found' }, 404);
  return c.json(person);
});

// API: Prüfen ob Person bereits einem Watcher zugeordnet ist
app.get('/api/person/:id/has-watcher', async (c) => {
  const personId = c.req.param('id').trim();
  if (!personId) return c.json({ error: 'person_id required' }, 400);
  if (!await deviceOwnsPerson(c.env.DB, c.get('deviceId'), personId)) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const result = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM watch_relations WHERE person_id = ?1 AND removed_at IS NULL'
  ).bind(personId).first<{ count: number | string }>();

  const watcherCount = Number(result?.count ?? 0);
  return c.json({
    has_watcher: watcherCount > 0,
    watcher_count: watcherCount
  });
});

// API: Watcher-Infos einer Person — liefert Namen einmalig aus watcher_name_announcements und löscht sie danach
app.get('/api/person/:id/watchers', async (c) => {
  const personId = c.req.param('id').trim();
  if (!personId) return c.json({ error: 'person_id required' }, 400);
  if (!await deviceOwnsPerson(c.env.DB, c.get('deviceId'), personId)) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const result = await c.env.DB.prepare(
    `SELECT wr.watcher_id, wna.name as watcher_name
     FROM watch_relations wr
     LEFT JOIN watcher_name_announcements wna ON wr.watcher_id = wna.watcher_id
     WHERE wr.person_id = ?1 AND wr.removed_at IS NULL`
  ).bind(personId).all<{ watcher_id: string; watcher_name: string | null }>();

  const rows = result.results ?? [];

  // Namen-Ankündigungen nach dem Lesen löschen (read-once)
  const withNames = rows.filter(r => r.watcher_name !== null);
  if (withNames.length > 0) {
    await c.env.DB.batch(
      withNames.map(r => c.env.DB.prepare('DELETE FROM watcher_name_announcements WHERE watcher_id = ?').bind(r.watcher_id))
    );
  }

  const watchers = rows.map(r => ({ id: r.watcher_id, name: r.watcher_name ?? null }));
  return c.json({ watcher_count: watchers.length, watchers });
});

// API: Watcher kündigt seinen Namen an (einmal-lesbar für Person)
app.post('/api/watcher/:id/announce', async (c) => {
  const watcherId = c.req.param('id');
  const { name } = await c.req.json<{ name: string }>();
  if (!name?.trim()) return c.json({ error: 'name required' }, 400);

  // Prüfen ob das anfragende Gerät zu diesem Watcher gehört
  const deviceId = c.get('deviceId');
  const owns = await c.env.DB.prepare(
    'SELECT 1 FROM watcher_devices WHERE watcher_id = ? AND device_id = ?'
  ).bind(watcherId, deviceId).first();
  if (!owns) return c.json({ error: 'Forbidden' }, 403);

  await c.env.DB.prepare(
    'INSERT OR REPLACE INTO watcher_name_announcements (watcher_id, name, created_at) VALUES (?, ?, datetime(\'now\'))'
  ).bind(watcherId, name.trim()).run();

  return c.json({ ok: true });
});

// API: Geräte einer Person
app.get('/api/person/:id/devices', async (c) => {
  const personId = c.req.param('id').trim();
  if (!personId) return c.json({ error: 'person_id required' }, 400);
  if (!await deviceOwnsPerson(c.env.DB, c.get('deviceId'), personId)) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  await ensurePersonDevicesTable(c.env.DB);
  const devices = await c.env.DB.prepare(
    `SELECT id, person_id, device_id, device_model, last_seen
     FROM person_devices
     WHERE person_id = ?1
     ORDER BY datetime(last_seen) DESC, id DESC`
  ).bind(personId).all<PersonDeviceRow>();

  return c.json(devices.results ?? []);
});

app.post('/api/person/:id/devices', async (c) => {
  const personId = c.req.param('id').trim();
  if (!await deviceOwnsPerson(c.env.DB, c.get('deviceId'), personId)) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  const body = await c.req.json<{ device_id?: string }>().catch((): { device_id?: string } => ({}));
  const deviceId = typeof body.device_id === 'string' ? body.device_id.trim() : '';
  if (!personId || !deviceId) {
    return c.json({ error: 'person_id and device_id required' }, 400);
  }
  if (personId.length > 255 || deviceId.length > 255) {
    return c.json({ error: 'person_id or device_id is too long' }, 400);
  }

  const nowIso = new Date().toISOString();
  const deviceModel = detectDeviceModel(c.req.header('user-agent') ?? '');
  await ensurePersonDevicesTable(c.env.DB);
  await c.env.DB.prepare('INSERT OR IGNORE INTO persons (id) VALUES (?1)').bind(personId).run();
  await upsertPersonDevice(c.env.DB, personId, deviceId, deviceModel, nowIso);

  return c.json({
    success: true,
    person_id: personId,
    device_id: deviceId,
    device_model: deviceModel,
    last_seen: nowIso
  });
});

app.delete('/api/person/:id/devices', async (c) => {
  const personId = c.req.param('id').trim();
  if (!await deviceOwnsPerson(c.env.DB, c.get('deviceId'), personId)) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  const body = await c.req.json<{ device_id?: string }>().catch((): { device_id?: string } => ({}));
  const deviceId = typeof body.device_id === 'string' ? body.device_id.trim() : '';
  if (!personId || !deviceId) {
    return c.json({ error: 'person_id and device_id required' }, 400);
  }

  await ensurePersonDevicesTable(c.env.DB);
  const existing = await c.env.DB.prepare(
    'SELECT id FROM person_devices WHERE person_id = ?1 AND device_id = ?2'
  ).bind(personId, deviceId).first<{ id: number }>();

  if (!existing) {
    return c.json({ error: 'Device not found' }, 404);
  }

  const countRow = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM person_devices WHERE person_id = ?1'
  ).bind(personId).first<{ count: number | string }>();
  const deviceCount = Number(countRow?.count ?? 0);

  if (deviceCount <= 1) {
    return c.json({ error: 'Das letzte Gerät kann nicht gelöscht werden.' }, 409);
  }

  await c.env.DB.prepare(
    'DELETE FROM person_devices WHERE person_id = ?1 AND device_id = ?2'
  ).bind(personId, deviceId).run();

  return c.json({ success: true, person_id: personId, device_id: deviceId });
});

// API: Betreuer registrieren
app.post('/api/watcher', async (c) => {
  const { push_token, device_model = 'unknown' } = await c.req.json<{ push_token: string; device_model?: string }>();
  if (!push_token) return c.json({ error: 'push_token required' }, 400);
  const deviceId = c.get('deviceId');
  const watcherId = crypto.randomUUID();
  await c.env.DB.batch([
    c.env.DB.prepare('INSERT INTO watchers (id, push_token) VALUES (?, \'\')').bind(watcherId),
    c.env.DB.prepare(
      `INSERT OR REPLACE INTO watcher_devices (watcher_id, device_id, push_token, device_model, last_seen)
       VALUES (?, ?, ?, ?, datetime('now'))`
    ).bind(watcherId, deviceId, push_token, device_model),
  ]);
  return c.json({ id: watcherId }, 201);
});

// API: Person überwachen (Intervall in Minuten)
app.post('/api/watch', async (c) => {
  try {
    const { person_id, watcher_id, check_interval_minutes = 1440 } = await c.req.json();
    if (!person_id || !watcher_id) return c.json({ error: 'person_id and watcher_id required' }, 400);
    const existing = await c.env.DB.prepare(
      'SELECT id FROM watch_relations WHERE person_id = ? AND watcher_id = ? AND removed_at IS NULL'
    ).bind(person_id, watcher_id).first();
    if (!existing) {
      await c.env.DB.prepare(
        `INSERT INTO watch_relations (person_id, watcher_id, check_interval_minutes) VALUES (?, ?, ?)`
      ).bind(person_id, watcher_id, check_interval_minutes).run();
    }
    return c.json({ success: true, person_id, watcher_id, check_interval_minutes });
  } catch (e) {
    console.error('Error in watch:', e);
    return c.json({ error: 'Failed to create watch relation', details: String(e) }, 500);
  }
});

// API: Intervall für überwachte Person aktualisieren (in Minuten)
app.put('/api/watch', async (c) => {
  const { person_id, watcher_id, check_interval_minutes } = await c.req.json();
  if (!person_id || !watcher_id || !check_interval_minutes) return c.json({ error: 'person_id, watcher_id and check_interval_minutes required' }, 400);
  await c.env.DB.prepare(
    `UPDATE watch_relations SET check_interval_minutes = ? WHERE person_id = ? AND watcher_id = ? AND removed_at IS NULL`
  ).bind(check_interval_minutes, person_id, watcher_id).run();
  return c.json({ success: true, person_id, watcher_id, check_interval_minutes });
});

// API: Person aus Betreuung entfernen (Soft-Delete)
app.delete('/api/watch', async (c) => {
  const { person_id, watcher_id } = await c.req.json();
  if (!person_id || !watcher_id) return c.json({ error: 'person_id and watcher_id required' }, 400);
  await c.env.DB.prepare(
    `UPDATE watch_relations SET removed_at = datetime('now') WHERE person_id = ? AND watcher_id = ? AND removed_at IS NULL`
  ).bind(person_id, watcher_id).run();
  return c.json({ success: true });
});

// API: Alle überwachten Personen eines Betreuers (Intervall in Minuten)
app.get('/api/watcher/:id/persons', async (c) => {
  const watcherId = c.req.param('id');
  const persons = await c.env.DB.prepare(
    `SELECT 
      p.id,
      p.last_heartbeat,
      p.last_location_lat,
      p.last_location_lng,
      wr.check_interval_minutes,
      CASE 
        WHEN p.last_heartbeat IS NULL THEN 'never'
        WHEN datetime(p.last_heartbeat, '+' || wr.check_interval_minutes || ' minutes') < datetime('now') 
        THEN 'overdue'
        ELSE 'ok'
      END as status
     FROM persons p
     JOIN watch_relations wr ON p.id = wr.person_id
     WHERE wr.watcher_id = ? AND wr.removed_at IS NULL`
  ).bind(watcherId).all();
  return c.json(persons.results);
});

// CRON: Überfälligkeits-Check (Intervall in Minuten)
async function checkOverduePersons(db: D1Database, expoToken?: string) {
  const overdue = await db.prepare(
    `SELECT p.id as person_id, p.last_heartbeat, wr.watcher_id, wr.check_interval_minutes, wd.push_token
     FROM persons p
     JOIN watch_relations wr ON p.id = wr.person_id
     JOIN watcher_devices wd ON wr.watcher_id = wd.watcher_id
     WHERE wr.removed_at IS NULL
     AND (p.last_heartbeat IS NULL OR datetime(p.last_heartbeat, '+' || wr.check_interval_minutes || ' minutes') < datetime('now'))
     AND (wr.last_notified_at IS NULL OR wr.last_notified_at < datetime('now', '-1 hour'))`
  ).all();

  for (const item of overdue.results || []) {
    if (expoToken && item.push_token) {
      const hours = Math.round(item.check_interval_minutes / 60);
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${expoToken}` },
        body: JSON.stringify({
          to: item.push_token,
          title: 'I bin da – Alarm',
          body: `Keine Meldung seit ${hours} Stunden`,
          data: { person_id: item.person_id },
        }),
      });
    }
    await db.prepare('UPDATE watch_relations SET last_notified_at = datetime("now") WHERE person_id = ? AND watcher_id = ? AND removed_at IS NULL')
      .bind(item.person_id, item.watcher_id).run();
  }
  return { checked: overdue.results?.length || 0 };
}

// Worker Handler
export default {
  async fetch(request: Request, env: AppBindings, ctx: ExecutionContext) {
    return app.fetch(request, env, ctx);
  },
  async scheduled(event: ScheduledEvent, env: AppBindings, ctx: ExecutionContext) {
    ctx.waitUntil(checkOverduePersons(env.DB, env.EXPO_ACCESS_TOKEN));
  },
};
