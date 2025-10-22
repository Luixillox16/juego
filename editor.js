// js/editor.js - Editor con paleta de colores, lienzo blanco cuadriculado, lista guardada y filtro
(() => {
  const SIZE = 16;
  const pixelSize = 28; // tamaño visual de cada 'píxel' en el canvas (ajusta para que sea cómodo)
  // Paleta base (puedes ampliar)
  const paletteColors = [
    "#00000000", // transparente (index 0, tratada como transparente)
    "#000000", "#ffffff", "#ff0000", "#ff7f00", "#ffd400",
    "#ffea7f", "#7fff7f", "#00cc66", "#00aaff", "#0066ff",
    "#7f3f00", "#7f7f7f", "#3f7f7f", "#ff00ff", "#00ffff"
  ];

  const editorCanvasContainer = document.getElementById("editorCanvasContainer");
  const saveSpriteBtn = document.getElementById("saveSpriteBtn");
  const exportPngBtn = document.getElementById("exportPngBtn");
  const spriteNameInput = document.getElementById("spriteName");
  const spriteTypeSelect = document.getElementById("spriteType");
  const editorSavedList = document.getElementById("editorSavedList");
  const eraserBtn = document.getElementById("eraserBtn");

  const paletteEl = document.getElementById("palette");
  const transparentBtn = document.getElementById("transparentBtn");
  const customColorInput = document.getElementById("customColorInput");

  // saved list filter buttons
  const savedAllBtn = document.getElementById("savedAll");
  const savedPlayersBtn = document.getElementById("savedPlayers");
  const savedEnemiesBtn = document.getElementById("savedEnemies");
  let savedFilter = 'all'; // 'all' | 'player' | 'enemy'

  // estado del editor
  let currentColor = "#000000";
  let pixels = new Array(SIZE*SIZE).fill("#00000000");

  // canvas elements
  let previewCanvas = null;
  let previewCtx = null;

  // Construye la paleta visual en el DOM
  function buildPalette() {
    if (!paletteEl) return;
    paletteEl.innerHTML = '';
    paletteColors.forEach((col, i) => {
      if (i === 0) return; // transparente tendrá su propio botón
      const btn = document.createElement('button');
      btn.className = 'palette-button';
      btn.title = col;
      btn.dataset.color = col;
      btn.style.background = col;
      btn.addEventListener('click', () => {
        selectColor(col, btn);
      });
      paletteEl.appendChild(btn);
    });
    // inicializar selección
    const first = paletteEl.querySelector('.palette-button');
    if (first) selectColor(first.dataset.color, first);
  }

  function selectColor(colorHex, btnEl) {
    currentColor = colorHex;
    paletteEl.querySelectorAll('.palette-button').forEach(b => b.classList.remove('selected'));
    if (btnEl) btnEl.classList.add('selected');
    if (transparentBtn) transparentBtn.classList.remove('selected');
  }

  if (transparentBtn) {
    transparentBtn.addEventListener('click', () => {
      currentColor = "#00000000";
      paletteEl.querySelectorAll('.palette-button').forEach(b => b.classList.remove('selected'));
      transparentBtn.classList.add('selected');
    });
  }

  if (customColorInput) {
    customColorInput.value = '#000000';
    customColorInput.addEventListener('input', (ev) => {
      const col = ev.target.value;
      paletteEl.querySelectorAll('.palette-button').forEach(b => b.classList.remove('selected'));
      if (transparentBtn) transparentBtn.classList.remove('selected');
      currentColor = col;
      let exist = Array.from(paletteEl.querySelectorAll('.palette-button')).find(b => b.dataset.color.toLowerCase() === col.toLowerCase());
      if (exist) {
        exist.classList.add('selected');
      } else {
        const btn = document.createElement('button');
        btn.className = 'palette-button selected';
        btn.dataset.color = col;
        btn.style.background = col;
        btn.addEventListener('click', () => selectColor(col, btn));
        paletteEl.insertBefore(btn, paletteEl.firstChild);
      }
    });
  }

  // helpers
  function cssToRgba(css){
    if (!css) return [255,255,255,0];
    if (css === "#00000000") return [255,255,255,0];
    if (css.startsWith("#")){
      const hex = css.replace("#","");
      if (hex.length===8) return [parseInt(hex.slice(0,2),16),parseInt(hex.slice(2,4),16),parseInt(hex.slice(4,6),16),parseInt(hex.slice(6,8),16)];
      if (hex.length===6) return [parseInt(hex.slice(0,2),16),parseInt(hex.slice(2,4),16),parseInt(hex.slice(4,6),16),255];
    }
    return [255,255,255,0];
  }

  function drawThumbFromPixels(pixelsArr, canvasEl){
    const small = document.createElement("canvas"); small.width = SIZE; small.height = SIZE;
    const sctx = small.getContext("2d");
    const imgData = sctx.createImageData(SIZE,SIZE);
    for (let i=0;i<SIZE*SIZE;i++){
      const col = pixelsArr[i] || "#00000000";
      const rgba = cssToRgba(col);
      imgData.data[i*4+0]=rgba[0]; imgData.data[i*4+1]=rgba[1]; imgData.data[i*4+2]=rgba[2]; imgData.data[i*4+3]=rgba[3];
    }
    sctx.putImageData(imgData,0,0);
    const ctx = canvasEl.getContext("2d"); ctx.imageSmoothingEnabled=false; ctx.clearRect(0,0,canvasEl.width,canvasEl.height);
    ctx.drawImage(small,0,0,canvasEl.width,canvasEl.height);
  }

  function makeSavedTile(sprite) {
    const tile = document.createElement("div"); tile.className="skin-tile";
    const thumb = document.createElement("canvas"); thumb.width=48; thumb.height=48; thumb.className="skin-thumb";
    drawThumbFromPixels(sprite.pixels, thumb);
    tile.appendChild(thumb);
    const label = document.createElement("div"); label.className="skin-label"; label.textContent = sprite.name;
    tile.appendChild(label);
    const del = document.createElement("button"); del.className = "small"; del.textContent = "Eliminar";
    del.style.position = "absolute"; del.style.top = "6px"; del.style.right = "6px";
    del.addEventListener("click", (ev) => {
      ev.stopPropagation();
      let list = JSON.parse(localStorage.getItem("customSprites") || "[]");
      list = list.filter((s)=> !(s.name === sprite.name && s.type === sprite.type && JSON.stringify(s.pixels) === JSON.stringify(sprite.pixels)));
      localStorage.setItem("customSprites", JSON.stringify(list));
      populateSavedList();
    });
    tile.appendChild(del);
    tile.addEventListener("click", () => {
      // cargar sprite en editor
      pixels = sprite.pixels.slice();
      spriteNameInput.value = sprite.name;
      spriteTypeSelect.value = sprite.type;
      if (typeof refreshEditorFromPixels === 'function') refreshEditorFromPixels();
    });
    return tile;
  }

  function populateSavedList() {
    if (!editorSavedList) return;
    editorSavedList.innerHTML = '';
    const list = JSON.parse(localStorage.getItem("customSprites") || "[]");
    const filtered = list.filter(s => {
      if (savedFilter === 'all') return true;
      return s.type === savedFilter;
    });
    if (filtered.length === 0) {
      editorSavedList.innerHTML = '<div style="padding:8px;color:var(--muted)">No hay skins guardadas para esta categoría.</div>';
      return;
    }
    filtered.forEach((s) => editorSavedList.appendChild(makeSavedTile(s)));
  }

  function updateSavedFilterUI() {
    if (!savedAllBtn) return;
    savedAllBtn.classList.toggle('active', savedFilter === 'all');
    savedPlayersBtn.classList.toggle('active', savedFilter === 'player');
    savedEnemiesBtn.classList.toggle('active', savedFilter === 'enemy');
  }

  // UI events for saved filters
  if (savedAllBtn) savedAllBtn.addEventListener('click', () => { savedFilter = 'all'; updateSavedFilterUI(); populateSavedList(); });
  if (savedPlayersBtn) savedPlayersBtn.addEventListener('click', () => { savedFilter = 'player'; updateSavedFilterUI(); populateSavedList(); });
  if (savedEnemiesBtn) savedEnemiesBtn.addEventListener('click', () => { savedFilter = 'enemy'; updateSavedFilterUI(); populateSavedList(); });

  // Save functionality (simple)
  if (saveSpriteBtn) saveSpriteBtn.addEventListener('click', () => {
    const name = (spriteNameInput.value || '').trim() || 'mi-sprite';
    const type = spriteTypeSelect.value || 'player';
    const list = JSON.parse(localStorage.getItem('customSprites') || '[]');
    list.push({ name, type, pixels: pixels.slice() });
    localStorage.setItem('customSprites', JSON.stringify(list));
    populateSavedList();
    alert('Sprite guardado en el armario (local).');
  });

  // Eraser button toggles currentColor to transparent
  if (eraserBtn) eraserBtn.addEventListener('click', () => {
    currentColor = "#00000000";
    paletteEl.querySelectorAll('.palette-button').forEach(b => b.classList.remove('selected'));
    if (transparentBtn) transparentBtn.classList.add('selected');
  });

  // Construye el canvas y el loop de redibujo con cuadrícula
  function buildGrid() {
    if (!editorCanvasContainer) return;
    // crear canvas grande: SIZE * pixelSize
    previewCanvas = document.createElement('canvas');
    previewCanvas.width = SIZE * pixelSize;
    previewCanvas.height = SIZE * pixelSize;
    previewCanvas.style.width = (SIZE * pixelSize) + 'px';
    previewCanvas.style.height = (SIZE * pixelSize) + 'px';
    previewCanvas.setAttribute('aria-label', 'Lienzo de 16x16 píxeles');
    previewCanvas.className = 'editor-preview-canvas';
    previewCanvas.style.cursor = 'crosshair';

    // reemplazar contenido del contenedor
    editorCanvasContainer.innerHTML = '';
    editorCanvasContainer.appendChild(previewCanvas);

    previewCtx = previewCanvas.getContext('2d');
    previewCtx.imageSmoothingEnabled = false;

    function redraw() {
      // fondo blanco
      previewCtx.clearRect(0,0,previewCanvas.width, previewCanvas.height);
      previewCtx.fillStyle = '#ffffff';
      previewCtx.fillRect(0,0,previewCanvas.width, previewCanvas.height);

      // dibujar píxeles (cada celda)
      for (let y=0;y<SIZE;y++){
        for (let x=0;x<SIZE;x++){
          const idx = y * SIZE + x;
          const col = pixels[idx] || "#00000000";
          if (!col || col === "#00000000") {
            // transparente: dejamos blanco (ya está el fondo blanco)
          } else {
            previewCtx.fillStyle = col;
            previewCtx.fillRect(x*pixelSize, y*pixelSize, pixelSize, pixelSize);
          }
        }
      }

      // dibujar cuadrícula: líneas finas en gris claro
      previewCtx.strokeStyle = 'rgba(0,0,0,0.08)';
      previewCtx.lineWidth = 1;
      for (let i=0;i<=SIZE;i++){
        const pos = i * pixelSize;
        // líneas horizontales
        previewCtx.beginPath();
        previewCtx.moveTo(0.5 + 0, 0.5 + pos);
        previewCtx.lineTo(0.5 + previewCanvas.width, 0.5 + pos);
        previewCtx.stroke();
        // líneas verticales
        previewCtx.beginPath();
        previewCtx.moveTo(0.5 + pos, 0.5 + 0);
        previewCtx.lineTo(0.5 + pos, 0.5 + previewCanvas.height);
        previewCtx.stroke();
      }

      // opcional: dibujar marcas más oscuras cada 4 píxeles para referencia (no oblig.)
      previewCtx.strokeStyle = 'rgba(0,0,0,0.12)';
      previewCtx.lineWidth = 1;
      for (let i=0;i<=SIZE;i+=4){
        const pos = i * pixelSize;
        previewCtx.beginPath();
        previewCtx.moveTo(0.5 + 0, 0.5 + pos);
        previewCtx.lineTo(0.5 + previewCanvas.width, 0.5 + pos);
        previewCtx.stroke();
        previewCtx.beginPath();
        previewCtx.moveTo(0.5 + pos, 0.5 + 0);
        previewCtx.lineTo(0.5 + pos, 0.5 + previewCanvas.height);
        previewCtx.stroke();
      }
    }

    // pintar al hacer click (y soporta arrastrar)
    let drawing = false;
    function pointerDown(e){
      drawing = true;
      paintFromEvent(e);
    }
    function pointerUp(){ drawing = false; }
    function pointerMove(e){
      if (!drawing) return;
      paintFromEvent(e);
    }
    function getCanvasCoords(e){
      const rect = previewCanvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const x = Math.floor((clientX - rect.left) / pixelSize);
      const y = Math.floor((clientY - rect.top) / pixelSize);
      return {x,y};
    }
    function paintFromEvent(e){
      const {x,y} = getCanvasCoords(e);
      if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
      const idx = y * SIZE + x;
      if (currentColor === "#00000000") {
        pixels[idx] = "#00000000";
      } else {
        pixels[idx] = (pixels[idx] === currentColor) ? "#00000000" : currentColor;
      }
      redraw();
    }

    // soportar mouse y touch
    previewCanvas.addEventListener('mousedown', pointerDown);
    window.addEventListener('mouseup', pointerUp);
    previewCanvas.addEventListener('mousemove', pointerMove);
    // touch
    previewCanvas.addEventListener('touchstart', (e) => { e.preventDefault(); pointerDown(e); }, {passive:false});
    window.addEventListener('touchend', pointerUp);
    previewCanvas.addEventListener('touchmove', (e) => { e.preventDefault(); pointerMove(e); }, {passive:false});

    // exponer redraw
    window.refreshEditorFromPixels = redraw;
    // dibujado inicial
    redraw();
  }

  // inicialización
  buildPalette();
  buildGrid();
  populateSavedList();
  updateSavedFilterUI();

  // export PNG (simple) - mantiene transparencia si corresponde
  if (exportPngBtn) exportPngBtn.addEventListener('click', () => {
    const small = document.createElement('canvas'); small.width = SIZE; small.height = SIZE;
    const sctx = small.getContext('2d');
    const imgData = sctx.createImageData(SIZE, SIZE);
    for (let i=0;i<SIZE*SIZE;i++){
      const rgba = cssToRgba(pixels[i] || "#00000000");
      imgData.data[i*4+0]=rgba[0]; imgData.data[i*4+1]=rgba[1]; imgData.data[i*4+2]=rgba[2]; imgData.data[i*4+3]=rgba[3];
    }
    sctx.putImageData(imgData,0,0);
    // upscale (sin suavizado)
    const out = document.createElement('canvas'); out.width = SIZE * 8; out.height = SIZE * 8;
    const octx = out.getContext('2d'); octx.imageSmoothingEnabled = false;
    octx.drawImage(small, 0, 0, out.width, out.height);
    const url = out.toDataURL('image/png');
    const a = document.createElement('a'); a.href = url; a.download = (spriteNameInput.value || 'sprite') + '.png';
    a.click();
  });

  // Exponer estado útil globalmente si se necesita
  window.__editorPixels = pixels;
  window.__refreshSavedList = populateSavedList;
})();
