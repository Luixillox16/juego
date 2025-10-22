
const fs = require('fs');
const path = require('path');

const base = path.join(__dirname);
const personajesDir = path.join(base, 'personajes');
const enemigosDir = path.join(base, 'enemigos');
const outFile = path.join(base, 'manifest.json');

function listImages(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => /\.(png|jpg|jpeg|gif|webp)$/i.test(f))
    .map(f => path.posix.join(path.basename(dir), f)); // relative to sprites/
}

const manifest = {
  personajes: listImages(personajesDir),
  enemigos: listImages(enemigosDir),
  generated_at: new Date().toISOString()
};

fs.writeFileSync(outFile, JSON.stringify(manifest, null, 2), 'utf8');
console.log('manifest.json generado en', outFile);
console.log('personajes:', manifest.personajes.length, 'enemigos:', manifest.enemigos.length);
