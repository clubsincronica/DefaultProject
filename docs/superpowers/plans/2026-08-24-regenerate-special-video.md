# Regeneración video especial eclipse 2026-08-27

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Regenerar el video especial para el eclipse del 27/08/2026 usando la transcripción y audio actualizados, produciendo ideo-preview-special.mp4 en una subcarpeta para evitar confusión con el video diario.

**Architecture:** Seguir el pipeline estándar de Club Sincrónica: storyboard-audio.js → frames.js → assemble.js, pero dirigiendo la salida a una subcarpeta y usando el audio especial.

**Tech Stack:** Node.js v22, ffmpeg 8.1.2, scripts del pipeline club-sincronica.

## Global Constraints

- No sobre escribir ideo-preview.mp4 existente (video diario del batch 25-09-01).
- Usar la transcripción actualizada 	ranscripcion-timed.md que contiene los segmentos del especial eclipse.
- Usar el audio especial ideo especial eclipse luna en piscis.mp4 como pista de voz.
- Output final: content/output/2026-08-27/video-preview-special.mp4.
- Mantener trazabilidad: guardar frames intermedios en subcarpeta.
