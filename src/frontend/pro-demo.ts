export const PRO_DEMO_HTML = `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>iBinda Pro — Institutionelle Betreuung</title>
    <style>
        :root {
            --bg-color: #f8fafc;
            --card-bg: #ffffff;
            --text-main: #0f172a;
            --text-muted: #475569;
            --primary: #2563eb;
            --status-green: #10b981;
            --status-yellow: #f59e0b;
            --status-red: #ef4444;
            --radius: 16px;
            --shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-main);
            line-height: 1.5;
            padding: 0;
            margin: 0;
            height: 100vh;
        }

        /* Login Screen */
        #login-screen {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
        }
        .login-card {
            background: white;
            padding: 3rem;
            border-radius: 24px;
            box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
            width: 100%;
            max-width: 400px;
            text-align: center;
        }
        .login-card h1 { margin-bottom: 0.5rem; color: var(--primary); font-weight: 800; }
        .login-card p { margin-bottom: 2rem; color: var(--text-muted); font-size: 0.95rem; }
        .login-card input {
            width: 100%;
            padding: 0.85rem 1rem;
            margin-bottom: 1rem;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            font-size: 1rem;
            outline: none;
        }
        .login-card input:focus { border-color: var(--primary); }

        /* Dashboard (Hidden by default) */
        #dashboard-container {
            display: none;
            padding: 2rem;
        }

        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2.5rem;
            max-width: 1400px;
            margin-left: auto;
            margin-right: auto;
        }

        .logo-area h1 { font-size: 1.75rem; font-weight: 800; color: var(--primary); }
        .logo-area p { font-size: 0.95rem; color: var(--text-muted); font-weight: 500; }

        .actions { display: flex; gap: 1rem; align-items: center; }
        button {
            padding: 0.75rem 1.5rem;
            border-radius: 12px;
            border: none;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }
        .btn-primary { background: var(--primary); color: white; }
        .btn-outline { background: white; border: 1px solid #e2e8f0; color: var(--text-main); }
        button:hover { opacity: 0.9; transform: translateY(-1px); }

        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
            gap: 2rem;
            max-width: 1400px;
            margin: 0 auto;
        }

        .patient-card {
            background: var(--card-bg);
            border-radius: var(--radius);
            padding: 1.75rem;
            box-shadow: var(--shadow);
            border: 2px solid transparent;
            transition: all 0.4s;
            position: relative;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            min-height: 220px;
        }

        /* Status Styles */
        .status-ok { border-color: #f1f5f9; }
        .status-warning { border-color: var(--status-yellow); }
        .status-alarm { 
            border-color: var(--status-red); 
            animation: pulse-border 2s infinite;
        }

        @keyframes pulse-border {
            0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
            70% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); }
            100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }

        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 1rem;
        }

        .patient-name { font-size: 1.3rem; font-weight: 800; }
        .room-info { font-size: 0.9rem; color: var(--text-muted); margin-top: 2px; }

        .heartbeat-status {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.75rem;
            font-weight: 800;
            text-transform: uppercase;
        }

        .dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
        }
        .dot-green { background: var(--status-green); box-shadow: 0 0 12px var(--status-green); }
        .dot-red { background: var(--status-red); }

        .card-body { margin-bottom: 1.5rem; }
        .last-activity { font-size: 0.85rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem; }

        .btn-alarm-action {
            width: 100%;
            background: var(--status-red);
            color: white;
            padding: 1rem;
            font-size: 1rem;
            font-weight: 800;
        }

        #overlay {
            display: none;
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
            z-index: 100;
            justify-content: center;
            align-items: center;
        }
        .modal {
            background: white;
            padding: 3rem;
            border-radius: 24px;
            max-width: 460px;
            text-align: center;
        }
        .qr-placeholder {
            width: 240px; height: 240px;
            background: #f8fafc;
            margin: 2rem auto;
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 3px dashed #e2e8f0;
        }
        .encrypted { filter: blur(5px); user-select: none; opacity: 0.7; }
    </style>
</head>
<body>

    <div id="login-screen">
        <div class="login-card">
            <h1>iBinda <span style="font-weight: 300;">Pro</span></h1>
            <p>Institutioneller Login</p>
            <input type="text" id="email" placeholder="Benutzername">
            <input type="password" id="password" placeholder="Passwort">
            <button class="btn-primary" style="width: 100%;" onclick="tryLogin()">Einloggen</button>
        </div>
    </div>

    <div id="dashboard-container">
        <header>
            <div class="logo-area">
                <h1>iBinda <span style="font-weight: 300; color: #64748b;">Pro Portal</span></h1>
                <p>Klienten-Übersicht — Ambulante Betreuung & Wohnungskontrolle</p>
            </div>
            <div class="actions">
                <button class="btn-outline" onclick="toggleEncryption()">🔐 PII Verschlüsselung</button>
                <button class="btn-primary" onclick="showOnboarding()">+ Mitarbeiter einladen</button>
            </div>
        </header>

        <div class="dashboard-grid" id="dashboard">
            <!-- Cards will be injected here -->
        </div>

        <div id="overlay" onclick="hideOnboarding()">
            <div class="modal" onclick="event.stopPropagation()">
                <h2>Mitarbeiter-Einladung</h2>
                <p style="color: var(--text-muted); margin-top: 0.5rem;">Ein autorisierter Pfleger oder Mitarbeiter scannt diesen Code mit der iBinda App, um der Institution beizutreten.</p>
                <div class="qr-placeholder">
                    <div style="text-align: center;">
                        <div style="font-size: 0.8rem; font-weight: 700; color: #94a3b8;">[EINLADUNGS-QR]</div>
                    </div>
                </div>
                <button class="btn-outline" style="margin-top: 2rem; width: 100%;" onclick="hideOnboarding()">Schließen</button>
            </div>
        </div>
    </div>

    <script>
        const clients = [
            { id: '1', name: 'Maria Sommer', info: 'Appartement 14', status: 'ok', lastSeen: 'vor 12 Min.', battery: '92%' },
            { id: '2', name: 'Josef Berger', info: 'Wohnung 3a', status: 'alarm', lastSeen: 'vor 2 Std.', battery: '64%' },
            { id: '3', name: 'Hildegard Mayr', info: 'Appartement 1', status: 'warning', lastSeen: 'vor 45 Min.', battery: '18%' },
            { id: '4', name: 'Karl-Heinz Koch', info: 'Wohnung 22', status: 'ok', lastSeen: 'vor 5 Min.', battery: '98%' },
            { id: '5', name: 'Anna Huber', info: 'Wohnung 7', status: 'ok', lastSeen: 'vor 1 Std.', battery: '45%' },
            { id: '6', name: 'Peter Lustig', info: 'Wohneinheit 1', status: 'ok', lastSeen: 'vor 8 Min.', battery: '77%' }
        ];

        let isEncrypted = false;

        function tryLogin() {
            const e = document.getElementById('email').value;
            const p = document.getElementById('password').value;
            if (e === 'admin' && p === 'demo') {
                document.getElementById('login-screen').style.display = 'none';
                document.getElementById('dashboard-container').style.display = 'block';
                render();
            } else {
                alert('Falsche Zugangsdaten! (admin / demo)');
            }
        }

        function render() {
            const grid = document.getElementById('dashboard');
            grid.innerHTML = clients.map(c => \`
                <div class="patient-card status-\${c.status}">
                    <div class="card-header">
                        <div>
                            <div class="patient-name \${isEncrypted ? 'encrypted' : ''}">\${isEncrypted ? 'K-ID: 772-XQ' : c.name}</div>
                            <div class="room-info \${isEncrypted ? 'encrypted' : ''}">\${isEncrypted ? 'Sektor A / Zone 4' : c.info}</div>
                        </div>
                        <div class="heartbeat-status">
                            <div class="dot \${c.status === 'alarm' ? 'dot-red' : 'dot-green'}"></div>
                            <span style="color: \${c.status === 'alarm' ? 'var(--status-red)' : 'var(--status-green)'}">
                                \${c.status === 'alarm' ? 'Eskalation' : 'Normal'}
                            </span>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="last-activity">🕒 Letzte Meldung: \${c.lastSeen}</div>
                        <div class="last-activity" style="color: \${parseInt(c.battery) < 20 ? 'var(--status-red)' : 'inherit'}">
                            🔋 Gerät: \${c.battery}
                        </div>
                    </div>
                    \${c.status === 'alarm' ? \`
                        <div class="card-footer">
                            <button class="btn-alarm-action" onclick="claimAlarm('\${c.id}')">ALARM ÜBERNEHMEN</button>
                        </div>
                    \` : ''}
                </div>
            \`).join('');
        }

        function claimAlarm(id) {
            const c = clients.find(c => c.id === id);
            if (c) {
                c.status = 'warning';
                c.lastSeen = 'Übernahme läuft';
                alert('Alarm übernommen. Die Intervention wurde im System vermerkt.');
                render();
            }
        }

        function toggleEncryption() {
            isEncrypted = !isEncrypted;
            render();
        }

        function showOnboarding() {
            document.getElementById('overlay').style.display = 'flex';
        }

        function hideOnboarding() {
            document.getElementById('overlay').style.display = 'none';
        }
    </script>
</body>
</html>
`;
