export const WATCHER_HTML = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>I bin da - Verbundene Personen</title>
<script>__JSQR_SCRIPT__</script>
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
.status-modal-overlay{position:fixed;inset:0;background:rgba(15,23,42,0.6);display:none;align-items:center;justify-content:center;padding:16px;z-index:2200}
.status-modal-overlay.open{display:flex}
.status-modal{width:100%;max-width:420px;background:#fff;border-radius:16px;padding:22px;box-shadow:0 12px 32px rgba(0,0,0,0.22)}
.status-modal-title{margin:0 0 10px;font-size:20px;font-weight:700;color:#101828}
.status-modal-message{margin:0;color:#475467;font-size:15px;line-height:1.5}
.status-modal-actions{display:flex;justify-content:flex-end;margin-top:20px}
.status-modal-button{min-width:120px}
.confirm-modal-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:20px}
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
<div id="statusModalOverlay" class="status-modal-overlay" onclick="handleStatusModalOverlayClick(event)">
  <div class="status-modal" role="dialog" aria-modal="true" aria-labelledby="statusModalTitle">
    <h3 id="statusModalTitle" class="status-modal-title">Hinweis</h3>
    <p id="statusModalMessage" class="status-modal-message"></p>
    <div class="status-modal-actions">
      <button type="button" id="statusModalButton" class="status-modal-button" onclick="closeStatusModal()">OK</button>
    </div>
  </div>
</div>
<div id="confirmModalOverlay" class="status-modal-overlay" onclick="handleConfirmModalOverlayClick(event)">
  <div class="status-modal" role="dialog" aria-modal="true" aria-labelledby="confirmModalTitle">
    <h3 id="confirmModalTitle" class="status-modal-title">Bestätigung</h3>
    <p id="confirmModalMessage" class="status-modal-message"></p>
    <div class="confirm-modal-actions">
      <button type="button" id="confirmModalCancelButton" class="secondary-btn" onclick="closeConfirmModal(false)">Abbrechen</button>
      <button type="button" id="confirmModalConfirmButton" class="remove-btn" onclick="closeConfirmModal(true)">Bestätigen</button>
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
function showDisplayNameValidationError(errorCode){if(errorCode==='name-too-short'){showStatusModal('Eingabe prüfen','Der Name muss mindestens 2 Zeichen lang sein.')}else if(errorCode==='name-too-long'){showStatusModal('Eingabe prüfen','Der Name darf maximal 35 Zeichen lang sein.')}else if(errorCode==='name-invalid-start'){showStatusModal('Eingabe prüfen','Die ersten 2 Zeichen des Namens müssen Buchstaben sein.')}else if(errorCode==='invalid-json'){showStatusModal('Eingabe prüfen','Die Eingabe enthält kein gültiges Pairing-Format.')}else if(errorCode==='invalid-person-id'){showStatusModal('Eingabe prüfen','Die Eingabe enthält keine gültige Personen-ID.')}else if(errorCode==='invalid-pairing-token'){showStatusModal('Eingabe prüfen','Die Eingabe enthält kein gültiges Pairing-Token.')}else if(errorCode==='pairing-required'){showStatusModal('Pairing-Code erforderlich','Zum Verbinden wird ein gültiger Pairing-Code benötigt. Bitte den aktuellen QR-Code der Person scannen.')}} 

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
let dialogFocusTarget = null;
let confirmModalResolver = null;
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

function showStatusModal(title, message, buttonLabel) {
  const overlay = document.getElementById('statusModalOverlay');
  const titleEl = document.getElementById('statusModalTitle');
  const messageEl = document.getElementById('statusModalMessage');
  const buttonEl = document.getElementById('statusModalButton');
  if (!overlay || !titleEl || !messageEl || !buttonEl) return;
  dialogFocusTarget = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  titleEl.textContent = title || 'Hinweis';
  messageEl.textContent = message || '';
  buttonEl.textContent = buttonLabel || 'OK';
  overlay.classList.add('open');
  buttonEl.focus();
}

function closeStatusModal() {
  const overlay = document.getElementById('statusModalOverlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  restoreDialogFocus();
}

function handleStatusModalOverlayClick(event) {
  if (event.target === event.currentTarget) closeStatusModal();
}

function showConfirmModal(title, message, confirmLabel, cancelLabel) {
  const overlay = document.getElementById('confirmModalOverlay');
  const titleEl = document.getElementById('confirmModalTitle');
  const messageEl = document.getElementById('confirmModalMessage');
  const confirmButton = document.getElementById('confirmModalConfirmButton');
  const cancelButton = document.getElementById('confirmModalCancelButton');
  if (!overlay || !titleEl || !messageEl || !confirmButton || !cancelButton) return Promise.resolve(false);
  dialogFocusTarget = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  titleEl.textContent = title || 'Bestätigung';
  messageEl.textContent = message || '';
  confirmButton.textContent = confirmLabel || 'Bestätigen';
  cancelButton.textContent = cancelLabel || 'Abbrechen';
  overlay.classList.add('open');
  confirmButton.focus();
  return new Promise((resolve) => {
    confirmModalResolver = resolve;
  });
}

function closeConfirmModal(confirmed) {
  const overlay = document.getElementById('confirmModalOverlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  const resolver = confirmModalResolver;
  confirmModalResolver = null;
  restoreDialogFocus();
  if (typeof resolver === 'function') resolver(!!confirmed);
}

function handleConfirmModalOverlayClick(event) {
  if (event.target === event.currentTarget) closeConfirmModal(false);
}

function restoreDialogFocus() {
  if (dialogFocusTarget && typeof dialogFocusTarget.focus === 'function') {
    dialogFocusTarget.focus();
  }
  dialogFocusTarget = null;
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
  showStatusModal('Limit erreicht', getPersonLimitAlertText());
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
  const statusOverlay = document.getElementById('statusModalOverlay');
  if (statusOverlay && statusOverlay.classList.contains('open')) {
    closeStatusModal();
    return;
  }
  const confirmOverlay = document.getElementById('confirmModalOverlay');
  if (confirmOverlay && confirmOverlay.classList.contains('open')) {
    closeConfirmModal(false);
    return;
  }
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
      showStatusModal('Verbindung bestätigt', 'Die Person hat deine Verbindungsanfrage bestätigt. Die Verbindung ist jetzt aktiv.');
      return;
    }
    if (data.status === 'rejected') {
      showStatusModal('Verbindung abgelehnt', 'Die Person hat die Verbindung abgelehnt.');
      return;
    }
    if (data.status === 'expired') {
      showStatusModal('Anfrage abgelaufen', 'Die Verbindungsanfrage ist abgelaufen.');
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
    showStatusModal('Anfrage gesendet', 'Die Person muss die Verbindung jetzt bestätigen.');
    startOutgoingPairingPolling(pairingToken, personId, parsedInput.name || '');
  } catch (err) {
    showStatusModal('Fehler', err && err.message ? 'Fehler: ' + err.message : 'Verbindung konnte nicht hinzugefügt werden.');
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
    showStatusModal('Speichern fehlgeschlagen', err && err.message ? err.message : 'Intervall konnte nicht gespeichert werden.');
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
    showStatusModal('Ungültige Datei', 'Bitte eine Bilddatei auswählen.');
    if (input) input.value = '';
    return;
  }

  try {
    const photoDataUrl = await fileToDataUrl(file);
    storePersonPhoto(activeEditPersonId, photoDataUrl);
    renderEditPhotoPreview(activeEditPersonId);
    await loadPersons();
  } catch (err) {
    showStatusModal('Foto fehlgeschlagen', 'Foto konnte nicht gespeichert werden.');
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
  const confirmed = await showConfirmModal('Verbindung entfernen', 'Verbindung mit "' + label + '" entfernen?', 'Entfernen', 'Abbrechen');
  if (!confirmed) return false;
  try {
    const res = await fetch(API_URL + '/watch', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ person_id: personId, watcher_id: watcherId })
    });
    if (!res.ok) throw new Error('Server error ' + res.status);
  } catch (e) {
    showStatusModal('Entfernen fehlgeschlagen', 'Entfernen fehlgeschlagen. Bitte erneut versuchen.');
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
