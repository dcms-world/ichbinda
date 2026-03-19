import { Hono } from 'hono';
import { cors } from 'hono/cors';

// HTML Templates (embedded for Cloudflare Worker)
const PERSON_HTML = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>IchBinDa - Ich bin okay</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:20px}
.container{background:white;border-radius:20px;padding:40px;max-width:400px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.3);position:relative}
h1{color:#333;margin-bottom:10px}
.subtitle{color:#666;margin-bottom:30px}
.btn-okay{width:200px;height:200px;border-radius:50%;border:none;background:linear-gradient(135deg,#11998e 0%,#38ef7d 100%);color:white;font-size:24px;font-weight:bold;cursor:pointer;box-shadow:0 10px 30px rgba(17,153,142,0.4);transition:transform 0.2s,box-shadow 0.2s}
.btn-okay:hover{transform:scale(1.05);box-shadow:0 15px 40px rgba(17,153,142,0.5)}
.btn-okay:active{transform:scale(0.95)}
.btn-okay:disabled{background:#ccc;cursor:not-allowed;transform:none}
.status{margin-top:30px;padding:15px;border-radius:10px;font-weight:500}
.status.success{background:#d4edda;color:#155724}
.status.error{background:#f8d7da;color:#721c24}
.last-checkin{margin-top:20px;color:#666;font-size:14px}

.menu-btn{position:absolute;top:20px;right:20px;background:rgba(255,255,255,0.9);border:none;border-radius:50%;width:44px;height:44px;font-size:20px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.2);z-index:100}
.menu-btn:hover{background:white;transform:scale(1.1)}

.settings-panel{position:fixed;top:0;right:-100%;width:100%;max-width:400px;height:100vh;background:white;box-shadow:-5px 0 20px rgba(0,0,0,0.2);transition:right 0.3s;z-index:200;padding:60px 20px 20px;overflow-y:auto}
.settings-panel.open{right:0}
.settings-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);opacity:0;visibility:hidden;transition:opacity 0.3s;z-index:150}
.settings-overlay.open{opacity:1;visibility:visible}

.settings-title{font-size:24px;margin-bottom:20px;color:#333}
.settings-section{margin:20px 0;padding:15px;background:#f8f9fa;border-radius:10px}
.settings-section h3{margin-bottom:10px;color:#555;font-size:16px}
.id-display{background:#e9ecef;padding:12px;border-radius:8px;font-family:monospace;font-size:14px;word-break:break-all;margin:10px 0;cursor:pointer;transition:background 0.2s}
.id-display:hover{background:#dee2e6}
.id-display.copied{background:#d4edda}
.name-label{display:block;color:#555;font-size:14px;font-weight:600;margin-bottom:6px}
.name-display{background:white;border:2px solid #e9ecef;padding:14px;border-radius:10px;font-size:24px;font-weight:700;line-height:1.2;color:#2f3b59;word-break:break-word}
.btn-small{padding:10px 20px;font-size:14px;border:none;border-radius:6px;cursor:pointer;margin:5px}
.btn-close{position:absolute;top:15px;left:15px;background:none;border:none;font-size:24px;cursor:pointer;color:#666}
.btn-close:hover{color:#333}
.qr-container{margin:15px 0;padding:15px;background:white;border-radius:10px;text-align:center}
#qrcode{display:inline-block}
.qr-raw-label{display:block;margin-top:12px;margin-bottom:6px;color:#555;font-size:13px}
.qr-raw{margin:0;padding:10px;background:#e9ecef;border-radius:8px;font-family:monospace;font-size:12px;line-height:1.4;word-break:break-all;white-space:pre-wrap;text-align:left;user-select:text}
.close-settings{margin-top:30px;padding:12px 24px;background:#dc3545;color:white;border:none;border-radius:8px;font-size:16px;cursor:pointer;width:100%}
.close-settings:hover{background:#c82333}
.name-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.55);display:none;align-items:center;justify-content:center;z-index:350;padding:20px}
.name-modal-overlay.open{display:flex}
.name-modal{background:white;border-radius:14px;padding:24px;width:100%;max-width:360px;box-shadow:0 14px 45px rgba(0,0,0,0.25)}
.name-modal h2{font-size:24px;color:#333;margin-bottom:8px}
.name-modal p{color:#666;margin-bottom:16px}
.name-modal input{width:100%;padding:12px 14px;border:2px solid #ddd;border-radius:8px;font-size:16px;margin-bottom:12px}
.name-modal input:focus{outline:none;border-color:#667eea}
.name-modal button{width:100%;padding:12px 14px;border:none;border-radius:8px;background:#11998e;color:white;font-size:16px;font-weight:600;cursor:pointer}
.name-modal button:hover{background:#0f877e}
</style>
</head>
<body>
<div class="name-modal-overlay" id="nameModalOverlay">
<form class="name-modal" id="nameModalForm">
<h2>Wie heißt du?</h2>
<p>Bitte gib deinen Namen einmalig ein.</p>
<input id="personNameInput" type="text" maxlength="80" placeholder="z.B. Oma Erna" required>
<button type="submit">Speichern</button>
</form>
</div>

<button class="menu-btn" onclick="openSettings()" title="Einstellungen">⚙️</button>

<div class="settings-overlay" id="settingsOverlay" onclick="closeSettings()"></div>

<div class="settings-panel" id="settingsPanel">
<button class="btn-close" onclick="closeSettings()">✕</button>
<h2 class="settings-title">⚙️ Einstellungen</h2>

<div class="settings-section">
<h3>🔑 Deine ID</h3>
<div class="id-display" id="personId" onclick="copyId()" title="Klicken zum Kopieren">-</div>
<small id="copyHint">Tippe auf die ID zum Kopieren</small>
<div style="margin-top:10px">
<button class="btn-small" style="background:#6c757d;color:white" onclick="copyId()">📋 Kopieren</button>
</div>
</div>

<div class="settings-section">
<span class="name-label">Dein Name:</span>
<div class="name-display" id="personNameDisplay">-</div>
</div>

<div class="settings-section">
<h3>📱 QR-Code für Betreuer</h3>
<div class="qr-container" id="qrContainer">
<div id="qrcode"></div>
<label class="qr-raw-label" for="qrPayloadText">QR-Code Inhalt (zum Kopieren):</label>
<pre class="qr-raw" id="qrPayloadText"></pre>
</div>
<small>Der Betreuer kann diesen Code scannen.</small>
</div>

<button class="close-settings" onclick="closeSettings()">Schließen</button>
</div>

<div class="container">
<h1>👋 IchBinDa</h1>
<p class="subtitle">Einmal drücken = "Ich bin okay"</p>
<button class="btn-okay" id="btnOkay" onclick="sendHeartbeat()">✅<br>OKAY</button>
<div id="status"></div>
<div class="last-checkin" id="lastCheckin"></div>
</div>

<script>
const API_URL='/api';
const PERSON_NAME_KEY='sicherda_person_name';
let currentPersonId=null;
let currentPersonName='';

function getPersonId(){const params=new URLSearchParams(window.location.search);return params.get('id')||localStorage.getItem('sicherda_person_id')}
function getPersonName(){return(localStorage.getItem(PERSON_NAME_KEY)||'').trim()}
function setPersonName(name){localStorage.setItem(PERSON_NAME_KEY,name)}

async function createPerson(){const res=await fetch(API_URL+'/person',{method:'POST'});const data=await res.json();localStorage.setItem('sicherda_person_id',data.id);return data.id}

function buildQrPayload(){return JSON.stringify({id:currentPersonId,name:currentPersonName})}
function renderQrCode(){if(!currentPersonId)return;const qrPayload=buildQrPayload();const qrEl=document.getElementById('qrcode');qrEl.innerHTML='';new QRCode(qrEl,{text:qrPayload,width:180,height:180});document.getElementById('qrPayloadText').textContent=qrPayload}
function renderPersonName(){document.getElementById('personNameDisplay').textContent=currentPersonName||getPersonName()||'-'}
function openSettings(){document.getElementById('settingsPanel').classList.add('open');document.getElementById('settingsOverlay').classList.add('open');renderPersonName();renderQrCode()}

function closeSettings(){document.getElementById('settingsPanel').classList.remove('open');document.getElementById('settingsOverlay').classList.remove('open')}

function copyId(){if(!currentPersonId)return;navigator.clipboard.writeText(currentPersonId).then(()=>{const idEl=document.getElementById('personId');idEl.classList.add('copied');idEl.textContent='✅ Kopiert!';document.getElementById('copyHint').textContent='ID wurde kopiert';setTimeout(()=>{idEl.classList.remove('copied');idEl.textContent=currentPersonId;document.getElementById('copyHint').textContent='Tippe auf die ID zum Kopieren'},2000)})}

function askForPersonName(){return new Promise((resolve)=>{const overlay=document.getElementById('nameModalOverlay');const form=document.getElementById('nameModalForm');const input=document.getElementById('personNameInput');overlay.classList.add('open');input.focus();const onSubmit=(event)=>{event.preventDefault();const name=input.value.trim();if(!name)return;setPersonName(name);overlay.classList.remove('open');resolve(name)};form.addEventListener('submit',onSubmit,{once:true})})}

async function ensurePersonName(){const savedName=getPersonName();if(savedName)return savedName;return askForPersonName()}

async function init(){currentPersonName=await ensurePersonName();let personId=getPersonId();if(!personId)personId=await createPerson();currentPersonId=personId;document.getElementById('personId').textContent=personId;renderPersonName();const url=new URL(window.location);url.searchParams.set('id',personId);window.history.replaceState({},'',url);loadStatus(personId)}

async function sendHeartbeat(){const btn=document.getElementById('btnOkay');const status=document.getElementById('status');const personId=getPersonId();btn.disabled=true;status.className='status';status.textContent='Wird gesendet...';try{const res=await fetch(API_URL+'/heartbeat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({person_id:personId})});if(res.ok){const data=await res.json();status.className='status success';status.textContent='✅ Gemeldet!';document.getElementById('lastCheckin').textContent='Letzte Meldung: '+new Date(data.timestamp).toLocaleString('de-DE')}else throw new Error('Fehler')}catch(err){status.className='status error';status.textContent='❌ Fehler. Bitte erneut versuchen.'}finally{btn.disabled=false;setTimeout(()=>status.textContent='',5000)}}

async function loadStatus(personId){try{const res=await fetch(API_URL+'/person/'+personId);if(res.ok){const data=await res.json();if(data.last_heartbeat){document.getElementById('lastCheckin').textContent='Letzte Meldung: '+new Date(data.last_heartbeat).toLocaleString('de-DE')}}}catch(e){}}

init();
</script>
</body>
</html>`;

const WATCHER_HTML = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>IchBinDa - Betreuer Dashboard</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;min-height:100vh;background:#f5f7fa;padding:20px}
.container{max-width:800px;margin:0 auto}
h1{color:#333;margin-bottom:10px}
.subtitle{color:#666;margin-bottom:30px}
.card{background:white;border-radius:12px;padding:20px;margin-bottom:20px;box-shadow:0 2px 8px rgba(0,0,0,0.1)}
.add-person{display:flex;gap:10px;margin-bottom:20px}
input[type="text"]{flex:1;padding:12px 16px;border:2px solid #e0e0e0;border-radius:8px;font-size:16px}
input[type="text"]:focus{outline:none;border-color:#667eea}
button{padding:12px 24px;background:#667eea;color:white;border:none;border-radius:8px;font-size:16px;cursor:pointer}
button:hover{background:#5a6fd6}
.person-list{list-style:none}
.person-item{display:flex;justify-content:space-between;align-items:center;padding:16px;border-bottom:1px solid #eee}
.person-main{flex:1}
.person-id{font-family:monospace;color:#666;font-size:14px}
.person-name{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#2f3b59;font-weight:600}
.person-status{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;text-transform:uppercase}
.status-ok{background:#d4edda;color:#155724}
.status-overdue{background:#f8d7da;color:#721c24}
.status-never{background:#fff3cd;color:#856404}
.last-seen{color:#666;font-size:14px;margin-top:4px}
.person-actions{display:flex;align-items:center;gap:10px}
.remove-btn{padding:8px 12px;background:#fff;color:#b42318;border:1px solid #fda29b;border-radius:8px;font-size:14px;cursor:pointer}
.remove-btn:hover{background:#fee4e2}
.empty-state{text-align:center;padding:40px;color:#666}
.scan-hint{display:block;color:#666;font-size:12px;margin-top:8px}
</style>
</head>
<body>
<div class="container">
<h1>👀 IchBinDa Betreuer</h1>
<p class="subtitle">Überwachte Personen im Blick behalten</p>
<div class="card">
<h3 style="margin-bottom:15px">➕ Person hinzufügen</h3>
<div class="add-person">
<input type="text" id="personId" placeholder="Person ID oder QR-Daten">
<button onclick="addPerson()">Hinzufügen</button>
<button type="button" onclick="openQrScanner()">QR scannen</button>
</div>
<input type="file" id="qrFileInput" accept="image/*" capture="environment" style="display:none" onchange="handleQrFileChange(event)">
<small class="scan-hint">QR-Code als Bild/Kamera scannen oder JSON direkt einfügen.</small>
</div>
<div class="card">
<h3 style="margin-bottom:15px">📋 Meine Personen</h3>
<ul class="person-list" id="personList">
<li class="empty-state">Noch keine Personen.</li>
</ul>
</div>
</div>
<script>
const API_URL = '/api';
const PERSON_NAMES_KEY = 'sicherda_person_names';
const PERSON_NAME_HISTORY_KEY = 'sicherda_person_name_history';
const WATCHED_PERSON_IDS_KEY = 'sicherda_watched_person_ids';
const HIDDEN_PERSON_IDS_KEY = 'sicherda_hidden_person_ids';

function getWatcherId() {
  return localStorage.getItem('sicherda_watcher_id');
}

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

function openQrScanner() {
  document.getElementById('qrFileInput').click();
}

async function handleQrFileChange(event) {
  const input = event.target;
  const file = input.files && input.files[0];
  if (!file) return;

  if (!('BarcodeDetector' in window)) {
    alert('QR-Scan wird hier nicht unterstützt. Bitte QR-JSON manuell einfügen.');
    input.value = '';
    return;
  }

  try {
    const detector = new BarcodeDetector({ formats: ['qr_code'] });
    const bitmap = await createImageBitmap(file);
    const barcodes = await detector.detect(bitmap);
    if (bitmap.close) bitmap.close();
    const qrText = barcodes[0] && barcodes[0].rawValue ? barcodes[0].rawValue.trim() : '';
    if (!qrText) throw new Error('Kein QR-Code erkannt');
    document.getElementById('personId').value = qrText;
    await addPerson();
  } catch (err) {
    alert('QR-Code konnte nicht gelesen werden.');
  } finally {
    input.value = '';
  }
}

async function init() {
  if (!getWatcherId()) {
    const res = await fetch(API_URL + '/watcher', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ push_token: 'web-' + crypto.randomUUID() })
    });
    const data = await res.json();
    localStorage.setItem('sicherda_watcher_id', data.id);
  }
  loadPersons();
}

async function addPerson() {
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
  
  // Zuerst sicherstellen, dass die Person existiert (automatisch erstellt durch API)
  try {
    // Person erstellen falls nicht existiert
    const personRes = await fetch(API_URL + '/person', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: personId })
    });
    if (!personRes.ok && personRes.status !== 409) { // 409 = already exists ist OK
      throw new Error('Failed to create person');
    }
    
    // Dann Watch-Relation erstellen
    await fetch(API_URL + '/watch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ person_id: personId, watcher_id: getWatcherId(), check_interval_minutes: 1440 })
    });
    unhidePersonInLocalView(personId);
    
    document.getElementById('personId').value = '';
    loadPersons();
  } catch (err) {
    alert('Fehler: ' + err.message);
  }
}

async function updateInterval(personId, minutes) {
  await fetch(API_URL + '/watch', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ person_id: personId, watcher_id: getWatcherId(), check_interval_minutes: parseInt(minutes) })
  });
  loadPersons();
}

function buildIntervalSelect(p) {
  // Werte in Minuten: 1min, 1h, 6h, 12h, 24h, 48h
  const intervals = [
    { min: 1, label: '1 Min' },
    { min: 60, label: '1 Std' },
    { min: 360, label: '6 Std' },
    { min: 720, label: '12 Std' },
    { min: 1440, label: '24 Std' },
    { min: 2880, label: '48 Std' }
  ];
  let html = '<select onchange="updateInterval(&quot;' + p.id + '&quot;, this.value)" style="padding:2px 6px;border:1px solid #ddd;border-radius:4px">';
  for (const iv of intervals) {
    const selected = p.check_interval_minutes == iv.min ? ' selected' : '';
    html += '<option value="' + iv.min + '"' + selected + '>' + iv.label + '</option>';
  }
  html += '</select>';
  return html;
}

function buildPersonRow(p) {
  const lastSeen = p.last_heartbeat 
    ? 'Letzte Meldung: ' + new Date(p.last_heartbeat).toLocaleString('de-DE')
    : 'Noch nie gemeldet';
  const personName = getPersonName(p.id);
  const idLabel = personName
    ? '<span class="person-name">' + escapeHtml(personName) + '</span> <span class="person-id">(' + escapeHtml(p.id) + ')</span>'
    : '<span class="person-id">' + escapeHtml(p.id) + '</span>';
  
  return '<li class="person-item">' +
    '<div class="person-main">' +
      '<div>' + idLabel + '</div>' +
      '<div class="last-seen">' + lastSeen + '</div>' +
      '<div style="margin-top:8px;font-size:12px;color:#888">' +
        '⏰ Alarm nach: ' + buildIntervalSelect(p) +
      '</div>' +
    '</div>' +
    '<div class="person-actions">' +
      '<span class="person-status status-' + p.status + '">' + p.status + '</span>' +
      '<button type="button" class="remove-btn" data-person-id="' + escapeHtml(p.id) + '">🗑️ Entfernen</button>' +
    '</div>' +
  '</li>';
}

function removePersonFromLocalView(personId) {
  if (!personId) return;
  const personName = getPersonName(personId) || getRememberedPersonName(personId);
  const label = personName ? personName + ' (' + personId + ')' : personId;
  const confirmed = confirm('Person "' + label + '" nur lokal ausblenden? Die Datenbank bleibt unverändert.');
  if (!confirmed) return;
  removePersonName(personId);
  hidePersonFromLocalView(personId);
  loadPersons();
}

async function loadPersons() {
  const res = await fetch(API_URL + '/watcher/' + getWatcherId() + '/persons');
  const personsRaw = await res.json();
  const persons = Array.isArray(personsRaw) ? personsRaw : [];
  const hiddenPersonIds = new Set(getHiddenPersonIds());
  const visiblePersons = persons.filter((person) => !hiddenPersonIds.has(person.id));
  const watchedPersonIds = getStoredList(WATCHED_PERSON_IDS_KEY);
  for (const person of visiblePersons) watchedPersonIds.push(person.id);
  setStoredList(WATCHED_PERSON_IDS_KEY, watchedPersonIds);
  const list = document.getElementById('personList');
  if (visiblePersons.length === 0) {
    list.innerHTML = '<li class="empty-state">Noch keine Personen.</li>';
    return;
  }
  list.innerHTML = visiblePersons.map(buildPersonRow).join('');
  list.querySelectorAll('.remove-btn').forEach((button) => {
    button.addEventListener('click', (event) => {
      const target = event.currentTarget;
      const personId = target ? target.getAttribute('data-person-id') : '';
      removePersonFromLocalView(personId || '');
    });
  });
}

init();
setInterval(loadPersons, 30000);
</script>
</body>
</html>`;

// Types
interface Env {
  DB: D1Database;
  EXPO_ACCESS_TOKEN?: string;
  API_KEYS?: string;  // Comma or newline separated API keys
}

interface RateLimitRow {
  last_heartbeat_at: string;
}

const RATE_LIMIT_WINDOW_MS = 10 * 1000; // 10 seconds (for testing)

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

// Security: Validate API Key from X-API-Key header
function isAuthorized(request: Request, env: Env): boolean {
  const providedKey = request.headers.get("X-API-Key");
  if (!providedKey) {
    return false;
  }

  const allowedKeys = (env.API_KEYS ?? "")
    .split(/[\n,]/)
    .map((key) => key.trim())
    .filter(Boolean);

  if (allowedKeys.length === 0) {
    return false;
  }

  return allowedKeys.some((key) => constantTimeEquals(providedKey, key));
}

// Security: Check rate limit for person_id (max 1 per 5 minutes)
async function checkRateLimit(
  db: D1Database,
  personId: string
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const now = new Date();
  const nowIso = now.toISOString();
  const cutoffIso = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS).toISOString();

  // Get previous rate limit entry
  const previousRateLimit = await db.prepare(
    "SELECT last_heartbeat_at FROM device_rate_limits WHERE device_id = ?1"
  )
    .bind(personId)
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
    .bind(personId, nowIso, cutoffIso)
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
  personId: string,
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
        .bind(previousTimestamp, personId, currentTimestamp)
        .run();
      return;
    }

    await db.prepare(
      "DELETE FROM device_rate_limits WHERE device_id = ?1 AND last_heartbeat_at = ?2"
    )
      .bind(personId, currentTimestamp)
      .run();
  } catch (rollbackError) {
    console.error("Failed to rollback rate limit state", rollbackError);
  }
}

const app = new Hono<{ Bindings: Env }>();

// Static HTML routes
app.get('/', (c) => c.html('<h1>IchBinDa</h1><p><a href="/person.html">Person UI</a> | <a href="/watcher.html">Betreuer UI</a></p>'));
app.get('/person.html', (c) => c.html(PERSON_HTML));
app.get('/watcher.html', (c) => c.html(WATCHER_HTML));

// API routes with CORS
app.use('/api/*', cors({ origin: '*', allowMethods: ['GET', 'POST', 'PUT', 'DELETE'] }));

// API: Neue Person erstellen (oder bestehende zurückgeben)
app.post('/api/person', async (c) => {
  try {
    const body = await c.req.json<{ id?: string }>().catch(() => ({}));
    const personId = body.id || crypto.randomUUID();
    await c.env.DB.prepare(
      'INSERT OR IGNORE INTO persons (id) VALUES (?)'
    ).bind(personId).run();
    return c.json({ id: personId }, 201);
  } catch (e) {
    console.error('Error creating person:', e);
    return c.json({ error: 'Failed to create person', details: String(e) }, 500);
  }
});

// API: Heartbeat senden (ohne API-Key, mit Rate Limiting)
app.post('/api/heartbeat', async (c) => {
  // 1. Parse and validate request body
  const body = await c.req.json<{ person_id?: string; status?: string }>().catch(() => ({}));
  const person_id = typeof body.person_id === 'string' ? body.person_id.trim() : '';
  const status = typeof body.status === 'string' ? body.status.trim() : 'ok';

  if (!person_id) {
    return c.json({ error: 'person_id required' }, 400);
  }

  if (person_id.length > 255 || status.length > 64) {
    return c.json({ error: 'person_id or status is too long' }, 400);
  }

  const now = new Date();
  const nowIso = now.toISOString();

  // 2. Check rate limit (max 1 per 5 minutes per person)
  const rateLimitCheck = await checkRateLimit(c.env.DB, person_id);
  if (!rateLimitCheck.allowed) {
    return c.json({
      error: 'Too many requests',
      retry_after_seconds: rateLimitCheck.retryAfterSeconds
    }, 429);
  }

  // 3. Store heartbeat
  try {
    await c.env.DB.prepare(
      `INSERT INTO persons (id, last_heartbeat) VALUES (?, ?)
       ON CONFLICT(id) DO UPDATE SET last_heartbeat = excluded.last_heartbeat`
    ).bind(person_id, nowIso).run();

    return c.json({
      success: true,
      person_id,
      status,
      timestamp: nowIso
    });
  } catch (error) {
    // Rollback rate limit on error (best effort)
    const previousRateLimit = await c.env.DB.prepare(
      "SELECT last_heartbeat_at FROM device_rate_limits WHERE device_id = ?1"
    ).bind(person_id).first<RateLimitRow>();

    await rollbackRateLimit(
      c.env.DB,
      person_id,
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
  const person = await c.env.DB.prepare('SELECT * FROM persons WHERE id = ?').bind(personId).first();
  if (!person) return c.json({ error: 'Person not found' }, 404);
  return c.json(person);
});

// API: Betreuer registrieren
app.post('/api/watcher', async (c) => {
  const { push_token } = await c.req.json<{ push_token: string }>();
  if (!push_token) return c.json({ error: 'push_token required' }, 400);
  const watcherId = crypto.randomUUID();
  await c.env.DB.prepare('INSERT INTO watchers (id, push_token) VALUES (?, ?)').bind(watcherId, push_token).run();
  return c.json({ id: watcherId }, 201);
});

// API: Person überwachen (Intervall in Minuten)
app.post('/api/watch', async (c) => {
  try {
    const { person_id, watcher_id, check_interval_minutes = 1440 } = await c.req.json();
    if (!person_id || !watcher_id) return c.json({ error: 'person_id and watcher_id required' }, 400);
    await c.env.DB.prepare(
      `INSERT INTO watch_relations (person_id, watcher_id, check_interval_minutes)
       VALUES (?, ?, ?)
       ON CONFLICT(person_id, watcher_id) DO UPDATE SET
       check_interval_minutes = excluded.check_interval_minutes`
    ).bind(person_id, watcher_id, check_interval_minutes).run();
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
    `UPDATE watch_relations SET check_interval_minutes = ? WHERE person_id = ? AND watcher_id = ?`
  ).bind(check_interval_minutes, person_id, watcher_id).run();
  return c.json({ success: true, person_id, watcher_id, check_interval_minutes });
});

// API: Alle überwachten Personen eines Betreuers (Intervall in Minuten)
app.get('/api/watcher/:id/persons', async (c) => {
  const watcherId = c.req.param('id');
  const persons = await c.env.DB.prepare(
    `SELECT 
      p.id,
      p.last_heartbeat,
      wr.check_interval_minutes,
      CASE 
        WHEN p.last_heartbeat IS NULL THEN 'never'
        WHEN datetime(p.last_heartbeat, '+' || wr.check_interval_minutes || ' minutes') < datetime('now') 
        THEN 'overdue'
        ELSE 'ok'
      END as status
     FROM persons p
     JOIN watch_relations wr ON p.id = wr.person_id
     WHERE wr.watcher_id = ?`
  ).bind(watcherId).all();
  return c.json(persons.results);
});

// CRON: Überfälligkeits-Check (Intervall in Minuten)
async function checkOverduePersons(db: D1Database, expoToken?: string) {
  const overdue = await db.prepare(
    `SELECT p.id as person_id, p.last_heartbeat, wr.watcher_id, wr.check_interval_minutes, w.push_token
     FROM persons p
     JOIN watch_relations wr ON p.id = wr.person_id
     JOIN watchers w ON wr.watcher_id = w.id
     WHERE (p.last_heartbeat IS NULL OR datetime(p.last_heartbeat, '+' || wr.check_interval_minutes || ' minutes') < datetime('now'))
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
          title: 'IchBinDa Alarm',
          body: `Keine Meldung seit ${hours} Stunden`,
          data: { person_id: item.person_id },
        }),
      });
    }
    await db.prepare('UPDATE watch_relations SET last_notified_at = datetime("now") WHERE person_id = ? AND watcher_id = ?')
      .bind(item.person_id, item.watcher_id).run();
  }
  return { checked: overdue.results?.length || 0 };
}

// Worker Handler
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return app.fetch(request, env, ctx);
  },
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(checkOverduePersons(env.DB, env.EXPO_ACCESS_TOKEN));
  },
};
