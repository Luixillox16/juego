// js/game.js - Lógica del juego con soporte para intentar guardar el primer intento en la BD
// y marcar localmente cuando el primer intento ya fue registrado (para mostrar "jugando sin clasificación").
// Coloca este archivo en: htdocs/space-invaders/js/game.js

document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const startBtn = document.getElementById("startBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const scoreEl = document.getElementById("score");
  const livesEl = document.getElementById("lives");
  const previewPlayer = document.getElementById("previewPlayer");
  const previewEnemy = document.getElementById("previewEnemy");
  const previewPlayerName = document.getElementById("previewPlayerName");
  const previewEnemyName = document.getElementById("previewEnemyName");

  // Touch
  const touchControls = document.getElementById("touchControls");
  const touchLeft = document.getElementById("touchLeft");
  const touchRight = document.getElementById("touchRight");
  const touchFire = document.getElementById("touchFire");

  // API endpoints (subcarpeta api dentro de space-invaders)
  const API_REGISTER_URL = '/space-invaders/api/register.php';
  const API_SAVE_SCORE_URL = '/space-invaders/api/save_score.php';
  const API_GET_LEADERBOARD_URL = '/space-invaders/api/get_leaderboard.php';

  function adjustCanvasForDevice() {
    const isMobile = window.matchMedia("(max-width: 900px)").matches;
    if (isMobile) {
      canvas.width = Math.min(window.innerWidth - 40, 420);
      canvas.height = Math.min(window.innerHeight - 200, 640);
      if (touchControls) touchControls.classList.remove('hidden');
    } else {
      canvas.width = Math.min(window.innerWidth - 320, 1100);
      canvas.height = Math.min(560, window.innerHeight - 160);
      if (touchControls) touchControls.classList.add('hidden');
    }
  }
  window.addEventListener('resize', adjustCanvasForDevice);
  adjustCanvasForDevice();

  // Small pixel preset helper (fallback)
  function makePixelsFromPattern(fn) {
    const SIZE = 16;
    const arr = new Array(SIZE * SIZE);
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) arr[y * SIZE + x] = fn(x, y) || "#00000000";
    return arr;
  }
  const Presets = {
    default: makePixelsFromPattern((x,y)=>(y>11 && Math.abs(x-8)<3) ? "#ffffff" : "#00000000"),
    alien1: makePixelsFromPattern((x,y)=>{ if (y<4) return "#00000000"; if (y<8 && Math.abs(x-7.5)<5) return "#ffcc00"; if (y>=8 && Math.abs(x-7.5)<6) return "#ff6600"; return "#00000000"; })
  };

  function cssToRgba(css){
    if (!css) return [0,0,0,0];
    if (css.startsWith("#")){
      const hex = css.replace("#","");
      if (hex.length===8) return [parseInt(hex.slice(0,2),16),parseInt(hex.slice(2,4),16),parseInt(hex.slice(4,6),16),parseInt(hex.slice(6,8),16)];
      if (hex.length===6) return [parseInt(hex.slice(0,2),16),parseInt(hex.slice(2,4),16),parseInt(hex.slice(4,6),16),255];
    }
    return [0,0,0,0];
  }

  function createImageFromPixels(pixelArray, scale = 4) {
    const SIZE = 16;
    const small = document.createElement("canvas");
    small.width = SIZE; small.height = SIZE;
    const sctx = small.getContext("2d");
    const imgData = sctx.createImageData(SIZE, SIZE);
    for (let i=0;i<SIZE*SIZE;i++){
      const col = pixelArray[i] || "#00000000";
      const rgba = cssToRgba(col);
      imgData.data[i*4+0] = rgba[0];
      imgData.data[i*4+1] = rgba[1];
      imgData.data[i*4+2] = rgba[2];
      imgData.data[i*4+3] = rgba[3];
    }
    sctx.putImageData(imgData, 0, 0);
    const out = document.createElement("canvas");
    out.width = SIZE * scale; out.height = SIZE * scale;
    const octx = out.getContext("2d");
    octx.imageSmoothingEnabled = false;
    octx.drawImage(small, 0, 0, out.width, out.height);
    const img = new Image();
    img.src = out.toDataURL();
    return img;
  }

  // Entities
  class Player {
    constructor(spriteImg) {
      this.w = Math.floor(canvas.width * 0.07);
      this.h = Math.floor(this.w * 0.75);
      this.x = (canvas.width - this.w) / 2;
      this.y = canvas.height - this.h - 18;
      this.speed = Math.max(180, canvas.width * 0.6);
      this.sprite = spriteImg;
      this.cooldown = 0;
    }
    update(dt, input) {
      if (input.left) this.x -= this.speed * dt;
      if (input.right) this.x += this.speed * dt;
      this.x = Math.max(0, Math.min(canvas.width - this.w, this.x));
      if (input.fire && this.cooldown <= 0) {
        this.cooldown = 0.28;
        spawnBullet(this.x + this.w/2 - 3, this.y - 10, -450, "player");
      }
      this.cooldown -= dt;
    }
    draw(ctx) {
      if (this.sprite) ctx.drawImage(this.sprite, this.x, this.y, this.w, this.h);
      else { ctx.fillStyle = "#fff"; ctx.fillRect(this.x, this.y, this.w, this.h); }
    }
  }

  class Enemy {
    constructor(x, y, img, posIndex) {
      this.w = Math.floor(canvas.width * 0.06);
      this.h = Math.floor(this.w * 0.75);
      this.x = x; this.y = y; this.sprite = img; this.alive = true; this.posIndex = posIndex;
      this.fireCooldown = 1.5 + Math.random() * 3.0;
    }
    draw(ctx) {
      if (!this.alive) return;
      if (this.sprite) ctx.drawImage(this.sprite, this.x, this.y, this.w, this.h);
      else { ctx.fillStyle = "#ff6"; ctx.fillRect(this.x, this.y, this.w, this.h); }
    }
  }

  class Bullet {
    constructor(x, y, vy, owner) {
      this.x = x; this.y = y; this.vy = vy; this.owner = owner;
      this.w = Math.max(4, Math.floor(canvas.width * 0.008));
      this.h = Math.max(8, Math.floor(canvas.height * 0.02));
    }
    update(dt) { this.y += this.vy * dt; }
    draw(ctx) {
      ctx.fillStyle = this.owner === "player" ? "#8cf" : "#f55";
      ctx.fillRect(this.x, this.y, this.w, this.h);
    }
  }

  // state
  let player = null, enemies = [], bullets = [], score = 0, lives = 3, running = false, paused = false;
  let lastTime = 0;
  const input = { left:false, right:false, fire:false };

  // folder images
  let folderPlayerImages = [], folderEnemyImages = [];
  let gridPositions = [], gridCols = 10, gridRows = 3;

  const REGISTER_KEY = 'registeredPlayer';
  const REGISTER_FIRSTSAVED_KEY = 'registeredPlayer_firstSaved';
  const LEADERBOARD_KEY = 'leaderboard'; // kept for fallback local leaderboard if needed

  async function loadSpritesManifest() {
    try {
      const resp = await fetch('sprites/manifest.json', { cache: "no-store" });
      if (!resp.ok) throw new Error('manifest no encontrado');
      const manifest = await resp.json();
      folderPlayerImages = []; folderEnemyImages = [];
      if (manifest.personajes) {
        for (const rel of manifest.personajes) {
          const img = new Image(); img.src = 'sprites/' + rel; await img.decode().catch(()=>{}); folderPlayerImages.push({ src:'sprites/'+rel, img });
        }
      }
      if (manifest.enemigos) {
        for (const rel of manifest.enemigos) {
          const img = new Image(); img.src = 'sprites/' + rel; await img.decode().catch(()=>{}); folderEnemyImages.push({ src:'sprites/'+rel, img });
        }
      }
    } catch (err) {
      folderPlayerImages = []; folderEnemyImages = [];
      console.warn('No se pudo cargar manifest:', err);
    }
  }

  function buildEnemyImagesArray() {
    const imgs = [];
    imgs.push(createImageFromPixels(Presets.alien1, Math.max(3, Math.round(canvas.width * 0.04 / 16))));
    folderEnemyImages.forEach(o => imgs.push(o.img));
    const list = JSON.parse(localStorage.getItem('customSprites') || '[]');
    list.filter(s => s.type === 'enemy' && s.pixels && s.pixels.length === 256).forEach(s => imgs.push(createImageFromPixels(s.pixels, Math.max(3, Math.round(canvas.width * 0.04 / 16)))));
    return imgs;
  }

  function buildGridPositions(cols=10, rows=3) {
    gridPositions = []; gridCols = cols; gridRows = rows;
    const marginX = 20; const gapX = Math.max(48, Math.floor((canvas.width - marginX*2)/cols));
    const gapY = Math.max(40, Math.floor(canvas.height*0.08));
    for (let r=0;r<rows;r++) for (let c=0;c<cols;c++) { const x = marginX + c*gapX; const y = 40 + r*gapY; gridPositions.push({x,y}); }
  }

  function spawnInitialEnemyGrid() {
    enemies = []; buildGridPositions(gridCols, gridRows);
    const images = buildEnemyImagesArray(); const typesCount = images.length || 1;
    const positions = gridPositions.map((p,i)=>({...p,idx:i})); shuffleArray(positions);
    for (let t=0;t<typesCount && t<positions.length;t++){ const pos = positions.pop(); enemies.push(new Enemy(pos.x,pos.y,images[t],pos.idx)); }
    while (positions.length) { const pos = positions.pop(); const img = images[Math.floor(Math.random()*typesCount)]; enemies.push(new Enemy(pos.x,pos.y,img,pos.idx)); }
  }

  function spawnSingleEnemyAtFreePos() {
    const images = buildEnemyImagesArray(); if (!images.length) return;
    const occupied = new Set(enemies.filter(e=>e.alive).map(e=>e.posIndex));
    const free = gridPositions.map((p,i)=>i).filter(i=>!occupied.has(i)); if (!free.length) return;
    const idx = free[Math.floor(Math.random()*free.length)]; const pos = gridPositions[idx]; const img = images[Math.floor(Math.random()*images.length)];
    const delay = 2000 + Math.random()*1000;
    setTimeout(()=>{ if (!running) return; const occNow = new Set(enemies.filter(e=>e.alive).map(e=>e.posIndex)); if (occNow.has(idx)) return; enemies.push(new Enemy(pos.x,pos.y,img,idx)); }, delay);
  }

  function shuffleArray(arr){ for (let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } }

  function spawnBullet(x,y,vy,owner){ bullets.push(new Bullet(x,y,vy,owner)); }

  function resetGame(){ bullets=[]; score=0; lives=3; spawnInitialEnemyGrid(); if (!player) player = new Player(createImageFromPixels(Presets.default, Math.max(3, Math.round(canvas.width*0.04/16)))); updateUI(); }

  function updateUI(){ if (scoreEl) scoreEl.textContent = score; if (livesEl) livesEl.textContent = lives; }

  function loop(t){ if (!running) return; const dt = Math.min(0.05,(t-lastTime)/1000); lastTime=t; if (!paused) update(dt); render(); requestAnimationFrame(loop); }

  function update(dt){
    if (player) player.update(dt,input);
    bullets.forEach(b=>b.update(dt));
    bullets = bullets.filter(b=>b.y > -200 && b.y < canvas.height + 200);
    enemies.forEach(e=>{ if (!e.alive) return; e.fireCooldown -= dt; const extra = Math.min(0.8, score/10000); if (e.fireCooldown <= 0){ e.fireCooldown = 1.0 + Math.random()*(2.4 - extra); const bx = e.x + e.w/2 - 3; const by = e.y + e.h + 4; spawnBullet(bx,by,180 + Math.random()*80,"enemy"); } });
    bullets.forEach(b=>{
      if (b.owner==="player"){
        enemies.forEach(e=>{ if (e.alive && rectIntersect(b,e)){ e.alive=false; b.y=-1000; score += 100; updateUI(); spawnSingleEnemyAtFreePos(); }});
      } else {
        if (player && rectIntersect(b,player)){ b.y = 9999; lives -= 1; updateUI(); if (lives <= 0){ running = false; handleGameOver(); } }
      }
    });
    if (enemies.length>0 && Math.random()<0.01) enemies = enemies.filter(e=>e.alive || Math.random()<0.005);
  }

  function rectIntersect(a,b){ return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

  function render(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = "#041423"; ctx.fillRect(0,0,canvas.width,canvas.height);
    if (player) player.draw(ctx);
    enemies.forEach(e=>e.draw(ctx));
    bullets.forEach(b=>b.draw(ctx));
    // HUD
    ctx.fillStyle = "#fff"; ctx.font = `${Math.max(12, Math.round(canvas.width*0.02))}px monospace`;
    ctx.fillText("Score: " + score, 12, 18);
    ctx.fillText("Lives: " + lives, 12, 36);
    // show registered state in canvas HUD
    const reg = getRegisteredPlayer();
    const flag = JSON.parse(localStorage.getItem(REGISTER_FIRSTSAVED_KEY) || 'null');
    if (reg && reg.name) {
      ctx.fillStyle = "#cfe6ff";
      ctx.font = `${Math.max(10, Math.round(canvas.width*0.015))}px monospace`;
      if (flag && flag.name === reg.name && flag.saved) {
        ctx.fillText("Jugando sin clasificación (primer intento guardado)", 12, canvas.height - 12);
      } else {
        ctx.fillText("Registrado: " + reg.name + " (tu primera puntuación se guardará)", 12, canvas.height - 12);
      }
    }
  }

  // input
  window.addEventListener("keydown", e => {
    if (e.key === "ArrowLeft") input.left = true;
    if (e.key === "ArrowRight") input.right = true;
    if (e.key === " ") input.fire = true;
    if (e.key === "p") { paused = !paused; if (pauseBtn) pauseBtn.textContent = paused ? "Reanudar" : "Pausa"; }
    if (e.key === "Escape") { running = false; }
  });
  window.addEventListener("keyup", e => {
    if (e.key === "ArrowLeft") input.left = false;
    if (e.key === "ArrowRight") input.right = false;
    if (e.key === " ") input.fire = false;
  });

  function addTouchListeners(){
    if (!touchLeft || !touchRight || !touchFire) return;
    function startLeft(ev){ ev.preventDefault(); input.left = true; } function endLeft(ev){ ev.preventDefault(); input.left = false; }
    function startRight(ev){ ev.preventDefault(); input.right = true; } function endRight(ev){ ev.preventDefault(); input.right = false; }
    function startFire(ev){ ev.preventDefault(); input.fire = true; setTimeout(()=>{ input.fire=false; },200); } function endFire(ev){ ev.preventDefault(); input.fire = false; }
    touchLeft.addEventListener('touchstart', startLeft); touchLeft.addEventListener('touchend', endLeft);
    touchRight.addEventListener('touchstart', startRight); touchRight.addEventListener('touchend', endRight);
    touchFire.addEventListener('touchstart', startFire); touchFire.addEventListener('touchend', endFire);
    touchLeft.addEventListener('mousedown', startLeft); document.addEventListener('mouseup', endLeft);
    touchRight.addEventListener('mousedown', startRight); document.addEventListener('mouseup', endRight);
    touchFire.addEventListener('mousedown', startFire); document.addEventListener('mouseup', endFire);
  }
  addTouchListeners();

  // ---------- Integration with API: save first attempt ----------
  async function trySaveScoreToServer(name, score) {
    try {
      const resp = await fetch(API_SAVE_SCORE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, score })
      });
      return await resp.json();
    } catch (e) {
      console.warn('Error guardar score en servidor:', e);
      return { success:false, message:'error conexion' };
    }
  }

  // handleGameOver: try to save first attempt in server and mark locally that first attempt is saved
  async function handleGameOver() {
    const reg = getRegisteredPlayer();
    if (reg && reg.name) {
      const r = await trySaveScoreToServer(reg.name, score);
      if (r && r.success && r.saved) {
        localStorage.setItem(REGISTER_FIRSTSAVED_KEY, JSON.stringify({ name: reg.name, saved: true }));
        console.log('Primer intento guardado en BD para', reg.name);
      } else {
        // If server says it didn't save because already exists, still mark as saved so UI degrades into "jugando sin clasificación"
        if (r && r.success === false && r.message && r.message.toLowerCase().includes('ya existe')) {
          localStorage.setItem(REGISTER_FIRSTSAVED_KEY, JSON.stringify({ name: reg.name, saved: true }));
        }
        console.log('Servidor no guardó primer intento:', r);
      }
    }
    alert("Juego terminado. Puntuación: " + score);
  }

  function getRegisteredPlayer() {
    try { return JSON.parse(localStorage.getItem(REGISTER_KEY) || 'null'); } catch { return null; }
  }

  // ---------- start / UI integration ----------
  startBtn.addEventListener('click', () => {
    adjustCanvasForDevice();
    loadSpritesManifest().then(()=> {
      loadSelectedSkinsToPreviewAndFolders();
      running = true; paused = false; lastTime = performance.now();
      resetGame(); requestAnimationFrame(loop);
    });
  });

  function loadSelectedSkinsToPreviewAndFolders() {
    const selP = JSON.parse(localStorage.getItem("selectedPlayer") || "null");
    const selE = JSON.parse(localStorage.getItem("selectedEnemy") || "null");
    if (selP) {
      if (selP.pixels && selP.pixels.length === 256) {
        const pPixels = selP.pixels; const pName = selP.name || "Jugador"; previewPlayerName.textContent = pName; drawPixelsToCanvas(pPixels, previewPlayer); player = new Player(createImageFromPixels(pPixels, Math.max(3, Math.round(canvas.width*0.04/16))));
      } else if (selP.imgSrc) {
        const pName = selP.name || selP.imgSrc.split('/').pop(); previewPlayerName.textContent = pName; const img = new Image(); img.src = selP.imgSrc; img.onload = ()=>{ const ctx2 = previewPlayer.getContext('2d'); ctx2.imageSmoothingEnabled=false; ctx2.clearRect(0,0,previewPlayer.width,previewPlayer.height); ctx2.drawImage(img,0,0,previewPlayer.width,previewPlayer.height); }; player = new Player(img);
      }
    } else { const pPixels = Presets.default; previewPlayerName.textContent = "Predeterm."; drawPixelsToCanvas(pPixels, previewPlayer); player = new Player(createImageFromPixels(pPixels, Math.max(3, Math.round(canvas.width*0.04/16)))); }

    if (selE) {
      if (selE.pixels && selE.pixels.length === 256) { const ePixels = selE.pixels; const eName = selE.name || "Enemigo"; previewEnemyName.textContent = eName; drawPixelsToCanvas(ePixels, previewEnemy); } else if (selE.imgSrc) { const eName = selE.name || selE.imgSrc.split('/').pop(); previewEnemyName.textContent = eName; const img = new Image(); img.src = selE.imgSrc; img.onload = ()=>{ const ctx2 = previewEnemy.getContext('2d'); ctx2.imageSmoothingEnabled=false; ctx2.clearRect(0,0,previewEnemy.width,previewEnemy.height); ctx2.drawImage(img,0,0,previewEnemy.width,previewEnemy.height); }; }
    } else { previewEnemyName.textContent = "Predeterm."; drawPixelsToCanvas(Presets.alien1, previewEnemy); }
  }

  function drawPixelsToCanvas(pixelArray, canvasEl){
    const SIZE = 16; const small = document.createElement("canvas"); small.width = SIZE; small.height = SIZE;
    const sctx = small.getContext("2d"); const imgData = sctx.createImageData(SIZE,SIZE);
    for (let i=0;i<SIZE*SIZE;i++){ const col = pixelArray[i] || "#00000000"; const rgba = cssToRgba(col); imgData.data[i*4+0]=rgba[0]; imgData.data[i*4+1]=rgba[1]; imgData.data[i*4+2]=rgba[2]; imgData.data[i*4+3]=rgba[3]; }
    sctx.putImageData(imgData,0,0); const ctx2 = canvasEl.getContext('2d'); ctx2.imageSmoothingEnabled=false; ctx2.clearRect(0,0,canvasEl.width,canvasEl.height); ctx2.drawImage(small,0,0,canvasEl.width,canvasEl.height);
  }

  // Initialization
  (async ()=>{
    await loadSpritesManifest();
    const selP = localStorage.getItem('selectedPlayer');
    if (!selP && folderPlayerImages.length>0) {
      const imgObj = folderPlayerImages[0]; const ctx2 = previewPlayer.getContext('2d'); ctx2.imageSmoothingEnabled=false; ctx2.clearRect(0,0,previewPlayer.width,previewPlayer.height); ctx2.drawImage(imgObj.img,0,0,previewPlayer.width,previewPlayer.height); previewPlayerName.textContent = imgObj.src.split('/').pop();
    }
    loadSelectedSkinsToPreviewAndFolders();
    spawnInitialEnemyGrid();
    updateUI();
  })();

  window.GameAPI = { refreshSprites: async ()=>{ await loadSpritesManifest(); spawnInitialEnemyGrid(); }, openLeaderboard: ()=>{ location.href='leaderboard.html'; } };

});
