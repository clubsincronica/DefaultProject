# PIPELINE-STATE.md — estado vivo de los 3 pipelines

Fuente de verdad del estado actual. Cargala y ACTUALIZALA antes/depsues de cada sesion de trabajo.
Formato: estado por proyecto + hitos + DO-NOT-REPEAT (correcciones que nunca deben repetirse).

Historial de fixes: `docs/Changelog.md`

---

## club-sincronica (shorts diarios)

- **Etapa actual:** produccion diaria (Fase 1, aprobacion humana). **LOTE COMPLETADO (2026-09-08):** 7 videos Sep 10-16 (Kin 15-21) producidos. Publicacion via Buffer + YouTube directo.
- **Plan de mejora de frames:** `docs/Plans/Frame-Improvement.md`. kinCarta quota fix aplicado 2026-09-13.
- **Pipeline:** `club-sincronica/AGENTS.md` (orden: tzolkin → astro → generate-day → guion → grabacion → transcripcion → validate-astro → storyboard → musica → frames → assemble → publicacion).
- **Publicacion:** Buffer (FB/IG/TikTok/LinkedIn) + YouTube Shorts (ruta directa).
- **LOTE DE REFERENCIA:** videos del 17-24 ago = ejemplo canonico.

### DO-NOT-REPEAT (reglas duras)

1. **NO usar `storyboard-audio.js` solo y descartar `render.js`.** Canonico = AMBOS.
2. Duracion minima de frame 3.0s (clamp); oraculo temprano (+3s tras cartouche).
3. Aspecto GARANTIZADO por `render.js`: `elAspecto` centrado, `cartaAstral` max 2, `kinCarta` = 25%.
4. Sin mojibake: encoding `·` → `-`. Numerales maya `GAP 26`. Radio oraculo 240.
5. Ortografia: "Club Sincronica" / "Kin Maya" (NUNCA "King Maya", "Quim Maya").
6. **Hook element detection:** usar `norm()` para strip accents (JS regex no matchea acentos).
7. **Pi counter:** despues de hook frames, `if (pi < 2) pi = 2` para evitar overwrite.
8. **render-daily:** rm+mkdir+cp SIEMPRE (nunca `if (!existsSync)`).
9. **Mux:** Remotion mete pista AAC muda. DEBE usar `-map 0:v:0 -map 1:a:0`.
10. **Whisper:** "Quimaya" → sed a "Kin Maya" antes de storyboard. FIX en transcribe-timed.js: reemplaza king/quim/kim/quin maya + galáctico/eléctrica. SIEMPRE verificar transcripciones nuevas con grep antes de storyboard.
11. **Pan law:** `aformat` mono→estereo aplica -3dB. Compensado con `volume=1.41254` en assemble.js.
12. **Subtitle layout:** render.js: `ty=-40`, `blockCenter=1500`, maxLines=4. frames.js: `ty=80`, `blockCenter=1420`. Subtítulos NUNCA suben de Y=1416 (margen seguro sobre gráficos).
13. **Guion NO inventa aspectos:** validate-astro.js es gate ANTES de storyboard.
14. **Maya numeral compacto:** `gap=6` (no 12 ni 22), `GAP=10` (no 14). Tono 13 = 44px (antes 80-100px). Frames.js y render.js deben tener los MISMOS valores. Nunca subir gap por encima de 8.

### Issues abiertos

- **CRITICAL: Guion inventa aspectos astrales** — 7 videos (Sep 10-16) con datos falsos. Regrabaciones pendientes (humano). Guiones regrabacion escritos y auto-validados.
- **King Maya Whisper bug** — FIX APLICADO (2026-09-16): sed en transcribe-timed.js corrige king/quim/kim/quin maya → "Kin Maya" + galáctico/eléctrica. 10/14 transcripciones del batch Sep 17-30 afectadas y corregidas. Videos re-renderizados y re-subidos a Cloudinary.
- **DailyShort durationInFrames hardcodeado** — 3000 frames trunca videos >100s. TODO: dinamico desde frames.json.
- **MEJORA PENDIENTE: Frames de aspecto necesitan carta astral** — los frames actuales muestran los planetas del aspecto pero sin círculo/marca en la carta astral. Propuesta: duplicar frame — uno con símbolos de planetas solos, otro con la carta marcando el aspecto. (Feedback Alquimista, 2026-09-16)

---

## cancionero-rojo (karaoke backing tracks Ableton)

- **Etapa actual:** Phase 1 COMPLETADA — canción #1 "Je Veux" shippeada (2026-09-25). Output: `songs/je-veux/output/je-veux.als` (bossa slow→mid 72/98, 4 scenes, 6 locators, 8 mids + 8 stems, 49/49 tests). Template `ableton/template.als` regenerado y validado (199KB gz).
- **Canción #1 "Je Veux":** COMPLETADA (2026-09-25). Output: songs/je-veux/output/je-veux.als. Grids: orca/keys+perc ×4 scenes (chanson comping + bossa clave); Patterns: strings.js/texture.js (sawtooth pad + brown/sine bed); Stems: 8 WAVs (10-40s); Build: --dry-run OK → build OK, inspect 16 scenes/6 locators/tempo 98.
- **Spec:** `docs/superpowers/specs/2026-09-24-cancionero-rojo-karaoke-design.md`.
- **Pipeline:** ver `cancionero-rojo/AGENTS.md`.
- **DO-NOT-REPEAT:**
  1. `node --test <dir>` NO recursa desde Node 21 (win32): usar `node --test` (bare) — script `npm test` corregido 2026-09-24.
  2. `parts` en `structure.json` van EN MINÚSCULAS (`keys`, `strings`, `texture`…): los nombres PascalCase (`Keys`, `Strings`) son SOLO de tracks de Ableton. Mapeo case-insensitive pendiente en builder (Task 13).
  3. El plan/planilla tenía rosters con mayúsculas y omitía check de `scene.name` — fixes A1/A2 (commits `294d1d4`, `6627859`). Revisar briefs del plan por bugs antes de ejecutarlos.
  4. `strudel-render.js` NO acepta rutas absolutas de patrón (`join(ROOT, pat)` las rompe): pasar ruta RELATIVA a `pipeline-viral/` (lo hace `render-stems.js`). Regla "ABSOLUTE path" en AGENTS.md era incorrecta — fix `1041957`.
  5. Renumerar Ids de clones de `.als` por clave `(nombre,id)`: renumerar solo por id hizo que un `FileRef Id="0"` pisara `TrackSendHolder Id="0"`. `(nombre,id)` repetido DENTRO de un clon = índice local → NO renumerar. Reglas completas en `cancionero-rojo/ableton/xml-map.md`.
  6. `build-template.js` es la ÚNICA fuente de `ableton/template.als` (regenera y valida; no escribe si falla). NO editar el .als a mano: el próximo build lo pisa. Sends que la receta no lista → floor `0.0003162277571` (borra cruft de la lección donor).
  7. `songs/_fixture/output` queda bloqueado por AV/indexer (EBUSY en win32) tras tests: `setupFixture` debe tolerar EBUSY y limpiar subcarpetas individualmente (patch 2026-09-25 en build.test.js). No borrar todo `songs/_fixture` con `rmSync` a ciegas.
  8. Template XML inválido si se interrumpe `build-template.js` ( DeviceChain/MidiToAudioDeviceChain mismatch → fast-xml-parser addChild): regenerar con `node scripts/build-template.js` y validar `XMLValidator.validate` antes de builder.

---

## pipeline-viral (Kin Harmonic 10min+)

- **Etapa actual:** H1-H8 COMPLETADO. H7 y H8 publicados en YouTube (2026-09-24) con videos Remotion finales. H9-H10 guiones completos, pendiente grabación.
  - H7: https://youtu.be/weebjoc890g (Meditación sobre Armónica 7, Remotion final 309MB)
  - H8: https://youtu.be/JeS82kwTpZ0 (Meditación sobre Armónica 8, Remotion final 313MB)
  - NOTA: Se subieron videos intermedios (~21MB) antes de corregir; re-subir con Remotion final y borrar los videos incorrectos.
- **Ultimo publicado:** Harmonic 64 = kins 253-256 (BLUEPRINT canonico).
- **Pipeline:** `pipeline-viral/AGENTS.md` (tzolkin → chakra-freq → journey-composer → soundscape → breath-sync → [voz real continua 600s + whisper trim si silencias extra] → visual-meditation → assemble-meditation).
- **Scripts clave:** `soundscape.js`, `voice-layer.js` (H1-H6), `visual-meditation.js`, `strudel-render.js`, `deliver.js`, `meditar.js` (opts.voiceFile), `kin-data.js` BLOCKS 7-10, `meditar-h7..h10.mjs`, `whisper-h7-h8.py` (detección secuencial power word), `trim-voice-by-whisper.js` (asplit+atrim+adelay+amix 600s).
- **Fix 2026-09-14:** `publish-pack.js` corregido - Act 1 (Respiración) ya no muestra info de kin en timestamps. `schedule-buffer.js` actualizado para ser dinámico (lee de publicacion.md).
- **Fix 2026-09-17:** `kin-data.js` BLOCKS 7-10, `generate-block.js` 6→10, `meditar.js` voz real (volume 0.92 + atrim/pad), guiones H7-H10 180-260w/acto, WHISPER H7/H8 (base) + TRIM a 600s realineado (H7 raw 571s→600s Δ act3 +47s, act4 +15s, act5 +19s; H8 raw 605s→600s Δ +7/+9/0/+9/+22s). Trimmed en `club-sincronica/.../H*-trimmed.wav` y copiado a `pipeline-viral/assets/audio/recordings/H*.wav` para meditar.js.

### DO-NOT-REPEAT

1. Aplicar mejoras de H64 a H65+ POR DEFECTO.
2. **Usar Remotion (remotion-poc) para videos.** No regresar a camino sin Remotion.
3. **Mux DEBE usar `-map 0:v:0 -map 1:a:0`** (fix 2026-09-13). Verificar `ffprobe volumedetect` → mean > -60dB.
4. Correlacion de titulo en acts 2-5: usar "power word" del kin destacado.
5. H1 bed plan: campos@0s, grillos@0s, olas@84s (targetRms 0.02).
6. H1 kin-tones layer: tonos gentiles por kin durante acts 2-5.
7. **publish-pack.js timestamps:** Act 1 (Respiración) NO debe mostrar info de kin. Usar `actToKinIndex` mapping: Acts 2-4 = kines[0-2], Acts 1,5,6 = sin kin.
8. **H7-10 voz real continua:** 1 WAV 600s corrido por armónica (44+126*4+52), no 5 archivos. `meditar-h*.mjs` usa `opts.voiceFile` + `aformat volume=0.92` + `atrim/pad 600s`. Guion: Power word → Cuerpo 2-3 párrafos (sello/tono/color/dirección/familia/onda) → lema verbatim tzolkin → tríada cierre, 0 astro (solo kin), 180-260w/acto.
9. **Whisper trim H7-10:** Si hay silencios extra, usar `python scripts/whisper-h7-h8.py H7` → `whisper-h*-live.json` (detección secuencial power word) → `node scripts/trim-voice-by-whisper.js H7` (asplit+atrim+adelay+amix 600s) → genera `*-trimmed.wav` y copiar a `pipeline-viral/assets/audio/recordings/` para que `meditar.js` lo use. No reversion/whisper en mezcla final.

### H4-H10 Plan

| Harmonic | Kins | Fechas | Drone | Estado |
|----------|------|--------|-------|--------|
| H4 | 13-16 | Sep 8-11 | 141.27 Hz (Garganta) | COMPLETADO |
| H5 | 17-20 | Sep 12-15 | 172.06 Hz (Corona) | YouTube ✓, Buffer programado 2026-09-15 |
| H6 | 21-24 | Sep 16-19 | 141.27 Hz (Garganta) | YouTube ✓, Buffer programado 2026-09-16 |
| H7 | 25-28 | Sep 20-23 | 141.27 Hz (Garganta) | **YouTube ✓ (weebjoc890g), Buffer ✓ (2026-09-25)** |
| H8 | 29-32 | Sep 24-27 | 172.06 Hz (Corona) | **YouTube ✓ (JeS82kwTpZ0), Buffer ✓ (2026-09-25)** |
| H9 | 33-36 | Sep 28-Oct 1 | 194.18 Hz (Raíz) | Guion ✓ (190/193/190/215w), pendiente WAV 600s |
| H10 | 37-40 | Oct 2-5 | 126.22 Hz (Plexo) | Guion ✓ (193/188/207/234w), pendiente WAV 600s |

### Issues abiertos

- **Buffer posts viejos con video mudo** — 3 posts (FB, TikTok, IG) para borrar manual en dashboard.
- **YouTube OAuth compartido** con club-sincronica — FIX 2026-09-24: refresh_token revocado, se re-autorizó via authorize-loopback. Se corrigió redirect_uri mismatch (trailing slash `http://localhost:8123/` vs `http://localhost:8123`) en client_secret.json y google-oauth.js. H7 y H8 publicados exitosamente.
- **Cloudinary free tier limit** — videos >100MB dan 413 error. Se usaron versiones `-compressed.mp4` del Remotion-poc (600s, ~50MB). URL Cloudinary tienen doble `club-sincronica/` en path por config de folder+public_id en upload-cloudinary-sdk.js.
- **Facebook Reels rechaza videos >90s** — H7 y H8 (600s) rechazados por Buffer para Facebook. **FIX 2026-09-24**: se usan teasers (~6s) como video regular (type: 'post') para Facebook, con link al video completo de YouTube. Teasers subidos a Cloudinary.
- **Pipeline-viral credentials** — canal.env con `pipeline.viral.canales@gmail.com` aún sin OAuth propio. Se usa el OAuth compartido de club-sincronica.

---

## remotion-poc (Render lab)

- **Etapa actual:** Render diario funcional (DailyShort) con crossfade suave.
- **AGENTS.md:** `remotion-poc/AGENTS.md`
- **Issues:** imports relativos rotos en `src/` (detectados 2026-08-21).
- **DECISIÓN 2026-09-16:** assemble.js (ffmpeg directo) es SUFICIENTE para DailyShort.
  El batch Sep 17-30 se procesó SIN remotion-poc y los videos son correctos.
  Remotion no aporta nada especial al pipeline actual. Mantener como laboratorio
  pero NO integrar en el pipeline diario salvo que surja una necesidad concreta.

### DO-NOT-REPEAT

- Crossfade: `fadeIn * fadeOut` con fadeOut despues de `durationFrames`. NO `Math.min(fadeIn, fadeOut)`.
