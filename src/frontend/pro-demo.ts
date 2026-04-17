export const PRO_DEMO_HTML = `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>iBinda Pro — Professional Care Suite</title>
    <style>
        :root {
            --bg-main: #f8fafc;
            --sidebar-bg: #111827;
            --sidebar-text: #9ca3af;
            --sidebar-active: #ffffff;
            --card-bg: #ffffff;
            --text-main: #0f172a;
            --text-muted: #64748b;
            --primary: #2563eb;
            --primary-hover: #1d4ed8;
            --status-green: #10b981;
            --status-green-bg: #ecfdf5;
            --status-yellow: #f59e0b;
            --status-yellow-bg: #fffbeb;
            --status-red: #ef4444;
            --status-red-bg: #fef2f2;
            --border: #e2e8f0;
            --radius-lg: 16px;
            --radius-md: 12px;
            --shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
        }

        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
        
        body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--bg-main);
            color: var(--text-main);
            min-height: 100vh;
            line-height: 1.5;
        }

        /* --- Login Screen --- */
        #login-screen {
            position: fixed;
            inset: 0;
            display: flex;
            z-index: 1000;
            background: white;
        }
        .login-left {
            flex: 1.2;
            background: var(--sidebar-bg);
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: 4rem;
            color: white;
        }
        .login-left h2 { font-size: clamp(2rem, 5vw, 3.5rem); font-weight: 800; line-height: 1.1; margin-bottom: 1.5rem; }
        .login-left p { font-size: 1.25rem; color: var(--sidebar-text); max-width: 400px; }
        
        .login-right {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 2rem;
        }
        .login-form { width: 100%; max-width: 320px; }
        .login-form h3 { font-size: 1.5rem; font-weight: 700; margin-bottom: 2rem; }
        .login-form input {
            width: 100%;
            padding: 0.75rem 1rem;
            margin-bottom: 1rem;
            border: 1px solid var(--border);
            border-radius: var(--radius-md);
            font-size: 1rem;
        }
        .btn-login {
            width: 100%;
            background: var(--primary);
            color: white;
            padding: 0.75rem;
            border-radius: var(--radius-md);
            font-weight: 600;
            border: none;
            cursor: pointer;
        }

        /* --- Main Layout --- */
        #app-container { display: none; min-height: 100vh; }
        
        aside {
            width: 260px;
            background: var(--sidebar-bg);
            color: var(--sidebar-text);
            display: flex;
            flex-direction: column;
            padding: 1.5rem;
            position: sticky;
            top: 0;
            height: 100vh;
        }
        .nav-logo { color: white; font-size: 1.25rem; font-weight: 800; margin-bottom: 2.5rem; }
        .nav-item {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem 1rem;
            border-radius: var(--radius-md);
            cursor: pointer;
            margin-bottom: 0.25rem;
            font-weight: 500;
            font-size: 0.9375rem;
        }
        .nav-item.active { color: white; background: var(--primary); }
        .nav-item:not(.active):hover { color: white; background: rgba(255,255,255,0.05); }

        main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
        
        .top-bar {
            height: 64px;
            background: white;
            border-bottom: 1px solid var(--border);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 1.5rem;
            position: sticky;
            top: 0;
            z-index: 100;
        }

        .content-area { padding: 1.5rem; max-width: 1400px; margin: 0 auto; width: 100%; }

        /* --- Dashboard UI --- */
        .stats-row { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 1rem; 
            margin-bottom: 2rem; 
        }
        .stat-card { background: white; padding: 1.25rem; border-radius: var(--radius-lg); border: 1px solid var(--border); }
        .stat-label { font-size: 0.8125rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.025em; }
        .stat-value { font-size: 1.5rem; font-weight: 700; margin-top: 0.25rem; }

        .client-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 1rem;
        }
        .client-card {
            background: white;
            border-radius: var(--radius-lg);
            border: 1px solid var(--border);
            padding: 1.25rem;
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        
        .card-header { display: flex; justify-content: space-between; align-items: flex-start; }
        .client-name { font-size: 1.125rem; font-weight: 700; }
        .client-info { font-size: 0.875rem; color: var(--text-muted); }

        .badge {
            padding: 0.25rem 0.625rem;
            border-radius: 99px;
            font-size: 0.75rem;
            font-weight: 700;
        }
        .badge-ok { background: var(--status-green-bg); color: var(--status-green); }
        .badge-warning { background: var(--status-yellow-bg); color: var(--status-yellow); }
        .badge-alarm { background: var(--status-red-bg); color: var(--status-red); border: 1px solid var(--status-red); }

        .info-group { display: flex; flex-direction: column; gap: 0.375rem; }
        .info-item { display: flex; justify-content: space-between; font-size: 0.875rem; }
        .info-label { color: var(--text-muted); }
        .info-value { font-weight: 600; }

        .btn-action {
            width: 100%;
            padding: 0.75rem;
            border-radius: var(--radius-md);
            font-weight: 700;
            border: none;
            cursor: pointer;
            transition: background 0.2s;
        }
        .btn-alarm { background: var(--status-red); color: white; }

        .menu-btn { display: none; background: none; border: none; font-size: 1.5rem; cursor: pointer; padding: 0.5rem; }

        /* --- Mobile Responsiveness --- */
        @media (max-width: 1024px) {
            .login-left { display: none; }
        }

        @media (max-width: 768px) {
            aside {
                position: fixed;
                inset: 0 0 0 -260px;
                z-index: 1000;
                transition: transform 0.3s;
            }
            aside.open { transform: translateX(260px); }
            
            #app-container { flex-direction: column; }
            .menu-btn { display: block; }
            .top-bar-title { font-size: 1rem; }
            .user-profile span { display: none; }
            
            .content-area { padding: 1rem; }
            .stats-row { grid-template-columns: 1fr 1fr; }
            
            .btn-text { display: none; }
        }

        .encrypted { filter: blur(5px); opacity: 0.5; }
    </style>
</head>
<body>

    <div id="login-screen">
        <div class="login-left">
            <h2>Sicherheit, <br>die vertraut.</h2>
            <p>Die professionelle iBinda Suite für ambulante Einrichtungen und modernes Wohnen.</p>
        </div>
        <div class="login-right">
            <div class="login-form">
                <div style="font-size: 2.5rem; margin-bottom: 1rem;">📍</div>
                <h3>Anmelden</h3>
                <input type="text" id="email" placeholder="Benutzername">
                <input type="password" id="password" placeholder="Passwort">
                <button class="btn-login" onclick="tryLogin()">Portal öffnen</button>
            </div>
        </div>
    </div>

    <div id="app-container" style="display: none;">
        <aside id="sidebar">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <div class="nav-logo">iBinda <span style="font-weight: 300;">Pro</span></div>
                <button class="menu-btn" style="color: white; padding: 0;" onclick="toggleMenu()">✕</button>
            </div>
            <nav>
                <div class="nav-item active">📊 Dashboard</div>
                <div class="nav-item">👥 Klienten</div>
                <div class="nav-item">📡 Geräte</div>
                <div class="nav-item">📁 Protokolle</div>
                <div class="nav-item">⚙️ Settings</div>
            </nav>
        </aside>

        <main>
            <div class="top-bar">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <button class="menu-btn" onclick="toggleMenu()">☰</button>
                    <div class="top-bar-title">Übersicht</div>
                </div>
                <div style="display: flex; gap: 0.75rem; align-items: center;">
                    <button onclick="toggleEncryption()" style="padding: 0.5rem; border-radius: 8px; border: 1px solid var(--border); background: white;">🔐 <span class="btn-text">Schutz</span></button>
                    <button onclick="showOnboarding()" style="padding: 0.5rem; border-radius: 8px; border: none; background: var(--primary); color: white;">+ <span class="btn-text">Einladen</span></button>
                    <div style="width: 32px; height: 32px; background: #e2e8f0; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700;">AZ</div>
                </div>
            </div>

            <div class="content-area">
                <div class="stats-row">
                    <div class="stat-card">
                        <div class="stat-label">Klienten</div>
                        <div class="stat-value">124</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Alarme</div>
                        <div class="stat-value" style="color: var(--status-red);" id="alarm-count">1</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Warnungen</div>
                        <div class="stat-value" style="color: var(--status-yellow);">1</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Status</div>
                        <div class="stat-value" style="color: var(--status-green); font-size: 1.1rem;">Bereit</div>
                    </div>
                </div>

                <div class="client-grid" id="dashboard"></div>
            </div>
        </main>
    </div>

    <script>
        const clients = [
            { id: '1', name: 'Maria Sommer', info: 'App. 14', status: 'ok', last: '12 Min.', bat: '92%' },
            { id: '2', name: 'Josef Berger', info: 'Whg. 3a', status: 'alarm', last: '2 Std.', bat: '64%' },
            { id: '3', name: 'Hildegard Mayr', info: 'App. 1', status: 'warning', last: '45 Min.', bat: '18%' },
            { id: '4', name: 'Karl-Heinz Koch', info: 'Whg. 22', status: 'ok', last: '5 Min.', bat: '98%' }
        ];

        let isEncrypted = false;

        function toggleMenu() {
            document.getElementById('sidebar').classList.toggle('open');
        }

        function tryLogin() {
            const e = document.getElementById('email').value;
            const p = document.getElementById('password').value;
            if (e === 'admin' && p === 'demo') {
                document.getElementById('login-screen').style.display = 'none';
                document.getElementById('app-container').style.display = 'flex';
                render();
            } else {
                alert('admin / demo nutzen');
            }
        }

        function render() {
            const grid = document.getElementById('dashboard');
            grid.innerHTML = clients.map(c => \`
                <div class="client-card">
                    <div class="card-header">
                        <div>
                            <div class="client-name \${isEncrypted ? 'encrypted' : ''}">\${isEncrypted ? 'ID-772' : c.name}</div>
                            <div class="client-info">\${c.info}</div>
                        </div>
                        <div class="badge badge-\${c.status}">\${c.status.toUpperCase()}</div>
                    </div>
                    <div class="info-group">
                        <div class="info-item"><span class="info-label">Letzte Meldung</span><span class="info-value">vor \${c.last}</span></div>
                        <div class="info-item"><span class="info-label">Batterie</span><span class="info-value">\${c.bat}</span></div>
                    </div>
                    \${c.status === 'alarm' ? \`<button class="btn-action btn-alarm" onclick="claimAlarm('\${c.id}')">HILFE STARTEN</button>\` : ''}
                </div>
            \`).join('');
            document.getElementById('alarm-count').innerText = clients.filter(c => c.status === 'alarm').length;
        }

        function claimAlarm(id) {
            const c = clients.find(c => c.id === id);
            if (c) { c.status = 'ok'; c.last = 'Gerade eben'; render(); }
        }

        function toggleEncryption() { isEncrypted = !isEncrypted; render(); }
        function showOnboarding() { alert('QR Code Scan-Einladung (Simuliert)'); }
    </script>
</body>
</html>
`;
