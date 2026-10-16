# Calidad Musical cancionero-rojo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar el "sonido de juguete barato" de je-veux y disritmia: instrumentos mejores en el template, guía melódica sin trompeta GM, voicings extendidos que dejen clara la tonalidad, y verificación de tempo por escucha.

**Architecture:** Dos carriles de intervención sobre el pipeline existente: (1) swap MANUAL de instruments en `template.als` vía Live 10 (el builder NUNCA toca devices — el swap entra al template y de ahí fluye a cada song al hacer build); (2) cambios de datos/código en `chords.json` + patterns + `gen-guide.js` que enriquecen armonía y guía, con regeneración de MIDI/stems y rebuild. Sin nuevas dependencias.

**Tech Stack:** Node 22 (`node --test`), Ableton Live 10 Suite, Strudel (via `pipeline-viral/scripts/strudel-render.js`), ffmpeg/ffprobe, PowerShell 5.1. Repo de trabajo: `cancionero-rojo/` (repo git propio, commitear AHÍ; solo el cierre toca `PIPELINE-STATE.md` del repo raíz).

## Global Constraints

- Roster del template (nombres EXACTOS): Mic Lead, Mic Guest, Keys, Guitar, Bass, Perc, Strings, Texture; returns A-Reverb, B-Delay; 16 escenas; 4/4.
- El builder SOLO toca: clip content, scene names, tempo, locators. NUNCA devices/mappings/routing/mics/returns/master.
- `build-template.js` es la ÚNICA fuente de `ableton/template.als` — pero el swap de instruments de este plan es MANUAL en Live y va DESPUÉS; **NUNCA re-ejecutar `build-template.js` después del swap** (lo pisaría).
- `.als` = gzip (`1f8b`); `Expand-Archive` de PS5.1 lo rechaza.
- Stems: `cps = tempo/480` (ley del engine: `cycle = 0.5/cps`); duración EXACTA de sección; `loopSec=0`. Verificado por `scripts/render-stems.js` — NO tocar esa ley.
- Cerrar Live 10 ANTES de re-renderizar stems (EBUSY en win32 bloquea WAVs).
- Tests: `npm test` desde `cancionero-rojo/` (`node --test` bare — NUNCA `node --test <dir>` en win32).
- Harness de apertura: `node ../alsopentest.mjs <archivo.als> 75` desde `cancionero-rojo/` — gate OBLIGATORIO tras cada cambio que produzca un `.als`. Éxito = `OPEN_OK`.
- PowerShell: arrays con `@($x) * $n` (nunca `'str' * n`); outputs con regex ASCII-safe (sin acentos en Select-String).
- Melodía guía: sin Demucs. `extract-melody.py` (pYIN) es la única excepción aprobada.
- Tempo por canción: je-veux = 98, disritmia = 136. NUNCA tempo de escena distinto al de los stems.

---

### Task 1: Diagnóstico sonoro por sección (humano + doc)

**Files:**
- Create: `cancionero-rojo/DIAGNOSTICO-SONIDO.md`

**Interfaces:**
- Consumes: `songs/je-veux/output/je-veux.als`, `songs/disritmia/output/disritmia.als` (ya buildados).
- Produces: lista priorizada de agravios que gobierna los ajustes finos de Tasks 2-4 y el loop de Task 5.

- [ ] **Step 1: Crear el doc con la plantilla**

```markdown
# Diagnóstico sonoro — 2026-10-XX
Canciones escuchadas en Live 10 (Arrangement play-through + saltos de escena).

## je-veux (Am, 98 BPM)
| Sección | Agravio (qué suena mal) | Pista culpable (Keys/Guitar/Bass/Perc/Strings/Texture/Guía) | Severidad 1-3 |
|---|---|---|---|
| Intro | | | |
| Verse | | | |
| Chorus | | | |
| Outro | | | |
Global: tonalidad clara? tempo correcto? "juguete barato" en cuál/qué?

## disritmia (Bm, 136 BPM)
(misma tabla)
```

- [ ] **Step 2 [HUMAN]: Escuchar ambas canciones** — abrir cada `.als` en Live 10, play-through lineal + disparar escenas en Session, llenar la tabla. Escuchar CONTRA la referencia (MP3 de Stefano Mota / Zaz) para tonalidad y feel.

- [ ] **Step 3: Commit**

```bash
git add DIAGNOSTICO-SONIDO.md
git commit -m "docs: diagnostico sonoro por seccion je-veux + disritmia"
```

---

### Task 2: Swap de instruments del template (humano en Live + gates)

**Files:**
- Modify: `ableton/template.als` (swap manual en Live, binario)
- Modify: `ableton/TEMPLATE-RECIPE.md:10-16` (§3 Instrumentos — actualizar con lo elegido)

**Interfaces:**
- Consumes: `ableton/template.als` actual (198KB, generado 2026-09).
- Produces: template con instruments de mejor calidad sonora; cada `build.js` posterior lo clona a sus outputs.

- [ ] **Step 1 [HUMAN]: Abrir `ableton/template.als` en Live 10 y swaphear instruments** — por pista MIDI, reemplazar el device actual por un preset stock que suene mejor (candidatos iniciales; el oído manda):
  - Keys: Wavetable (preset piano/fm) o Electric (preset "Mark" / "Tine") — evitar "Closet" si suena a juguete
  - Guitar: Electric (preset "Clean") o Sampler con nylon — coherente con guía nylon
  - Bass: Analog (preset "Basic Sine" / "Round") u Operator
  - Perc: Collision (marimba) o Drum Rack stock — mapeo C1=bombo, D1=caja, F#1=hihat (NO tocar mapeo)
  - Strings: Wavetable "Soft Pad" / " ensemble" — polifonía alta
  - Texture: dejar Simpler Classic (el sample cambia por canción vía stems de todas formas)
  - NO tocar: mics, returns, master, MIDI mappings (K2/APC), routing.

- [ ] **Step 2: Guardar el template** (File > Save en `ableton/template.als`).

- [ ] **Step 3: Gate harness** — Run: `node ../alsopentest.mjs ableton/template.als 75` (workdir `cancionero-rojo/`). Expected: `OPEN_OK`. Si CRASH: revertir desde git (`git checkout -- ableton/template.als`), reintentar con swap más conservador (1-2 instruments por corrida).

- [ ] **Step 4: Actualizar `TEMPLATE-RECIPE.md` §3** con los instruments/ presets realmente elegidos (reemplazar las líneas 10-16), para que la receta quede como verdad.

- [ ] **Step 5: Rebuild de ambas canciones con el template nuevo**

```bash
node ableton/builder/build.js songs/je-veux --dry-run   # esperar missing: []
node ableton/builder/build.js songs/je-veux
node ableton/builder/build.js songs/disritmia --dry-run # esperar missing: []
node ableton/builder/build.js songs/disritmia
node ../alsopentest.mjs songs/je-veux/output/je-veux.als 75        # OPEN_OK
node ../alsopentest.mjs songs/disritmia/output/disritmia.als 75    # OPEN_OK
```

- [ ] **Step 6 [HUMAN]: Escucha rápida** — confirmar que los instruments nuevos suenan en ambas canciones y nada se rompió (clips, escenas, tempo).

- [ ] **Step 7: Commit**

```bash
git add ableton/template.als ableton/TEMPLATE-RECIPE.md
git commit -m "feat(template): swap de instruments por presets de mejor calidad sonora"
```

---

### Task 3: Guía melódica — trompeta GM → guitarra nylon (TDD)

**Files:**
- Modify: `scripts/gen-guide.js:8`
- Modify: `test/gen-guide.test.js:20-22`

**Interfaces:**
- Consumes: `GUIDE_PROGRAM` exportado; clips `guitar--<Scene>.mid` se regeneran con el nuevo program byte.
- Produces: `GUIDE_PROGRAM = 24` (GM Acoustic Guitar nylon). El timbre AUDIBLE lo define el device Guitar del template (Task 2); el program byte es el fallback del SMF y debe ser coherente (nylon para bossa/samba).

- [ ] **Step 1: Escribir el test que falla** — en `test/gen-guide.test.js`, reemplazar:

```js
test('guide program is GM nylon guitar', () => {
  assert.equal(GUIDE_PROGRAM, 24);
});
```

- [ ] **Step 2: Verificar FAIL** — Run: `npm test` (workdir `cancionero-rojo/`). Expected: FAIL en `guide program is GM nylon guitar` (recibe 56).

- [ ] **Step 3: Implementar** — en `scripts/gen-guide.js:8`:

```js
export const GUIDE_PROGRAM = 24; // GM Acoustic Guitar nylon (coherente con bossa/samba; el timbre real lo da el device Guitar del template)
```

- [ ] **Step 4: Verificar PASS** — Run: `npm test`. Expected: todos PASS (incluye el nuevo).

- [ ] **Step 5: Regenerar guías de ambas canciones**

```bash
node scripts/gen-guide.js --song je-veux    # espera: wrote ... guitar--*.mid ×4
node scripts/gen-guide.js --song disritmia  # nota: usa melody.tempo=136 del melody.json
```

- [ ] **Step 6: Rebuild + harness**

```bash
node ableton/builder/build.js songs/je-veux --dry-run && node ableton/builder/build.js songs/je-veux
node ableton/builder/build.js songs/disritmia --dry-run && node ableton/builder/build.js songs/disritmia
node ../alsopentest.mjs songs/je-veux/output/je-veux.als 75
node ../alsopentest.mjs songs/disritmia/output/disritmia.als 75
```

- [ ] **Step 7: Commit**

```bash
git add scripts/gen-guide.js test/gen-guide.test.js songs/je-veux/clips songs/disritmia/clips
git commit -m "feat(guide): GM program trumpet(56) -> nylon guitar(24) + regen guias"
```

---

### Task 4: Voicings extendidos — tonalidad clara (TDD + regen)

**Files:**
- Modify: `songs/disritmia/chords.json`
- Modify: `songs/je-veux/chords.json`
- Modify: `songs/disritmia/patterns/strings.js:6-17`
- Modify: `songs/disritmia/patterns/texture.js:6-17`
- Modify: `songs/je-veux/patterns/strings.js:7-13`
- Modify: `songs/je-veux/patterns/texture.js:6-12`
- Modify: `test/patterns-chords.test.js:30` (`rootOfBar`)

**Interfaces:**
- Consumes: `chords.json` drives patterns (test gate), `voicing()` de `scripts/lib/chords.js` (ya soporta `m7/7/9/m9/maj7/6`), `parseChord` de gen-guide (soporta extensiones), grids orca → `orca-to-mid.js`.
- Produces: armonía extendida (7as/menores-7as en dominantes y menores) que hace clara la tonalidad; MIDI keys/bass y stems re-generados.

- [ ] **Step 1: Re-escribir `songs/disritmia/chords.json`** (mismas raíces y progresión; solo cualidad extendida en función dominante/menor):

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

- [ ] **Step 2: Re-escribir `songs/je-veux/chords.json`**:

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

- [ ] **Step 3: Verificar FAIL (rojo real)** — Run: `npm test`. Expected: FAIL en `patterns-chords` (el helper viejo `rootOfBar('Bm7')` devuelve `'Bm7'` ≠ raíz `'B'` del voicing).

- [ ] **Step 4: Fix del helper en `test/patterns-chords.test.js:30`**:

```js
function rootOfBar(bar) { return bar.match(/^([A-G][#b]?)/)[1]; }
```

- [ ] **Step 5: Verificar estado** — Run: `npm test`. Expected: FAIL ahora en pads con símbolos sin entrada en `VOICING` (`<undefined>` → raíz `U`). Eso confirma que faltan voicings en los patterns.

- [ ] **Step 6: Agregar voicings a `songs/disritmia/patterns/strings.js`** — extendir el map `VOICING` (mantener las entradas viejas que siguen usándose: G, D):

```js
const VOICING = {
  Bm: 'b3 d4 f#4',
  Bm7: 'b3 d4 f#4 a4',
  E: 'e3 g#3 b3',
  E7: 'e3 g#3 b3 d4',
  'F#m': 'f#3 a3 c#4',
  'F#m7': 'f#3 a3 c#4 e4',
  B: 'b3 d#4 f#4',
  B7: 'b3 d#4 f#4 a4',
  Em: 'e3 g3 b3',
  Em7: 'e3 g3 b3 d4',
  G: 'g3 b3 d4',
  A: 'a3 c#4 e4',
  A7: 'a3 c#4 e4 g4',
  D: 'd3 f#3 a3',
  'C#m': 'c#4 e4 g#4',
  'C#m7': 'c#4 e4 g#4 b4',
  'F#': 'f#3 a#3 c#4',
  'F#7': 'f#3 a#3 c#4 e4',
};
```

- [ ] **Step 7: Agregar voicings a `songs/disritmia/patterns/texture.js`** — dyads raíz+5:

```js
const VOICING = {
  Bm: 'b2 f#3',
  Bm7: 'b2 f#3',
  E: 'e2 b2',
  E7: 'e2 b2',
  'F#m': 'f#2 c#3',
  'F#m7': 'f#2 c#3',
  B: 'b2 f#3',
  B7: 'b2 f#3',
  Em: 'e2 b2',
  Em7: 'e2 b2',
  G: 'g2 d3',
  A: 'a2 e3',
  A7: 'a2 e3',
  D: 'd3 a3',
  'C#m': 'c#3 g#3',
  'C#m7': 'c#3 g#3',
  'F#': 'f#2 c#3',
  'F#7': 'f#2 c#3',
};
```

- [ ] **Step 8: Agregar voicings a `songs/je-veux/patterns/strings.js`**:

```js
const VOICING = {
  Am: 'a3 c4 e4',
  Am7: 'a3 c4 e4 g4',
  G: 'g3 b3 d4',
  F: 'f3 a3 c4',
  C: 'c4 e4 g4',
  E: 'e3 g#3 b3',
  E7: 'e3 g#3 b3 d4',
};
```

- [ ] **Step 9: Agregar voicings a `songs/je-veux/patterns/texture.js`**:

```js
const VOICING = {
  Am: 'a2 e3',
  Am7: 'a2 e3',
  G: 'g2 d3',
  F: 'f2 c3',
  C: 'c3 g3',
  E: 'e2 b2',
  E7: 'e2 b2',
};
```

- [ ] **Step 10: Verificar PASS** — Run: `npm test`. Expected: TODOS los tests PASS (patterns-chords ahora valida las extensiones; gen-guide acepta E7/B7/C#m7 etc.).

- [ ] **Step 11: Regenerar MIDI keys/bass de ambas canciones** — OJO: rutas de grids DIFIEREN por canción (je-veux = `songs/je-veux/orca/` y SIN bass — bass vacío por diseño; disritmia = raíz del song, con bass). Perc se OMITE (DRUM_MAP no depende de cualidad). Guía se regenera abajo por consistencia con los nuevos acordes:

```powershell
# je-veux: solo keys (grids en orca/, sin bass)
foreach ($sc in @(@('Intro',4),@('Verse',16),@('Chorus',16),@('Outro',4))) {
  node scripts/orca-to-mid.js --grid "songs/je-veux/orca/keys--$($sc[0]).grid" --chords "songs/je-veux/chords.json" --scene $sc[0] --totalBars $sc[1] --tempo 98 --out "songs/je-veux/clips/keys--$($sc[0]).mid"
}
# disritmia: keys + bass (grids en raíz del song)
foreach ($part in 'keys','bass') {
  foreach ($sc in @(@('Intro',4),@('Verse',16),@('Chorus',16),@('Outro',4))) {
    node scripts/orca-to-mid.js --grid "songs/disritmia/$($part)--$($sc[0]).grid" --chords "songs/disritmia/chords.json" --scene $sc[0] --totalBars $sc[1] --tempo 136 --out "songs/disritmia/clips/$($part)--$($sc[0]).mid"
  }
}
node scripts/gen-guide.js --song je-veux
node scripts/gen-guide.js --song disritmia
```

Expected: 12 `wrote` de orca-to-mid (4 keys je-veux + 8 keys/bass disritmia) + 8 de gen-guide, sin WARN `grid rows`.

- [ ] **Step 12: Cerrar Live 10 y re-renderizar stems** (EBUSY — Live NO debe estar abierto):

```bash
node scripts/render-stems.js je-veux     # manifest: 8 stems (strings+texture × 4 scenes)
node scripts/render-stems.js disritmia   # manifest: 8 stems
```

- [ ] **Step 13: Verificar duraciones exactas de stems** — Run (PowerShell):

```powershell
ffprobe -v error -show_entries format=duration -of csv=p=0 songs/je-veux/stems/strings--Verse.wav    # 39.184
ffprobe -v error -show_entries format=duration -of csv=p=0 songs/je-veux/stems/strings--Intro.wav     # 9.796
ffprobe -v error -show_entries format=duration -of csv=p=0 songs/disritmia/stems/strings--Verse.wav  # 28.235
ffprobe -v error -show_entries format=duration -of csv=p=0 songs/disritmia/stems/strings--Intro.wav  # 7.059
```

Expected: valores exactos (±0.05s). Si difieren: no tocar la ley de cps; revisar manifest/tempo.

- [ ] **Step 14: Rebuild + harness**

```bash
node ableton/builder/build.js songs/je-veux --dry-run && node ableton/builder/build.js songs/je-veux
node ableton/builder/build.js songs/disritmia --dry-run && node ableton/builder/build.js songs/disritmia
node ../alsopentest.mjs songs/je-veux/output/je-veux.als 75
node ../alsopentest.mjs songs/disritmia/output/disritmia.als 75
```

- [ ] **Step 15: Commit**

```bash
git add songs/je-veux songs/disritmia test/patterns-chords.test.js
git commit -m "feat(harmony): voicings extendidos (7as/m7) en chords.json + patterns + regen MIDI/stems"
```

---

### Task 5: Escucha de aceptación + cierre

**Files:**
- Modify: `PIPELINE-STATE.md` (repo RAÍZ, sección cancionero-rojo)
- Modify: `DIAGNOSTICO-SONIDO.md` (marcar resueltos/pendientes)

**Interfaces:**
- Consumes: outputs finales de Tasks 2-4 + `DIAGNOSTICO-SONIDO.md` de Task 1.
- Produces: aceptación humana o lista de re-autoría fina por sección; estado del pipeline actualizado.

- [ ] **Step 1 [HUMAN]: Escucha de aceptación** — ambas canciones completas en Live 10 (play-through + escenas), contra la referencia. Para CADA agravio del diagnóstico: ¿resuelto? Si queda alguno: re-autorizar SOLO esa sección (playbook: ajustar SOLO esa VOICING en `patterns/*.js` + re-render de ese stem, o `--offset-beats N` en extract-melody si la guía se desplazó → gen-guide → rebuild).

- [ ] **Step 2: Si hubo re-autoría** — repetir gates afectados: `npm test` → render-stems (Live cerrado) → build --dry-run → build → alsopentest. Commit por sección ajustada:

```bash
git add -A && git commit -m "fix(music): re-autoria seccion <X> de <song> tras escucha"
```

- [ ] **Step 3: Actualizar `DIAGNOSTICO-SONIDO.md`** — columna de estado por agravio (RESUELTO/PENDIENTE).

- [ ] **Step 4: Actualizar `PIPELINE-STATE.md` (repo raíz)** — sección cancionero-rojo: milestone "CALIDAD MUSICAL 2026-10-XX: instrument swap + guide nylon + voicings extendidos (je-veux + disritmia); escucha aceptación: OK/PENDIENTE". Agregar DNRs nuevos aprendidos (ej. "NO re-ejecutar build-template.js tras swap manual de instruments — lo pisa"; "rootOfBar del test de patterns debe matchear `^([A-G][#b]?)` para soportar extensiones").

- [ ] **Step 5: Commit repo raíz**

```bash
git add PIPELINE-STATE.md
git commit -m "docs(state): cancionero calidad musical cerrada (je-veux + disritmia)"
```
