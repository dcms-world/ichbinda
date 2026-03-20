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
:root{
--bg-top:#eff4fb;
--bg-bottom:#dfe7f1;
--panel-bg:rgba(255,255,255,0.93);
--text:#0f172a;
--muted:#334155;
--line:#ccd7e3;
--ok-green-a:#22c55e;
--ok-green-b:#11998e;
--ok-green-shadow:#0f766e;
}
*{margin:0;padding:0;box-sizing:border-box}
body{
font-family:'SF Pro Text','SF Pro Display',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
font-size:20px;
line-height:1.5;
min-height:100vh;
display:flex;
align-items:center;
justify-content:center;
padding:24px;
color:var(--text);
background:linear-gradient(180deg,var(--bg-top) 0%,var(--bg-bottom) 100%);
position:relative;
overflow-x:hidden;
}
body::before{
content:'';
position:fixed;
inset:0;
pointer-events:none;
background-image:radial-gradient(rgba(255,255,255,0.65) 1px,transparent 1px);
background-size:18px 18px;
opacity:0.4;
}
.container{
position:relative;
z-index:1;
width:100%;
max-width:480px;
text-align:center;
padding:36px 24px 30px;
border-radius:34px;
border:1px solid var(--line);
background:var(--panel-bg);
box-shadow:0 20px 45px rgba(15,23,42,0.14),0 4px 14px rgba(15,23,42,0.08);
backdrop-filter:blur(8px);
}
h1{
color:var(--text);
font-size:40px;
line-height:1.15;
font-weight:800;
letter-spacing:-0.01em;
margin-bottom:10px;
}
.subtitle{
color:#1e293b;
font-size:24px;
line-height:1.35;
font-weight:600;
margin-bottom:24px;
}
.btn-okay{
width:248px;
height:248px;
max-width:100%;
margin:0 auto;
border:none;
border-radius:50%;
background:linear-gradient(180deg,var(--ok-green-a) 0%,var(--ok-green-b) 100%);
color:#ffffff;
font-size:56px;
line-height:1;
font-weight:800;
letter-spacing:0.02em;
cursor:pointer;
display:flex;
align-items:center;
justify-content:center;
flex-direction:column;
gap:10px;
box-shadow:0 14px 28px rgba(17,153,142,0.3),0 6px 0 var(--ok-green-shadow),inset 0 2px 7px rgba(255,255,255,0.35);
transition:transform 140ms ease,filter 140ms ease,box-shadow 140ms ease;
}
.btn-okay .btn-sub{
font-size:30px;
font-weight:700;
letter-spacing:0;
}
.btn-okay:hover{
filter:brightness(1.03);
transform:translateY(-1px);
}
.btn-okay:active{
transform:translateY(3px);
box-shadow:0 7px 14px rgba(17,153,142,0.26),0 2px 0 var(--ok-green-shadow),inset 0 2px 6px rgba(255,255,255,0.28);
}
.btn-okay:disabled{
background:linear-gradient(180deg,#94a3b8 0%,#64748b 100%);
box-shadow:0 6px 14px rgba(51,65,85,0.26),0 3px 0 #475569;
color:#f8fafc;
cursor:not-allowed;
transform:none;
}
.status{
margin-top:22px;
padding:16px 14px;
border-radius:14px;
border:2px solid #94a3b8;
font-size:22px;
font-weight:700;
color:var(--text);
background:#f8fafc;
}
.status:empty{display:none}
.status.success{background:#dcfce7;color:#14532d;border-color:#166534}
.status.error{background:#fee2e2;color:#7f1d1d;border-color:#991b1b}
.status.rate-limit{background:#fff7ed;color:#7c2d12;border-color:#9a3412}
.last-checkin{
margin-top:18px;
color:#1f2937;
font-size:20px;
font-weight:600;
}
.cooldown-container{
margin-top:20px;
padding:16px;
border:2px solid #cbd5e1;
background:#f8fafc;
border-radius:14px;
display:none;
}
.cooldown-container.active{display:block}
.cooldown-text{color:#334155;font-size:19px;font-weight:600;margin-bottom:10px}
.cooldown-bar{height:12px;background:#dbe4ee;border-radius:8px;overflow:hidden}
.cooldown-progress{height:100%;background:#2563eb;width:0%}
.cooldown-countdown{font-size:34px;font-weight:800;color:#1d4ed8;margin-top:10px}

.menu-btn{
position:fixed;
top:18px;
right:18px;
width:62px;
height:62px;
border-radius:18px;
border:2px solid var(--line);
background:rgba(255,255,255,0.96);
color:var(--text);
font-size:34px;
font-weight:700;
line-height:1;
cursor:pointer;
z-index:260;
box-shadow:0 8px 20px rgba(15,23,42,0.14);
}

.settings-overlay{position:fixed;inset:0;background:rgba(15,23,42,0.46);display:none;z-index:250}
.settings-overlay.open{display:block}
.settings-panel{
position:fixed;
inset:0;
background:#edf2f8;
z-index:300;
padding:92px 20px 28px;
overflow-y:auto;
display:none;
}
.settings-panel.open{display:block}
.settings-title{font-size:36px;line-height:1.2;margin-bottom:18px;color:var(--text)}
.settings-section{
margin:16px 0;
padding:18px;
background:#fff;
border:2px solid #d4dce7;
border-radius:20px;
box-shadow:0 7px 18px rgba(15,23,42,0.06);
}
.settings-section h3{margin-bottom:10px;color:var(--text);font-size:26px;line-height:1.2}
.name-label{display:block;color:#334155;font-size:19px;font-weight:700;margin-bottom:8px}
.name-display{background:#fff;border:2px solid #cbd5e1;padding:14px;border-radius:14px;font-size:32px;font-weight:800;line-height:1.2;color:var(--text);word-break:break-word}
.btn-close{
position:absolute;
top:22px;
left:20px;
width:56px;
height:56px;
border-radius:16px;
border:2px solid var(--line);
background:#fff;
font-size:30px;
line-height:1;
color:var(--text);
cursor:pointer;
}
.qr-container{margin:12px 0 6px;padding:14px;border:2px solid #d6dde7;background:#fff;border-radius:16px;text-align:center}
#qrcode{display:inline-block;cursor:pointer}
.qr-copy-btn{display:block;margin:12px auto 0;padding:10px 14px;background:#eef2ff;color:#1e3a8a;border:2px solid #c7d2fe;border-radius:12px;font-size:18px;font-weight:700;cursor:pointer}
.qr-copy-btn:active{transform:scale(0.99)}
.qr-copy-status{display:block;min-height:24px;margin-top:8px;font-size:17px;color:#1e40af}
.qr-copy-status.error{color:#b91c1c}
.settings-help{display:block;color:#1f2937;font-size:19px;line-height:1.35}
.close-settings{
margin-top:22px;
min-height:56px;
padding:12px 20px;
background:#1f2937;
color:#fff;
border:none;
border-radius:14px;
font-size:24px;
font-weight:700;
cursor:pointer;
width:100%;
}
.name-modal-overlay{position:fixed;inset:0;background:rgba(15,23,42,0.55);display:none;align-items:center;justify-content:center;z-index:350;padding:20px}
.name-modal-overlay.open{display:flex}
.name-modal{
background:#fff;
border:2px solid #d3dae4;
border-radius:20px;
padding:24px;
width:100%;
max-width:430px;
box-shadow:0 14px 45px rgba(15,23,42,0.2);
}
.name-modal h2{font-size:34px;color:var(--text);line-height:1.2;margin-bottom:10px}
.name-modal p{color:#334155;font-size:21px;line-height:1.35;margin-bottom:16px}
.name-modal input{width:100%;min-height:58px;padding:12px 14px;border:2px solid #9ca3af;border-radius:14px;font-size:21px;margin-bottom:12px}
.name-modal button{width:100%;min-height:58px;padding:12px 14px;border:none;border-radius:14px;background:#2563eb;color:#fff;font-size:23px;font-weight:700;cursor:pointer}

.location-toggle{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:12px 14px;background:#fff;border:2px solid #cbd5e1;border-radius:14px;margin-top:10px}
.location-toggle-label{color:var(--text);font-size:22px;font-weight:700;line-height:1.2}
.location-toggle-help{color:var(--muted);font-size:18px;line-height:1.3;margin-top:6px}
.toggle-switch{position:relative;flex-shrink:0;width:84px;height:48px;background:#6b7280;border-radius:24px;cursor:pointer;border:2px solid #4b5563}
.toggle-switch.active{background:#2563eb;border-color:#1e40af}
.toggle-switch::after{content:'';position:absolute;top:3px;left:3px;width:38px;height:38px;background:#fff;border-radius:50%}
.toggle-switch.active::after{left:39px}

button,input,.toggle-switch{min-height:44px;touch-action:manipulation}
button:focus-visible,input:focus-visible,.toggle-switch:focus-visible{outline:3px solid #ff9500;outline-offset:2px}
@media (prefers-reduced-motion:reduce){
*{transition:none !important}
}
@media (max-width:520px){
body{padding:12px}
.container{padding:28px 16px 22px}
h1{font-size:34px}
.subtitle{font-size:22px}
.btn-okay{width:224px;height:224px;font-size:48px}
.btn-okay .btn-sub{font-size:27px}
.settings-title{font-size:30px}
}
</style>
</head>
<body>
<div class="name-modal-overlay" id="nameModalOverlay">
<form class="name-modal" id="nameModalForm">
<h2>Wie heißt du?</h2>
<p>Bitte gib deinen Namen einmal ein.</p>
<input id="personNameInput" type="text" maxlength="80" placeholder="z.B. Oma Erna" required>
<button type="submit">Speichern</button>
</form>
</div>

<button class="menu-btn" onclick="openSettings()" title="Menü" aria-label="Menü öffnen">☰</button>

<div class="settings-overlay" id="settingsOverlay" onclick="closeSettings()"></div>

<div class="settings-panel" id="settingsPanel">
<button class="btn-close" onclick="closeSettings()" aria-label="Einstellungen schließen">✕</button>
<h2 class="settings-title">Einstellungen</h2>

<div class="settings-section">
<span class="name-label">Dein Name:</span>
<div class="name-display" id="personNameDisplay">-</div>
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
<div class="location-toggle">
<div>
<div class="location-toggle-label">Standort mitteilen</div>
<div class="location-toggle-help">Bei jedem OK senden wir deinen Standort mit</div>
</div>
<div class="toggle-switch" id="locationToggle" onclick="toggleLocation()"></div>
</div>
</div>

<button class="close-settings" onclick="closeSettings()">Schließen</button>
</div>

<div class="container">
<h1>IchBinDa</h1>
<p class="subtitle">Einmal tippen: Alles okay</p>
<button class="btn-okay" id="btnOkay" onclick="sendHeartbeat()" aria-label="Okay senden">OK<span class="btn-sub">Alles gut</span></button>
<div id="status" class="status" aria-live="polite"></div>
<div class="cooldown-container" id="cooldownContainer">
<div class="cooldown-text">Bitte kurz warten...</div>
<div class="cooldown-bar"><div class="cooldown-progress" id="cooldownProgress"></div></div>
<div class="cooldown-countdown" id="cooldownCountdown">5:00</div>
</div>
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
let qrCopyStatusTimeout=null;
function setQrCopyStatus(message,isError){const statusEl=document.getElementById('qrCopyStatus');if(!statusEl)return;statusEl.textContent=message||'';statusEl.classList.toggle('error',!!isError);if(qrCopyStatusTimeout){clearTimeout(qrCopyStatusTimeout);qrCopyStatusTimeout=null}if(message){qrCopyStatusTimeout=setTimeout(()=>{statusEl.textContent='';statusEl.classList.remove('error');qrCopyStatusTimeout=null},1600)}}
async function copyQrPayload(event){if(event&&typeof event.stopPropagation==='function')event.stopPropagation();if(!currentPersonId)return;const qrPayload=buildQrPayload();if(!navigator.clipboard||typeof navigator.clipboard.writeText!=='function'){setQrCopyStatus('Kopieren nicht verfügbar',true);return}try{await navigator.clipboard.writeText(qrPayload);setQrCopyStatus('Kopiert!',false)}catch(e){console.error('QR payload copy failed',e);setQrCopyStatus('Kopieren fehlgeschlagen',true)}}
function renderQrCode(){if(!currentPersonId)return;const qrPayload=buildQrPayload();const qrEl=document.getElementById('qrcode');qrEl.innerHTML='';new QRCode(qrEl,{text:qrPayload,width:180,height:180});qrEl.onclick=copyQrPayload}
function renderPersonName(){document.getElementById('personNameDisplay').textContent=currentPersonName||getPersonName()||'-'}
function openSettings(){console.log('openSettings called');document.getElementById('settingsPanel').classList.add('open');document.getElementById('settingsOverlay').classList.add('open');renderPersonName();renderQrCode()}

function closeSettings(){document.getElementById('settingsPanel').classList.remove('open');document.getElementById('settingsOverlay').classList.remove('open')}

function askForPersonName(){return new Promise((resolve)=>{const overlay=document.getElementById('nameModalOverlay');const form=document.getElementById('nameModalForm');const input=document.getElementById('personNameInput');overlay.classList.add('open');input.focus();const onSubmit=(event)=>{event.preventDefault();const name=input.value.trim();if(!name)return;setPersonName(name);overlay.classList.remove('open');resolve(name)};form.addEventListener('submit',onSubmit,{once:true})})}

async function ensurePersonName(){const savedName=getPersonName();if(savedName)return savedName;return askForPersonName()}

const LOCATION_ENABLED_KEY='sicherda_location_enabled';

function isLocationEnabled(){return localStorage.getItem(LOCATION_ENABLED_KEY)==='true'}
function setLocationEnabled(enabled){localStorage.setItem(LOCATION_ENABLED_KEY,enabled?'true':'false');updateLocationToggleUi()}

function updateLocationToggleUi(){const toggle=document.getElementById('locationToggle');if(!toggle)return;toggle.classList.toggle('active',isLocationEnabled())}

async function toggleLocation(){const currentlyEnabled=isLocationEnabled();if(!currentlyEnabled){const confirmed=confirm('Möchtest du deinen Standort bei jedem "Okay" mitteilen? Der Betreuer sieht dann, wo du dich befindest.');if(!confirmed)return;try{await getCurrentPosition();setLocationEnabled(true)}catch(e){console.log('Location permission denied',e);setLocationEnabled(false);alert('Standort nicht verfügbar. Bitte Standortzugriff im Browser erlauben.')}}else{setLocationEnabled(false)}}

function getCurrentPosition(){return new Promise((resolve,reject)=>{if(!navigator.geolocation){reject(new Error('Geolocation not supported'));return}navigator.geolocation.getCurrentPosition(pos=>resolve({lat:pos.coords.latitude,lng:pos.coords.longitude}),err=>reject(err),{enableHighAccuracy:true,timeout:10000,maximumAge:60000})})}

async function init(){try{currentPersonName=await ensurePersonName();let personId=getPersonId();if(!personId){personId=await createPerson()}currentPersonId=personId;renderPersonName();updateLocationToggleUi();const url=new URL(window.location);url.searchParams.set('id',personId);window.history.replaceState({},'',url);loadStatus(personId)}catch(e){console.error('Init error:',e);document.getElementById('status').textContent='Fehler beim Laden. Bitte Seite neu laden.';document.getElementById('status').className='status error'}}

let cooldownInterval=null;let cooldownEndTime=null;

function formatCountdown(seconds){const mins=Math.floor(seconds/60);const secs=seconds%60;return mins+':'+(secs<10?'0':'')+secs}

function startCooldown(seconds){const btn=document.getElementById('btnOkay');const status=document.getElementById('status');if(cooldownInterval)return;cooldownEndTime=Date.now()+seconds*1000;btn.disabled=true;status.className='status rate-limit';status.textContent='ℹ️ Bereits gemeldet. Noch '+seconds+' Sekunden warten.';cooldownInterval=setInterval(()=>{const remaining=Math.ceil((cooldownEndTime-Date.now())/1000);if(remaining<=0){clearInterval(cooldownInterval);cooldownInterval=null;btn.disabled=false;status.className='status success';status.textContent='✅ Bereit zum Melden!';setTimeout(()=>status.textContent='',2000);return}status.textContent='ℹ️ Bereits gemeldet. Noch '+remaining+' Sekunden warten.'},1000)}

async function sendHeartbeat(){console.log('sendHeartbeat called');const btn=document.getElementById('btnOkay');const status=document.getElementById('status');const personId=getPersonId();if(!personId){console.error('No person ID');status.className='status error';status.textContent='❌ Fehler: Keine Person ID';return}if(cooldownInterval){console.log('Cooldown active');return}status.className='status';status.textContent='Wird gesendet...';const payload={person_id:personId};if(isLocationEnabled()){try{const pos=await getCurrentPosition();const lat=Number(pos.lat);const lng=Number(pos.lng);if(!Number.isFinite(lat)||!Number.isFinite(lng))throw new Error('Invalid coordinates');payload.lat=lat;payload.lng=lng;console.log('Location added',pos)}catch(e){console.log('Could not get location',e);status.className='status error';status.textContent='❌ Standort nicht verfügbar. Bitte Standortzugriff erlauben.';setTimeout(()=>status.textContent='',5000);return}}try{console.log('Sending payload',payload);const res=await fetch(API_URL+'/heartbeat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});console.log('Response',res.status);if(res.ok){if(cooldownInterval){clearInterval(cooldownInterval);cooldownInterval=null}btn.disabled=false;const data=await res.json();status.className='status success';status.textContent='✅ Gemeldet!';document.getElementById('lastCheckin').textContent='Letzte Meldung: '+new Date(data.timestamp).toLocaleString('de-DE');setTimeout(()=>status.textContent='',3000)}else if(res.status===429){const data=await res.json().catch(()=>({}));const retrySeconds=data.retry_after_seconds||20;startCooldown(retrySeconds)}else{const text=await res.text();console.error('Server error',res.status,text);throw new Error('Server error: '+res.status)}}catch(err){console.error('sendHeartbeat error',err);if(!cooldownInterval){status.className='status error';status.textContent='❌ Fehler. Bitte erneut versuchen.';btn.disabled=false;setTimeout(()=>status.textContent='',5000)}}}

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
<script src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js"></script>
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
</style>
</head>
<body>
<div class="container">
<h1>👀 IchBinDa Betreuer</h1>
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
const PERSON_NAMES_KEY = 'sicherda_person_names';
const PERSON_NAME_HISTORY_KEY = 'sicherda_person_name_history';
const PERSON_PHOTOS_KEY = 'sicherda_person_photos';
const WATCHED_PERSON_IDS_KEY = 'sicherda_watched_person_ids';
const HIDDEN_PERSON_IDS_KEY = 'sicherda_hidden_person_ids';
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
  const coordinates = lat.toFixed(4) + ', ' + lng.toFixed(4);
  const mapsUrl = 'https://www.google.com/maps?q=' + encodeURIComponent(lat + ',' + lng);
  return '<a href="' + escapeHtml(mapsUrl) + '" target="_blank" rel="noopener noreferrer" style="color:#667eea;text-decoration:none;">' + escapeHtml(coordinates) + '</a>';
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
          const personId = parsedInput && parsedInput.personId ? parsedInput.personId : qrText;
          document.getElementById('personId').value = personId;
          if (parsedInput && parsedInput.name) {
            storePersonName(personId, parsedInput.name);
          }
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
  updatePersonLimitUi();
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

function removePersonFromModal() {
  if (!activeEditPersonId) return;
  const personId = activeEditPersonId;
  const removed = removePersonFromLocalView(personId);
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

function removePersonFromLocalView(personId) {
  if (!personId) return;
  const personName = getPersonName(personId) || getRememberedPersonName(personId);
  const label = personName ? personName + ' (' + personId + ')' : personId;
  const confirmed = confirm('Person "' + label + '" nur lokal ausblenden? Die Datenbank bleibt unverändert.');
  if (!confirmed) return false;
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
interface Env {
  DB: D1Database;
  EXPO_ACCESS_TOKEN?: string;
  API_KEYS?: string;  // Comma or newline separated API keys
}

interface RateLimitRow {
  last_heartbeat_at: string;
}

const RATE_LIMIT_WINDOW_MS = 20 * 1000; // 20 seconds (for testing)

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

const app = new Hono<{ Bindings: Env }>();

// Static HTML routes
app.get('/', (c) =>
  c.html(`<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>IchBinDa</title>
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
      <h1>IchBinDa</h1>
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
app.get('/person.html', (c) => c.html(PERSON_HTML));
app.get('/watcher.html', (c) => c.html(WATCHER_HTML));

// API routes with CORS
app.use('/api/*', cors({ origin: '*', allowMethods: ['GET', 'POST', 'PUT', 'DELETE'] }));

// API: Neue Person erstellen (oder bestehende zurückgeben)
app.post('/api/person', async (c) => {
  try {
    const body = await c.req.json<{ id?: string }>().catch((): { id?: string } => ({}));
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
  const body = await c.req
    .json<{ person_id?: string; status?: string; lat?: unknown; lng?: unknown }>()
    .catch((): { person_id?: string; status?: string; lat?: unknown; lng?: unknown } => ({}));
  const person_id = typeof body.person_id === 'string' ? body.person_id.trim() : '';
  const status = typeof body.status === 'string' ? body.status.trim() : 'ok';
  const hasLat = body.lat !== undefined && body.lat !== null && body.lat !== '';
  const hasLng = body.lng !== undefined && body.lng !== null && body.lng !== '';
  const lat = hasLat ? parseCoordinate(body.lat) : null;
  const lng = hasLng ? parseCoordinate(body.lng) : null;

  if (!person_id) {
    return c.json({ error: 'person_id required' }, 400);
  }

  if (person_id.length > 255 || status.length > 64) {
    return c.json({ error: 'person_id or status is too long' }, 400);
  }

  if (hasLat !== hasLng) {
    return c.json({ error: 'lat and lng must be provided together' }, 400);
  }

  if ((hasLat && lat === null) || (hasLng && lng === null)) {
    return c.json({ error: 'Invalid coordinates' }, 400);
  }

  // Validate coordinate ranges if provided
  if (lat !== null && (lat < -90 || lat > 90)) {
    return c.json({ error: 'Invalid latitude' }, 400);
  }
  if (lng !== null && (lng < -180 || lng > 180)) {
    return c.json({ error: 'Invalid longitude' }, 400);
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

  // 3. Store heartbeat with optional location
  try {
    if (lat !== null && lng !== null) {
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

    return c.json({
      success: true,
      person_id,
      status,
      timestamp: nowIso,
      location: lat !== null && lng !== null ? { lat, lng } : null
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
