export const LANDING_HTML = `<!DOCTYPE html>
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
</html>`;
