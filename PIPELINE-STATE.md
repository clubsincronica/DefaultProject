# PIPELINE-STATE.md — estado vivo de los 3 pipelines

Fuente de verdad del estado actual. Cárgala y ACTUALÍZALA antes/depués de cada sesión de trabajo.
Formato: estado por proyecto + hitos + DO-NOT-REPEAT (correcciones que nunca deben repetirse).

---

## club-sincronica (shorts diarios)

- **Etapa actual:** producción diaria (Fase 1, aprobación humana). **EN CURSO (2026-08-24):** alinear la estructura de los videos al ejemplo canónico del 24 ago.
- **Hitos:** pipeline diario en `club-sincronica/AGENTS.md` (orden: guion → grabación → transcripción → storyboard → música → publicación).
- **Publicación:** Buffer (FB/IG/TikTok/LinkedIn) + YouTube Shorts (ruta directa).
- **LOTE DE REFERENCIA:** los videos del **17–24 ago** son el EJEMPLO CANÓNICO. Sus mejoras son la norma a preservar; NO se revierten. El storyboard canónico es `storyboard-audio.js` (desde transcripción real).
- **DO-NOT-REPEAT:**
  - NO volver a `render.js` para el storyboard. El camino canónico es el storyboard DESDE la transcripción real del audio grabado (`storyboard-audio.js`), no desde el guion escrito.
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
