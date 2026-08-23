# PIPELINE-STATE.md — estado vivo de los 3 pipelines

Fuente de verdad del estado actual. Cárgala y ACTUALÍZALA antes/depués de cada sesión de trabajo.
Formato: estado por proyecto + hitos + DO-NOT-REPEAT (correcciones que nunca deben repetirse).

---

## club-sincronica (shorts diarios)

- **Etapa actual:** PENDIENTE — confirmar con usuario (¿en producción diaria? ¿aprobación humana Fase 1?)
- **Hitos:** pipeline diario definido en `club-sincronica/AGENTS.md` (orden: guion → grabación → transcripción → storyboard → música → publicación).
- **Publicación:** Buffer (FB/IG/TikTok/LinkedIn) + YouTube Shorts (ruta directa).
- **DO-NOT-REPEAT:** (vacío — completar con los hickups reales que reportes)
- **Issues conocidos:** (vacío)

## pipeline-viral (Kin Harmonic 10min+)

- **Etapa actual:** PENDIENTE — confirmar con usuario.
- **Último publicado (según memoria de sesión previa):** Harmonic 64 = kins 253-256. CONFIRMAR si sigue siendo el último.
- **Scripts clave:** `soundscape.js`, `voice-layer.js`, `visual-meditation.js`, `visual-watercolor.js`, `strudel-render.js`, `deliver.js`, `make-thumbnail.js`.
- **DO-NOT-REPEAT:** (vacío — completar)
- **Issues conocidos:** (vacío)

## remotion-poc (Remotion, puente de render)

- **Etapa actual:** PENDIENTE — confirmar con usuario.
- **Issues conocidos (detectados por auditor-codigo, 2026-08-21):** imports relativos rotos en `src/` (`./Root`, `./components/GlowBackground`, `./components/MayaGlyph`, `./components/ToneNumeral`, `./components/TeaserText`, `./GlyphTunnelScene`, `./EntranceAct`, `./OutroAct`, `./KinTeaser`, `./meditation/MeditationDemo`, `./meditation/LemaStill`). Estos deben resolverse antes de que el render lab funcione.
- **DO-NOT-REPEAT:** (vacío)

---

## ⚠️ Qué reporterme para llenar esto

Para que las regresiones se detengan, necesito que me describas los HICKUPS RECURRENTES que has visto
(cada pipeline por separado): ¿qué "etapa temprana" se repite, qué corrección tuviste que hacer varias veces?
Los anoto aquí como DO-NOT-REPEAT y la próxima sesión los respeta.
