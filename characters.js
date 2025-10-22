// js/characters.js - Armario con filtros verticales y selección (reemplaza el existente)
(() => {
  const armarioPlayers = document.getElementById("armarioPlayers");
  const armarioEnemies = document.getElementById("armarioEnemies");
  const selectAndPlayBtn = document.getElementById("selectAndPlayBtn");

  const filterAllBtn = document.getElementById("filterAll");
  const filterPlayersBtn = document.getElementById("filterPlayers");
  const filterEnemiesBtn = document.getElementById("filterEnemies");

  // Presets 16x16 (fallbacks)
  function makePixelsFromPattern(fn){
    const SIZE=16; const arr=new Array(SIZE*SIZE);
    for (let y=0;y<SIZE;y++) for (let x=0;x<SIZE;x++) arr[y*SIZE+x] = fn(x,y) || "#00000000";
    return arr;
  }
  const Presets = {
    default: makePixelsFromPattern((x,y)=> (y>11 && Math.abs(x-8)<3) ? "#ffffff" : "#00000000"),
    shipGreen: makePixelsFromPattern((x,y)=> (y>10 && Math.abs(x-8)<4) ? "#00ff00" : "#00000000"),
    shipBlue: makePixelsFromPattern((x,y)=> (y>10 && Math.abs(x-8)<4) ? "#00aaff" : "#00000000"),
    alien1: makePixelsFromPattern((x,y)=> { if (y<4) return "#00000000"; if (y<8 && Math.abs(x-7.5)<5) return "#ffcc00"; if (y>=8 && Math.abs(x-7.5)<6) return "#ff6600"; return "#00000000"; }),
    alien2: makePixelsFromPattern((x,y)=> { if (y<3) return "#00000000"; if (y<7 && Math.abs(x-7.5)<4) return "#8aff8a"; if (y>=7 && Math.abs(x-7.5)<5) return "#2fb824"; return "#00000000"; })
  };

  let chosenPlayer = null;
  let chosenEnemy = null;

  function cssToRgba(css){
    if (!css) return [0,0,0,0];
    if (css.startsWith("#")){
      const hex = css.replace("#","");
      if (hex.length===8) return [parseInt(hex.slice(0,2),16),parseInt(hex.slice(2,4),16),parseInt(hex.slice(4,6),16),parseInt(hex.slice(6,8),16)];
      if (hex.length===6) return [parseInt(hex.slice(0,2),16),parseInt(hex.slice(2,4),16),parseInt(hex.slice(4,6),16),255];
    }
    return [0,0,0,0];
  }

  function drawThumbFromPixels(pixels, canvasEl){
    const SIZE = 16;
    const small = document.createElement("canvas"); small.width = SIZE; small.height = SIZE;
    const sctx = small.getContext("2d");
    const imgData = sctx.createImageData(SIZE,SIZE);
    for (let i=0;i<SIZE*SIZE;i++){
      const col = pixels[i] || "#00000000";
      const rgba = cssToRgba(col);
      imgData.data[i*4+0]=rgba[0]; imgData.data[i*4+1]=rgba[1]; imgData.data[i*4+2]=rgba[2]; imgData.data[i*4+3]=rgba[3];
    }
    sctx.putImageData(imgData,0,0);
    const ctx = canvasEl.getContext("2d"); ctx.imageSmoothingEnabled=false; ctx.clearRect(0,0,canvasEl.width,canvasEl.height);
    ctx.drawImage(small,0,0,canvasEl.width,canvasEl.height);
  }

  function drawThumbFromImage(img, canvasEl) {
    const ctx = canvasEl.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0,0,canvasEl.width,canvasEl.height);
    ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, 0, 0, canvasEl.width, canvasEl.height);
  }

  function makeTileForFolderImage(name, imgSrc, type){
    const tile = document.createElement("div"); tile.className="skin-tile";
    const thumb = document.createElement("canvas"); thumb.width=64; thumb.height=64; thumb.className="skin-thumb";
    const img = new Image();
    img.src = imgSrc;
    img.onload = () => drawThumbFromImage(img, thumb);
    img.onerror = () => {
      const ctx = thumb.getContext("2d"); ctx.fillStyle="#222"; ctx.fillRect(0,0,thumb.width,thumb.height);
    };
    tile.appendChild(thumb);
    const label = document.createElement("div"); label.className="skin-label"; label.textContent = name;
    tile.appendChild(label);

    tile.addEventListener("click", () => {
      if (type === "player") {
        chosenPlayer = { name, imgSrc, type: "folder" };
        armarioPlayers.querySelectorAll(".skin-tile").forEach(t => t.classList.remove("selected"));
      } else {
        chosenEnemy = { name, imgSrc, type: "folder" };
        armarioEnemies.querySelectorAll(".skin-tile").forEach(t => t.classList.remove("selected"));
      }
      tile.classList.add("selected");
    });

    return tile;
  }

  function makeTile(name, pixels, type, isCustom=false){
    const tile = document.createElement("div"); tile.className="skin-tile";
    const thumb = document.createElement("canvas"); thumb.width=64; thumb.height=64; thumb.className="skin-thumb";
    drawThumbFromPixels(pixels, thumb);
    tile.appendChild(thumb);
    const label = document.createElement("div"); label.className="skin-label"; label.textContent = name;
    tile.appendChild(label);

    if (isCustom){
      const del = document.createElement("button"); del.className = "small"; del.textContent = "Eliminar";
      del.style.position = "absolute"; del.style.top = "6px"; del.style.right = "6px";
      del.addEventListener("click", (ev) => {
        ev.stopPropagation();
        let list = JSON.parse(localStorage.getItem("customSprites") || "[]");
        list = list.filter(s => !(s.name === name && s.type === type));
        localStorage.setItem("customSprites", JSON.stringify(list));
        populate(); // refrescar
      });
      tile.appendChild(del);
    }

    tile.addEventListener("click", () => {
      if (type === "player") {
        chosenPlayer = { name, pixels, type: "pixels" };
        armarioPlayers.querySelectorAll(".skin-tile").forEach(t => t.classList.remove("selected"));
      } else {
        chosenEnemy = { name, pixels, type: "pixels" };
        armarioEnemies.querySelectorAll(".skin-tile").forEach(t => t.classList.remove("selected"));
      }
      tile.classList.add("selected");
    });

    return tile;
  }

  async function fetchManifest() {
    try {
      const resp = await fetch('sprites/manifest.json', {cache: 'no-store'});
      if (!resp.ok) throw new Error('manifest no encontrado');
      return await resp.json();
    } catch (err) {
      console.warn('No se pudo leer sprites/manifest.json:', err);
      return { personajes: [], enemigos: [] };
    }
  }

  // populate separates containers but we will show/hide via filter
  async function populate(){
    armarioPlayers.innerHTML = ""; armarioEnemies.innerHTML = "";

    // add presets
    armarioPlayers.appendChild(makeTile("Predeterm.", Presets.default, "player"));
    armarioPlayers.appendChild(makeTile("Verde", Presets.shipGreen, "player"));
    armarioPlayers.appendChild(makeTile("Azul", Presets.shipBlue, "player"));

    armarioEnemies.appendChild(makeTile("Alien 1", Presets.alien1, "enemy"));
    armarioEnemies.appendChild(makeTile("Alien 2", Presets.alien2, "enemy"));

    // add custom from localStorage
    const list = JSON.parse(localStorage.getItem("customSprites") || "[]");
    list.filter(s=>s.type==="player").forEach(s => armarioPlayers.appendChild(makeTile(s.name, s.pixels, "player", true)));
    list.filter(s=>s.type==="enemy").forEach(s => armarioEnemies.appendChild(makeTile(s.name, s.pixels, "enemy", true)));

    // add folder images from manifest
    const manifest = await fetchManifest();
    (manifest.personajes||[]).forEach(rel => {
      const name = rel.split('/').pop();
      const src = 'sprites/' + rel;
      armarioPlayers.appendChild(makeTileForFolderImage(name, src, "player"));
    });
    (manifest.enemigos||[]).forEach(rel => {
      const name = rel.split('/').pop();
      const src = 'sprites/' + rel;
      armarioEnemies.appendChild(makeTileForFolderImage(name, src, "enemy"));
    });

    // default selection: first available
    const firstP = armarioPlayers.querySelector(".skin-tile");
    const firstE = armarioEnemies.querySelector(".skin-tile");
    if (firstP) firstP.click();
    if (firstE) firstE.click();

    // ensure filter UI initial state: show all
    showType(currentFilter);
  }

  // filter management
  let currentFilter = 'all'; // 'all' | 'player' | 'enemy'
  function setActiveFilterBtn() {
    filterAllBtn.classList.toggle('active', currentFilter === 'all');
    filterPlayersBtn.classList.toggle('active', currentFilter === 'player');
    filterEnemiesBtn.classList.toggle('active', currentFilter === 'enemy');

    filterAllBtn.setAttribute('aria-selected', currentFilter === 'all');
    filterPlayersBtn.setAttribute('aria-selected', currentFilter === 'player');
    filterEnemiesBtn.setAttribute('aria-selected', currentFilter === 'enemy');
  }

  function showType(type) {
    currentFilter = type;
    setActiveFilterBtn();
    if (type === 'all') {
      armarioPlayers.style.display = 'grid';
      armarioEnemies.style.display = 'grid';
    } else if (type === 'player') {
      armarioPlayers.style.display = 'grid';
      armarioEnemies.style.display = 'none';
    } else {
      armarioPlayers.style.display = 'none';
      armarioEnemies.style.display = 'grid';
    }
  }

  filterAllBtn.addEventListener('click', () => showType('all'));
  filterPlayersBtn.addEventListener('click', () => showType('player'));
  filterEnemiesBtn.addEventListener('click', () => showType('enemy'));

  selectAndPlayBtn.addEventListener("click", () => {
    if (chosenPlayer) localStorage.setItem("selectedPlayer", JSON.stringify(chosenPlayer));
    if (chosenEnemy) localStorage.setItem("selectedEnemy", JSON.stringify(chosenEnemy));
    location.href = "game.html";
  });

  // initial populate
  populate();

})();
