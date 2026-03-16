import { Hono } from 'hono';
import { cors } from 'hono/cors';

// HTML Templates (embedded for Cloudflare Worker)
const PERSON_HTML = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SicherDa - Ich bin okay</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:20px}
.container{background:white;border-radius:20px;padding:40px;max-width:400px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.3)}
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
.setup-info{margin-top:30px;padding:15px;background:#f8f9fa;border-radius:10px;font-size:14px}
.id-display{background:#e9ecef;padding:12px;border-radius:8px;font-family:monospace;font-size:16px;word-break:break-all;margin:10px 0;cursor:pointer;transition:background 0.2s}
.id-display:hover{background:#dee2e6}
.id-display.copied{background:#d4edda}
.btn-small{padding:8px 16px;font-size:14px;border:none;border-radius:6px;cursor:pointer;margin:5px}
.btn-qr{background:#667eea;color:white}
.btn-copy{background:#6c757d;color:white}
.qr-container{margin:15px 0;padding:15px;background:white;border-radius:10px;display:none}
.qr-container.show{display:block}
.menu{margin-top:15px;display:flex;justify-content:center;gap:10px;flex-wrap:wrap}
</style>
</head>
<body>
<div class="container">
<h1>👋 SicherDa</h1>
<p class="subtitle">Einmal drücken = "Ich bin okay"</p>
<button class="btn-okay" id="btnOkay" onclick="sendHeartbeat()">✅<br>OKAY</button>
<div id="status"></div>
<div class="last-checkin" id="lastCheckin"></div>

<div class="setup-info" id="setupInfo">
<strong>🔑 Deine ID:</strong>
<div class="id-display" id="personId" onclick="copyId()" title="Klicken zum Kopieren">-</div>
<small id="copyHint">Tippe auf die ID zum Kopieren</small>

<div class="menu">
<button class="btn-small btn-copy" onclick="copyId()">📋 Kopieren</button>
<button class="btn-small btn-qr" onclick="toggleQR()">📱 QR-Code</button>
</div>

<div class="qr-container" id="qrContainer">
<div id="qrcode"></div>
<small>Der Betreuer kann diesen Code scannen</small>
</div>

<small style="display:block;margin-top:15px;color:#666">Gib diese ID oder den QR-Code deinem Betreuer.</small>
</div>
</div>

<script>
const API_URL='/api';
let currentPersonId = null;

function getPersonId(){
const params=new URLSearchParams(window.location.search);
return params.get('id')||localStorage.getItem('sicherda_person_id')
}

async function createPerson(){
const res=await fetch(API_URL+'/person',{method:'POST'});
const data=await res.json();
localStorage.setItem('sicherda_person_id',data.id);
return data.id
}

function copyId(){
if(!currentPersonId)return;
navigator.clipboard.writeText(currentPersonId).then(()=>{
const idEl=document.getElementById('personId');
idEl.classList.add('copied');
idEl.textContent='✅ Kopiert!';
document.getElementById('copyHint').textContent='ID wurde in die Zwischenablage kopiert';
setTimeout(()=>{
idEl.classList.remove('copied');
idEl.textContent=currentPersonId;
document.getElementById('copyHint').textContent='Tippe auf die ID zum Kopieren';
},2000);
});
}

function toggleQR(){
const container=document.getElementById('qrContainer');
if(container.classList.contains('show')){
container.classList.remove('show');
}else{
container.classList.add('show');
if(currentPersonId){
document.getElementById('qrcode').innerHTML='';
new QRCode(document.getElementById('qrcode'),{
text:currentPersonId,
width:200,
height:200,
colorDark:"#000000",
colorLight:"#ffffff",
correctLevel:QRCode.CorrectLevel.M
});
}
}
}

async function init(){
let personId=getPersonId();
if(!personId)personId=await createPerson();
currentPersonId=personId;
document.getElementById('personId').textContent=personId;
const url=new URL(window.location);
url.searchParams.set('id',personId);
window.history.replaceState({},'',url);
loadStatus(personId)
}

async function sendHeartbeat(){
const btn=document.getElementById('btnOkay');
const status=document.getElementById('status');
const personId=getPersonId();
btn.disabled=true;
status.className='status';
status.textContent='Wird gesendet...';
try{
const res=await fetch(API_URL+'/heartbeat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({person_id:personId})});
if(res.ok){
const data=await res.json();
status.className='status success';
status.textContent='✅ Gemeldet!';
document.getElementById('lastCheckin').textContent='Letzte Meldung: '+new Date(data.timestamp).toLocaleString('de-DE')
}else throw new Error('Fehler')
}catch(err){
status.className='status error';
status.textContent='❌ Fehler. Bitte erneut versuchen.'
}finally{
btn.disabled=false;
setTimeout(()=>status.textContent='',5000)
}
}

async function loadStatus(personId){
try{
const res=await fetch(API_URL+'/person/'+personId);
if(res.ok){
const data=await res.json();
if(data.last_heartbeat){
document.getElementById('lastCheckin').textContent='Letzte Meldung: '+new Date(data.last_heartbeat).toLocaleString('de-DE')
}
}
}catch(e){}
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
<title>SicherDa - Betreuer Dashboard</title>
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
.person-id{font-family:monospace;color:#666;font-size:14px}
.person-status{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;text-transform:uppercase}
.status-ok{background:#d4edda;color:#155724}
.status-overdue{background:#f8d7da;color:#721c24}
.status-never{background:#fff3cd;color:#856404}
.last-seen{color:#666;font-size:14px;margin-top:4px}
.empty-state{text-align:center;padding:40px;color:#666}
</style>
</head>
<body>
<div class="container">
<h1>👀 SicherDa Betreuer</h1>
<p class="subtitle">Überwachte Personen im Blick behalten</p>
<div class="card">
<h3 style="margin-bottom:15px">➕ Person hinzufügen</h3>
<div class="add-person">
<input type="text" id="personId" placeholder="Person ID">
<button onclick="addPerson()">Hinzufügen</button>
</div>
</div>
<div class="card">
<h3 style="margin-bottom:15px">📋 Meine Personen</h3>
<ul class="person-list" id="personList">
<li class="empty-state">Noch keine Personen.</li>
</ul>
</div>
</div>
<script>
const API_URL='/api';
function getWatcherId(){return localStorage.getItem('sicherda_watcher_id')}
async function init(){if(!getWatcherId()){const res=await fetch(API_URL+'/watcher',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({push_token:'web-'+crypto.randomUUID()})});const data=await res.json();localStorage.setItem('sicherda_watcher_id',data.id)}loadPersons()}
async function addPerson(){const personId=document.getElementById('personId').value.trim();if(!personId)return;await fetch(API_URL+'/watch',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({person_id:personId,watcher_id:getWatcherId(),check_interval_hours:24})});document.getElementById('personId').value='';loadPersons()}
async function loadPersons(){const res=await fetch(API_URL+'/watcher/'+getWatcherId()+'/persons');const persons=await res.json();const list=document.getElementById('personList');if(persons.length===0){list.innerHTML='<li class="empty-state">Noch keine Personen.</li>';return}list.innerHTML=persons.map(p=>'<li class="person-item"><div><div class="person-id">'+p.id+'</div><div class="last-seen">'+(p.last_heartbeat?'Letzte Meldung: '+new Date(p.last_heartbeat).toLocaleString('de-DE'):'Noch nie gemeldet')+'</div></div><span class="person-status status-'+p.status+'">'+p.status+'</span></li>').join('')}
init();setInterval(loadPersons,30000);
</script>
</body>
</html>`;

// Types
interface Env {
  DB: D1Database;
  EXPO_ACCESS_TOKEN?: string;
}

const app = new Hono<{ Bindings: Env }>();

// Static HTML routes
app.get('/', (c) => c.html('<h1>SicherDa</h1><p><a href="/person.html">Person UI</a> | <a href="/watcher.html">Betreuer UI</a></p>'));
app.get('/person.html', (c) => c.html(PERSON_HTML));
app.get('/watcher.html', (c) => c.html(WATCHER_HTML));

// API routes with CORS
app.use('/api/*', cors({ origin: '*', allowMethods: ['GET', 'POST', 'PUT', 'DELETE'] }));

// API: Neue Person erstellen
app.post('/api/person', async (c) => {
  try {
    const body = await c.req.json<{ id?: string }>().catch(() => ({}));
    const personId = body.id || crypto.randomUUID();
    await c.env.DB.prepare('INSERT INTO persons (id) VALUES (?)').bind(personId).run();
    return c.json({ id: personId }, 201);
  } catch (e) {
    console.error('Error creating person:', e);
    return c.json({ error: 'Failed to create person', details: String(e) }, 500);
  }
});

// API: Heartbeat senden
app.post('/api/heartbeat', async (c) => {
  const { person_id } = await c.req.json<{ person_id: string }>();
  if (!person_id) return c.json({ error: 'person_id required' }, 400);
  const now = new Date().toISOString();
  await c.env.DB.prepare(
    `INSERT INTO persons (id, last_heartbeat) VALUES (?, ?)
     ON CONFLICT(id) DO UPDATE SET last_heartbeat = excluded.last_heartbeat`
  ).bind(person_id, now).run();
  return c.json({ success: true, person_id, timestamp: now });
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

// API: Person überwachen
app.post('/api/watch', async (c) => {
  const { person_id, watcher_id, check_interval_hours = 24 } = await c.req.json();
  if (!person_id || !watcher_id) return c.json({ error: 'person_id and watcher_id required' }, 400);
  await c.env.DB.prepare(
    `INSERT INTO watch_relations (person_id, watcher_id, check_interval_hours)
     VALUES (?, ?, ?)
     ON CONFLICT(person_id, watcher_id) DO UPDATE SET
     check_interval_hours = excluded.check_interval_hours`
  ).bind(person_id, watcher_id, check_interval_hours).run();
  return c.json({ success: true, person_id, watcher_id, check_interval_hours });
});

// API: Alle überwachten Personen eines Betreuers
app.get('/api/watcher/:id/persons', async (c) => {
  const watcherId = c.req.param('id');
  const persons = await c.env.DB.prepare(
    `SELECT 
      p.id,
      p.last_heartbeat,
      wr.check_interval_hours,
      CASE 
        WHEN p.last_heartbeat IS NULL THEN 'never'
        WHEN datetime(p.last_heartbeat, '+' || wr.check_interval_hours || ' hours') < datetime('now') 
        THEN 'overdue'
        ELSE 'ok'
      END as status
     FROM persons p
     JOIN watch_relations wr ON p.id = wr.person_id
     WHERE wr.watcher_id = ?`
  ).bind(watcherId).all();
  return c.json(persons.results);
});

// CRON: Überfälligkeits-Check
async function checkOverduePersons(db: D1Database, expoToken?: string) {
  const overdue = await db.prepare(
    `SELECT p.id as person_id, p.last_heartbeat, wr.watcher_id, wr.check_interval_hours, w.push_token
     FROM persons p
     JOIN watch_relations wr ON p.id = wr.person_id
     JOIN watchers w ON wr.watcher_id = w.id
     WHERE (p.last_heartbeat IS NULL OR datetime(p.last_heartbeat, '+' || wr.check_interval_hours || ' hours') < datetime('now'))
     AND (wr.last_notified_at IS NULL OR wr.last_notified_at < datetime('now', '-1 hour'))`
  ).all();

  for (const item of overdue.results || []) {
    if (expoToken && item.push_token) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${expoToken}` },
        body: JSON.stringify({
          to: item.push_token,
          title: 'SicherDa Alarm',
          body: `Keine Meldung seit ${item.check_interval_hours} Stunden`,
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
