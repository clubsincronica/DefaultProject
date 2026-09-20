# Task 5: Create Unified Generator Script

**Files:**
- Create: `pipeline-viral/scripts/generate-block.js`

**Interfaces:**
- Consumes: `kin-data.js getBlockData()`
- Produces: Meditation script + shorts script for any block

## Steps

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

## Global Constraints

- Windows PowerShell 5.1, Node v22, FFmpeg 8.1.2
- All voice content in Spanish, "Alquimista Resiliente" voice
- Lemas must match tzolkin.js output exactly (no manual edits)
- Drone frequencies from chakra-freq.js (Hans Cousto Cosmic Octave)
- Act durations: Act 1=44s, Acts 2-5=126s each, Act 6=52s (total 600s)
- Publication schedule: Lun/Mié/Vie (covers 3-day windows)
