# Beds Strudel Oct 1-14 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Componer 14 patterns Strudel (kin 36-49), renderizar 14 beds de 120s y re-mezclar los 13 videos Oct 1-14 para eliminar el fallback estridente `etereo-espejo.wav`.

**Architecture:** Un pattern por kin en `content/patterns/<sello>-<kin>.js` (export `{code, cps, loopSec, sampleRate, lfo}`), render con `scripts/strudel-render.js` a `assets/audio/beds/YYYY-MM-DD-<sello>-<kin>.wav` (120s uniforme), y `scripts/assemble.js` re-mezcla (findBed selecciona por fecha). Sin cambios de código en ningún script existente.

**Tech Stack:** Strudel (`@strudel/core`, headless vía `scripts/strudel-render.js`), ffmpeg/ffprobe, Node 22 en Windows PowerShell.

**Spec:** `docs/superpowers/specs/2026-09-29-beds-strudel-oct-1-14-design.md`

## Global Constraints

- Synths: solo `sine`/`triangle` (saw solo en bajo con cutoff ≤600). Sin campanas/glocks.
- Capas brillantes: `gain ≤ 0.05` y `cutoff ≤ 3000`.
- Pads: attack ≥0.05, release ≥1s. Máximo 4 voces en `stack(...)`.
- `cps` 0.4-0.6; `loopSec` 8-16; LFO `period 16-32, min 0.5-0.6, depth 0.3`.
- Export shape: `{ code, cps, loopSec, sampleRate: 44100, lfo }`.
- `<...>` (rotación por ciclo) SOLO como contenido completo de `note("...")`, nunca embebido en medio de una secuencia.
- Nombres exactos: pattern `content/patterns/<sello>-<kin>.js` (sello en minúsculas); bed `assets/audio/beds/<fecha>-<sello>-<kin>.wav`.
- Directorio de trabajo: `C:\Users\tom_w\Documents\Default Project\club-sincronica`.
- Ejecución en PowerShell 5.1: sin `&&`; usar `; if ($?) { ... }`.
- Bed 120s uniforme para los 14 (video más largo = 117.7s; `amix duration=first` trunca).

---

### Task 1: Pattern guerrero-36 + smoke test del toolchain

**Files:**
- Create: `content/patterns/guerrero-36.js`
- Output temporal: `assets/audio/beds/_smoke-5s.wav` (se borra al final)

**Interfaces:**
- Produces: valida que `strudel-render.js` importa un pattern ESM, renderiza WAV y aplica LFO. Los Tasks 2-3 dependen de que este paso pase.

- [ ] **Step 1: Escribir el pattern**

```js
// Kin 36 - Guerrero Planetario (2026-10-01) — CLASE: rítmico
// Mi menor: pulso firme (triangle) + bajo marcha + brillo contenido.
// Versión suave de guerrero-256: gains bajos, capa alta cutoff ≤2600.
export const code = `
stack(
  note("e2 ~ e2 ~ e2 ~ e2 ~").s("triangle").gain(0.11)
    .attack(0.03).decay(0.25).sustain(0.35).release(0.5)
    .cutoff(700),
  note("e2 ~ ~ g2 ~ ~ b2 ~ ~ a2 ~ ~").s("sine").gain(0.08)
    .attack(0.3).decay(0.4).sustain(0.4).release(1.6)
    .cutoff(400),
  note("e3 ~ g3 ~ b3 ~ a3 ~ g3 ~ e3 ~").s("triangle").gain(0.07)
    .attack(0.12).decay(0.2).sustain(0.4).release(1.4)
    .cutoff(1400).pan(sine.slow(5).range(-0.2, 0.2)),
  note("[e4 ~ ~ ~] ~ [g4 ~ ~ ~] ~").s("sine").gain(0.035)
    .attack(0.02).decay(0.15).sustain(0.1).release(0.5)
    .cutoff(2600)
).slow(2)
`;
export const cps = 0.5;
export const loopSec = 16;
export const sampleRate = 44100;
export const lfo = { period: 24, depth: 0.3, min: 0.55, max: 1.0, phase: 0.2 };
```

- [ ] **Step 2: Smoke render 5s**

Run: `node scripts/strudel-render.js content/patterns/guerrero-36.js 5 assets/audio/beds/_smoke-5s.wav`
Expected: `OK`/`->` ruta de salida, exit 0. Si falla con `SalatRepl`/exports → reparar `package.json` de `@kabelsalat/web` (AGENTS.md) y reintentar.

- [ ] **Step 3: Verificar WAV sin clipping**

Run: `ffmpeg -hide_banner -i assets/audio/beds/_smoke-5s.wav -af volumedetect -f null NUL 2>&1 | Select-String "max_volume|mean_volume"`
Expected: `max_volume` < 0 dB (objeto: ≤ -1 dB), `mean_volume` presente.

- [ ] **Step 4: Borrar smoke y commitear**

Run: `Remove-Item assets/audio/beds/_smoke-5s.wav; git add content/patterns/guerrero-36.js; git commit -m "feat(music): pattern guerrero-36 (rítmico, Mi menor) + smoke strudel OK"`
Expected: commit creado.

---

### Task 2: Patterns rítmicos restantes (5)

**Files:**
- Create: `content/patterns/tormenta-39.js`, `content/patterns/sol-40.js`, `content/patterns/semilla-44.js`, `content/patterns/serpiente-45.js`, `content/patterns/mano-47.js`

**Interfaces:**
- Consumes: toolchain validado en Task 1 (mismo shape de export).
- Produces: 5 patterns listos para render en Task 4.

- [ ] **Step 1: tormenta-39.js** (10-04, GAP, Do menor oscuro syncopado)

```js
// Kin 39 - Tormenta Cósmica (2026-10-04, GAP) — CLASE: rítmico
// Do menor: groove oscuro syncopado, sin agudos (cutoff ≤1100).
export const code = `
stack(
  note("c2 ~ ~ c2 ~ g2 ~ ~").s("triangle").gain(0.12)
    .attack(0.02).decay(0.3).sustain(0.35).release(0.5).cutoff(650),
  note("~ ~ g1 ~ ~ ~ c2 ~").s("sine").gain(0.09)
    .attack(0.05).decay(0.4).sustain(0.4).release(1.2).cutoff(350),
  note("c3 ~ eb3 ~ g3 ~ eb3 ~").s("sine").gain(0.06)
    .attack(0.15).decay(0.3).sustain(0.4).release(1.2)
    .cutoff(sine.slow(7).range(500, 1100)).pan(sine.slow(6).range(-0.3, 0.3))
).slow(2)
`;
export const cps = 0.5;
export const loopSec = 16;
export const sampleRate = 44100;
export const lfo = { period: 28, depth: 0.3, min: 0.5, max: 1.0, phase: 0.4 };
```

- [ ] **Step 2: sol-40.js** (10-05, Do mayor, acento magnético en downbeat)

```js
// Kin 40 - Sol Magnético (2026-10-05) — CLASE: rítmico
// Do mayor cálido: el acento magnético cae en el 1 (chord [c2 c3]).
export const code = `
stack(
  note("[c2 c3] ~ ~ ~ [g2 g3] ~ ~ ~").s("triangle").gain(0.11)
    .attack(0.03).decay(0.35).sustain(0.35).release(0.7).cutoff(750),
  note("c3 e3 g3 e3 c3 e3 g3 e3").s("sine").gain(0.065)
    .attack(0.1).decay(0.25).sustain(0.4).release(1.0)
    .cutoff(1300).pan(sine.slow(9).range(-0.25, 0.25)),
  note("g4 ~ ~ e4 ~ ~ c4 ~ ~").s("triangle").gain(0.045)
    .attack(0.06).decay(0.3).sustain(0.25).release(1.2).cutoff(2400),
  note("c5 ~ ~ ~ ~ ~ ~ ~").s("sine").gain(0.03)
    .attack(0.01).decay(0.6).sustain(0).release(0.8).cutoff(2800)
).slow(2)
`;
export const cps = 0.5;
export const loopSec = 16;
export const sampleRate = 44100;
export const lfo = { period: 24, depth: 0.3, min: 0.6, max: 1.0, phase: 0.0 };
```

- [ ] **Step 3: semilla-44.js** (10-09, refrán: 5 notas + silencio)

```js
// Kin 44 - Semilla Entonada (2026-10-09) — CLASE: rítmico
// Copla de siembra: frase de 5 notas que vuelve (refrán) + silencio.
export const code = `
stack(
  note("d2 ~ d2 ~ ~ g2 ~ ~").s("triangle").gain(0.11)
    .attack(0.03).decay(0.3).sustain(0.35).release(0.6).cutoff(700),
  note("d3 e3 g3 a3 g3 ~ ~ ~").s("sine").gain(0.07)
    .attack(0.12).decay(0.3).sustain(0.4).release(1.2)
    .cutoff(1300).pan(sine.slow(10).range(-0.25, 0.25)),
  note("~ ~ [g2 d3] ~ ~ ~ [a2 e3] ~").s("sine").gain(0.06)
    .attack(0.05).decay(0.35).sustain(0.35).release(1.0).cutoff(900),
  note("d5 ~ ~ ~ ~ ~ ~ ~").s("triangle").gain(0.035)
    .attack(0.02).decay(0.8).sustain(0).release(1.0).cutoff(2400)
).slow(2)
`;
export const cps = 0.5;
export const loopSec = 16;
export const sampleRate = 44100;
export const lfo = { period: 26, depth: 0.3, min: 0.55, max: 1.0, phase: 0.6 };
```

- [ ] **Step 4: serpiente-45.js** (10-10, bajo serpenteante Do menor)

```js
// Kin 45 - Serpiente Rítmica (2026-10-10) — CLASE: rítmico
// Tono Rítmico: bajo que se enrosca (línea descendente + cutoff que respira).
export const code = `
stack(
  note("c2 eb2 g2 eb2 c2 bb1 g1 bb1").s("sine").gain(0.10)
    .attack(0.08).decay(0.3).sustain(0.45).release(0.6)
    .cutoff(sine.slow(6).range(350, 800)),
  note("~ g2 ~ c3 ~ g2 ~ eb2").s("triangle").gain(0.07)
    .attack(0.04).decay(0.25).sustain(0.35).release(0.6).cutoff(650),
  note("c4 ~ bb3 ~ g3 ~ eb3 ~").s("sine").gain(0.05)
    .attack(0.15).decay(0.3).sustain(0.4).release(1.0)
    .cutoff(1400).pan(sine.slow(8).range(-0.4, 0.4)),
  note("[c3 g3] ~ ~ ~ ~ ~ ~ ~").s("sine").gain(0.04)
    .attack(0.5).decay(1).sustain(0.4).release(2).cutoff(1000)
).slow(2)
`;
export const cps = 0.5;
export const loopSec = 16;
export const sampleRate = 44100;
export const lfo = { period: 30, depth: 0.3, min: 0.55, max: 1.0, phase: 0.3 };
```

- [ ] **Step 5: mano-47.js** (10-12, pulso de tarea 4/4)

```js
// Kin 47 - Mano Galáctica (2026-10-12) — CLASE: rítmico
// Coplas de trabajo: pulso 4/4 de tarea + melodía de "contar y armar".
export const code = `
stack(
  note("g2 g2 g2 g2").s("triangle").gain(0.10)
    .attack(0.03).decay(0.25).sustain(0.35).release(0.5).cutoff(700),
  note("~ g2 ~ g2").s("sine").gain(0.07)
    .attack(0.02).decay(0.2).sustain(0.3).release(0.5).cutoff(450),
  note("d4 d4 e4 g4 e4 d4 b3 d4").s("sine").gain(0.065)
    .attack(0.1).decay(0.25).sustain(0.4).release(1.0)
    .cutoff(1500).pan(sine.slow(7).range(-0.25, 0.25)),
  note("g4 ~ ~ ~ d4 ~ ~ ~").s("triangle").gain(0.04)
    .attack(0.08).decay(0.4).sustain(0.3).release(1.2).cutoff(2200)
).slow(2)
`;
export const cps = 0.5;
export const loopSec = 16;
export const sampleRate = 44100;
export const lfo = { period: 22, depth: 0.3, min: 0.6, max: 1.0, phase: 0.1 };
```

- [ ] **Step 6: Smoke render 5s de cada uno**

Run (por cada archivo): `node scripts/strudel-render.js content/patterns/<archivo>.js 5 assets/audio/beds/_smoke-5s.wav`
Expected: exit 0 en los 5. ante fallo: leer mensaje, corregir el pattern (solo ese), reintentar.

- [ ] **Step 7: Borrar smoke y commitear**

Run: `Remove-Item assets/audio/beds/_smoke-5s.wav; git add content/patterns/tormenta-39.js content/patterns/sol-40.js content/patterns/semilla-44.js content/patterns/serpiente-45.js content/patterns/mano-47.js; git commit -m "feat(music): 5 patterns rítmicos oct (tormenta-39, sol-40, semilla-44, serpiente-45, mano-47)"`

---

### Task 3: Patterns ambientes (8)

**Files:**
- Create: `content/patterns/tierra-37.js`, `content/patterns/espejo-38.js`, `content/patterns/dragon-41.js`, `content/patterns/viento-42.js`, `content/patterns/noche-43.js`, `content/patterns/enlazador-46.js`, `content/patterns/estrella-48.js`, `content/patterns/luna-49.js`

**Interfaces:**
- Consumes: toolchain validado en Task 1.
- Produces: 8 patterns listos para render en Task 4.

- [ ] **Step 1: tierra-37.js** (10-02, drone terroso sol2+quinta)

```js
// Kin 37 - Tierra Espectral (2026-10-02) — CLASE: ambiente
// Drone terroso: sol2 + quinta, cutoff 300-600, disolución lenta.
export const code = `
stack(
  note("[g2]").s("sine").gain(0.12)
    .attack(2.5).decay(3).sustain(0.7).release(4)
    .cutoff(sine.slow(11).range(300, 600)),
  note("[d3]").s("sine").gain(0.07)
    .attack(3).decay(4).sustain(0.6).release(5)
    .cutoff(500),
  note("<g3 b3 d4 b3>").s("triangle").gain(0.045)
    .attack(1.2).decay(2).sustain(0.5).release(3)
    .cutoff(1200).pan(sine.slow(9).range(-0.35, 0.35))
).slow(4)
`;
export const cps = 0.42;
export const loopSec = 16;
export const sampleRate = 44100;
export const lfo = { period: 28, depth: 0.3, min: 0.55, max: 1.0, phase: 0.5 };
```

- [ ] **Step 2: espejo-38.js** (10-03, dos voces espejadas la2/la3)

```js
// Kin 38 - Espejo Cristal (2026-10-03) — CLASE: ambiente
// Acertijo espejado: dos voces (la2 ↔ la3) alternan y se responden, pan opuesto.
export const code = `
stack(
  note("<a2 ~ ~ a3>").s("sine").gain(0.10)
    .attack(1.5).decay(2).sustain(0.6).release(3)
    .cutoff(sine.slow(8).range(350, 700)).pan(-0.4),
  note("<~ a3 ~ a2>").s("sine").gain(0.10)
    .attack(1.5).decay(2).sustain(0.6).release(3)
    .cutoff(sine.slow(8).range(700, 350)).pan(0.4),
  note("<e4 c4 e4 c4>").s("triangle").gain(0.04)
    .attack(1.0).decay(1.5).sustain(0.4).release(2.5)
    .cutoff(1500).pan(sine.slow(13).range(-0.5, 0.5))
).slow(2)
`;
export const cps = 0.45;
export const loopSec = 16;
export const sampleRate = 44100;
export const lfo = { period: 26, depth: 0.3, min: 0.55, max: 1.0, phase: 0.7 };
```

- [ ] **Step 3: dragon-41.js** (10-06, gotas pentatónicas + río)

```js
// Kin 41 - Dragón Lunar (2026-10-06) — CLASE: ambiente
// Haiku con agua: gotas (decays cortos) sobre río de fondo (cutoff que fluye).
export const code = `
stack(
  note("c3 ~ ~ g2 ~ ~ d3 ~").s("sine").gain(0.05)
    .attack(0.005).decay(0.6).sustain(0).release(0.9)
    .cutoff(2200).pan(sine.slow(7).range(-0.5, 0.5)),
  note("~ e3 ~ ~ g3 ~ ~ b3").s("sine").gain(0.04)
    .attack(0.005).decay(0.5).sustain(0).release(0.8)
    .cutoff(2500).pan(sine.slow(9).range(0.5, -0.5)),
  note("[c2]").s("sine").gain(0.10)
    .attack(3).decay(4).sustain(0.7).release(5)
    .cutoff(sine.slow(12).range(250, 550)),
  note("<f3 g3 a3 g3>").s("triangle").gain(0.035)
    .attack(1.5).decay(2).sustain(0.5).release(3).cutoff(900)
).slow(2)
`;
export const cps = 0.45;
export const loopSec = 16;
export const sampleRate = 44100;
export const lfo = { period: 24, depth: 0.3, min: 0.55, max: 1.0, phase: 0.2 };
```

- [ ] **Step 4: viento-42.js** (10-07, pad de aire sin percusión)

```js
// Kin 42 - Viento Eléctrico (2026-10-07) — CLASE: ambiente
// Verso que se lleva: sin percusión, el cutoff "sopla" (sine.slow), desapego.
export const code = `
stack(
  note("[a3]").s("sine").gain(0.09)
    .attack(3.5).decay(4).sustain(0.65).release(5)
    .cutoff(sine.slow(10).range(400, 2000)),
  note("[e4]").s("sine").gain(0.06)
    .attack(4).decay(4).sustain(0.6).release(5)
    .cutoff(sine.slow(13).range(600, 2400)).pan(sine.slow(8).range(-0.5, 0.5)),
  note("<d5 b4 e5 b4>").s("sine").gain(0.035)
    .attack(1.8).decay(2.5).sustain(0.4).release(3.5)
    .cutoff(sine.slow(7).range(800, 2200)).pan(sine.slow(6).range(0.6, -0.6))
).slow(4)
`;
export const cps = 0.42;
export const loopSec = 16;
export const sampleRate = 44100;
export const lfo = { period: 30, depth: 0.3, min: 0.55, max: 1.0, phase: 0.8 };
```

- [ ] **Step 5: noche-43.js** (10-08, GAP, pad oscuro grave)

```js
// Kin 43 - Noche Autoexistente (2026-10-08, GAP) — CLASE: ambiente
// Soneto oscuro: fa2 + re2 (re menor), cutoff 250-450, intimidad.
export const code = `
stack(
  note("[f2]").s("sine").gain(0.13)
    .attack(3).decay(4).sustain(0.75).release(5)
    .cutoff(sine.slow(14).range(250, 450)),
  note("[d2]").s("sine").gain(0.10)
    .attack(4).decay(4).sustain(0.7).release(5)
    .cutoff(300),
  note("<a3 c4 f4 c4>").s("sine").gain(0.04)
    .attack(2.5).decay(3).sustain(0.5).release(4)
    .cutoff(sine.slow(11).range(400, 900)).pan(sine.slow(12).range(-0.35, 0.35)),
  note("c5 ~ ~ ~ ~ ~ ~ ~").s("sine").gain(0.025)
    .attack(0.8).decay(1.5).sustain(0.1).release(2.5).cutoff(1800)
).slow(4)
`;
export const cps = 0.4;
export const loopSec = 16;
export const sampleRate = 44100;
export const lfo = { period: 32, depth: 0.3, min: 0.5, max: 1.0, phase: 0.9 };
```

- [ ] **Step 6: enlazador-46.js** (10-11, call & response la3/la4)

```js
// Kin 46 - Enlazador de Mundos Resonante (2026-10-11) — CLASE: ambiente
// Eco en espejo: verso (la3, pan izq) y contraverso (la4, pan der) se responden.
export const code = `
stack(
  note("a3 ~ ~ ~").s("sine").gain(0.08)
    .attack(1.2).decay(1.5).sustain(0.5).release(2.5)
    .cutoff(1100).pan(-0.45),
  note("~ ~ a4 ~").s("sine").gain(0.06)
    .attack(1.2).decay(1.5).sustain(0.5).release(2.5)
    .cutoff(1400).pan(0.45),
  note("<e4 f#4 e4 f#4>").s("triangle").gain(0.045)
    .attack(1.5).decay(2).sustain(0.5).release(3)
    .cutoff(1300).pan(sine.slow(9).range(-0.3, 0.3)),
  note("[a2]").s("sine").gain(0.10)
    .attack(3).decay(3).sustain(0.7).release(4).cutoff(350)
).slow(4)
`;
export const cps = 0.42;
export const loopSec = 16;
export const sampleRate = 44100;
export const lfo = { period: 28, depth: 0.3, min: 0.55, max: 1.0, phase: 0.5 };
```

- [ ] **Step 7: estrella-48.js** (10-13, destellos gain 0.035 cutoff 2800)

```js
// Kin 48 - Estrella Solar (2026-10-13) — CLASE: ambiente
// Letrilla estelar: pad cálido + destellos CONTENIDOS (gain 0.035, cutoff 2800).
export const code = `
stack(
  note("[c2 g2]").s("sine").gain(0.10)
    .attack(3).decay(4).sustain(0.7).release(4.5)
    .cutoff(sine.slow(10).range(350, 700)),
  note("<e4 g4 c5 g4>").s("sine").gain(0.05)
    .attack(1.8).decay(2.5).sustain(0.5).release(3)
    .cutoff(1600).pan(sine.slow(8).range(-0.4, 0.4)),
  note("[e5 g5] ~ ~ [c6 e5] ~ ~ [g5 c6] ~").s("sine").gain(0.035)
    .attack(0.01).decay(0.5).sustain(0).release(0.7)
    .cutoff(2800).pan(sine.slow(11).range(0.6, -0.6))
).slow(4)
`;
export const cps = 0.4;
export const loopSec = 16;
export const sampleRate = 44100;
export const lfo = { period: 26, depth: 0.3, min: 0.6, max: 1.0, phase: 0.4 };
```

- [ ] **Step 8: luna-49.js** (10-14, canción de cuna 3/4)

```js
// Kin 49 - Luna Planetaria (2026-10-14) — CLASE: ambiente
// Canción de cuna: arpegio mecedor (slow 3 = 3/4) en sines cálidos.
export const code = `
stack(
  note("a2 e3 a3 e3 a2 e3").s("sine").gain(0.075)
    .attack(0.4).decay(0.6).sustain(0.4).release(1.8)
    .cutoff(sine.slow(9).range(600, 1200)).pan(sine.slow(6).range(-0.3, 0.3)),
  note("[a1 a2]").s("sine").gain(0.11)
    .attack(2).decay(3).sustain(0.6).release(4).cutoff(320),
  note("c5 b4 a4 ~ ~ ~").s("sine").gain(0.045)
    .attack(0.8).decay(1.5).sustain(0.3).release(2.5).cutoff(2000)
).slow(3)
`;
export const cps = 0.45;
export const loopSec = 12;
export const sampleRate = 44100;
export const lfo = { period: 30, depth: 0.3, min: 0.55, max: 1.0, phase: 0.6 };
```

- [ ] **Step 9: Smoke render 5s de cada uno**

Run (por cada archivo): `node scripts/strudel-render.js content/patterns/<archivo>.js 5 assets/audio/beds/_smoke-5s.wav`
Expected: exit 0 en los 8. ante fallo: leer mensaje, corregir solo ese pattern, reintentar.

- [ ] **Step 10: Borrar smoke y commitear**

Run: `Remove-Item assets/audio/beds/_smoke-5s.wav; git add content/patterns/tierra-37.js content/patterns/espejo-38.js content/patterns/dragon-41.js content/patterns/viento-42.js content/patterns/noche-43.js content/patterns/enlazador-46.js content/patterns/estrella-48.js content/patterns/luna-49.js; git commit -m "feat(music): 8 patterns ambientes oct (tierra-37..luna-49)"`

---

### Task 4: Render de los 14 beds de 120s + verificación

**Files:**
- Create: `assets/audio/beds/2026-10-01-guerrero-36.wav` … `2026-10-14-luna-49.wav` (14 WAV, ~21MB c/u)

**Interfaces:**
- Consumes: los 14 patterns de Tasks 1-3.
- Produces: beds `YYYY-MM-DD-*.wav` que `findBed()` (assemble.js:58) selecciona por fecha.

- [ ] **Step 1: Mapeo fecha→pattern (tabla de render)**

| Fecha | pattern | bed salida |
|---|---|---|
| 2026-10-01 | guerrero-36 | 2026-10-01-guerrero-36.wav |
| 2026-10-02 | tierra-37 | 2026-10-02-tierra-37.wav |
| 2026-10-03 | espejo-38 | 2026-10-03-espejo-38.wav |
| 2026-10-04 | tormenta-39 | 2026-10-04-tormenta-39.wav |
| 2026-10-05 | sol-40 | 2026-10-05-sol-40.wav |
| 2026-10-06 | dragon-41 | 2026-10-06-dragon-41.wav |
| 2026-10-07 | viento-42 | 2026-10-07-viento-42.wav |
| 2026-10-08 | noche-43 | 2026-10-08-noche-43.wav |
| 2026-10-09 | semilla-44 | 2026-10-09-semilla-44.wav |
| 2026-10-10 | serpiente-45 | 2026-10-10-serpiente-45.wav |
| 2026-10-11 | enlazador-46 | 2026-10-11-enlazador-46.wav |
| 2026-10-12 | mano-47 | 2026-10-12-mano-47.wav |
| 2026-10-13 | estrella-48 | 2026-10-13-estrella-48.wav |
| 2026-10-14 | luna-49 | 2026-10-14-luna-49.wav |

- [ ] **Step 2: Render loop (14 comandos)**

Run: para cada fila, `node scripts/strudel-render.js content/patterns/<pattern>.js 120 assets/audio/beds/<bed>`
Expected: 14 WAV creados, exit 0 en todos (loopSec corto + aloop en memoria ≈ segundos por archivo).

- [ ] **Step 3: Verificar duración 120s y sin clipping**

Run: por cada bed, `ffprobe -v error -show_entries format=duration -of csv=p=0 <bed>` y `ffmpeg -hide_banner -i <bed> -af volumedetect -f null NUL 2>&1 | Select-String max_volume`
Expected: duración ≈ 120.0s (±0.5) y `max_volume` ≤ -1 dB en los 14. Fallos → re-render solo de ese pattern (revisar gains).

- [ ] **Step 4: Commit (solo si los WAVs no están gitignored)**

Run: `git check-ignore assets/audio/beds/2026-10-01-guerrero-36.wav`
Expected: si imprime la ruta → ignorado, no commitear (fin de task). Si NO imprime nada → `git add assets/audio/beds/2026-10-*.wav && git commit -m "feat(music): 14 beds strudel oct 1-14 (120s)"`.

---

### Task 5: Re-assemble de los 13 videos con sus beds

**Files:**
- Modify (regenera): `content/output/2026-10-XX/video-preview.mp4` (13 días; NO Oct 13)

**Interfaces:**
- Consumes: beds del Task 4; `assemble.js` con `findBed()` + `computeBedVol()` (normalize -42dB, BED_VOL 0.38, fades).
- Produces: videos finales con música propia. Frames/render NO se tocan.

- [ ] **Step 1: Assemble loop (13 días)**

Run: `1..14 | ForEach-Object { $d = "2026-10-" + $_.ToString("00"); if ($d -eq '2026-10-13') { return }; node scripts/assemble.js $d 2>&1 | Select-Object -Last 2; if ($LASTEXITCODE -ne 0) { Write-Output "FAIL $d" } }`
Expected: 13 × `Video listo` y cada log de música muestra el bed nuevo (p.ej. `música (2026-10-01-guerrero-36.wav)`), NUNCA `etereo-espejo.wav`.

- [ ] **Step 2: Gate — ningún video usa el fallback**

Run: grep en la salida del Step 1 (o re-logging): para cada día, `node scripts/assemble.js <fecha>` NO se re-ejecuta; en su lugar verificar `Select-String` sobre los logs capturados, o constatar por ffprobe que el stream de audio existe. Check manual: si algún log mostró `etereo-espejo` → investigar por qué `findBed` no encontró el bed (naming/fecha) y corregir el nombre del archivo (no el código).

- [ ] **Step 3: ffprobe de los 13 videos**

Run: por cada fecha, `ffprobe -v error -show_entries stream=codec_type -show_entries format=duration -of json <mp4>`
Expected: streams `video+audio` en los 13 y duración ≈ la del video previo a la re-mezcla ±1s (la música con `amix duration=first` no alarga el video; solo se recorta el silencio final, como en el lote original). Comparar contra la duración reportada en el paso H del lote de producción.

---

### Task 6: Actualizar PIPELINE-STATE y commitear

**Files:**
- Modify: `C:\Users\tom_w\Documents\Default Project\PIPELINE-STATE.md` (sección club-sincronica: hito + Issues abiertos)

**Interfaces:**
- Consumes: resultados de Tasks 4-5.
- Produces: estado vivo actualizado para la próxima sesión (regla de continuidad de AGENTS.md raíz).

- [ ] **Step 1: Editar PIPELINE-STATE.md**

Cambios exactos:
- En la línea del hito "LOTE PRODUCCION OCT 1-14": añadir "Música: 14 beds Strudel por sello (mixto rítmico/ambiente) re-mezclados 2026-09-29 — los 13 videos ya NO usan etereo-espejo (spec `docs/superpowers/specs/2026-09-29-beds-strudel-oct-1-14-design.md`)."
- En "Issues abiertos": eliminar/actualizar el issue "Música Strudel pendiente para kins 36-49" → RESUELTO 2026-09-29 (14 patterns + 14 beds; escucha final pendiente).
- Añadir issue: "Escucha final de los 13 beds de octubre (Alquimista) — si algún día suena mal, re-componer SOLO ese pattern y re-render su bed + assemble."

- [ ] **Step 2: Commit en el repo raíz**

Run (workdir = repo raíz): `git add PIPELINE-STATE.md; git commit -m "docs(pipeline-state): beds strudel oct 1-14 completados (14 patterns, 13 videos re-mezclados, sin etereo-espejo)"`

- [ ] **Step 3: Informe final al Alquimista**

Resumen: 14 patterns+beds, 13 videos re-mezclados (log por fecha), Oct 13 pendiente de regrabar (bed listo), escucha final = gate humano.
