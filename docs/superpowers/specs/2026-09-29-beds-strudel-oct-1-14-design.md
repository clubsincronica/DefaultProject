# Spec: Beds Strudel por sello — lote Oct 1-14 (club-sincronica)

Fecha: 2026-09-29 · Estado: aprobada por el Alquimista (design review en chat)
Relacionado: PIPELINE-STATE.md (lote Oct 1-14, 13/14 videos producidos), `club-sincronica/AGENTS.md` §pipeline paso 5 (música Strudel).

## Problema

Los 13 videos Oct 1-14 usan el bed de fallback `assets/audio/beds/etereo-espejo.wav`
(campanas cristalinas de `ethereal-bed.js`): sonido estridente y repetitivo, igual en
todos los días. No existen patterns Strudel para los kins 36-49 (el pipeline paso 5
quedó sin ejecutar para este lote).

## Decisiones tomadas (con el usuario)

1. **Dirección musical: "mixto por sello"** — motivo rítmico con más presencia en días
   de energía fuerte; ambiente sutil en los contemplativos (la voz es la protagonista).
2. **Herramienta: solo Strudel** — Orca descartado (cero tooling en el repo; Strudel ya
   está cableado con `strudel-render.js` + LFO).
3. **Alcance: 14 beds** — incluido Oct 13 (kin 48), que aún no tiene video (grabación
   de 6s pendiente de regrabar): su bed queda listo para cuando se monte el día.

## Alcance

- 14 patterns nuevos en `club-sincronica/content/patterns/<sello>-<kin>.js`
  (kin 36-49, fechas 2026-10-01..14).
- 14 beds en `club-sincronica/assets/audio/beds/YYYY-MM-DD-<sello>-<kin>.wav`.
- Re-ejecutar `scripts/assemble.js <fecha>` en los 13 días con video (solo audio;
  frames/render intocables).
- NO: cambios de código en assemble/render/strudel-render; NO Orca; NO componer el
  video de Oct 13 (pendiente de regrabación humana).

## Dirección musical (aprobada)

| Fecha | Kin | Sello · Tono | Clase | Idea (raíz/escala → timbre/motivo) |
|---|---|---|---|---|
| 10-01 | 36 | Guerrero Planetario | rítmico | Mi menor: pulso firme triangle + bajo marcha, brillo contenido (versión suave de guerrero-256) |
| 10-02 | 37 | Tierra Espectral | ambiente | Drone terroso (sol2 + quinta, cutoff 300-600), lento, disolución |
| 10-03 | 38 | Espejo Cristal | ambiente | Dos voces espejadas (la2 ↔ la3, pan ±) que se responden (acertijo espejado) |
| 10-04 | 39 | Tormenta Cósmica (GAP) | rítmico | Do menor: groove oscuro syncopado, sin agudos, "tormenta que danza" |
| 10-05 | 40 | Sol Magnético | rítmico | Do mayor cálido: acento magnético en el downbeat, triangle cálido |
| 10-06 | 41 | Dragón Lunar | ambiente | Gotas sine pentatónicas + río de fondo (cutoff que fluye) — haiku con agua |
| 10-07 | 42 | Viento Eléctrico | ambiente | Pad de aire sin percusión, cutoff que sopla (sine.slow), desapego |
| 10-08 | 43 | Noche Autoexistente (GAP) | ambiente | Pad oscuro grave (fa2/re2), cutoff 250-500 — soneto oscuro |
| 10-09 | 44 | Semilla Entonada | rítmico | Pulso de siembra que vuelve (refrán musical: 5 notas + silencio), tierra |
| 10-10 | 45 | Serpiente Rítmica | rítmico | Bajo serpenteante en Do menor, groove sinuoso (tono Rítmico) |
| 10-11 | 46 | Enlazador Resonante | ambiente | Call & response de dos notas con eco (verso/contraverso) |
| 10-12 | 47 | Mano Galáctica | rítmico | Pulso de tarea 4/4 suave, melodía de "contar y armar" |
| 10-13 | 48 | Estrella Solar | ambiente | Destellos sine con gain ≤0.04 y cutoff ≤3k (brillo sin strident) |
| 10-14 | 49 | Luna Planetaria | ambiente | Canción de cuna: arpegio mecedor 3/4, sines cálidos |

6 rítmicos (36, 39, 40, 44, 45, 47) / 8 ambientes (37, 38, 41, 42, 43, 46, 48, 49).

## Restricciones anti-strident (reglas duras)

- Synths: solo `sine`/`triangle` (saw solo en bajo con cutoff ≤600). Sin campanas/glocks.
- Capas brillantes: `gain ≤ 0.05` y `cutoff ≤ 3000`.
- Pads: attack ≥0.05, release ≥1s. Máx 4 voces en stack.
- `cps` 0.4-0.6; `loopSec` 8-16 (seamless); LFO respiratorio
  `period 16-32s, min 0.5-0.6, depth 0.3`.
- Export shape: `{ code, cps, loopSec, sampleRate: 44100, lfo }` (igual que los
  patterns existentes; `strudel-render.js` lo lee tal cual).

## Pipeline de ejecución

1. Smoke test: render 5s de un patrón → valida toolchain (fix kabelsalat de AGENTS.md).
2. Escribir los 14 patterns (`content/patterns/<sello>-<kin>.js`) con comentario de
   cabecera (kin, fecha, concepto).
3. Render por día: `node scripts/strudel-render.js <patron.js> 120
   assets/audio/beds/<fecha>-<sello>-<kin>.wav` — **120s uniforme** para los 14
   (≥ el video más largo del lote, 117.7s; si el bed es más largo que el video,
   `amix duration=first` lo trunca en el cierre con fade). El naming `YYYY-MM-DD-*.wav`
   lo selecciona `findBed()` automáticamente.
4. Re-ejecutar `node scripts/assemble.js <fecha>` ×13 (loguea el bed elegido).
5. Verificación por día (gate de aceptación):
   - log de assemble muestra el bed nuevo (NO `etereo-espejo.wav`);
   - `ffprobe` duración del bed ≥ duración del video;
   - `volumedetect`: `max_volume` < 0 dB (sin clipping);
   - texto de PIPELINE-STATE actualizado al terminar.

## Error handling

- Si `strudel-render.js` falla en un patrón: ese día conserva el fallback
  `etereo-espejo.wav`, se reporta en el informe final y se reintenta solo ese día.
- Si el toolchain Strudel está roto (fix de `@kabelsalat/web` perdido): reparar el
  `exports` de `package.json` según AGENTS.md antes de continuar.

## Criterios de éxito

- 14 patterns + 14 beds existentes y verificados (duración/clip).
- Los 13 videos re-mezclados con su bed propio: ningún video usa `etereo-espejo.wav`.
- Escucha final por parte del Alquimista (último gate, humano).
- Patterns y spec commiteados; PIPELINE-STATE.md actualizado.

## Fuera de alcance / pendientes relacionados

- Oct 13: regrabación de la narración (6s) → pipeline de ese día (bed ya listo).
- Publicación de los 13 videos (sigue siendo Fase 1: aprobación humana).
