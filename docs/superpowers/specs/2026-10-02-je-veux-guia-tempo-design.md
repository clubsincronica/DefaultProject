# Spec — Je Veux: tempo fijo 98 + línea guía (2026-10-02)

Feedback del Alquimista (audición en Live): el cambio de tempo de Intro/Verse
(72) rompe la sincronía entre clips y la canción suena "noise", no "song".

## Diagnóstico

- Los stems WAV duran exactamente 4/16 bars @ **98 BPM** (9.796s / 39.184s,
  verificado en `stems/manifest.json`), pero las escenas Intro/Verse declaran
  `tempo: 72` → Live estira esos clips de audio ~36% → des-sync.
- El `.als` construido solo tiene DOS overrides de escena
  (`<Tempo><Manual Value="72">` en escenas 1 y 2); no existe ninguna curva de
  automatización de tempo en el set (solo nodos de vista
  `TempoAutomationView*`). Quitar los overrides basta.

## Decisiones (aprobadas por el Alquimista)

1. **Tempo único 98 BPM** en todas las escenas (el real de Zaz; sin
   re-render de stems).
2. **Línea guía híbrida en la pista Guitar** (MIDI):
   - Intro/Outro: pulso en los 4 tiempos sobre la raíz del acorde
     (acento velocity en el tiempo 1).
   - Verse/Chorus: melodía vocal + acento grave en el 1 de cada barra.
3. **Melodía vocal extraída del MP3** con pYIN (`librosa`) sobre
   `sources/reference/je-veux.mp3`. Excepción explícita y única a la regla
   "sin Demucs/separación de voz": pYIN es monody-tracking de un archivo,
   no separación de pistas. Documentar en PIPELINE-STATE.md.
4. **ClyphX 2.6.2** instalado en Live para cargar instrumentos al vuelo
   (`LOADDEV`, `SWAP`, `BPM`).
5. **Timbre del instrumento guía**: elección manual del usuario en Live
   sobre `ableton/template.als` (Live 10.0.1 NO permite insertar
   dispositivos por API — `Track.insert_device` existe solo desde Live
   12.3). El builder solo inyecta clips, así que el template lo hereda en
   todos los builds.

## Componentes

| Archivo | Qué hace |
|---|---|
| `songs/je-veux/structure.json` | sin `tempo` en Intro/Verse; `parts.midi += "guitar"` |
| `scripts/extract-melody.py` (nuevo) | MP3 → `songs/je-veux/melody.json` (notas por escena, en beats) |
| `scripts/gen-guide.js` (nuevo) | `melody.json` + `chords.json` + `structure.json` → `clips/guitar--<Scene>.mid` + sidecar `.json` |
| `ableton/builder/build.js` | sin cambios: `TRACK_MAP.guitar → Guitar`, roster ya lo permite |
| `C:\...\Live\Resources\MIDI Remote Scripts\ClyphX\` | ClyphX 2.6.2 (Live 10.0.1 no lee User Library/Remote Scripts, eso es desde 10.1.13) |

### extract-melody.py (implementado 2026-10-02, enfoque revisado)

El enfoque original (correlación de chroma contra la secuencia de acordes)
NO funcionó: la grabación (~82 BPM, ~77 compases, estructura V1≈14c /
C≈14-16c / outro≈13c con fades) difiere de nuestra adaptación (98 BPM,
72 compases, 16 por escena) y el pico de correlación quedó en ruido
(z≈3, verificado contra un self-test sintético que sí da el offset exacto).
Enfoque implementado:

1. `librosa.load(mp3)` → onsets → **rejilla por resultant scan** (BPM
   68–112, grid de 1/16, `R=0.126` → **82.10 BPM** = tempo real de la
   grabación; el MP3 NO es 72 ni 98).
2. **Downbeat**: puntos de la rejilla dentro de la media compás previa al
   inicio del audio (`phi=1.992s`), puntuados por cuán bien caen en
   compás entero los silencios vocales ≥0.8s.
3. **Anclas de estructura** (piecewise, compases de la grabación):
   `rec=[0, 3.94, 17.79, 33.79, 49.79, 63.92, 77.36]` ↔
   `our=[0, 4, 20, 36, 52, 68, 72]`; mapeo lineal por segmento
   (Intro↔Intro y Verse↔Verse arrancan juntos; el resto se estira/encoge).
   Fallbacks en `FALLBACK_REC` si la detección falla.
4. `librosa.pyin` → runs → snap a escala de A menor → filtro de calidad
   (`prob ≥ 0.25` o `dur ≥ 1 beat`; sin filtro: 109 notas/coro de ruido
   de instrumentos; con filtro: Verse 41 / Chorus 26).
5. Recorta por rango de compases de la PRIMERA aparición de cada escena →
   `melody.json` (Intro/Outro = `notes: []`, son de pulso). Confianza en
   `gridR` + `--min-confidence` (default 0.06); override manual completo
   con `--offset-beats N` (re-desplaza phi y remapea todo).

### gen-guide.js

- Intro/Outro: `note = root(chord)` por tiempo (startBeat 0..3 de cada
  compás), velocity 100 en beat 1, 76 en el resto.
- Verse/Chorus: notas de `melody.json` (velocity 88) + root del acorde en
  startBeat de cada barra (velocity 60, dur 0.25).
- Escribe SMF con `lib/smf-writer.js` (program 56 = trompeta GM, por si el
  instrumento del template no está cargado) y sidecar
  `{ notes: [{track,note,startBeat,durBeats,velocity,part:"guitar"}] }`.

## Validación (gates) — ejecutado 2026-10-02

1. `npm test` → **56/56 PASS** (49 previos + 7 de `test/gen-guide.test.js`).
2. `node scripts/build-template.js` NO se ejecutó (DNR #6).
3. `--dry-run` → `missing: []`, `Guitar: 4`, `mids: 12`, `tempo: 98`.
4. Build real + `inspect-als`: 16 escenas, 6 locators, tempo 98, y
   **0 overrides de tempo** (verificado en el XML: único
   `<Tempo><Manual Value="98">`; `Value="72"` = 0 apariciones).
5. `alsopentest.mjs ... 75` → **OPEN_OK** (2 corridas, incl. una tras
   instalar ClyphX).
6. **Pendiente (humano):** en Live → Preferences → Link/MIDI → Control
   Surface = **ClyphX** (instalado en `MIDI Remote Scripts\ClyphX\`, 37
   archivos, sin traceback en Log.txt, pero hay que activarlo a mano).
   Luego escucha — tempo constante, guía en tiempo, melodía alineada. Si
   la melodía se desplaza: `extract-melody.py --offset-beats N` →
   `gen-guide.js` → rebuild.

## Riesgos

- **Alineación MP3↔rejilla**: si la intro del MP3 difiere de nuestros 4
  compases, la melodía corre → mitigación `--offset-beats` + escucha.
- **Calidad pYIN**: voz doblada/resonancia puede dar notas erráticas → es
  una guía, no partitura; snap a escala A menor acota el daño.
- **ClyphX en Live 10.0.1**: instalado 2026-10-02 (2.6.2 = última versión
  free para Live 10, README del repo lo confirma); Log.txt sin traceback
  tras arranque. Si fallara: borrar la carpeta de Remote Scripts (rollback
  total). Activación manual pendiente en Preferences (ver gates).
- **Instrumento guía**: si al audicionar suena mal, cambiar el preset en el
  template (paso 3 de TEMPLATE-RECIPE.md) y reconstruir.

## Fuera de alcance

- Re-render de stems, rediseño de escenas, cambios de devices/routing en el
  builder, automatización del swap de instrumento por API.
