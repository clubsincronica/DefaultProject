# Plan de Mejora de Frames — Club Sincrónica

**Estado:** Pendiente (feedback del Alquimista, 2026-09-16)  
**Prioridad:** Media — mejora visual sin bloquear producción

---

## Problema Actual

Los frames de aspecto astral muestran los planetas del aspecto pero sin círculo/marca en la carta astral. El usuario ve los símbolos pero no puede ubicarlos en la carta.

## Propuesta

Duplicar el frame de aspecto:
1. **Frame A:** Símbolos de planetas solos (actual, simplificado)
2. **Frame B:** Carta astral con el aspecto marcado (círculo/resaltado en la posición del aspecto)

Esto da contexto visual completo: primero los símbolos, luego su ubicación en la carta.

## Reglas DO-NOT-REPEAT relevantes

- `render.js` garantiza aspecto: `elAspecto` centrado, `cartaAstral` max 2, `kinCarta` = 25%.
- Subtítulos: `ty=-40`, `blockCenter=1500`, maxLines=4.
- Oracle: centrado, radio 240.
- Brand: wave color palette, NEVER fixed blue `DEEP`.

## Archivos a modificar

- `club-sincronica/scripts/render.js` — lógica de frame de aspecto
- `club-sincronica/scripts/frames.js` — composición de frames

## Criterio de éxito

- Frame de aspecto muestra carta astral con aspecto marcado
- Sin regresiones en otros frames (cartouche, oracle, hook, outro)
- Batch de referencia (Aug 17-24) sigue siendo el ancla de calidad
