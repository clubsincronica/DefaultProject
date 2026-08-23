# PIPELINE-STATE.md — estado vivo de los 3 pipelines

Fuente de verdad del estado actual. Cárgala y ACTUALÍZALA antes/depués de cada sesión de trabajo.
Formato: estado por proyecto + hitos + DO-NOT-REPEAT (correcciones que nunca deben repetirse).

---

## club-sincronica (shorts diarios)

- **Etapa actual:** producción diaria (Fase 1, aprobación humana). **EN CURSO (2026-08-24):** alinear la estructura de los videos al ejemplo canónico del 24 ago.
- **Hitos:** pipeline diario en `club-sincronica/AGENTS.md` (orden: guion → grabación → transcripción → storyboard → música → publicación).
- **Publicación:** Buffer (FB/IG/TikTok/LinkedIn) + YouTube Shorts (ruta directa).
- **LOTE DE REFERENCIA:** los videos del **17–24 ago** son el EJEMPLO CANÓNICO (calidad: composición inteligente con aspecto garantizado, vía `render.js` v2). El estándar actual = `storyboard-audio.js` (beats desde transcripción) + `render.js` (composición con reglas de marca) EN ARMONÍA.
- **DO-NOT-REPEAT (reglas duras, ver `club-sincronica/docs/ESTRUCTURA-CANONICA.md`):**
  - **NO usar `storyboard-audio.js` solo y descartar `render.js`.** La regresión del 25-31 ago vino de eso: se perdieron duración mínima, oráculo temprano, aspecto y reglas de marca. Canónico = AMBOS: `storyboard-audio.js` da los beats reales; `render.js` (`pickEl` + `elAspecto`) compone con reglas de marca.
  - Duración mínima de frame 3.0 s (clamp); oráculo debe aparecer temprano (umbral +3 s tras cartouche), NO tardío.
  - Aspecto GARANTIZADO por `render.js`: `elAspecto` con símbolos centrados bajo título, separación 160 px, escala 1.6, conjunción a escala media; `cartaAstral` máx 2 aspectos; `kinCarta` ≤ 25 % del frame; fallback de aspecto presente.
  - Sin mojibake: encoding `Â·` → `-`. Numerales maya `GAP 26`. Radio de oráculo 240. Subtítulos 42/36/30 px. Ortografía: "Club Sincrónica" / "Kin Maya" (NUNCA "King Maya", "Quim Maya", "quimaya").
  - NO perder las mejoras del lote 17–24 ago: son el estándar. Si al regenerar archivos desde plantilla se pisan esas ediciones, DETENER y reportar, no continuar.
- **Issues conocidos:** (vacío)

## pipeline-viral (Kin Harmonic 10min+)

- **Etapa actual:** **EN CURSO H65** (siguiente tras H64).
- **Último publicado:** **Harmonic 64 = kins 253-256** (confirmado por usuario 2026-08-24). Es el BLUEPRINT canónico.
- **BLUEPRINT:** H64 es el molde ideal de los videos Kin Harmonic (estructura de acts, soundscape, render). Úsalo como referencia para H65+, pero ADAPTA por kin (NO copiar literal).
- **Scripts clave:** `soundscape.js`, `voice-layer.js`, `visual-meditation.js`, `visual-watercolor.js`, `strudel-render.js`, `deliver.js`, `make-thumbnail.js`.
- **DO-NOT-REPEAT:**
  - Aplicar las mejoras de H64 a los siguientes harmonics (H65+) POR DEFECTO. No esperar a que se pida: si H65+ no trae las mejoras de H64, es regresión.
  - **Usar Remotion (remotion-poc) para producir los videos.** pipeline-viral NO debe olvidar/regresar a un camino sin Remotion.
  - **Correlación de título en acts 2-3-4-5:** usar la "palabra de poder" (power word) del kin destacado de ese acto. Corregido en H65; debe mantenerse.
- **Issues conocidos:** (vacío)

## remotion-poc (Remotion, puente de render)

- **Etapa actual:** PENDIENTE — confirmar con usuario.
- **Issues conocidos (detectados por auditor-codigo, 2026-08-21):** imports relativos rotos en `src/` (`./Root`, `./components/GlowBackground`, `./components/MayaGlyph`, `./components/ToneNumeral`, `./components/TeaserText`, `./GlyphTunnelScene`, `./EntranceAct`, `./OutroAct`, `./KinTeaser`, `./meditation/MeditationDemo`, `./meditation/LemaStill`). Estos deben resolverse antes de que el render lab funcione.
- **DO-NOT-REPEAT:** (vacío)

---

## ⚠️ Estado de este archivo

Reglas de continuidad cargadas el 2026-08-24 a partir del reporte de hickups del usuario.
Si aparecen NUEVOS hickups recurrentes, añadirlos abajo en la sección correspondiente.
