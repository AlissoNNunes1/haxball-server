// Script para aplicar paleta da comunidade CHA em todos os mapas .hbs
// Comentarios em pt-BR sem acentos por padrao
const fs = require('fs').promises;
const path = require('path');

const palette = {
  primary: '6A2DE4',
  light: 'FFFFFF',
  dark: '1C1C1C',
  deep: '1A0E32',
};

function applyPalette(map) {
  map.traits = map.traits || {};

  // Tracos principais com paleta coerente
  map.traits.line = { ...(map.traits.line || {}), color: palette.light };
  map.traits.goalNet = { ...(map.traits.goalNet || {}), color: palette.primary };
  map.traits.goalPost = { ...(map.traits.goalPost || {}), color: palette.primary };
  map.traits.kickOffBarrier = {
    ...(map.traits.kickOffBarrier || {}),
    color: palette.deep,
  };

  // Ajustar segmentos conhecidos
  if (Array.isArray(map.segments)) {
    map.segments = map.segments.map((seg) => {
      if (!seg || typeof seg !== 'object') return seg;
      const next = { ...seg };
      if (seg.trait === 'line') next.color = palette.light;
      if (seg.trait === 'goalNet') next.color = palette.primary;
      return next;
    });
  }

  // Ajustar discos (ex: traves, marcadores)
  if (Array.isArray(map.discs)) {
    map.discs = map.discs.map((disc) => {
      if (!disc || typeof disc !== 'object') return disc;
      const next = { ...disc };
      if (disc.trait === 'goalPost') next.color = palette.primary;
      if (disc.trait === 'marker' && !disc.color) next.color = palette.primary;
      return next;
    });
  }

  // Ajustar traits que tenham cor direta
  if (map.traits) {
    for (const key of Object.keys(map.traits)) {
      const trait = map.traits[key];
      if (trait && typeof trait === 'object' && 'color' in trait) {
        if (!trait.color) trait.color = palette.light;
      }
    }
  }

  return map;
}

async function processMaps() {
  const mapsDir = path.resolve(__dirname, '..', 'shared', 'maps');
  const entries = await fs.readdir(mapsDir, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.hbs'))
    .map((e) => path.join(mapsDir, e.name));

  for (const file of files) {
    try {
      const raw = await fs.readFile(file, 'utf8');
      const map = JSON.parse(raw);
      const updated = applyPalette(map);
      const formatted = JSON.stringify(updated, null, 2);
      await fs.writeFile(file, formatted + '\n', 'utf8');
      console.log('OK ' + path.basename(file));
    } catch (err) {
      console.error('Falha em ' + file + ': ' + (err && err.message ? err.message : String(err)));
    }
  }
}

processMaps();

//   __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
