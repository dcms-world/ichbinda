export const WATCHER_HTML = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>iBinda — Watcher</title>
<script>__JSQR_SCRIPT__</script>
<style>
:root {
  --primary: #4f46e5;
  --primary-hover: #4338ca;
  --bg: #f8fafc;
  --surface: #ffffff;
  --text-main: #0f172a;
  --text-muted: #64748b;
  --status-ok: #10b981;
  --status-overdue: #f43f5e;
  --status-never: #f59e0b;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 20px;
  --shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
}

* { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg);
  color: var(--text-main);
  line-height: 1.5;
  min-height: 100vh;
  padding-bottom: 100px;
}

/* Header & Navigation */
.app-header {
  position: sticky;
  top: 0;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: 16px 20px;
  border-bottom: 1px solid rgba(0,0,0,0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 100;
}
.app-logo { font-size: 22px; font-weight: 800; color: var(--primary); letter-spacing: -0.5px; }
.watcher-profile {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: var(--surface);
  border-radius: 100px;
  box-shadow: var(--shadow);
  cursor: pointer;
  transition: transform 0.2s ease;
}
.watcher-profile:active { transform: scale(0.96); }
.watcher-name { font-size: 14px; font-weight: 600; color: var(--text-main); }

/* Container */
.container { max-width: 600px; margin: 0 auto; padding: 20px; }
.section-title { font-size: 18px; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; }

/* FAB (Floating Action Button) */
.fab {
  position: fixed;
  bottom: 30px;
  right: 24px;
  height: 56px;
  padding: 0 24px;
  background: var(--primary);
  color: white;
  border-radius: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  box-shadow: var(--shadow-lg);
  cursor: pointer;
  z-index: 500;
  border: none;
  transition: transform 0.2s ease, background 0.2s ease;
}
.fab:active { transform: scale(0.95); }
.fab svg { width: 24px; height: 24px; }
.fab span { font-size: 16px; font-weight: 700; }

/* Cards & List */
.person-card {
  background: var(--surface);
  border-radius: var(--radius-lg);
  padding: 20px;
  box-shadow: var(--shadow);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  position: relative;
  overflow: hidden;
  cursor: pointer;
}
.person-card:hover { box-shadow: var(--shadow-lg); }
.person-card:active { transform: scale(0.98); }
.person-card-header { display: flex; gap: 16px; align-items: center; margin-bottom: 16px; }
.avatar-container { position: relative; flex-shrink: 0; }
.person-avatar { width: 64px; height: 64px; border-radius: 32px; object-fit: cover; background: #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700; color: var(--text-muted); }

.status-indicator {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 16px;
  height: 16px;
  border-radius: 8px;
  border: 3px solid var(--surface);
}
.status-ok .status-indicator { background: var(--status-ok); }
.status-overdue .status-indicator { background: var(--status-overdue); animation: pulse 2s infinite; }
.status-never .status-indicator { background: var(--status-never); }

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(244, 63, 94, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(244, 63, 94, 0); }
  100% { box-shadow: 0 0 0 0 rgba(244, 63, 94, 0); }
}

.person-info { flex: 1; min-width: 0; padding-right: 40px; }
.person-name { font-size: 18px; font-weight: 700; color: var(--text-main); margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.person-id-label { font-size: 12px; font-family: monospace; color: var(--text-muted); }

.person-meta { display: flex; flex-direction: column; gap: 8px; }
.meta-item { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--text-muted); }
.meta-item svg { width: 16px; height: 16px; opacity: 0.7; }

.card-actions {
  position: absolute;
  top: 14px;
  right: 14px;
}
.icon-btn {
  background: none;
  border: none;
  padding: 8px;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 50%;
  transition: background 0.2s ease;
}
.icon-btn:hover { background: rgba(0,0,0,0.05); }
.icon-btn svg { width: 20px; height: 20px; }

/* Avatar Edit Overlay */
.avatar-edit-wrapper {
  position: relative;
  cursor: pointer;
  width: 120px;
  height: 120px;
  margin: 0 auto;
}
.avatar-edit-overlay {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 30px;
  height: 30px;
  background: var(--primary, #3b82f6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 1px 4px rgba(0,0,0,0.35);
  pointer-events: none;
}
.avatar-edit-overlay svg { width: 15px; height: 15px; }
.crop-viewport {
  width: 280px;
  height: 280px;
  overflow: hidden;
  border-radius: 12px;
  position: relative;
  margin: 0 auto;
  cursor: grab;
  user-select: none;
  touch-action: none;
  background: #e2e8f0;
}
.crop-viewport:active { cursor: grabbing; }
.crop-image {
  position: absolute;
  user-select: none;
  -webkit-user-drag: none;
  touch-action: none;
  pointer-events: none;
}
.person-avatar-large { width: 120px; height: 120px; border-radius: 60px; font-size: 48px; }
.person-avatar-xl { width: 190px; height: 190px; border-radius: 95px; font-size: 72px; }

/* Add Person Section (Modal-like) */
.add-person-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: none;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.add-person-overlay.open { display: flex; }
.add-card {
  background: var(--surface);
  border-radius: var(--radius-lg);
  padding: 24px;
  width: 100%;
  max-width: 440px;
  box-shadow: var(--shadow-lg);
}
.add-card h3 { margin-bottom: 20px; font-size: 20px; font-weight: 800; }
.input-group { margin-bottom: 20px; }
input[type="text"], select {
  width: 100%;
  padding: 14px 16px;
  background: #f1f5f9;
  border: 2px solid transparent;
  border-radius: var(--radius-md);
  font-size: 16px;
  color: var(--text-main);
  transition: all 0.2s ease;
}
input[type="text"]:focus, select:focus {
  outline: none;
  background: white;
  border-color: var(--primary);
  box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
}

.button-row { display: flex; gap: 12px; }
.btn {
  flex: 1;
  padding: 14px 20px;
  border-radius: var(--radius-md);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  white-space: nowrap;
}
.btn-primary { background: var(--primary); color: white; }
.btn-primary:active { background: var(--primary-hover); transform: scale(0.98); }
.btn-secondary { background: #f1f5f9; color: var(--text-main); }
.btn-secondary:active { background: #e2e8f0; transform: scale(0.98); }
.btn-danger { background: #fee2e2; color: #ef4444; }
.btn-danger:active { background: #fecaca; transform: scale(0.98); }

/* Modals */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(8px);
  z-index: 2000;
  display: none;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.modal-overlay.open { display: flex; }
.modal-content {
  background: var(--surface);
  border-radius: var(--radius-lg);
  padding: 32px;
  width: 100%;
  max-width: 400px;
  text-align: center;
  box-shadow: var(--shadow-lg);
}
.modal-icon { font-size: 48px; margin-bottom: 20px; }
.modal-title { font-size: 22px; font-weight: 800; margin-bottom: 12px; }
.modal-message { color: var(--text-muted); margin-bottom: 28px; line-height: 1.6; }

/* Empty State */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-muted);
}
.empty-state svg { width: 80px; height: 80px; margin-bottom: 20px; opacity: 0.2; color: var(--primary); }
.empty-state h3 { color: var(--text-main); margin-bottom: 8px; }

/* Camera UI */
.camera-overlay {
  position: fixed;
  inset: 0;
  background: #000;
  z-index: 3000;
  display: none;
  flex-direction: column;
}
.camera-overlay.open { display: flex; }
.camera-header { padding: 20px; color: white; display: flex; align-items: center; justify-content: space-between; z-index: 10; }
.camera-video { flex: 1; object-fit: cover; }
.camera-footer { padding: 40px 20px; display: flex; justify-content: center; z-index: 10; }
.camera-status { position: absolute; top: 80px; left: 0; right: 0; text-align: center; color: white; background: rgba(0,0,0,0.5); padding: 8px; font-size: 14px; }

.limit-badge {
  background: #fee2e2;
  color: #ef4444;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
}

@media (max-width: 480px) {
  .container { padding: 16px; }
  .modal-content { padding: 24px; }
  .button-row { flex-direction: column; }
  .btn { width: 100%; }
}
</style>
</head>
<body>

<header class="app-header">
  <div class="app-logo">iBinda</div>
  <div class="watcher-profile" onclick="showProfileInfo()" style="cursor:pointer">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--primary)"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
    <span id="watcherNameDisplay" class="watcher-name">-</span>
  </div>
</header>

<div class="container">
  <div class="section-title" id="personListHeader" style="display:none">
    <span>Verbunden</span>
    <button onclick="loadPersons()" class="icon-btn" title="Aktualisieren">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
    </button>
  </div>
  
  <ul class="person-list" id="personList">
    <li class="empty-state" id="emptyPersonState">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
      <h3>Noch niemand verbunden</h3>
      <p>Klicke auf „Gerät verbinden" unten, um die erste Person zu überwachen.</p>
    </li>
  </ul>
</div>

<button class="fab" onclick="toggleAddPerson(true)" id="fabAdd">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
  <span>Gerät verbinden</span>
</button>

<!-- Add Person Overlay -->
<div class="add-person-overlay" id="addPersonOverlay" onclick="handleOverlayClick(event, 'addPersonOverlay')">
  <div class="add-card">
    <h3>Verbindung hinzufügen</h3>
    <div class="input-group">
      <label style="display:block;margin-bottom:8px;font-size:14px;font-weight:600;color:var(--text-muted)">Pairing-Daten oder QR-Inhalt</label>
      <input type="text" id="personId" placeholder="Pairing-Daten einfügen...">
      <p id="personLimitMessage" style="margin-top:10px; color:var(--status-overdue); font-size:13px; font-weight:600; display:none;"></p>
    </div>
    
    <div style="margin-bottom:24px;">
      <button class="btn btn-secondary" style="width:100%" onclick="openQrScanner()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="7" y1="7" x2="7" y2="7"></line><line x1="17" y1="7" x2="17" y2="7"></line><line x1="7" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="17" y2="17"></line></svg>
        QR-Code scannen
      </button>
    </div>

    <div class="button-row" style="flex-direction:row-reverse">
      <button class="btn btn-primary" id="addPersonBtn" onclick="addPerson()">Verbinden</button>
      <button class="btn btn-secondary" onclick="toggleAddPerson(false)">Abbrechen</button>
    </div>
  </div>
</div>


<!-- Watcher Name Modal -->
<div class="modal-overlay" id="nameModalOverlay">
  <form class="modal-content" id="nameModalForm">
    <h2 class="modal-title">Wie heißt du?</h2>
    <p class="modal-message">Dieser Name wird der Person angezeigt, wenn du eine Verbindung anfragst.</p>
    <div class="input-group">
      <input id="watcherNameInput" type="text" maxlength="35" placeholder="z.B. Max Mustermann" required>
    </div>
    <button type="submit" class="btn btn-primary" style="width:100%">Speichern</button>
  </form>
</div>

<!-- Watcher Profile Modal -->
<div class="modal-overlay" id="watcherProfileOverlay" onclick="handleOverlayClick(event, 'watcherProfileOverlay')">
  <div class="modal-content">
    <div class="modal-icon">👤</div>
    <h3 id="watcherProfileName" class="modal-title"></h3>
    <p id="watcherProfileInfo" class="modal-message" style="word-break:break-all"></p>
    <button type="button" class="btn btn-primary" style="width:100%;margin-bottom:12px" onclick="closeWatcherProfile()">Schließen</button>
    <button type="button" class="btn btn-secondary" style="width:100%;border-color:#ef4444;color:#ef4444" onclick="closeWatcherProfile();deleteWatcherAccount()">Konto löschen</button>
  </div>
</div>

<!-- Status Modal -->
<div class="modal-overlay" id="statusModalOverlay" onclick="handleOverlayClick(event, 'statusModalOverlay')">
  <div class="modal-content">
    <div id="statusModalIcon" class="modal-icon">ℹ️</div>
    <h3 id="statusModalTitle" class="modal-title">Hinweis</h3>
    <p id="statusModalMessage" class="modal-message"></p>
    <button type="button" class="btn btn-primary" style="width:100%" onclick="closeStatusModal()">OK</button>
  </div>
</div>

<!-- Confirm Modal -->
<div class="modal-overlay" id="confirmModalOverlay" onclick="handleOverlayClick(event, 'confirmModalOverlay')">
  <div class="modal-content">
    <div class="modal-icon">⚠️</div>
    <h3 id="confirmModalTitle" class="modal-title">Bestätigung</h3>
    <p id="confirmModalMessage" class="modal-message"></p>
    <div class="button-row" style="flex-direction:row-reverse">
      <button type="button" id="confirmModalConfirmBtn" class="btn btn-primary" style="background:var(--status-overdue)" onclick="closeConfirmModal(true)">Entfernen</button>
      <button type="button" class="btn btn-secondary" onclick="closeConfirmModal(false)">Abbrechen</button>
    </div>
  </div>
</div>

<!-- Person Detail Overlay -->
<div class="modal-overlay" id="personDetailOverlay" onclick="handleOverlayClick(event, 'personDetailOverlay')">
  <div class="modal-content" style="text-align:center">
    <div id="detailPhotoPreview" style="display:flex; justify-content:center; margin-bottom:16px"></div>
    <div id="detailPersonName" style="font-weight:800; font-size:22px; margin-bottom:4px"></div>
    <div style="margin-bottom:24px"></div>
    <div class="button-row" style="gap:12px">
      <button type="button" class="btn btn-secondary" onclick="closeDetailModal()">Schließen</button>
      <button type="button" class="btn btn-primary" onclick="openEditFromDetail()">Bearbeiten</button>
    </div>
  </div>
</div>

<!-- Edit Person Overlay -->
<div class="add-person-overlay" id="personEditOverlay" onclick="handleOverlayClick(event, 'personEditOverlay')">
  <div class="add-card" style="max-width:500px">
    <h3 class="modal-title" style="text-align:left; margin-bottom:24px">Person bearbeiten</h3>
    
    <div style="text-align:center; margin-bottom:24px">
      <div class="avatar-edit-wrapper" onclick="document.getElementById('editPhotoInput').click()">
        <div id="editPhotoPreview"></div>
        <div class="avatar-edit-overlay">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
        </div>
      </div>
      <input type="file" id="editPhotoInput" accept="image/*" onchange="handleEditPhotoChange(event)" style="display:none">
      <div style="margin-top:12px">
        <div id="editPersonName" style="font-weight:800; font-size:20px;"></div>
        <div id="editPersonId" class="person-id-label"></div>
      </div>
    </div>

    <div class="input-group">
      <label class="edit-label" style="display:block;margin-bottom:8px;font-size:14px;font-weight:600;color:var(--text-muted)">Alarmintervall</label>
      <select id="editIntervalSelect">
        <option value="1">1 Min</option>
        <option value="60">1 Std</option>
        <option value="360">6 Std</option>
        <option value="720">12 Std</option>
        <option value="1440">24 Std</option>
        <option value="2880">48 Std</option>
        <option value="4320">72 Std</option>
      </select>
    </div>


    <div class="button-row" style="flex-direction:column-reverse; gap:16px">
      <button type="button" class="btn btn-danger" onclick="removePersonFromModal()">Löschen</button>
      <div class="button-row" style="gap:12px">
        <button type="button" class="btn btn-secondary" onclick="closeEditModal()">Abbrechen</button>
        <button type="button" id="editSaveBtn" class="btn btn-primary" onclick="saveEditedPerson()">Speichern</button>
      </div>
    </div>
  </div>
</div>

<!-- Crop Modal -->
<div class="modal-overlay" id="cropModalOverlay">
  <div class="modal-content" style="text-align:center; padding:24px">
    <h3 class="modal-title" style="margin-bottom:8px">Bild anpassen</h3>
    <p style="font-size:13px; color:var(--text-muted); margin-bottom:16px">Verschieben &amp; Zoomen</p>
    <div id="cropViewport" class="crop-viewport">
      <img id="cropImage" class="crop-image" alt="" draggable="false">
    </div>
    <div style="padding:12px 4px 0">
      <input type="range" id="cropZoomSlider" min="0" max="100" value="0" oninput="onCropZoomSlider(+this.value)" style="width:100%;accent-color:var(--primary,#3b82f6)">
    </div>
    <div class="button-row" style="gap:12px; margin-top:12px; justify-content:center">
      <button type="button" class="btn btn-secondary" onclick="closeCropModal()">Abbrechen</button>
      <button type="button" class="btn btn-primary" onclick="confirmCrop()">Verwenden</button>
    </div>
  </div>
</div>

<!-- Camera UI -->
<div id="cameraOverlay" class="camera-overlay">
  <div class="camera-header">
    <div style="font-weight:800; font-size:18px;">QR scannen</div>
    <button class="icon-btn" onclick="closeQrScanner()" style="color:white">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    </button>
  </div>
  <p id="cameraStatus" class="camera-status">Kamera wird gestartet...</p>
  <video id="cameraVideo" class="camera-video" autoplay playsinline muted></video>
  <canvas id="cameraCanvas" style="display:none"></canvas>
  <div class="camera-footer">
    <div style="width:260px; height:260px; border:2px solid rgba(255,255,255,0.5); border-radius:40px; box-shadow:0 0 0 4000px rgba(0,0,0,0.5)"></div>
  </div>
</div>

<script>
const API_URL = '/api';
const MAX_DISPLAY_NAME_LENGTH = 35;

// Icons for dynamic injection
const ICONS = {
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',
  wifi: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>'
};

function normalizeDisplayName(name){return String(name||'').trim().slice(0,MAX_DISPLAY_NAME_LENGTH)}
function isLetterChar(char){return !!char&&char.toLocaleLowerCase()!==char.toLocaleUpperCase()}
function hasTwoLetterStart(name){const chars=[...String(name||'').trim()];return chars.length>=2&&isLetterChar(chars[0])&&isLetterChar(chars[1])}
function getDisplayNameValidationError(name){const trimmed=String(name||'').trim();if(trimmed.length<2)return'name-too-short';if(trimmed.length>MAX_DISPLAY_NAME_LENGTH)return'name-too-long';if(!hasTwoLetterStart(trimmed))return'name-invalid-start';return''}

function showDisplayNameValidationError(errorCode){
  if(errorCode==='name-too-short'){showStatusModal('Eingabe prüfen','Der Name muss mindestens 2 Zeichen lang sein.', '❌')}
  else if(errorCode==='name-too-long'){showStatusModal('Eingabe prüfen','Der Name darf maximal 35 Zeichen lang sein.', '❌')}
  else if(errorCode==='name-invalid-start'){showStatusModal('Eingabe prüfen','Die ersten 2 Zeichen des Namens müssen Buchstaben sein.', '❌')}
  else if(errorCode==='invalid-json'){showStatusModal('Eingabe prüfen','Die Eingabe enthält kein gültiges Pairing-Format.', '❌')}
  else if(errorCode==='invalid-person-id'){showStatusModal('Eingabe prüfen','Die Eingabe enthält keine gültige Personen-ID.', '❌')}
  else if(errorCode==='invalid-pairing-token'){showStatusModal('Eingabe prüfen','Die Eingabe enthält kein gültiges Pairing-Token.', '❌')}
  else if(errorCode==='pairing-required'){showStatusModal('Pairing-Code erforderlich','Zum Verbinden wird ein gültiger Pairing-Code benötigt. Bitte den aktuellen QR-Code der Person scannen.', '🔑')}
} 

function isRegistered(){return localStorage.getItem('ibinda_registered_watcher')==='1'}
function setRegistered(){localStorage.setItem('ibinda_registered_watcher','1')}
function createWatcherDeviceId(){if(window.crypto&&typeof window.crypto.randomUUID==='function')return window.crypto.randomUUID();if(window.crypto&&typeof window.crypto.getRandomValues==='function'){const bytes=new Uint8Array(16);window.crypto.getRandomValues(bytes);bytes[6]=bytes[6]&15|64;bytes[8]=bytes[8]&63|128;const hex=[...bytes].map(byte=>byte.toString(16).padStart(2,'0')).join('');return hex.slice(0,8)+'-'+hex.slice(8,12)+'-'+hex.slice(12,16)+'-'+hex.slice(16,20)+'-'+hex.slice(20,32)}throw new Error('Secure random device id generation unavailable')}

async function ensureRegistered(){
  if(isRegistered()) return;
  const deviceId = localStorage.getItem('ibinda_watcher_device') || (() => {
    const id = createWatcherDeviceId();
    localStorage.setItem('ibinda_watcher_device', id);
    return id;
  })();
  const res = await fetch(API_URL+'/auth/register-device',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({device_id:deviceId,role:'watcher'})});
  if(!res.ok) throw new Error('Registrierung fehlgeschlagen: '+res.status);
  setRegistered();
}

function handleOverlayClick(e, id) { if (e.target === e.currentTarget) { if(id==='addPersonOverlay') toggleAddPerson(false); else if(id==='statusModalOverlay') closeStatusModal(); else if(id==='confirmModalOverlay') closeConfirmModal(false); else if(id==='personDetailOverlay') closeDetailModal(); else if(id==='personEditOverlay') closeEditModal(); else if(id==='watcherProfileOverlay') closeWatcherProfile(); } }

function toggleAddPerson(show) {
  const overlay = document.getElementById('addPersonOverlay');
  overlay.classList.toggle('open', show);
  if(show) document.getElementById('personId').focus();
}

const PERSON_NAMES_KEY = 'ibinda_person_names';
const PERSON_NAME_HISTORY_KEY = 'ibinda_person_name_history';
const PERSON_PHOTOS_KEY = 'ibinda_person_photos';
const WATCHED_PERSON_IDS_KEY = 'ibinda_watched_person_ids';
const HIDDEN_PERSON_IDS_KEY = 'ibinda_hidden_person_ids';
let MAX_WATCHED_PERSONS = 2;

const INTERVALS = [
  { min: 1, label: '1 Min' }, { min: 60, label: '1 Std' }, { min: 360, label: '6 Std' },
  { min: 720, label: '12 Std' }, { min: 1440, label: '24 Std' }, { min: 2880, label: '48 Std' },
  { min: 4320, label: '72 Std' }
];

let cameraStream = null;
let scanFrameRequestId = 0;
let visiblePersonsById = {};
let activeEditPersonId = '';
let currentPersonCount = 0;
let dialogFocusTarget = null;
let confirmModalResolver = null;
let outgoingPairingPollInterval = null;
let outgoingPairingTimeout = null;

function getWatcherId() { return localStorage.getItem('ibinda_watcher_id'); }

function clearOutgoingPairingTimers() {
  if (outgoingPairingPollInterval) { clearInterval(outgoingPairingPollInterval); outgoingPairingPollInterval = null; }
  if (outgoingPairingTimeout) { clearTimeout(outgoingPairingTimeout); outgoingPairingTimeout = null; }
}

function showStatusModal(title, message, icon) {
  const overlay = document.getElementById('statusModalOverlay');
  document.getElementById('statusModalTitle').textContent = title || 'Hinweis';
  document.getElementById('statusModalMessage').textContent = message || '';
  document.getElementById('statusModalIcon').textContent = icon || 'ℹ️';
  dialogFocusTarget = document.activeElement;
  overlay.classList.add('open');
}

function closeStatusModal() {
  document.getElementById('statusModalOverlay').classList.remove('open');
  if(dialogFocusTarget) dialogFocusTarget.focus();
}

function showConfirmModal(title, message, confirmLabel) {
  const overlay = document.getElementById('confirmModalOverlay');
  document.getElementById('confirmModalTitle').textContent = title || 'Bestätigung';
  document.getElementById('confirmModalMessage').innerHTML = message || '';
  document.getElementById('confirmModalConfirmBtn').textContent = confirmLabel || 'Entfernen';
  overlay.classList.add('open');
  return new Promise((resolve) => { confirmModalResolver = resolve; });
}

function closeConfirmModal(confirmed) {
  document.getElementById('confirmModalOverlay').classList.remove('open');
  const resolver = confirmModalResolver;
  confirmModalResolver = null;
  if (typeof resolver === 'function') resolver(!!confirmed);
}

const WATCHER_NAME_KEY = 'ibinda_watcher_name';
function getWatcherName(){return(localStorage.getItem(WATCHER_NAME_KEY)||'').trim()}
function setWatcherName(name){localStorage.setItem(WATCHER_NAME_KEY,normalizeDisplayName(name))}
function renderWatcherName(){const el=document.getElementById('watcherNameDisplay');if(el)el.textContent=getWatcherName()||'Name wählen'}

function showProfileInfo(){
  const id = getWatcherId() || '–';
  const raw = localStorage.getItem('ibinda_watcher_created_at');
  const created = raw ? new Date(raw).toLocaleString('de-DE') : '–';
  document.getElementById('watcherProfileName').textContent = getWatcherName() || 'Mein Profil';
  document.getElementById('watcherProfileInfo').textContent = 'ID: ' + id + '   Erstellt: ' + created;
  document.getElementById('watcherProfileOverlay').classList.add('open');
}
function closeWatcherProfile(){ document.getElementById('watcherProfileOverlay').classList.remove('open'); }
async function deleteWatcherAccount(){
  const confirmed = await showConfirmModal('Konto löschen', 'Alle Verbindungen werden getrennt und dein Konto dauerhaft gelöscht. Dies kann nicht rückgängig gemacht werden.', 'Endgültig löschen');
  if (!confirmed) return;
  const watcherId = getWatcherId();
  if (!watcherId) return;
  try {
    const res = await fetch(API_URL + '/watcher/' + watcherId, { method: 'DELETE' });
    if (!res.ok) throw new Error('Fehler ' + res.status);
    ['ibinda_registered_watcher','ibinda_watcher_id','ibinda_watcher_name','ibinda_watcher_device','ibinda_watcher_created_at','ibinda_person_names','ibinda_person_name_history','ibinda_person_photos','ibinda_watched_person_ids','ibinda_hidden_person_ids'].forEach(k => localStorage.removeItem(k));
    window.location.reload();
  } catch(e) { showStatusModal('Fehler', 'Konto konnte nicht gelöscht werden.', '❌'); }
}

function askForWatcherName(){
  return new Promise((resolve)=>{
    const overlay=document.getElementById('nameModalOverlay');
    const form=document.getElementById('nameModalForm');
    const input=document.getElementById('watcherNameInput');
    input.value=getWatcherName()||'';
    overlay.classList.add('open');
    input.focus();
    const onSubmit=(event)=>{
      event.preventDefault();
      const rawName=input.value;
      const errorCode=getDisplayNameValidationError(rawName);
      if(errorCode){showDisplayNameValidationError(errorCode);return}
      const name=normalizeDisplayName(rawName);
      setWatcherName(name);
      overlay.classList.remove('open');
      renderWatcherName();
      resolve(name);
    };
    form.onsubmit=onSubmit;
  });
}

async function ensureWatcherName(){const savedName=getWatcherName(); if(savedName) return savedName; return askForWatcherName();}


const PERSON_ID_REGEX=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidFrontendPersonId(value){return PERSON_ID_REGEX.test(String(value||'').trim())}
function isValidFrontendPairingToken(value){return PERSON_ID_REGEX.test(String(value||'').trim())}

function getStoredList(key) {
  try {
    const raw = localStorage.getItem(key);
    return (raw ? JSON.parse(raw) : []).filter(v => typeof v === 'string' && v.trim());
  } catch (err) { return []; }
}

function setStoredList(key, values) {
  const uniqueValues = Array.from(new Set((values || []).filter(v => typeof v === 'string' && v.trim())));
  localStorage.setItem(key, JSON.stringify(uniqueValues));
}

function addToStoredList(key, value) { if(!value)return; const list = getStoredList(key); list.push(value); setStoredList(key, list); }
function removeFromStoredList(key, value) { if(!value)return; const list = getStoredList(key); setStoredList(key, list.filter(v => v !== value)); }

function getPersonNames() { try { return JSON.parse(localStorage.getItem(PERSON_NAMES_KEY)) || {}; } catch(e) { return {}; } }
function setPersonNames(names) { localStorage.setItem(PERSON_NAMES_KEY, JSON.stringify(names)); }
function getPersonNameHistory() { try { return JSON.parse(localStorage.getItem(PERSON_NAME_HISTORY_KEY)) || {}; } catch(e) { return {}; } }
function setPersonNameHistory(names) { localStorage.setItem(PERSON_NAME_HISTORY_KEY, JSON.stringify(names)); }

function storePersonPhoto(personId, photoDataUrl) {
  const photos = JSON.parse(localStorage.getItem(PERSON_PHOTOS_KEY) || '{}');
  photos[personId] = photoDataUrl;
  localStorage.setItem(PERSON_PHOTOS_KEY, JSON.stringify(photos));
}
function getPersonPhoto(personId) {
  try { return JSON.parse(localStorage.getItem(PERSON_PHOTOS_KEY) || {})[personId] || ''; } catch(e) { return ''; }
}

function buildPersonAvatarMarkup(personId) {
  const photo = getPersonPhoto(personId);
  if (photo) return '<img src="' + photo + '" alt="" class="person-avatar">';
  const initial = (getPersonName(personId) || getRememberedPersonName(personId) || '?').charAt(0).toUpperCase();
  return '<div class="person-avatar">' + initial + '</div>';
}

function storePersonName(personId, name) {
  const safeName = normalizeDisplayName(name); if (!personId || !safeName) return;
  const names = getPersonNames(); names[personId] = safeName; setPersonNames(names);
  const history = getPersonNameHistory(); history[personId] = safeName; setPersonNameHistory(history);
}
function getPersonName(personId) { return getPersonNames()[personId] || ''; }
function getRememberedPersonName(personId) { return getPersonNameHistory()[personId] || ''; }

function removePersonName(personId) {
  const names = getPersonNames(); const existing = names[personId];
  if (existing) { const history = getPersonNameHistory(); history[personId] = existing; setPersonNameHistory(history); }
  delete names[personId]; setPersonNames(names);
}

function hidePersonFromLocalView(personId) { addToStoredList(HIDDEN_PERSON_IDS_KEY, personId); removeFromStoredList(WATCHED_PERSON_IDS_KEY, personId); }
function unhidePersonInLocalView(personId) { removeFromStoredList(HIDDEN_PERSON_IDS_KEY, personId); addToStoredList(WATCHED_PERSON_IDS_KEY, personId); }

function escapeHtml(v) { return String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }


function parsePersonInput(rawValue) {
  const v = rawValue.trim(); if (!v) return null;
  try {
    const parsed = JSON.parse(v);
    if (parsed && typeof parsed === 'object') {
      const personId = (parsed.id || parsed.person_id || parsed.p || '').trim();
      const pairingToken = (parsed.pairing_token || parsed.t || '').trim();
      if (!personId) return { error: 'invalid-json' };
      if (!pairingToken) return { personId, error: 'pairing-required' };
      if (!isValidFrontendPersonId(personId)) return { error: 'invalid-person-id' };
      return { personId, pairingToken, name: (parsed.name || parsed.n || '').trim() };
    }
  } catch(e) {}
  if (isValidFrontendPersonId(v)) return { personId: v, error: 'pairing-required' };
  return { error: 'invalid-json' };
}

function updatePersonLimitUi() {
  const isLimitReached = currentPersonCount >= MAX_WATCHED_PERSONS;
  const msg = document.getElementById('personLimitMessage');
  const fab = document.getElementById('fabAdd');
  if(msg) {
    msg.style.display = isLimitReached ? 'block' : 'none';
    msg.innerHTML = 'Limit erreicht: Maximal ' + MAX_WATCHED_PERSONS + ' Personen möglich. <span class="limit-badge">FREE</span>';
  }
}

async function refreshPersonCount() {
  if (!getWatcherId()) return currentPersonCount;
  try {
    const res = await fetch(API_URL + '/watcher/' + getWatcherId() + '/persons');
    const persons = await res.json();
    const hidden = new Set(getStoredList(HIDDEN_PERSON_IDS_KEY));
    currentPersonCount = (Array.isArray(persons) ? persons : []).filter(p => !hidden.has(p.id)).length;
    updatePersonLimitUi();
    return currentPersonCount;
  } catch(e) { return currentPersonCount; }
}

function stopQrScanner() {
  if (scanFrameRequestId) cancelAnimationFrame(scanFrameRequestId);
  const video = document.getElementById('cameraVideo');
  if (video) { video.pause(); video.srcObject = null; }
  if (cameraStream) { cameraStream.getTracks().forEach(t => t.stop()); cameraStream = null; }
}

function closeQrScanner() { stopQrScanner(); document.getElementById('cameraOverlay').classList.remove('open'); }

const QR_SCAN_VARIANTS = [
  { cropRatio: 1, maxSide: 600 },
  { cropRatio: 0.6, maxSide: 400 },
  { cropRatio: 1, maxSide: 300 },
];

function decodeQrFromVideoFrame(video, canvas) {
  if (typeof window.jsQR !== 'function') return '';
  const videoWidth = Number(video.videoWidth || 0);
  const videoHeight = Number(video.videoHeight || 0);
  if (videoWidth <= 0 || videoHeight <= 0) return '';
  for (const variant of QR_SCAN_VARIANTS) {
    const cropRatio = Math.max(0.2, Math.min(1, Number(variant.cropRatio) || 1));
    const maxSide = Math.max(180, Math.round(Number(variant.maxSide) || Math.max(videoWidth, videoHeight)));
    const sourceWidth = Math.max(1, Math.round(videoWidth * cropRatio));
    const sourceHeight = Math.max(1, Math.round(videoHeight * cropRatio));
    const sourceX = Math.max(0, Math.round((videoWidth - sourceWidth) / 2));
    const sourceY = Math.max(0, Math.round((videoHeight - sourceHeight) / 2));
    const scale = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight));
    const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
    const targetHeight = Math.max(1, Math.round(sourceHeight * scale));
    canvas.width = targetWidth; canvas.height = targetHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) continue;
    ctx.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, targetWidth, targetHeight);
    const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    const result = window.jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' });
    const qrText = result && typeof result.data === 'string' ? result.data.trim() : '';
    if (qrText) return qrText;
  }
  return '';
}

function scanQrFrame() {
  if (!cameraStream) return;
  const video = document.getElementById('cameraVideo');
  const canvas = document.getElementById('cameraCanvas');
  if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
    const qrText = decodeQrFromVideoFrame(video, canvas);
    if (qrText) {
      const parsed = parsePersonInput(qrText);
      if (parsed?.error) { showDisplayNameValidationError(parsed.error); closeQrScanner(); return; }
      document.getElementById('personId').value = qrText;
      closeQrScanner();
      addPerson();
      return;
    }
  }
  scanFrameRequestId = requestAnimationFrame(scanQrFrame);
}

async function openQrScanner() {
  if (currentPersonCount >= MAX_WATCHED_PERSONS) { showStatusModal('Limit erreicht', 'Du überwachst bereits ' + MAX_WATCHED_PERSONS + ' Personen.'); return; }
  document.getElementById('cameraOverlay').classList.add('open');
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    const video = document.getElementById('cameraVideo');
    video.srcObject = cameraStream;
    video.play();
    scanQrFrame();
  } catch (e) { document.getElementById('cameraStatus').textContent = 'Kamerafehler: ' + e.message; }
}

async function init() {
  await ensureRegistered();
  await ensureWatcherName();
  renderWatcherName();
  if (!getWatcherId()) {
    const res = await fetch(API_URL + '/watcher', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const data = await res.json();
    localStorage.setItem('ibinda_watcher_id', data.id);
  }
  const meta = await fetch(API_URL + '/watcher/' + getWatcherId()).then(r => r.json()).catch(() => ({}));
  if (meta.max_persons) MAX_WATCHED_PERSONS = meta.max_persons;
  if (meta.created_at) localStorage.setItem('ibinda_watcher_created_at', meta.created_at);
  loadPersons();
}

async function pollOutgoingPairing(pairingToken, personId, personName) {
  try {
    const res = await fetch(API_URL + '/pair/' + pairingToken, { credentials: 'include' });
    const data = await res.json();
    if (data.status === 'completed') {
      clearOutgoingPairingTimers();
      if (personName) storePersonName(personId, personName);
      unhidePersonInLocalView(personId);
      loadPersons();
      showStatusModal('Verbunden!', 'Die Verbindung wurde bestätigt.', '✅');
    } else if (['rejected', 'expired'].includes(data.status)) {
      clearOutgoingPairingTimers();
      showStatusModal('Fehlgeschlagen', 'Anfrage wurde ' + (data.status === 'rejected' ? 'abgelehnt' : 'abgelaufen') + '.', '❌');
    }
  } catch(e) {}
}

async function addPerson() {
  if (currentPersonCount >= MAX_WATCHED_PERSONS) { showStatusModal('Limit erreicht', 'Du überwachst bereits ' + MAX_WATCHED_PERSONS + ' Personen.'); return; }
  const input = document.getElementById('personId').value;
  const parsed = parsePersonInput(input);
  if (parsed?.error) { showDisplayNameValidationError(parsed.error); return; }

  // Name sofort lokal merken, falls im QR/Input vorhanden
  if (parsed.name) storePersonName(parsed.personId, parsed.name);

  const watcherName = await ensureWatcherName();

  try {
    const res = await fetch(API_URL + '/pair/respond', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pairing_token: parsed.pairingToken, watcher_name: watcherName })
    });
    if (!res.ok) throw new Error('Fehler ' + res.status);
    document.getElementById('personId').value = '';
    toggleAddPerson(false);
    showStatusModal('Anfrage gesendet', 'Warte auf Bestätigung der Person...', '⏳');
    outgoingPairingPollInterval = setInterval(() => pollOutgoingPairing(parsed.pairingToken, parsed.personId, parsed.name), 3000);
    outgoingPairingTimeout = setTimeout(clearOutgoingPairingTimers, 300000);
  } catch(e) { showStatusModal('Fehler', e.message, '❌'); }
}

function buildPersonRow(p) {
  const name = getPersonName(p.id) || 'Unbekannt';

  if (p.deleted) {
    return '<li class="person-card status-overdue" style="opacity:0.45;pointer-events:none">' +
      '<div class="person-card-header">' +
        '<div class="avatar-container">' + buildPersonAvatarMarkup(p.id) + '</div>' +
        '<div class="person-info">' +
          '<div class="person-name" style="text-decoration:line-through">' + escapeHtml(name) + '</div>' +
          '<div class="person-id-label">Konto gelöscht</div>' +
        '</div>' +
      '</div>' +
      '<div class="card-actions" style="pointer-events:auto">' +
        '<button type="button" class="icon-btn" style="color:#ef4444" onclick="removeDeletedPerson(\\\'' + p.id + '\\\')" title="Entfernen">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4h6v2"></path></svg>' +
        '</button>' +
      '</div>' +
    '</li>';
  }

  const lastSeen = p.last_heartbeat ? new Date(p.last_heartbeat).toLocaleString('de-DE', { hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit' }) : 'Nie';
  const interval = INTERVALS.find(i => i.min === p.check_interval_minutes)?.label || p.check_interval_minutes + ' Min';

  return '<li class="person-card status-' + p.status + '" onclick="openDetailModal(\\\'' + p.id + '\\\')">' +
    '<div class="person-card-header">' +
      '<div class="avatar-container">' +
        buildPersonAvatarMarkup(p.id) +
        '<div class="status-indicator"></div>' +
      '</div>' +
      '<div class="person-info">' +
        '<div class="person-name">' + escapeHtml(name) + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="person-meta">' +
      '<div class="meta-item">' + ICONS.wifi + ' Letzter Kontakt: ' + lastSeen + '</div>' +
      '<div class="meta-item">' + ICONS.clock + ' Alarm nach: ' + interval + '</div>' +
    '</div>' +
    '<div class="card-actions">' +
      '<button type="button" class="icon-btn" onclick="event.stopPropagation();openEditModal(\\\'' + p.id + '\\\')">' + ICONS.edit + '</button>' +
    '</div>' +
  '</li>';
}

async function removeDeletedPerson(personId) {
  const watcherId = getWatcherId();
  if (!watcherId) return;
  try {
    await fetch(API_URL + '/watch', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ person_id: personId, watcher_id: watcherId }),
    });
    removePersonName(personId);
    hidePersonFromLocalView(personId);
    loadPersons();
  } catch(e) { showStatusModal('Fehler', 'Entfernen fehlgeschlagen.', '❌'); }
}

async function loadPersons() {
  if (!getWatcherId()) return;
  const res = await fetch(API_URL + '/watcher/' + getWatcherId() + '/persons');
  const persons = await res.json();
  const hidden = new Set(getStoredList(HIDDEN_PERSON_IDS_KEY));
  const visible = (Array.isArray(persons) ? persons : []).filter(p => !hidden.has(p.id));
  
  currentPersonCount = visible.length;
  updatePersonLimitUi();
  visiblePersonsById = {}; visible.forEach(p => visiblePersonsById[p.id] = p);
  
  const list = document.getElementById('personList');
  const header = document.getElementById('personListHeader');
  if (visible.length === 0) {
    if (header) header.style.display = 'none';
    list.innerHTML = EMPTY_PERSON_STATE_HTML;
    return;
  }

  if (header) header.style.display = '';
  list.innerHTML = visible.sort((a,b) => (a.status === 'overdue' ? -1 : 1)).map(buildPersonRow).join('');
}

function openEditModal(id) {
  const p = visiblePersonsById[id]; if(!p) return;
  activeEditPersonId = id;
  document.getElementById('editPersonId').textContent = 'ID: ' + id;
  document.getElementById('editPersonName').textContent = getPersonName(id) || 'Unbekannt';
  document.getElementById('editIntervalSelect').value = p.check_interval_minutes;
  
  const preview = document.getElementById('editPhotoPreview');
  preview.innerHTML = buildPersonAvatarMarkup(id).replace('person-avatar', 'person-avatar person-avatar-large');
  
  document.getElementById('personEditOverlay').classList.add('open');
}

function closeEditModal() { document.getElementById('personEditOverlay').classList.remove('open'); activeEditPersonId = ''; }

function openDetailModal(id) {
  const p = visiblePersonsById[id]; if(!p) return;
  activeEditPersonId = id;
  document.getElementById('detailPersonName').textContent = getPersonName(id) || 'Unbekannt';
  const preview = document.getElementById('detailPhotoPreview');
  preview.style.display = 'block';
  preview.style.justifyContent = '';
  preview.onclick = null;
  const photo = getPersonPhoto(id);
  if (photo) {
    preview.innerHTML = '<img src="' + escapeHtml(photo) + '" alt="" style="width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:16px;display:block;">';
  } else {
    const initial = (getPersonName(id) || '?').charAt(0).toUpperCase();
    preview.innerHTML = '<div style="width:100%;aspect-ratio:1/1;border-radius:16px;background:var(--system-fill,#e2e8f0);display:flex;align-items:center;justify-content:center;font-size:72px;font-weight:700;color:var(--text-muted,#8E8E93)">' + escapeHtml(initial) + '</div>';
  }
  document.getElementById('personDetailOverlay').classList.add('open');
}
function closeDetailModal() { document.getElementById('personDetailOverlay').classList.remove('open'); activeEditPersonId = ''; }
function openEditFromDetail() { const id = activeEditPersonId; closeDetailModal(); openEditModal(id); }

async function saveEditedPerson() {
  const id = activeEditPersonId; if(!id) return;
  const minutes = document.getElementById('editIntervalSelect').value;
  try {
    await fetch(API_URL + '/watch', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ person_id: id, watcher_id: getWatcherId(), check_interval_minutes: parseInt(minutes) })
    });
    closeEditModal(); loadPersons();
  } catch(e) { showStatusModal('Fehler', 'Speichern fehlgeschlagen.'); }
}

async function handleEditPhotoChange(e) {
  const file = e.target.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = () => openCropModal(reader.result);
  reader.readAsDataURL(file);
}

const CROP_SIZE = 280;
const CROP_MAX_ZOOM = 4;
let cropScale = 1, cropMinScale = 1, cropOffsetX = 0, cropOffsetY = 0;
let cropDragActive = false, cropDragStartX = 0, cropDragStartY = 0, cropDragBaseX = 0, cropDragBaseY = 0;
let cropPinchActive = false, cropPinchDist = 0, cropPinchScaleBase = 1;

function cropClamp(offset, displaySize) {
  return Math.min(0, Math.max(CROP_SIZE - displaySize, offset));
}

function applyCropScale(newScale, pivotX, pivotY) {
  newScale = Math.max(cropMinScale, Math.min(cropMinScale * CROP_MAX_ZOOM, newScale));
  const ratio = newScale / cropScale;
  cropOffsetX = cropClamp(pivotX - (pivotX - cropOffsetX) * ratio, document.getElementById('cropImage').naturalWidth * newScale);
  cropOffsetY = cropClamp(pivotY - (pivotY - cropOffsetY) * ratio, document.getElementById('cropImage').naturalHeight * newScale);
  cropScale = newScale;
  const img = document.getElementById('cropImage');
  img.style.width = img.naturalWidth * cropScale + 'px';
  img.style.height = img.naturalHeight * cropScale + 'px';
  img.style.left = cropOffsetX + 'px';
  img.style.top = cropOffsetY + 'px';
  const slider = document.getElementById('cropZoomSlider');
  if (slider) slider.value = Math.round(((cropScale - cropMinScale) / (cropMinScale * (CROP_MAX_ZOOM - 1))) * 100);
}

function openCropModal(dataUrl) {
  const img = document.getElementById('cropImage');
  img.onload = () => {
    const w = img.naturalWidth, h = img.naturalHeight;
    cropMinScale = CROP_SIZE / Math.min(w, h);
    cropScale = cropMinScale;
    img.style.width = w * cropScale + 'px';
    img.style.height = h * cropScale + 'px';
    cropOffsetX = (CROP_SIZE - w * cropScale) / 2;
    cropOffsetY = (CROP_SIZE - h * cropScale) / 2;
    img.style.left = cropOffsetX + 'px';
    img.style.top = cropOffsetY + 'px';
    const slider = document.getElementById('cropZoomSlider');
    if (slider) slider.value = 0;
  };
  img.src = dataUrl;
  document.getElementById('cropModalOverlay').classList.add('open');
}

function closeCropModal() {
  document.getElementById('cropModalOverlay').classList.remove('open');
  document.getElementById('editPhotoInput').value = '';
}

function onCropZoomSlider(val) {
  const newScale = cropMinScale + cropMinScale * (CROP_MAX_ZOOM - 1) * (val / 100);
  applyCropScale(newScale, CROP_SIZE / 2, CROP_SIZE / 2);
}

function confirmCrop() {
  const img = document.getElementById('cropImage');
  const canvas = document.createElement('canvas');
  const OUT = 400;
  canvas.width = OUT; canvas.height = OUT;
  const srcSize = CROP_SIZE / cropScale;
  canvas.getContext('2d').drawImage(img, -cropOffsetX / cropScale, -cropOffsetY / cropScale, srcSize, srcSize, 0, 0, OUT, OUT);
  storePersonPhoto(activeEditPersonId, canvas.toDataURL('image/jpeg', 0.85));
  document.getElementById('cropModalOverlay').classList.remove('open');
  openEditModal(activeEditPersonId);
  loadPersons();
}

function pinchDist(touches) {
  const dx = touches[0].clientX - touches[1].clientX, dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function setupCropDrag() {
  const vp = document.getElementById('cropViewport');
  if (!vp) return;
  const getImg = () => document.getElementById('cropImage');

  function start(cx, cy) { cropDragActive = true; cropDragStartX = cx; cropDragStartY = cy; cropDragBaseX = cropOffsetX; cropDragBaseY = cropOffsetY; }
  function move(cx, cy) {
    if (!cropDragActive) return;
    const img = getImg();
    cropOffsetX = cropClamp(cropDragBaseX + cx - cropDragStartX, parseFloat(img.style.width));
    cropOffsetY = cropClamp(cropDragBaseY + cy - cropDragStartY, parseFloat(img.style.height));
    img.style.left = cropOffsetX + 'px';
    img.style.top = cropOffsetY + 'px';
  }
  function end() { cropDragActive = false; cropPinchActive = false; }

  vp.addEventListener('mousedown', e => { start(e.clientX, e.clientY); e.preventDefault(); });
  vp.addEventListener('mousemove', e => move(e.clientX, e.clientY));
  vp.addEventListener('mouseup', end);
  vp.addEventListener('mouseleave', end);
  vp.addEventListener('wheel', e => {
    e.preventDefault();
    const rect = vp.getBoundingClientRect();
    applyCropScale(cropScale * (e.deltaY < 0 ? 1.1 : 0.9), e.clientX - rect.left, e.clientY - rect.top);
  }, { passive: false });

  vp.addEventListener('touchstart', e => {
    if (e.touches.length === 2) {
      cropDragActive = false;
      cropPinchActive = true;
      cropPinchDist = pinchDist(e.touches);
      cropPinchScaleBase = cropScale;
    } else {
      start(e.touches[0].clientX, e.touches[0].clientY);
    }
    e.preventDefault();
  }, { passive: false });

  vp.addEventListener('touchmove', e => {
    if (e.touches.length === 2 && cropPinchActive) {
      const rect = vp.getBoundingClientRect();
      const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
      const my = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
      applyCropScale(cropPinchScaleBase * pinchDist(e.touches) / cropPinchDist, mx, my);
    } else if (e.touches.length === 1) {
      move(e.touches[0].clientX, e.touches[0].clientY);
    }
    e.preventDefault();
  }, { passive: false });

  vp.addEventListener('touchend', end);
}
setupCropDrag();

async function removePersonFromModal() {
  const id = activeEditPersonId; if(!id) return;
  const personName = escapeHtml(getPersonName(id) || 'diese Person');
  const confirmed = await showConfirmModal('Verbindung trennen', 'Möchtest du die Verbindung zu <strong>' + personName + '</strong> wirklich dauerhaft entfernen?');
  if (confirmed) {
    try {
      await fetch(API_URL + '/watch', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ person_id: id, watcher_id: getWatcherId() })
      });
      removePersonName(id); hidePersonFromLocalView(id);
      closeEditModal(); loadPersons();
    } catch(e) { showStatusModal('Fehler', 'Entfernen fehlgeschlagen.'); }
  }
}

const EMPTY_PERSON_STATE_HTML = document.getElementById('emptyPersonState').outerHTML;
init();
setInterval(loadPersons, 30000);
</script>
</body>
</html>`;
