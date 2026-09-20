# Task 1: Create Shared Kin Data Module

**Files:**
- Create: `pipeline-viral/scripts/kin-data.js`

**Interfaces:**
- Produces: `getBlockData(blockNumber)` → { kins[], actNames[], modoDeContar[], drone, dates[] }
- Produces: `getKinData(kinNumber)` → { seal, tone, signature, modoDeContar, actName }

## Steps

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
        actName: block.actNames[idx + 1],
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

## Global Constraints

- Windows PowerShell 5.1, Node v22, FFmpeg 8.1.2
- All voice content in Spanish, "Alquimista Resiliente" voice
- Lemas must match tzolkin.js output exactly (no manual edits)
- Drone frequencies from chakra-freq.js (Hans Cousto Cosmic Octave)
- Act durations: Act 1=44s, Acts 2-5=126s each, Act 6=52s (total 600s)
- Publication schedule: Lun/Mié/Vie (covers 3-day windows)
