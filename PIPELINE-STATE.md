# PIPELINE-STATE.md — estado vivo de los 3 pipelines

Fuente de verdad del estado actual. Cárgala y ACTUALÍZALA antes/depués de cada sesión de trabajo.
Formato: estado por proyecto + hitos + DO-NOT-REPEAT (correcciones que nunca deben repetirse).

---

## club-sincronica (shorts diarios)

- **Etapa actual:** producción diaria (Fase 1, aprobación humana). **EN CURSO (2026-08-24):** alinear la estructura de los videos al ejemplo canónico del 24 ago.
- **Hitos:** pipeline diario en `club-sincronica/AGENTS.md` (orden: guion → grabación → transcripción → storyboard → música → publicación).
- **Publicación:** Buffer (FB/IG/TikTok/LinkedIn) + YouTube Shorts (ruta directa).
- **LOTE DE REFERENCIA:** los videos del **17–24 ago** son el EJEMPLO CANÓNICO (calidad: composición inteligente con aspecto garantizado, vía `render.js` v2). El estándar actual = `storyboard-audio.js` (beats desde transcripción) + `render.js` (composición con reglas de marca) EN ARMONÍA.
- **DO-NOT-REPEAT (reglas duras, ver `docs/ESTRUCTURA-CANONICA.md`):**
  - **NO usar `storyboard-audio.js` solo y descartar `render.js`.** La regresión del 25-31 ago vino de eso: se perdieron duración mínima, oráculo temprano, aspecto y reglas de marca. Canónico = AMBOS: `storyboard-audio.js` da los beats reales; `render.js` (`pickEl` + `elAspecto`) compone con reglas de marca.
  - Duración mínima de frame 3.0 s (clamp); oráculo debe aparecer temprano (umbral +3 s tras cartouche), NO tardío.
  - Aspecto GARANTIZADO por `render.js`: `elAspecto` con símbolos centrados bajo título, separación 160 px, escala 1.6, conjunción a escala media; `cartaAstral` máx 2 aspectos; `kinCarta` ≤ 25 % del frame; fallback de aspecto presente.
  - Sin mojibake: encoding `Â·` → `-`. Numerales maya `GAP 26`. Radio de oráculo 240. Subtítulos 42/36/30 px. Ortografía: "Club Sincrónica" / "Kin Maya" (NUNCA "King Maya", "Quim Maya", "quimaya").
  - NO perder las mejoras del lote 17–24 ago: son el estándar. Si al regenerar archivos desde plantilla se pisan esas ediciones, DETENER y reportar, no continuar.
  - **Bug render.js (fallback de elementos) — fijado 2026-08-23:** el fallback de `pickEl` en `scripts/render.js` NO debe forzar `aspecto` para un beat sin keyword (ni demotar aspectos repetidos, ni romper repetición consecutiva, a `onda`). `onda` SOLO aparece cuando el texto menciona "onda"/"encantada"/"sello magnético" (vía `pickEl`). Regresión del 26 ago: `frames.json` con 10 frames `onda` y `aspecto` temprano (en beat que no lo mencionaba). Fix: removido `else if (ctx.astro.aspectoDelDia) e='aspecto'` (línea ~712) y los dos fallbacks a `onda` → `kinCarta`. Si un día tiene transcripción poco "keywordeada" (poética), es NORMAL que `kinCarta` domine; no reintroducir `onda` como relleno.
- **Issues conocidos:** (vacío)

## pipeline-viral (Kin Harmonic 10min+)

- **Etapa actual:** **H1 COMPLETADO** — **EN CURSO H2** (kins 5-8, siguiente).
- **Último publicado:** **Harmonic 64 = kins 253-256** (confirmado por usuario 2026-08-24). Es el BLUEPRINT canónico.
- **BLUEPRINT:** H64 es el molde ideal de los videos Kin Harmonic (estructura de acts, soundscape, render). Úsalo como referencia para H65+, pero ADAPTA por kin (NO copiar literal).
- **Scripts clave:** `soundscape.js`, `voice-layer.js`, `visual-meditation.js`, `visual-watercolor.js`, `strudel-render.js`, `deliver.js`, `make-thumbnail.js`.
- **DO-NOT-REPEAT:**
  - Aplicar las mejoras de H64 a los siguientes harmonics (H65+) POR DEFECTO. No esperar a que se pida: si H65+ no trae las mejoras de H64, es regresión.
  - **Usar Remotion (remotion-poc) para producir los videos.** pipeline-viral NO debe olvidar/regresar a un camino sin Remotion.
  - **Remotion exporta video SIN AUDIO (pista AAC silenciosa -91dB).** `remotion-poc/out/*.mp4` (H2.mp4, meditacion.mp4, etc.) NUNCA se suben directos: el master publicable es el mux con el WAV final de voz, p.ej. `pipeline-viral/content/meditation-output/<fecha>/H{n}-final.mp4`. **Verificar SIEMPRE antes de subir: `ffprobe -af volumedetect` → mean_volume > -60dB** (bug 01/09/2026: se subieron 3 versiones mudas a YouTube/Buffer).
  - **Correlación de título en acts 2-3-4-5:** usar la "palabra de poder" (power word) del kin destacado de ese acto. Corregido en H65; debe mantenerse.
  - **H1 new bed plan:** campos@0s, grillos/ranas@0s con pan orgánico, olas@Act2 (84s) más suave (targetRms 0.02). Aplicar a futuros harmonics como opción.
  - **H1 kin-tones layer:** tonos gentiles por kin (chakra freq ×2 y ×3) durante actos 2-5. Aplicar por defecto.
- **Estado H2 (01/09/2026):** YouTube publicado: `https://youtu.be/-hqitbR3SAM` (H2-final.mp4, audio v2 = intros bajadas + "exhala y contar hasta 4" en Act 1; verificado por correlación de envolvente). Buffer reprogramado para 02/09 con video CON audio (`H2-master.mp4` 16.9MB, mean -30.8dB; TikTok usa `H2-master-tiktok.mp4` 599s). IDs nuevos: li=6a9712f4… ig=6a9712f5… tk=6a9712f6… fb=6a9712f7…. **PENDIENTE: borrar manual en dashboard Buffer los 3 posts viejos con video mudo (API devuelve "not allowed"):** `6a96d4d7fc621fd3a23f6fb9` (FB), `6a96d5ceab48d6040e880da3` (TikTok), `6a96d5cf3131cb5e580706b9` (IG). Scripts nuevos: `delete-buffer-posts.mjs`, `update-buffer-media.mjs`, `reschedule-h2.mjs`.
- **Issues conocidos:** (vacío)

### H4-H6 Plan

#### H4 (Kins 13-16) — Sep 8-11, 2026
- **Central Date:** 2026-09-09 (Miércoles)
- **Publication:** Viernes Sep 11
- **Kins:**
  - Kin 13: Caminante del Cielo Cósmico Rojo — Coplas de camino
  - Kin 14: Mago Magnético Blanco — Encantamiento
  - Kin 15: Águila Lunar Azul — Oda al vuelo
  - Kin 16: Guerrero Eléctrico Amarillo — Romance marcial
- **Drone:** 141.27 Hz (Garganta, Mercury)
- **Wavespell:** Dragón (Rojo), positions 13-16

#### H5 (Kins 17-20) — Sep 12-15, 2026
- **Central Date:** 2026-09-13 (Miércoles)
- **Publication:** Miércoles Sep 16
- **Kins:**
  - Kin 17: Tierra Autoexistente Roja — Poema-piedra
  - Kin 18: Espejo Entonado Blanco — Acertijo espejado
  - Kin 19: Tormenta Rítmica Azul — Anti-soneto
  - Kin 20: Sol Resonante Amarillo — Letrilla luminosa
- **Drone:** 172.06 Hz (Corona, Platonic Year)
- **Wavespell:** Mago (Blanco), positions 4-7

#### H6 (Kins 21-24) — Sep 16-19, 2026
- **Central Date:** 2026-09-17 (Miércoles)
- **Publication:** Viernes Sep 18
- **Kins:**
  - Kin 21: Dragón Galáctico Rojo — Haiku con agua
  - Kin 22: Viento Solar Blanco — Verso que se lleva
  - Kin 23: Noche Planetaria Azul — Soneto oscuro
  - Kin 24: Semilla Espectral Amarilla — Copla de siembra
- **Drone:** 141.27 Hz (Garganta, Mercury)
- **Wavespell:** Mago (Blanco), positions 8-11

#### Energy Arc
- H1-H4: Onda Dragón (Rojo) — Nacimiento → Vitalidad → Corazón → Visión
- H5-H6: Onda Mago (Blanco) — Reflexión → Renacimiento
- H6 mirrors H1 at higher octaves (same seals, different tones)

## remotion-poc (Remotion, puente de render)

- **Etapa actual:** PENDIENTE — confirmar con usuario.
- **Issues conocidos (detectados por auditor-codigo, 2026-08-21):** imports relativos rotos en `src/` (`./Root`, `./components/GlowBackground`, `./components/MayaGlyph`, `./components/ToneNumeral`, `./components/TeaserText`, `./GlyphTunnelScene`, `./EntranceAct`, `./OutroAct`, `./KinTeaser`, `./meditation/MeditationDemo`, `./meditation/LemaStill`). Estos deben resolverse antes de que el render lab funcione.
- **DO-NOT-REPEAT:** (vacío)

---

## ⚠️ Estado de este archivo

Reglas de continuidad cargadas el 2026-08-24 a partir del reporte de hickups del usuario.
Si aparecen NUEVOS hickups recurrentes, añadirlos abajo en la sección correspondiente.

---

## Nota video especial 2026-08-27

- **Video especial eclipse** generado 2026-08-24 en club-sincronica/content/output/2026-08-27/video-preview-special.mp4.
- Audio: ideo especial eclipse luna en piscis.mp3 (narracion real del Alquimista sobre eclipse total de Luna en Piscis).
- Subcarpeta de trabajo: club-sincronica/content/output/2026-08-27/special/ con logs y backups.
- El video diario ideo-preview.mp4 se mantuvo intacto (backup en special/).
- Duracion: ~111.8s (1:51), 15 frames, Kin 1: Dragon Magetico Rojo.

---

## Progreso H1 (2026-08-27)

- **Audio generado:** `pipeline-viral/content/meditation-output/2026-08-28/audio-mezcla.wav` (720s, 12 min).
- **Actos H1:** 1=Respiración, 2=Nutrir (Kin 1), 3=Comunicar (Kin 2), 4=Soñar (Kin 3), 5=Atinar (Kin 4), 6=Cierre.
- **Nuevo lecho natural (bedPlan):** campos@0s, grillos@0s (pan orgánico), olas@84s (inicio Acto 2, targetRms 0.02), rios@120s.
- **Capa kin-tones añadida:** tonos gentiles por kin (octava + 5ta de su chakra) durante actos 2-5 con fade-in/out 20s.
- **Remotion data json actualizado:** `remotion-poc/src/data/meditacion-2026-08-28.json` con actos H1 y sound.nature.entrances actualizado.
- **Video H1 renderizado:** `remotion-poc/out/H1.mp4` (21600 frames, 30fps, 12 min, 360.9 MB).
- **Composición:** EntranceAct (acto 1), GlyphTunnelScene con power word + lema que aparece/desaparece (actos 2-5), OutroAct con logo (acto 6).
- **Estado:** ✅ COMPLETADO
