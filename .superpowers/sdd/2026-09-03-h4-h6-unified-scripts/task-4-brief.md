# Task 4: Create H6 Meditation Script

**Files:**
- Create: `pipeline-viral/scripts/meditar-h6.mjs`

**Interfaces:**
- Consumes: `kin-data.js getBlockData(6)`, `meditar.js buildAudio()`
- Produces: H6 audio mix + contexto.json

## Steps

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

## Global Constraints

- Windows PowerShell 5.1, Node v22, FFmpeg 8.1.2
- All voice content in Spanish, "Alquimista Resiliente" voice
- Lemas must match tzolkin.js output exactly (no manual edits)
- Drone frequencies from chakra-freq.js (Hans Cousto Cosmic Octave)
- Act durations: Act 1=44s, Acts 2-5=126s each, Act 6=52s (total 600s)
- Publication schedule: Lun/Mié/Vie (covers 3-day windows)
