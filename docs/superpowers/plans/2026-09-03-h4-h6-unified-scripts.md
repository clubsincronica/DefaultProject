# H4-H6 Harmonic Meditations + Unified Script System

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create H4, H5, H6 meditation scripts and a unified system that generates both club-sincronica shorts and pipeline-viral meditations from shared data, incorporating "modo de contar" styles.

**Architecture:** 
- Extract kin data + "modo de contar" into a shared `kin-data.js` module
- Create H4/H5/H6 meditation scripts following H3 pattern
- Create a unified generator that produces both shorts scripts and meditation block definitions
- Ensure meditation voice content reflects the poetic style of each kin

**Tech Stack:** Node.js ESM, FFmpeg, existing tzolkin.js engine

---

## File Structure

| File | Responsibility |
|------|----------------|
| `pipeline-viral/scripts/kin-data.js` | Shared kin data: ranges, act names, modo de contar, drone frequencies |
| `pipeline-viral/scripts/meditar-h4.mjs` | H4 block definition (kins 13-16) |
| `pipeline-viral/scripts/meditar-h5.mjs` | H5 block definition (kins 17-20) |
| `pipeline-viral/scripts/meditar-h6.mjs` | H6 block definition (kins 21-24) |
| `pipeline-viral/scripts/generate-block.js` | Unified generator: kin data → meditation script + shorts script |
| `club-sincronica/scripts/short-from-kin.js` | Generate shorts script from shared kin data |

---

## Global Constraints

- Windows PowerShell 5.1, Node v22, FFmpeg 8.1.2
- All voice content in Spanish, "Alquimista Resiliente" voice
- Lemas must match tzolkin.js output exactly (no manual edits)
- Drone frequencies from chakra-freq.js (Hans Cousto Cosmic Octave)
- Act durations: Act 1=44s, Acts 2-5=126s each, Act 6=52s (total 600s)
- Publication schedule: Lun/Mié/Vie (covers 3-day windows)

---

### Task 1: Create Shared Kin Data Module

**Files:**
- Create: `pipeline-viral/scripts/kin-data.js`

**Interfaces:**
- Produces: `getBlockData(blockNumber)` → { kins[], actNames[], modoDeContar[], drone, dates[] }
- Produces: `getKinData(kinNumber)` → { seal, tone, signature, modoDeContar, actName }

- [ ] **Step 1: Create kin-data.js with H1-H6 definitions**

```javascript
// pipeline-viral/scripts/kin-data.js
// Shared kin data for both club-sincronica shorts and pipeline-viral meditations.

import { dayReading } from './tzolkin.js';

const BLOCKS = {
  1: {
    dates: ['2026-08-27', '2026-08-28', '2026-08-29', '2026-08-30'],
    centralDate: '2026-08-28',
    actNames: ['Respiración', 'Nutrir', 'Comunicar', 'Soñar', 'Atinar', 'Cierre'],
    modoDeContar: [
      'Haiku con agua',      // Kin 1 Dragón
      'Verso que se lleva',  // Kin 2 Viento
      'Soneto oscuro',       // Kin 3 Noche
      'Copla de siembra',    // Kin 4 Semilla
    ],
  },
  2: {
    dates: ['2026-08-31', '2026-09-01', '2026-09-02', '2026-09-03'],
    centralDate: '2026-09-01',
    actNames: ['Respiración', 'Instinto', 'Igualar', 'Realización', 'Arte', 'Cierre'],
    modoDeContar: [
      'Oda al vuelo',        // Kin 5 Serpiente
      'Romance marcial',     // Kin 6 Enlazador
      'Coplas de camino',    // Kin 7 Mano
      'Encantamiento',       // Kin 8 Estrella
    ],
  },
  3: {
    dates: ['2026-09-04', '2026-09-05', '2026-09-06', '2026-09-07'],
    centralDate: '2026-09-05',
    actNames: ['Respiración', 'Purificación', 'Corazón', 'Magia', 'Libre Albedrío', 'Cierre'],
    modoDeContar: [
      'Poema-piedra',        // Kin 9 Luna
      'Acertijo espejado',   // Kin 10 Perro
      'Anti-soneto',         // Kin 11 Mono
      'Letrilla luminosa',   // Kin 12 Humano
    ],
  },
  4: {
    dates: ['2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11'],
    centralDate: '2026-09-09',
    actNames: ['Respiración', 'Exploración', 'Encantamiento', 'Visión', 'Inteligencia', 'Cierre'],
    modoDeContar: [
      'Coplas de camino',    // Kin 13 Caminante del Cielo
      'Encantamiento',       // Kin 14 Mago
      'Oda al vuelo',        // Kin 15 Águila
      'Romance marcial',     // Kin 16 Guerrero
    ],
  },
  5: {
    dates: ['2026-09-12', '2026-09-13', '2026-09-14', '2026-09-15'],
    centralDate: '2026-09-13',
    actNames: ['Respiración', 'Navegación', 'Reflexión', 'Autogeneración', 'Iluminación', 'Cierre'],
    modoDeContar: [
      'Poema-piedra',        // Kin 17 Tierra
      'Acertijo espejado',   // Kin 18 Espejo
      'Anti-soneto',         // Kin 19 Tormenta
      'Letrilla luminosa',   // Kin 20 Sol
    ],
  },
  6: {
    dates: ['2026-09-16', '2026-09-17', '2026-09-18', '2026-09-19'],
    centralDate: '2026-09-17',
    actNames: ['Respiración', 'Nacimiento', 'Espíritu', 'Sueño', 'Florecimiento', 'Cierre'],
    modoDeContar: [
      'Haiku con agua',      // Kin 21 Dragón
      'Verso que se lleva',  // Kin 22 Viento
      'Soneto oscuro',       // Kin 23 Noche
      'Copla de siembra',    // Kin 24 Semilla
    ],
  },
};

export function getBlockData(blockNumber) {
  const block = BLOCKS[blockNumber];
  if (!block) throw new Error(`Block ${blockNumber} not defined`);
  
  const readings = block.dates.map((d) => {
    const [y, m, dd] = d.split('-').map(Number);
    return { fecha: d, ...dayReading(y, m, dd) };
  });
  
  return {
    ...block,
    kines: readings,
    drone: droneFreqForBlock(readings),
  };
}

export function getKinData(kinNumber) {
  // Find which block contains this kin
  for (const [blockNum, block] of Object.entries(BLOCKS)) {
    const readings = block.dates.map((d) => {
      const [y, m, dd] = d.split('-').map(Number);
      return dayReading(y, m, dd);
    });
    const kinData = readings.find((r) => r.kin === kinNumber);
    if (kinData) {
      const idx = readings.indexOf(kinData);
      return {
        ...kinData,
        modoDeContar: block.modoDeContar[idx],
        actName: block.actNames[idx + 1], // +1 because actNames[0] is 'Respiración'
        blockNumber: Number(blockNum),
      };
    }
  }
  throw new Error(`Kin ${kinNumber} not found in any block`);
}

export function getAllBlocks() {
  return Object.keys(BLOCKS).map(Number);
}
```

- [ ] **Step 2: Test kin-data.js**

```bash
node -e "import('./pipeline-viral/scripts/kin-data.js').then(m => {
  const h4 = m.getBlockData(4);
  console.log('H4 kins:', h4.kines.map(k => k.kin).join(', '));
  console.log('H4 actNames:', h4.actNames.join(', '));
  console.log('H4 modoDeContar:', h4.modoDeContar.join(', '));
  console.log('Kin 14 modo:', m.getKinData(14).modoDeContar);
})"
```

Expected: H4 kins 13-16, act names, modo de_contar for each kin

- [ ] **Step 3: Commit**

```bash
git add pipeline-viral/scripts/kin-data.js
git commit -m "feat: add shared kin-data.js module for H1-H6 blocks"
```

---

### Task 2: Create H4 Meditation Script

**Files:**
- Create: `pipeline-viral/scripts/meditar-h4.mjs`

**Interfaces:**
- Consumes: `kin-data.js getBlockData(4)`, `meditar.js buildAudio()`
- Produces: H4 audio mix + contexto.json

- [ ] **Step 1: Create meditar-h4.mjs**

```javascript
// scripts/meditar-h4.mjs
// Genera la pista de audio del bloque Harmonic 4 (4 kin / 6 actos):
//   kins 13-16 → fechas 2026-09-08 .. 2026-09-11
import { getBlockData } from './kin-data.js';
import { buildAudio } from './meditar.js';
import { droneFreqForBlock } from './journey-composer.js';

const block = getBlockData(4);

const ACT_DEFS = [
  { act: 1, nombre: block.actNames[0], durSec: 44 },
  { act: 2, nombre: block.actNames[1], durSec: 126 },   // Kin 13 (Caminante Cósmico)
  { act: 3, nombre: block.actNames[2], durSec: 126 },   // Kin 14 (Mago Magnético)
  { act: 4, nombre: block.actNames[3], durSec: 126 },   // Kin 15 (Águila Lunar)
  { act: 5, nombre: block.actNames[4], durSec: 126 },   // Kin 16 (Guerrero Eléctrico)
  { act: 6, nombre: block.actNames[5], durSec: 52 },
];

let acc = 0;
const acts = ACT_DEFS.map((a) => {
  const startSec = acc;
  acc += a.durSec;
  return { ...a, startSec, finSec: acc };
});

const drone = droneFreqForBlock(block.kines);
const act2Start = acts.find(a => a.act === 2).startSec;

const bedPlan = {
  targetRms: 0.035,
  stems: {
    campos: { entrance: 0, pan: '0.5+0.15*sin(2*PI*0.0003*t)' },
    grillos: { entrance: 0, pan: '0.5+0.25*sin(2*PI*0.0007*t)' },
    olas: { entrance: act2Start, targetRms: 0.02, pan: '0.5+0.2*sin(2*PI*0.001*t)' },
    rios: { entrance: 120 },
  },
};

const bloque = {
  centralDate: block.centralDate,
  kines: block.kines,
  journey: {
    drone,
    breathCycle: { in: 8, out: 8 },
    acts,
  },
};

const r = buildAudio(bloque, { bedPlan });
console.log(`Audio mezcla: ${r.mix} (${r.totalSec}s)`);
console.log(`Partes de voz: ${r.voiceParts.length}`);
console.log(`Kins: ${block.kines.map((k) => k.kin).join(', ')}`);
console.log(`Drone: kin ${drone.kin} · ${drone.chakraEs} ${drone.freq}Hz`);
console.log(`Modo de contar: ${block.modoDeContar.join(' → ')}`);
console.log('Listo para assemble-meditation.js 2026-09-09');
```

- [ ] **Step 2: Test H4 script (dry run)**

```bash
node pipeline-viral/scripts/meditar-h4.mjs
```

Expected: Audio mix generated, context JSON with H4 data

- [ ] **Step 3: Commit**

```bash
git add pipeline-viral/scripts/meditar-h4.mjs
git commit -m "feat: add H4 meditation script (kins 13-16)"
```

---

### Task 3: Create H5 Meditation Script

**Files:**
- Create: `pipeline-viral/scripts/meditar-h5.mjs`

**Interfaces:**
- Consumes: `kin-data.js getBlockData(5)`, `meditar.js buildAudio()`
- Produces: H5 audio mix + contexto.json

- [ ] **Step 1: Create meditar-h5.mjs**

```javascript
// scripts/meditar-h5.mjs
// Genera la pista de audio del bloque Harmonic 5 (4 kin / 6 actos):
//   kins 17-20 → fechas 2026-09-12 .. 2026-09-15
import { getBlockData } from './kin-data.js';
import { buildAudio } from './meditar.js';
import { droneFreqForBlock } from './journey-composer.js';

const block = getBlockData(5);

const ACT_DEFS = [
  { act: 1, nombre: block.actNames[0], durSec: 44 },
  { act: 2, nombre: block.actNames[1], durSec: 126 },   // Kin 17 (Tierra Autoexistente)
  { act: 3, nombre: block.actNames[2], durSec: 126 },   // Kin 18 (Espejo Entonado)
  { act: 4, nombre: block.actNames[3], durSec: 126 },   // Kin 19 (Tormenta Rítmica)
  { act: 5, nombre: block.actNames[4], durSec: 126 },   // Kin 20 (Sol Resonante)
  { act: 6, nombre: block.actNames[5], durSec: 52 },
];

let acc = 0;
const acts = ACT_DEFS.map((a) => {
  const startSec = acc;
  acc += a.durSec;
  return { ...a, startSec, finSec: acc };
});

const drone = droneFreqForBlock(block.kines);
const act2Start = acts.find(a => a.act === 2).startSec;

const bedPlan = {
  targetRms: 0.035,
  stems: {
    campos: { entrance: 0, pan: '0.5+0.15*sin(2*PI*0.0003*t)' },
    grillos: { entrance: 0, pan: '0.5+0.25*sin(2*PI*0.0007*t)' },
    olas: { entrance: act2Start, targetRms: 0.02, pan: '0.5+0.2*sin(2*PI*0.001*t)' },
    rios: { entrance: 120 },
  },
};

const bloque = {
  centralDate: block.centralDate,
  kines: block.kines,
  journey: {
    drone,
    breathCycle: { in: 8, out: 8 },
    acts,
  },
};

const r = buildAudio(bloque, { bedPlan });
console.log(`Audio mezcla: ${r.mix} (${r.totalSec}s)`);
console.log(`Partes de voz: ${r.voiceParts.length}`);
console.log(`Kins: ${block.kines.map((k) => k.kin).join(', ')}`);
console.log(`Drone: kin ${drone.kin} · ${drone.chakraEs} ${drone.freq}Hz`);
console.log(`Modo de contar: ${block.modoDeContar.join(' → ')}`);
console.log('Listo para assemble-meditation.js 2026-09-13');
```

- [ ] **Step 2: Test H5 script (dry run)**

```bash
node pipeline-viral/scripts/meditar-h5.mjs
```

Expected: Audio mix generated, context JSON with H5 data

- [ ] **Step 3: Commit**

```bash
git add pipeline-viral/scripts/meditar-h5.mjs
git commit -m "feat: add H5 meditation script (kins 17-20)"
```

---

### Task 4: Create H6 Meditation Script

**Files:**
- Create: `pipeline-viral/scripts/meditar-h6.mjs`

**Interfaces:**
- Consumes: `kin-data.js getBlockData(6)`, `meditar.js buildAudio()`
- Produces: H6 audio mix + contexto.json

- [ ] **Step 1: Create meditar-h6.mjs**

```javascript
// scripts/meditar-h6.mjs
// Genera la pista de audio del bloque Harmonic 6 (4 kin / 6 actos):
//   kins 21-24 → fechas 2026-09-16 .. 2026-09-19
import { getBlockData } from './kin-data.js';
import { buildAudio } from './meditar.js';
import { droneFreqForBlock } from './journey-composer.js';

const block = getBlockData(6);

const ACT_DEFS = [
  { act: 1, nombre: block.actNames[0], durSec: 44 },
  { act: 2, nombre: block.actNames[1], durSec: 126 },   // Kin 21 (Dragón Galáctico)
  { act: 3, nombre: block.actNames[2], durSec: 126 },   // Kin 22 (Viento Solar)
  { act: 4, nombre: block.actNames[3], durSec: 126 },   // Kin 23 (Noche Planetaria)
  { act: 5, nombre: block.actNames[4], durSec: 126 },   // Kin 24 (Semilla Espectral)
  { act: 6, nombre: block.actNames[5], durSec: 52 },
];

let acc = 0;
const acts = ACT_DEFS.map((a) => {
  const startSec = acc;
  acc += a.durSec;
  return { ...a, startSec, finSec: acc };
});

const drone = droneFreqForBlock(block.kines);
const act2Start = acts.find(a => a.act === 2).startSec;

const bedPlan = {
  targetRms: 0.035,
  stems: {
    campos: { entrance: 0, pan: '0.5+0.15*sin(2*PI*0.0003*t)' },
    grillos: { entrance: 0, pan: '0.5+0.25*sin(2*PI*0.0007*t)' },
    olas: { entrance: act2Start, targetRms: 0.02, pan: '0.5+0.2*sin(2*PI*0.001*t)' },
    rios: { entrance: 120 },
  },
};

const bloque = {
  centralDate: block.centralDate,
  kines: block.kines,
  journey: {
    drone,
    breathCycle: { in: 8, out: 8 },
    acts,
  },
};

const r = buildAudio(bloque, { bedPlan });
console.log(`Audio mezcla: ${r.mix} (${r.totalSec}s)`);
console.log(`Partes de voz: ${r.voiceParts.length}`);
console.log(`Kins: ${block.kines.map((k) => k.kin).join(', ')}`);
console.log(`Drone: kin ${drone.kin} · ${drone.chakraEs} ${drone.freq}Hz`);
console.log(`Modo de contar: ${block.modoDeContar.join(' → ')}`);
console.log('Listo para assemble-meditation.js 2026-09-17');
```

- [ ] **Step 2: Test H6 script (dry run)**

```bash
node pipeline-viral/scripts/meditar-h6.mjs
```

Expected: Audio mix generated, context JSON with H6 data

- [ ] **Step 3: Commit**

```bash
git add pipeline-viral/scripts/meditar-h6.mjs
git commit -m "feat: add H6 meditation script (kins 21-24)"
```

---

### Task 5: Create Unified Generator Script

**Files:**
- Create: `pipeline-viral/scripts/generate-block.js`

**Interfaces:**
- Consumes: `kin-data.js getBlockData()`
- Produces: Meditation script + shorts script for any block

- [ ] **Step 1: Create generate-block.js**

```javascript
// pipeline-viral/scripts/generate-block.js
// Unified generator: creates both meditation script and shorts script for a block.
// Usage: node scripts/generate-block.js <blockNumber> [--dry-run]

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getBlockData } from './kin-data.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CLUB_ROOT = join(ROOT, '..', 'club-sincronica');

const blockNum = Number(process.argv[2]);
const DRY = process.argv.includes('--dry-run');

if (!blockNum || blockNum < 1 || blockNum > 6) {
  console.error('Usage: node generate-block.js <blockNumber> [--dry-run]');
  process.exit(1);
}

const block = getBlockData(blockNum);

// Generate meditation script
const meditationScript = `// scripts/meditar-h${blockNum}.mjs
// Genera la pista de audio del bloque Harmonic ${blockNum} (4 kin / 6 actos):
//   kins ${block.kines[0].kin}-${block.kines[3].kin} → fechas ${block.dates[0]} .. ${block.dates[3]}
import { getBlockData } from './kin-data.js';
import { buildAudio } from './meditar.js';
import { droneFreqForBlock } from './journey-composer.js';

const block = getBlockData(${blockNum});

const ACT_DEFS = [
  { act: 1, nombre: block.actNames[0], durSec: 44 },
  { act: 2, nombre: block.actNames[1], durSec: 126 },   // Kin ${block.kines[0].kin} (${block.kines[0].kinName})
  { act: 3, nombre: block.actNames[2], durSec: 126 },   // Kin ${block.kines[1].kin} (${block.kines[1].kinName})
  { act: 4, nombre: block.actNames[3], durSec: 126 },   // Kin ${block.kines[2].kin} (${block.kines[2].kinName})
  { act: 5, nombre: block.actNames[4], durSec: 126 },   // Kin ${block.kines[3].kin} (${block.kines[3].kinName})
  { act: 6, nombre: block.actNames[5], durSec: 52 },
];

let acc = 0;
const acts = ACT_DEFS.map((a) => {
  const startSec = acc;
  acc += a.durSec;
  return { ...a, startSec, finSec: acc };
});

const drone = droneFreqForBlock(block.kines);
const act2Start = acts.find(a => a.act === 2).startSec;

const bedPlan = {
  targetRms: 0.035,
  stems: {
    campos: { entrance: 0, pan: '0.5+0.15*sin(2*PI*0.0003*t)' },
    grillos: { entrance: 0, pan: '0.5+0.25*sin(2*PI*0.0007*t)' },
    olas: { entrance: act2Start, targetRms: 0.02, pan: '0.5+0.2*sin(2*PI*0.001*t)' },
    rios: { entrance: 120 },
  },
};

const bloque = {
  centralDate: block.centralDate,
  kines: block.kines,
  journey: {
    drone,
    breathCycle: { in: 8, out: 8 },
    acts,
  },
};

const r = buildAudio(bloque, { bedPlan });
console.log(\`Audio mezcla: \${r.mix} (\${r.totalSec}s)\`);
console.log(\`Partes de voz: \${r.voiceParts.length}\`);
console.log(\`Kins: \${block.kines.map((k) => k.kin).join(', ')}\`);
console.log(\`Drone: kin \${drone.kin} · \${drone.chakraEs} \${drone.freq}Hz\`);
console.log(\`Modo de contar: \${block.modoDeContar.join(' → ')}\`);
console.log('Listo para assemble-meditation.js ' + block.centralDate);
`;

// Generate shorts script (for club-sincronica)
const shortsScript = `// Club Sincrónica - Shorts script for Block ${blockNum}
// Generated from shared kin-data.js
// Kins: ${block.kines.map(k => k.kin).join(', ')}

export const blockData = {
  blockNumber: ${blockNum},
  dates: ${JSON.stringify(block.dates)},
  centralDate: '${block.centralDate}',
  kines: ${JSON.stringify(block.kines.map(k => ({
    kin: k.kin,
    seal: k.seal,
    tone: k.tone,
    kinName: k.kinName,
    signature: k.signature,
    lema: k.lema,
    color: k.color,
  })), null, 2)},
  actNames: ${JSON.stringify(block.actNames)},
  modoDeContar: ${JSON.stringify(block.modoDeContar)},
};

// Generate individual short scripts
export function generateShortScript(kinIndex) {
  const kin = blockData.kines[kinIndex];
  const modo = blockData.modoDeContar[kinIndex];
  
  return {
    title: \`Kin \${kin.kin} \${kin.signature}\`,
    hook: \`¿Qué significa ser \${kin.seal}?\`,
    body: \`[Modo: \${modo}]\`,
    outro: kin.lema,
    hashtags: '#meditacion #asmr #kinmaya #tzolkin',
  };
}
`;

if (DRY) {
  console.log('=== DRY RUN ===');
  console.log('Meditation script:');
  console.log(meditationScript.slice(0, 200) + '...');
  console.log('\nShorts script:');
  console.log(shortsScript.slice(0, 200) + '...');
} else {
  // Write meditation script
  const meditPath = join(ROOT, 'scripts', `meditar-h${blockNum}.mjs`);
  writeFileSync(meditPath, meditationScript, 'utf8');
  console.log(\`Created: \${meditPath}\`);
  
  // Write shorts script
  const shortsDir = join(CLUB_ROOT, 'content', 'blocks');
  mkdirSync(shortsDir, { recursive: true });
  const shortsPath = join(shortsDir, \`block-\${blockNum}-shorts.js\`);
  writeFileSync(shortsPath, shortsScript, 'utf8');
  console.log(\`Created: \${shortsPath}\`);
}

console.log(\`\nBlock \${blockNum}:\`);
console.log(\`  Kins: \${block.kines.map(k => k.kin).join(', ')}\`);
console.log(\`  Dates: \${block.dates.join(' → ')}\`);
console.log(\`  Modo de contar: \${block.modoDeContar.join(' → ')}\`);
```

- [ ] **Step 2: Test generate-block.js**

```bash
node pipeline-viral/scripts/generate-block.js 4 --dry-run
node pipeline-viral/scripts/generate-block.js 5 --dry-run
node pipeline-viral/scripts/generate-block.js 6 --dry-run
```

Expected: Dry run output showing generated scripts

- [ ] **Step 3: Generate actual scripts**

```bash
node pipeline-viral/scripts/generate-block.js 4
node pipeline-viral/scripts/generate-block.js 5
node pipeline-viral/scripts/generate-block.js 6
```

Expected: Files created in pipeline-viral/scripts/ and club-sincronica/content/blocks/

- [ ] **Step 4: Commit**

```bash
git add pipeline-viral/scripts/generate-block.js
git add pipeline-viral/scripts/meditar-h4.mjs
git add pipeline-viral/scripts/meditar-h5.mjs
git add pipeline-viral/scripts/meditar-h6.mjs
git add club-sincronica/content/blocks/
git commit -m "feat: add unified block generator and H4-H6 scripts"
```

---

### Task 6: Update Pipeline State Documentation

**Files:**
- Modify: `PIPELINE-STATE.md` (root)

**Interfaces:**
- Consumes: All block data from kin-data.js
- Produces: Updated documentation with H4-H6 plans

- [ ] **Step 1: Add H4-H6 section to PIPELINE-STATE.md**

```markdown
## Pipeline Viral — H4-H6 Plan

### H4 (Kins 13-16) — Sep 8-11, 2026
- **Central Date:** 2026-09-09 (Miércoles)
- **Publication:** Viernes Sep 11
- **Kins:**
  - Kin 13: Caminante del Cielo Cósmico Rojo — Coplas de camino
  - Kin 14: Mago Magnético Blanco — Encantamiento
  - Kin 15: Águila Lunar Azul — Oda al vuelo
  - Kin 16: Guerrero Eléctrico Amarillo — Romance marcial
- **Drone:** 141.27 Hz (Garganta, Mercury)
- **Wavespell:** Dragón (Rojo), positions 13-16

### H5 (Kins 17-20) — Sep 12-15, 2026
- **Central Date:** 2026-09-13 (Miércoles)
- **Publication:** Miércoles Sep 16
- **Kins:**
  - Kin 17: Tierra Autoexistente Roja — Poema-piedra
  - Kin 18: Espejo Entonado Blanco — Acertijo espejado
  - Kin 19: Tormenta Rítmica Azul — Anti-soneto
  - Kin 20: Sol Resonante Amarillo — Letrilla luminosa
- **Drone:** 172.06 Hz (Corona, Platonic Year)
- **Wavespell:** Mago (Blanco), positions 4-7

### H6 (Kins 21-24) — Sep 16-19, 2026
- **Central Date:** 2026-09-17 (Miércoles)
- **Publication:** Viernes Sep 18
- **Kins:**
  - Kin 21: Dragón Galáctico Rojo — Haiku con agua
  - Kin 22: Viento Solar Blanco — Verso que se lleva
  - Kin 23: Noche Planetaria Azul — Soneto oscuro
  - Kin 24: Semilla Espectral Amarilla — Copla de siembra
- **Drone:** 141.27 Hz (Garganta, Mercury)
- **Wavespell:** Mago (Blanco), positions 8-11

### Energy Arc
- H1-H4: Onda Dragón (Rojo) — Nacimiento → Vitalidad → Corazón → Visión
- H5-H6: Onda Mago (Blanco) — Reflexión → Renacimiento
- H6 mirrors H1 at higher octaves (same seals, different tones)
```

- [ ] **Step 2: Commit**

```bash
git add PIPELINE-STATE.md
git commit -m "docs: add H4-H6 plan to pipeline state"
```

---

## Verification Checklist

After completing all tasks:

1. **Kin data integrity:** Verify kin-data.js returns correct data for all blocks
2. **Script generation:** Run generate-block.js for H4/H5/H6 and verify output
3. **Meditation scripts:** Test meditar-h4/h5/h6.mjs (dry run mode)
4. **Shorts integration:** Verify club-sincronica can import block data
5. **Documentation:** Confirm PIPELINE-STATE.md has complete H4-H6 plan

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-03-h4-h6-unified-scripts.md`.

**Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
