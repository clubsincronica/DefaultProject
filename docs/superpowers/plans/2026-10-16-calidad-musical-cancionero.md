# Calidad Musical cancionero-rojo v2 — Implementation Plan (automatizado)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar el "sonido de juguete barato" de je-veux y disritmia ANALIZANDO las referencias y TRASPLANTANDO instruments reales del Core Library al template — casi todo automatizado; el humano solo valida al final.

**Architecture:** (1) Research de arreglos originales → instrument-plan que mapea instrumentos de la referencia a presets `.adg` del Core Library (gzip XML). (2) Script TDD `swap-instruments.js` que clona el `InstrumentGroupDevice` de un `.adg` dentro del `template.als` con renumbering de IDs (técnica donor ya probada). (3) Los cambios de armonía/guía del plan v1 se conservan. Perc queda intocado (DrumRack transplant = riesgo de mapeo de pads).

**Tech Stack:** Node 22, Ableton Live 10 Suite, Core Library (packs instalados en `Music/_Serato_/Program/Live/Resources/Core Library/`), Strudel, ffprobe. Repo: `cancionero-rojo/` (commits AHÍ; solo cierre toca `PIPELINE-STATE.md` raíz).

## Global Constraints

- Roster (nombres EXACTOS): Mic Lead, Mic Guest, Keys, Guitar, Bass, Perc, Strings, Texture; returns A-Reverb, B-Delay; 16 escenas; 4/4.
- Builder SOLO toca clip content, scene names, tempo, locators. El swap de instruments va al **template** (no al builder): template → cada song lo clona al build.
- `build-template.js` NUNCA se re-ejecuta tras el swap manual/automatizado (lo pisaría).
- DNR #5: renumerar IDs de fragmentos trasplantados por clave `(nombre,id)`; `(nombre,id)` repetido DENTRO del fragmento = índice local → NO renumerar.
- DNR #9: el swap REEMPLAZA in-situ el `InstrumentGroupDevice` existente del track (mismo byte-offset, indent 7 verificado en Keys/Guitar/Bass); NUNCA se anida otro device dentro del rack. Assert `indent===7` obligatorio.
- DNR #14 stems: `cps = tempo/480`, duración exacta, `loopSec=0`. NO tocar.
- Cerrar Live ANTES de re-renderizar stems (EBUSY win32).
- `.als` y `.adg` = gzip (`1f8b`).
- Tests: `npm test` (bare `node --test`; nunca `node --test <dir>` en win32).
- Harness: `node ../alsopentest.mjs <archivo> 75` desde `cancionero-rojo/`; éxito = `OPEN_OK`. Gate tras CADA cambio que produzca `.als`.
- Tempos: je-veux 98, disritmia 136. NUNCA tempo de escena ≠ tempo de stems.
- Perc: NO swap en este plan (DrumBranchPreset del .adg ≠ DrumBranch del .als; mapeo C1/D1/F#1 en riesgo).

---

### Task 1: Análisis de referencia → instrument-plan (research)

**Files:**
- Create: `cancionero-rojo/INSTRUMENT-PLAN.md`

**Interfaces:**
- Consumes: spec `2026-09-24` (contexto songbook), web (arreglos de las canciones), Core Library inventario (ya mapeado abajo).
- Produces: decisión de preset por pista que consume Task 2 (`--map Keys=path.adg,...`).

- [x] **Step 1: Research de los arreglos originales** — HECHO (2026-10-16):
  - **"Je Veux" (Zaz, 2010, Kerredine Soltani)**: gypsy jazz/chanson — guitarra acústica rítmica ("la pompe"), contrabajo, violín, trompeta, percusión ligera. Discogs: Jazz/Pop/Folk, style Folk/Gypsy Jazz.
  - **"Disritmia" (original Martinho da Vila 1974, prod. Rildo Hora; referencia = cover Stefano Mota)**: samba de raíz — violão (nylon), cavaquinho (comping agudo), baixo, percussão brasileña (pandeiro/surdo). Original en Gm → nuestra versión Bm (+4), 136 BPM.
  - Rol por pista: Guitar = comping rítmico; Keys = chords/comping (rol cavaquinho/EP); Bass = bajo; Perc = kit intacto; Strings/Texture = pads de audio (stems, no se tocan).

- [x] **Step 2: Mapear cada instrumento a un `.adg` del Core Library** — VERIFICADO en disco inspeccionando el XML interno de cada `.adg` (device source + referencias de samples):
  - **Guitar → `Sounds\Guitar & Plucked\Nylon Concerto Guitar.adg`**: source `StringStudio` (modelado físico de cuerda) + AutoFilter + FilterEQ3 + Compressor2 + Reverb. **Cero samples externos** → sin riesgo de rutas rotas. Emula violão (samba) y acústica gypsy (chanson) en ambas canciones. Alt: `Campfire.adg`, `Steel Jazz Clean.adg`.
  - **Keys → `Sounds\Piano & Keys\Old School Roads.adg`**: source `LoungeLizard` (Rhodes modelado) + capa `StringStudio` + Phaser/Cabinet/FilterDelay. **Cero samples externos**. EP clásico = coherente con chanson y samba. Alt: `Grand Piano.adg` (multisample .aif — más realista pero con riesgo de rutas), `Stevie Wow.adg`.
  - **Bass → `Sounds\Bass\Mello Bass.adg`**: source `Operator` + Compressor2 + Pedal + Reverb. **Cero samples externos** (a diferencia de `Analogue Bass.adg` que referencia `MS Seq.aif`). Bajo redondo, versátil para Am/98 y Bm/136. Alt: `Analogue Bass.adg`, `Fat Leather Bass.adg`.
  - **Perc → SIN CAMBIO** (Drum Kit 1): `.adg` usa `DrumBranchPreset` ≠ `DrumBranch` del `.als` → riesgo de romper mapeo C1/D1/F#1. Swap de kit = futuro aparte.
  - **Constraint clave: las 2 canciones comparten UN template** → una sola paleta sirve ambas; el timbre por canción lo dan stems + guía.
  - Diagnóstico del "juguete": Keys actual = "A Hornet Pillow" (Synth Lead delgada), Guitar = "Velo-Rezzo Plucks" (synth), Bass = "Three Op Bass" — todos defaults del donor. Los reemplazos son instrumentos de diseño con comp+reverb propios.

- [x] **Step 3: Escribir `INSTRUMENT-PLAN.md`** con tabla: pista → instrumento referencia → preset `.adg` elegido → justificación → ruta absoluta del `.adg`.

- [x] **Step 4: Commit**

```bash
git add INSTRUMENT-PLAN.md
git commit -m "docs: instrument-plan (referencia -> Core Library presets)"
```

---

### Task 2: Script `swap-instruments.js` (TDD)

**Files:**
- Create: `cancionero-rojo/ableton/builder/swap-instruments.js`
- Test: `cancionero-rojo/test/swap-instruments.test.js`
- Fixture: `songs/_fixture/` (ya bloqueado de git; usar `ableton/.tmp/` para artefactos de test)

**Interfaces:**
- Consumes: `template.als` (gzip XML), `.adg` del Core Library (gzip XML con `<GroupDevicePreset><Device><InstrumentGroupDevice Id="0">…`).
- Produces: `swapInstruments(templatePath, mapping) → {xml, swapped[]}` — template con los `InstrumentGroupDevice` de Keys/Guitar/Bass reemplazados por los del `.adg`, IDs renumerados. Task 3 lo ejecuta.

- [ ] **Step 1: Escribir tests que fallan** — `test/swap-instruments.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { gunzipSync, gzipSync } from 'node:zlib';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { swapInstruments, extractTrackDevice, renumberIds } from '../ableton/builder/swap-instruments.js';

const ADG = String.raw`C:\Users\tom_w\Music\_Serato_\Program\Live\Resources\Core Library\Sounds\Piano & Keys\Grand Piano.adg`;
const TEMPLATE = 'ableton/template.als';

test('extractTrackDevice encuentra el InstrumentGroupDevice top-level de Keys', () => {
  const xml = gunzipSync(readFileSync(TEMPLATE)).toString('utf8');
  const dev = extractTrackDevice(xml, 'Keys');
  assert.ok(dev, 'Keys device existe');
  assert.ok(dev.includes('<InstrumentGroupDevice'), 'es InstrumentGroupDevice');
  assert.equal(dev.indent, 7, 'indent top-level (DNR #9)');
});

test('renumberIds offseta ids y AutomationTargets sin colisionar', () => {
  const frag = '<InstrumentGroupDevice Id="0"><On><AutomationTarget Id="5"/></On><Z><AutomationTarget Id="7"/></Z></InstrumentGroupDevice>';
  const out = renumberIds(frag, 100);
  assert.ok(out.includes('Id="100"'), 'device id offset');
  assert.ok(out.includes('Id="105"'), 'target 5 -> 105');
  assert.ok(out.includes('Id="107"'), 'target 7 -> 107');
});

test('swapInstruments reemplaza Keys y el XML sigue balanceado', () => {
  const xml = gunzipSync(readFileSync(TEMPLATE)).toString('utf8');
  const { xml: out, swapped } = swapInstruments(TEMPLATE, { Keys: ADG });
  assert.deepEqual(swapped, ['Keys']);
  assert.ok(out.includes('Grand Piano') || out.includes('Piano'), 'preset nuevo presente');
  // balance de tags InstrumentGroupDevice
  const open = (out.match(/<InstrumentGroupDevice\b/g) ?? []).length;
  const close = (out.match(/<\/InstrumentGroupDevice>/g) ?? []).length;
  assert.equal(open, close, 'tags balanceados');
});

test('swap conserva roster y escenas', () => {
  const { xml: out } = swapInstruments(TEMPLATE, { Guitar: ADG });
  for (const n of ['Mic Lead', 'Mic Guest', 'Keys', 'Guitar', 'Bass', 'Perc', 'Strings', 'Texture', 'A-Reverb', 'B-Delay']) {
    assert.ok(out.includes(`Value="${n}"`), `roster ${n} intacto`);
  }
  const scenes = (out.match(/<Scene Id=/g) ?? []).length;
  assert.equal(scenes, 16, '16 escenas');
});
```

- [ ] **Step 2: Verificar FAIL** — Run: `npm test` (workdir `cancionero-rojo/`). Expected: FAIL (module not found).

- [ ] **Step 3: Implementar `ableton/builder/swap-instruments.js`**:

```js
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync, gzipSync } from 'node:zlib';

export function indentOf(xml, pos) {
  const lineStart = xml.lastIndexOf('\n', pos) + 1;
  return pos - lineStart;
}

export function extractTrackDevice(xml, trackName) {
  const namePos = xml.indexOf(`<EffectiveName Value="${trackName}"`);
  if (namePos < 0) throw new Error(`track not found: ${trackName}`);
  const devPos = xml.indexOf('<InstrumentGroupDevice', namePos);
  if (devPos < 0) throw new Error(`no InstrumentGroupDevice for ${trackName}`);
  const indent = indentOf(xml, devPos);
  // balancear desde el open tag
  let depth = 0, i = devPos;
  const openRe = /<InstrumentGroupDevice\b/g, closeRe = /<\/InstrumentGroupDevice>/g;
  const slice = xml.slice(devPos);
  let end = -1;
  const tokRe = /<InstrumentGroupDevice\b[^>]*>|<\/InstrumentGroupDevice>/g;
  let m;
  while ((m = tokRe.exec(slice))) {
    if (m[0].startsWith('</')) { depth--; if (depth === 0) { end = devPos + m.index + m[0].length; break; } }
    else depth++;
  }
  if (end < 0) throw new Error(`unbalanced InstrumentGroupDevice for ${trackName}`);
  return { xml: xml.slice(devPos, end), indent, start: devPos, end };
}

export function renumberIds(fragXml, offset) {
  // ids numericos de Device + AutomationTarget/ cualquier Id="N" numerico
  return fragXml.replace(/Id="(\d+)"/g, (m, n) => `Id="${parseInt(n, 10) + offset}"`);
}

export function maxNumericId(xml) {
  let max = 0;
  for (const m of xml.matchAll(/Id="(\d+)"/g)) {
    const n = parseInt(m[1], 10);
    if (n > max) max = n;
  }
  return max;
}

export function extractAdgDevice(adgPath) {
  const xml = gunzipSync(readFileSync(adgPath)).toString('utf8');
  const devPos = xml.indexOf('<InstrumentGroupDevice');
  if (devPos < 0) throw new Error(`no InstrumentGroupDevice in ${adgPath}`);
  // balancear (mismo tokRe)
  let depth = 0, end = -1;
  const tokRe = /<InstrumentGroupDevice\b[^>]*>|<\/InstrumentGroupDevice>/g;
  const slice = xml.slice(devPos);
  let m;
  while ((m = tokRe.exec(slice))) {
    if (m[0].startsWith('</')) { depth--; if (depth === 0) { end = devPos + m.index + m[0].length; break; } }
    else depth++;
  }
  if (end < 0) throw new Error(`unbalanced adg device in ${adgPath}`);
  return xml.slice(devPos, end);
}

export function swapInstruments(templatePath, mapping) {
  let xml = gunzipSync(readFileSync(templatePath)).toString('utf8');
  const swapped = [];
  // procesar de atrás adelante para no desalinear offsets
  const entries = Object.entries(mapping).sort((a, b) => {
    const pa = xml.indexOf(`<EffectiveName Value="${a[0]}"`);
    const pb = xml.indexOf(`<EffectiveName Value="${b[0]}"`);
    return pb - pa;
  });
  for (const [track, adgPath] of entries) {
    const cur = extractTrackDevice(xml, track);
    const adgDev = extractAdgDevice(adgPath);
    const offset = maxNumericId(xml) + 10;
    const renum = renumberIds(adgDev, offset);
    if (cur.indent !== 7) throw new Error(`DNR#9: ${track} indent=${cur.indent} (esperado 7)`);
    xml = xml.slice(0, cur.start) + renum + xml.slice(cur.end);
    swapped.push(track);
  }
  return { xml, swapped: swapped.reverse() };
}

export function writeSwapped(templatePath, mapping, outPath = templatePath) {
  const { xml, swapped } = swapInstruments(templatePath, mapping);
  writeFileSync(outPath, gzipSync(Buffer.from(xml, 'utf8')));
  console.log(`swapped: ${swapped.join(', ')} -> ${outPath}`);
  return swapped;
}

if (process.argv[1] && process.argv[1].endsWith('swap-instruments.js')) {
  const args = process.argv.slice(2);
  const template = args[0] ?? 'ableton/template.als';
  const mapping = {};
  for (const a of args.slice(1)) {
    const [k, v] = a.split('=');
    mapping[k] = v;
  }
  if (!Object.keys(mapping).length) { console.error('uso: node swap-instruments.js [template] Track=path.adg ...'); process.exit(1); }
  writeSwapped(template, mapping);
}
```

- [ ] **Step 4: Verificar PASS** — Run: `npm test`. Expected: los 4 tests nuevos PASS + suite completa verde.

- [ ] **Step 5: Commit**

```bash
git add ableton/builder/swap-instruments.js test/swap-instruments.test.js
git commit -m "feat: swap-instruments.js — trasplanta InstrumentGroupDevice de .adg al template"
```

---

### Task 3: Aplicar el swap al template + rebuild (ejecución)

**Files:**
- Modify: `ableton/template.als`
- Modify: `ableton/TEMPLATE-RECIPE.md:10-16`

**Interfaces:**
- Consumes: `INSTRUMENT-PLAN.md` (Task 1), `swapInstruments` (Task 2).
- Produces: template con instruments de mejor calidad; cada build los clona.

- [ ] **Step 1: Backup + swap** (workdir `cancionero-rojo/`):

```powershell
Copy-Item ableton/template.als ableton/template-pre-swap.als.bak
node ableton/builder/swap-instruments.js ableton/template.als "Keys=C:\Users\tom_w\Music\_Serato_\Program\Live\Resources\Core Library\Sounds\Piano & Keys\Old School Roads.adg" "Guitar=C:\Users\tom_w\Music\_Serato_\Program\Live\Resources\Core Library\Sounds\Guitar & Plucked\Nylon Concerto Guitar.adg" "Bass=C:\Users\tom_w\Music\_Serato_\Program\Live\Resources\Core Library\Sounds\Bass\Mello Bass.adg"
```

(Rutas exactas según `INSTRUMENT-PLAN.md`; PowerShell: las rutas con `&` van entre comillas como están arriba.)

- [ ] **Step 2: Gate XML** — Run: `node -e "import('fast-xml-parser').then(({XMLValidator})=>{const{readFileSync}=require('fs');const{gunzipSync}=require('zlib');const x=gunzipSync(readFileSync('ableton/template.als')).toString();console.log(XMLValidator.validate(x)===true?'XML OK':'XML INVALID');})"`. Expected: `XML OK`.

- [ ] **Step 3: Gate harness** — Run: `node ../alsopentest.mjs ableton/template.als 75`. Expected: `OPEN_OK`. Si CRASH: `Copy-Item ableton/template-pre-swap.als.bak ableton/template.als -Force`, revisar indent/DNR#9, reintentar 1 instrumento por vez.

- [ ] **Step 4: Actualizar `TEMPLATE-RECIPE.md` §3** — documentar los instruments nuevos (reemplazar líneas 10-16) y agregar advertencia: **NO re-ejecutar `build-template.js` tras el swap**.

- [ ] **Step 5: Rebuild ambas canciones**

```powershell
node ableton/builder/build.js songs/je-veux --dry-run   # missing: []
node ableton/builder/build.js songs/je-veux
node ableton/builder/build.js songs/disritmia --dry-run
node ableton/builder/build.js songs/disritmia
node ../alsopentest.mjs songs/je-veux/output/je-veux.als 75
node ../alsopentest.mjs songs/disritmia/output/disritmia.als 75
```

- [ ] **Step 6: Commit**

```bash
git add ableton/template.als ableton/TEMPLATE-RECIPE.md
git commit -m "feat(template): instruments trasplantados del Core Library (Keys=EP, Guitar=nylon, Bass=analogue)"
```

---

### Task 4: Guía melódica — trompeta GM → guitarra nylon (TDD)

**Files:**
- Modify: `scripts/gen-guide.js:8`
- Modify: `test/gen-guide.test.js:20-22`

**Interfaces:**
- Consumes: `GUIDE_PROGRAM` exportado.
- Produces: `GUIDE_PROGRAM = 24` (GM Acoustic Guitar nylon). El timbre audible lo define el Guitar del template (Task 3); el byte del SMF es el fallback y debe ser coherente.

- [ ] **Step 1: Test que falla** — reemplazar en `test/gen-guide.test.js`:

```js
test('guide program is GM nylon guitar', () => {
  assert.equal(GUIDE_PROGRAM, 24);
});
```

- [ ] **Step 2: FAIL** — Run: `npm test`. Expected: FAIL (recibe 56).

- [ ] **Step 3: Implementar** — `scripts/gen-guide.js:8`:

```js
export const GUIDE_PROGRAM = 24; // GM Acoustic Guitar nylon (fallback SMF coherente con bossa/samba; el timbre lo da el device Guitar del template)
```

- [ ] **Step 4: PASS** — Run: `npm test`.

- [ ] **Step 5: Regenerar guías**

```powershell
node scripts/gen-guide.js --song je-veux
node scripts/gen-guide.js --song disritmia
```

- [ ] **Step 6: Rebuild + harness** (mismos comandos que Task 3 Step 5).

- [ ] **Step 7: Commit**

```bash
git add scripts/gen-guide.js test/gen-guide.test.js songs/je-veux/clips songs/disritmia/clips
git commit -m "feat(guide): GM program 56->24 nylon + regen guias"
```

---

### Task 5: Voicings extendidos — tonalidad clara (TDD + regen)

**Files:**
- Modify: `songs/disritmia/chords.json`
- Modify: `songs/je-veux/chords.json`
- Modify: `songs/disritmia/patterns/strings.js:6-17`
- Modify: `songs/disritmia/patterns/texture.js:6-17`
- Modify: `songs/je-veux/patterns/strings.js:7-13`
- Modify: `songs/je-veux/patterns/texture.js:6-12`
- Modify: `test/patterns-chords.test.js:30`

**Interfaces:**
- Consumes: `voicing()` (soporta m7/7/9/m9/maj7/6), `parseChord` gen-guide (soporta extensiones).
- Produces: armonía extendida; MIDI keys/bass y stems regenerados.

- [ ] **Step 1: Reescribir `songs/disritmia/chords.json`**:

```json
{
  "sections": {
    "Intro": { "bars": ["Bm7", "E7", "Bm7", "E7"] },
    "Verse": { "bars": ["Bm7", "E7", "Bm7", "E7", "Bm7", "E7", "F#m7", "B7", "F#m7", "B7", "Em7", "G", "Em7", "Em7", "F#7", "Bm7"] },
    "Chorus": { "bars": ["Em7", "A7", "D", "G", "C#m7", "F#7", "B7", "B7", "Em7", "A7", "D", "G", "C#m7", "F#7", "B7", "Bm7"] },
    "Outro": { "bars": ["Em7", "F#7", "Bm7", "Bm7"] }
  }
}
```

- [ ] **Step 2: Reescribir `songs/je-veux/chords.json`**:

```json
{
  "sections": {
    "Intro": { "bars": ["Am7", "G", "F", "E7"] },
    "Verse": { "bars": ["Am7", "G", "F", "C", "E7", "Am7", "G", "F", "C", "E7", "Am7", "G", "F", "C", "F", "G"] },
    "Chorus": { "bars": ["Am7", "G", "F", "G", "E7", "Am7", "G", "F", "G", "E7", "Am7", "G", "F", "G", "E7", "Am7"] },
    "Outro": { "bars": ["Am7", "G", "F", "E7"] }
  }
}
```

- [ ] **Step 3: FAIL (rojo real)** — Run: `npm test`. Expected: FAIL patterns-chords (`rootOfBar('Bm7')`='Bm7' ≠ 'B').

- [ ] **Step 4: Fix helper `test/patterns-chords.test.js:30`**:

```js
function rootOfBar(bar) { return bar.match(/^([A-G][#b]?)/)[1]; }
```

- [ ] **Step 5: Verificar** — Run: `npm test`. Expected: FAIL ahora en pads con símbolos sin VOICING (`<undefined>` → 'U').

- [ ] **Step 6: Agregar voicings a `songs/disritmia/patterns/strings.js`** — extendir `VOICING` (mantener G, D):

```js
const VOICING = {
  Bm: 'b3 d4 f#4', Bm7: 'b3 d4 f#4 a4',
  E: 'e3 g#3 b3', E7: 'e3 g#3 b3 d4',
  'F#m': 'f#3 a3 c#4', 'F#m7': 'f#3 a3 c#4 e4',
  B: 'b3 d#4 f#4', B7: 'b3 d#4 f#4 a4',
  Em: 'e3 g3 b3', Em7: 'e3 g3 b3 d4',
  G: 'g3 b3 d4',
  A: 'a3 c#4 e4', A7: 'a3 c#4 e4 g4',
  D: 'd3 f#3 a3',
  'C#m': 'c#4 e4 g#4', 'C#m7': 'c#4 e4 g#4 b4',
  'F#': 'f#3 a#3 c#4', 'F#7': 'f#3 a#3 c#4 e4',
};
```

- [ ] **Step 7: Agregar voicings a `songs/disritmia/patterns/texture.js`**:

```js
const VOICING = {
  Bm: 'b2 f#3', Bm7: 'b2 f#3',
  E: 'e2 b2', E7: 'e2 b2',
  'F#m': 'f#2 c#3', 'F#m7': 'f#2 c#3',
  B: 'b2 f#3', B7: 'b2 f#3',
  Em: 'e2 b2', Em7: 'e2 b2',
  G: 'g2 d3',
  A: 'a2 e3', A7: 'a2 e3',
  D: 'd3 a3',
  'C#m': 'c#3 g#3', 'C#m7': 'c#3 g#3',
  'F#': 'f#2 c#3', 'F#7': 'f#2 c#3',
};
```

- [ ] **Step 8: Agregar voicings a `songs/je-veux/patterns/strings.js`**:

```js
const VOICING = {
  Am: 'a3 c4 e4', Am7: 'a3 c4 e4 g4',
  G: 'g3 b3 d4',
  F: 'f3 a3 c4',
  C: 'c4 e4 g4',
  E: 'e3 g#3 b3', E7: 'e3 g#3 b3 d4',
};
```

- [ ] **Step 9: Agregar voicings a `songs/je-veux/patterns/texture.js`**:

```js
const VOICING = {
  Am: 'a2 e3', Am7: 'a2 e3',
  G: 'g2 d3',
  F: 'f2 c3',
  C: 'c3 g3',
  E: 'e2 b2', E7: 'e2 b2',
};
```

- [ ] **Step 10: PASS** — Run: `npm test`. Expected: suite completa verde.

- [ ] **Step 11: Regenerar MIDI** (je-veux: keys en `orca/`, sin bass; disritmia: raíz, con bass; perc omitido):

```powershell
foreach ($sc in @(@('Intro',4),@('Verse',16),@('Chorus',16),@('Outro',4))) {
  node scripts/orca-to-mid.js --grid "songs/je-veux/orca/keys--$($sc[0]).grid" --chords "songs/je-veux/chords.json" --scene $sc[0] --totalBars $sc[1] --tempo 98 --out "songs/je-veux/clips/keys--$($sc[0]).mid"
}
foreach ($part in 'keys','bass') {
  foreach ($sc in @(@('Intro',4),@('Verse',16),@('Chorus',16),@('Outro',4))) {
    node scripts/orca-to-mid.js --grid "songs/disritmia/$($part)--$($sc[0]).grid" --chords "songs/disritmia/chords.json" --scene $sc[0] --totalBars $sc[1] --tempo 136 --out "songs/disritmia/clips/$($part)--$($sc[0]).mid"
  }
}
node scripts/gen-guide.js --song je-veux
node scripts/gen-guide.js --song disritmia
```

Expected: 12 `wrote` orca + 8 gen-guide, sin WARN `grid rows`.

- [ ] **Step 12: Cerrar Live + re-render stems**

```powershell
node scripts/render-stems.js je-veux
node scripts/render-stems.js disritmia
```

- [ ] **Step 13: Verificar duraciones** — ffprobe ±0.05s: je-veux Intro 9.796 / Verse 39.184; disritmia Intro 7.059 / Verse 28.235 (`strings--*.wav`).

- [ ] **Step 14: Rebuild + harness** (Task 3 Step 5).

- [ ] **Step 15: Commit**

```bash
git add songs/je-veux songs/disritmia test/patterns-chords.test.js
git commit -m "feat(harmony): voicings extendidos 7as/m7 + regen MIDI/stems"
```

---

### Task 6: Escucha humana única + cierre

**Files:**
- Modify: `PIPELINE-STATE.md` (repo raíz)

**Interfaces:**
- Consumes: outputs de Tasks 3-5.
- Produces: aceptación o lista de ajustes finales; estado actualizado.

- [ ] **Step 1 [HUMAN]: Escuchar ambas canciones completas** en Live 10 (único paso humano del plan). Si algo suena mal: anotar sección + pista culpable.

- [ ] **Step 2: Ajuste fino si hace falta** — playbook por agravio:
  - Guía desalineada: `python scripts/extract-melody.py songs/<slug> --offset-beats N` → gen-guide → rebuild.
  - Pads de una sección: ajustar SOLO esa VOICING en `patterns/*.js` + `render-stems` (Live cerrado) → rebuild.
  - Timbre: cambiar preset en `INSTRUMENT-PLAN.md` + re-swap SOLO esa pista (`swap-instruments.js` con backup) → rebuild.
  - Gates tras cada ajuste: `npm test` → `alsopentest`.

- [ ] **Step 3: Actualizar `PIPELINE-STATE.md`** — milestone + DNRs nuevos ("NO re-ejecutar build-template.js tras swap"; "rootOfBar test helper matchea `^([A-G][#b]?)` para extensiones"; "swap-instruments.js = forma canónica de cambiar instruments del template").

- [ ] **Step 4: Commit raíz**

```bash
git add PIPELINE-STATE.md
git commit -m "docs(state): cancionero calidad musical v2 (swap auto + voicings)"
```
