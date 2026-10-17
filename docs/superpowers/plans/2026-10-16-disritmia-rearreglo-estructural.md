# Plan — Re-arreglo estructural de disritmia (tramos de voz reales)

Fecha: 2026-10-16 (plan mode)
Estado: Fase 0 CERRADA (estructura confirmada por el usuario). Pendiente ejecución Fases 1-5.

## Diagnóstico (por qué suena raro)

`extract-melody.py` para disritmia usó las constantes `FALLBACK` de **je-veux**
(`[0, 4, 17.6, 33.6, 49.6, 63.1, 76.4]`), no una detección real. Eso produjo un
`melody.json` con solo 2 escenas de voz (`Verse` 23 notas, `Chorus` 31 notas),
colapsando toda la canción en `Intro4/Verse16/Chorus16/Verse16/Chorus16/Outro4`.

La forma real de la versión de Stefano Mota es otra (confirmada con el oído del
usuario + la letra canónica + análisis de energía vocal del mp3). Por eso el
arreglo actual suena: Verse largo/monótono y Chorus raro.

## Hechos verificados (Fase 0)

- **Letra canónica** (Letras/Shazam/Liedertexte): Verse1 "me esconder debaixo
  dessa sua saia…" → cierra "me deixa te trazer num dengo" (×2). Verse2
  "exorcizado…olhar infindo…retinas…olhos lindos…hipnotizado…disritmia". Chorus
  "vem logo, vem curar seu nego que chegou de porre lá da boemia" (×N, con tag
  "lá da boemia" repetido hasta el final).
- **Anclas del usuario** sobre `sources/reference/disritmia.mp3` (136 BPM,
  `phi=0.560`, `barSec=1.765`):
  - 88.2s = "retinas / olhos lindos" (Verse2, líneas 2-3)
  - 109.4s = "vem logo, vem curar seu nego" (arranque del Chorus)
  - 2:11+ = repite "lá da boemia" (tag del chorus hasta el cierre)
- **Energía vocal por compás** confirma los picos en los tramos de voz y el
  decaimiento a 0 en 137.6-142.6s.
- El mp3 dura 142.6s = 80.8 compases a 136 → el arreglo de **80 bars** calza.

## Estructura final (Fase 0 cerrada, decisión del usuario)

6 escenas técnicas (el extractor exige 6 entradas de arrangement → 7 anchors),
que suenan a 4 secciones musicales. Warp piecewise **~1:1** (ratios 0.957-1.003),
así que la interpolación casi no deforma.

| # | Escena | Bars | our-bar | t (s) | Letra |
|---|---|---|---|---|---|
| 1 | Intro | 10 | 0→10 | 0–17.6 | instrumental |
| 2 | Verse1a | 10 | 10→20 | 17.6–35.3 | "me esconder debaixo dessa sua saia…" |
| 3 | Verse1b | 10 | 20→30 | 35.3–52.9 | "me deixa te trazer num dengo" (×2) |
| 4 | Verse2 | 20 | 30→50 | 52.9–88.2 | "exorcizado…olhar infindo…retinas…olhos lindos" |
| 5 | PreChorus | 12 | 50→62 | 88.2–109.4 | "me deixe hipnotizado…disritmia" |
| 6 | Chorus | 18 | 62→80 | 109.4–142.6 | "vem logo, vem curar seu nego…lá da boemia" (×N) |

- `arrangement = ["Intro","Verse1a","Verse1b","Verse2","PreChorus","Chorus"]` (lineal, sin repetición — cada tramo aparece una vez).
- `our_anchors = [0, 10, 20, 30, 50, 62, 80]` (7 valores, cumple el contrato).
- `--rec-anchors "0.0,9.65,19.68,29.65,49.65,61.67,80.48"` (7 floats, rec-bars).

## Contrato técnico del extractor (NO negociable)

Verificado en `cancionero-rojo/scripts/extract-melody.py`:

- `--rec-anchors` exige **exactamente 7 floats** monótonamente crecientes (`:312-315`).
- `our_anchors` se arma desde `structure['arrangement']` con un punto por
  entrada + el cierre → `len(our_anchors) = len(arrangement) + 1` (`:266-268`).
  Para 7 anchors, el arrangement debe tener **6 entradas**.
- `rec_bar_to_our_bar` (`:220-233`) interpola pareando `rec[i] ↔ our_anchors[i]`.
  Guard `r<=0 → 0.0`; `r >= rec[-1]` → `our[-1]` (o `None` si `r > rec[-1]+2`).
- **Solo escribe melodía en la primera ocurrencia de cada escena** (filtrado por
  `first_occ`/`occ_ranges`). Con arrangement lineal (sin repeticiones) esto es
  irrelevante.
- `Intro` y `Outro` quedan sin notas (pulso only, por diseño).

## Restricciones del pipeline (heredadas, no negociables)

- **NUNCA re-ejecutar `ableton/builder/build-template.js`** (DNR #20). Todo el
  trabajo es sobre `structure.json`/`chords.json`/grids/stems/midi.
- `validate-structure.js`: ≤16 escenas, `timeSig` 4/4, arrangement solo
  referencia escenas existentes, no duplica nombres de escena.
- `orca-to-mid.js` escribe `clips/<part>--<sceneName>.mid` por nombre de escena.
  Con arrangement lineal sin repetición no hay pisado.
- Live debe estar **cerrado** antes de `render-stems.js` (file locks → EBUSY).
- `npm test` corre `node --test` (sin directorio). PowerShell 5.1: sin `node -e`
  inline con regex/brackets → usar scratch `.mjs` en `ableton/.tmp/`.
- `patterns-chords.test.js` verifica 1 acorde por compás + `slow(N)` en los
  patterns strings/texture por sección. Al agregar escenas hay que regenerar
  los patterns para que cubran Verse1a/Verse1b/Verse2/PreChorus/Chorus.
- DNR #16: en PowerShell usar `@($row) * $n` (no `'str' * n`); verificar conteo
  de filas de cada `.grid` antes de `orca-to-mid`.

## Fases restantes

### Fase 1 — `structure.json` + `chords.json`

1. Reescribir `songs/disritmia/structure.json` con las 6 escenas + arrangement
   lineal (tabla arriba). Validar con `validateStructure`.
2. Reescribir `songs/disritmia/chords.json`: una entrada `sections.<Scene>.bars`
   por escena, exactamente `bars` acordes por escena (1 por compás). Mapear la
   progresión actual del Verse/Chorus 16-barras a los tramos nuevos:
   - Verse1a/Verse1b: vamp `Bm7 E7` (i–IV7 dorian).
   - Verse2: misma progresión que el Verse actual (resolución `F#m7 B7`,
     `Em`, bajada `F#7 Bm7`).
   - PreChorus: `F#7 B7` dominantes que preparan el chorus.
   - Chorus: `Em7 A7 D G C#m7 F#7 B7` (la progresión del chorus actual).
3. `npm test` debe pasar (verifica pads === chords.json + `slow(N)`).

**Gate:** `npm test` verde; `structure.json` pasa `validateStructure`.

### Fase 2 — Re-extraer melodía

1. `python scripts/extract-melody.py --slug disritmia --transpose 2 --rec-anchors "0.0,9.65,19.68,29.65,49.65,61.67,80.48"`.
2. Verificar `melody.json`: notas en Verse1a/Verse1b/Verse2/PreChorus/Chorus;
   Intro sin notas. Sin warnings de anclas ni "out of range".

**Gate:** `melody.json` con notas en las 5 escenas de voz.

### Fase 3 — Variar grids + regen MIDI

1. Diseñar variación del riff de bajo (no 16× la misma fila). Dividir cada
   escena larga en regiones de 4 bars; cambiar la figura al cambiar de acorde
   (p. ej. añadir passing tones en la resolución). Igual para `keys`.
2. Regenerar MIDI por escena: `node scripts/orca-to-mid.js --grid <g> --chords
   songs/disritmia/chords.json --scene <Scene> --totalBars <bars> --tempo 136
   --out songs/disritmia/clips/<part>--<Scene>.mid`.
3. Regenerar guía: `node scripts/gen-guide.js --song disritmia`.

**Gate:** todos los `.mid` regenerados; `npm test` verde.

### Fase 4 — Re-render stems

1. Live cerrado.
2. `node scripts/render-stems.js disritmia`.
3. ffprobe (±0.05s) por escena: Intro≈17.6s, Verse1a≈17.6s, Verse1b≈17.6s,
   Verse2≈35.3s, PreChorus≈21.2s, Chorus≈31.8s.

**Gate:** stems con duración exacta por sección.

### Fase 5 — Rebuild + escucha + commit

1. `node ableton/builder/build.js songs/disritmia --dry-run` → `missing: []`.
2. `node ableton/builder/build.js songs/disritmia`.
3. `node ../alsopentest.mjs songs/disritmia/output/disritmia.als 75` → `OPEN_OK`.
4. `npm test` → verde.
5. Commit + actualizar `PIPELINE-STATE.md` (canción #2: re-arreglada, pendiente
   escucha). **Escucha humana del usuario**; iterar por agravio si hace falta
   (guía desalineada → `--offset-beats`; pads de una sección → ajustar solo esa
   `VOICING` + re-render de ese stem; timbre → re-swap de esa pista).

**Gate:** commit + `PIPELINE-STATE.md` + escucha.

## Riesgos

- **Warp del Chorus** (ratio 0.957): el chorus grabado dura 18.81 rec-bars pero
  lo forzamos a 18 our-bars. Aceptable (<5%), pero si la melodía suena
  adelantada/atrezada al final, ajustar `Chorus` a 19 bars y re-calcular anchors.
- **Verse2 de 20 bars** puede seguir sonando largo en karaoke. El usuario eligió
  mantener la forma de Stefano; si al escuchar quiere acortarlo, es un ajuste de
  `bars` + re-render, no re-arreglo completo.
- **2:11+ repite "lá da boemia"**: modelado dentro del Chorus de 18 bars. Si el
  usuario siente que el tag se repite de más, acortar Chorus a 14-16 bars.
- Live cerrado antes de stems (EBUSY).

## Fuera de alcance (v1)

- Variar melodía/acordes entre ocurrencias de la misma escena.
- Cambiar tempo por escena.
- Re-swap de instrumentos (ya hecho en Tasks 2-3 del plan de calidad musical).
- Je-veux (independiente).
