
(() => {
  const SIZE = 16;
  const pixelSize = 18;
  const paletteColors = [
    "#00000000","#000000","#ffffff","#ff0000","#00ff00","#0000ff",
    "#ffff00","#ff00ff","#00ffff","#7f3f00","#7f7f7f","#3f7f7f"
  ];

  const editorRoot = document.getElementById("editorRoot");
  const saveSpriteBtn = document.getElementById("saveSpriteBtn");
  const exportPngBtn = document.getElementById("exportPngBtn");
  const spriteNameInput = document.getElementById("spriteName");
  const spriteTypeSelect = document.getElementById("spriteType");
  const uploadSpriteFile = document.getElementById("uploadSpriteFile");
  const editorSavedList = document.getElementById("editorSavedList");
  const openPixelEditorBtn = document.getElementById("openPixelEditorBtn");
  const eraserBtn = document.getElementById("eraserBtn");

  let currentColor = paletteColors[2];
  let pixels = new Array(SIZE*SIZE).fill("#00000000");

  function buildGrid(){
    editorRoot.innerHTML = "";
    const grid = document.createElement("div");
    grid.className = "editor-grid";
    grid.style.gridTemplateColumns = `repeat(${SIZE}, ${pixelSize}px)`;

    for (let i=0;i<SIZE*SIZE;i++){
      const cell = document.createElement("div");
      cell.className = "pixel";
      cell.style.width = pixelSize+"px";
      cell.style.height = pixelSize+"px";
      cell.style.background = pixels[i];
      cell.dataset.index = i;

      cell.addEventListener("click", (ev) => {
        if (ev.shiftKey) {
          pixels[i] = "#00000000";
          cell.style.background = "#00000000";
        } else {
          pixels[i] = currentColor;
          cell.style.background = currentColor;
        }
      });
      cell.addEventListener("contextmenu", (ev) => {
        ev.preventDefault();
        pixels[i] = "#00000000";
        cell.style.background = "#00000000";
        return false;
      });
      grid.appendChild(cell);
    }
    editorRoot.appendChild(grid);

    // palette
    const pal = document.createElement("div");
    pal.className = "palette";
    paletteColors.forEach(col => {
      const b = document.createElement("button");
      b.style.background = col;
      b.title = col;
      b.addEventListener("click", () => {
        currentColor = col;
        Array.from(pal.children).forEach(x => x.style.outline = "");
        b.style.outline = "2px solid #fff";
        if (eraserBtn) eraserBtn.style.outline = "";
      });
      pal.appendChild(b);
    });
    editorRoot.appendChild(pal);
  }

  function exportPng(){
    const c = document.createElement("canvas");
    c.width = SIZE; c.height = SIZE;
    const ctx = c.getContext("2d");
    for (let y=0;y<SIZE;y++){
      for (let x=0;x<SIZE;x++){
        const col = pixels[y*SIZE + x];
        if (col && col !== "#00000000"){
          ctx.fillStyle = col;
          ctx.fillRect(x,y,1,1);
        }
      }
    }
    const out = document.createElement("canvas");
    out.width = SIZE*8; out.height = SIZE*8;
    const octx = out.getContext("2d");
    octx.imageSmoothingEnabled = false;
    octx.drawImage(c,0,0,out.width,out.height);
    const a = document.createElement("a");
    a.href = out.toDataURL();
    a.download = (spriteNameInput.value||"sprite") + ".png";
    a.click();
  }

  function getSpriteObject(){
    return { name: spriteNameInput.value || "mi-sprite", type: spriteTypeSelect.value || "player", pixels: pixels.slice(), created_at: new Date().toISOString() };
  }

  function saveToLocalStorage(obj){
    const key = "customSprites";
    const list = JSON.parse(localStorage.getItem(key) || "[]");
    const idx = list.findIndex(s => s.name === obj.name && s.type === obj.type);
    if (idx >= 0) list[idx] = obj; else list.push(obj);
    localStorage.setItem(key, JSON.stringify(list));
    refreshEditorSavedList();
    alert("Sprite guardado en el armario.");
  }

  function refreshEditorSavedList(){
    const key = "customSprites";
    const list = JSON.parse(localStorage.getItem(key) || "[]");
    editorSavedList.innerHTML = "";
    list.forEach(s => {
      const tile = makeSkinTile(s,true);
      editorSavedList.appendChild(tile);
    });
  }

  function makeSkinTile(spriteObj, inEditorList = false){
    const tile = document.createElement("div");
    tile.className = "skin-tile";
    const thumb = document.createElement("canvas"); thumb.width = 48; thumb.height = 48; thumb.className = "skin-thumb";
    drawPixelsToCanvas(spriteObj.pixels, thumb);
    tile.appendChild(thumb);
    const label = document.createElement("div"); label.className="skin-label"; label.textContent = spriteObj.name;
    tile.appendChild(label);

    if (inEditorList){
      const del = document.createElement("button");
      del.className = "small";
      del.textContent = "Eliminar";
      del.addEventListener("click", (ev) => {
        ev.stopPropagation();
        deleteSprite(spriteObj);
      });
      del.style.position = "absolute"; del.style.top = "6px"; del.style.right = "6px";
      tile.appendChild(del);
    }

    tile.addEventListener("click", () => {
      // abrir en editor rellenando pixeles
      pixels = spriteObj.pixels.slice();
      spriteNameInput.value = spriteObj.name;
      spriteTypeSelect.value = spriteObj.type;
      buildGrid();
    });

    return tile;
  }

  function drawPixelsToCanvas(pixelArray, canvasEl){
    const small = document.createElement("canvas"); small.width = SIZE; small.height = SIZE;
    const sctx = small.getContext("2d");
    const imgData = sctx.createImageData(SIZE,SIZE);
    for (let i=0;i<SIZE*SIZE;i++){
      const col = pixelArray[i] || "#00000000";
      const rgba = cssToRgba(col);
      imgData.data[i*4+0] = rgba[0]; imgData.data[i*4+1] = rgba[1]; imgData.data[i*4+2] = rgba[2]; imgData.data[i*4+3] = rgba[3];
    }
    sctx.putImageData(imgData,0,0);
    const ctx = canvasEl.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0,0,canvasEl.width,canvasEl.height);
    ctx.drawImage(small,0,0,canvasEl.width,canvasEl.height);
  }

  function cssToRgba(css){
    if (!css) return [0,0,0,0];
    if (css.startsWith("#")){
      const hex = css.replace("#","");
      if (hex.length===8){
        return [parseInt(hex.slice(0,2),16),parseInt(hex.slice(2,4),16),parseInt(hex.slice(4,6),16),parseInt(hex.slice(6,8),16)];
      }
      if (hex.length===6){
        return [parseInt(hex.slice(0,2),16),parseInt(hex.slice(2,4),16),parseInt(hex.slice(4,6),16),255];
      }
    }
    return [0,0,0,0];
  }

  function deleteSprite(obj){
    const key = "customSprites";
    let list = JSON.parse(localStorage.getItem(key) || "[]");
    list = list.filter(s => !(s.name === obj.name && s.type === obj.type));
    localStorage.setItem(key, JSON.stringify(list));
    refreshEditorSavedList();
  }

  // upload image -> convert to 16x16
  uploadSpriteFile.addEventListener("change", (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const c = document.createElement("canvas"); c.width = SIZE; c.height = SIZE;
      const cx = c.getContext("2d"); cx.imageSmoothingEnabled = false;
      const scale = Math.min(SIZE / img.width, SIZE / img.height);
      const sw = img.width * scale, sh = img.height * scale;
      const dx = (SIZE - sw)/2, dy = (SIZE - sh)/2;
      cx.clearRect(0,0,SIZE,SIZE);
      cx.drawImage(img,0,0,img.width,img.height,dx,dy,sw,sh);
      const data = cx.getImageData(0,0,SIZE,SIZE).data;
      const newPixels = new Array(SIZE*SIZE);
      for (let i=0;i<SIZE*SIZE;i++){
        const r = data[i*4], g = data[i*4+1], b = data[i*4+2], a = data[i*4+3];
        if (a === 0) newPixels[i] = "#00000000";
        else newPixels[i] = "#" + [r,g,b].map(v => v.toString(16).padStart(2,"0")).join("");
      }
      pixels = newPixels;
      spriteNameInput.value = f.name.replace(/\.[^/.]+$/,"");
      spriteTypeSelect.value = "player";
      buildGrid();
    };
    img.src = url;
  });

  saveSpriteBtn.addEventListener("click", () => {
    const obj = getSpriteObject();
    saveToLocalStorage(obj);
    refreshEditorSavedList();
  });
  exportPngBtn.addEventListener("click", exportPng);
  openPixelEditorBtn.addEventListener("click", () => buildGrid());

  if (eraserBtn) {
    eraserBtn.addEventListener("click", () => {
      currentColor = "#00000000";
      eraserBtn.style.outline = "2px solid #fff";
      const pal = editorRoot.querySelector(".palette");
      if (pal) Array.from(pal.children).forEach(x => x.style.outline = "");
    });
  }

  // init default sample and UI
  (function initDefault(){
    for (let y=10;y<15;y++) for (let x=6;x<10;x++) pixels[y*SIZE + x] = "#ffffff";
    buildGrid();
    refreshEditorSavedList();
  })();

})();