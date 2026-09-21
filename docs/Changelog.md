# Changelog — Club Sincrónica + Pipeline Viral

Historial de fixes y hitos principales. Fuente complementaria a `PIPELINE-STATE.md`.

---

## 2026-09-20

- **Limpieza de archivos basura:** eliminados 3 archivos vacíos con nombres rotos en `pipeline-viral/scripts/` (`{try{const`, `console.error(e))`, `200`).
- **Git hygiene:** 43 commits de pipeline-viral pusheados a origin (incluyendo H7-H10 scripts, Orca integration, cloudinary, whisper, operational docs).
- **Diagnóstico estructural:** creado `docs/superpowers/plans/2026-09-20-diagnostico-estructural.md` con 3 planes de mejora.
- **Docs fixes:** creado `docs/Changelog.md` (este archivo), `docs/Plans/Frame-Improvement.md`. Actualizado `auditor-codigo.config.json` para eliminar referencia a `PLAN-VIRAL.md` borrado.
- **Graphify regenerado:** grafo actualizado con nodos Orca + Obsidian.

## 2026-09-17

- **H7-H8 voz real grabada + whisper + trim 600s:** H7 raw 571s → trimmed 600s (Δ act3 +47s, act4 +15s, act5 +19s). H8 raw 605s → trimmed 600s (Δ +7/+9/0/+9/+22s). Trimmed en `club-sincronica/.../H*-trimmed.wav` y copiado a `pipeline-viral/assets/audio/recordings/`.
- **H7-H10 guiones completados:** modo B artesanal, voz real continua 600s, 180-260w/acto.
- **kin-data.js BLOCKS 7-10:** expandido de 6 a 10 blocks.
- **meditar.js voz real:** volume 0.92 + atrim/pad, opts.voiceFile.

## 2026-09-16

- **King Maya Whisper bug FIX:** sed en `transcribe-timed.js` corrige king/quim/kim/quin maya → "Kin Maya" + galáctico/eléctrica. 10/14 transcripciones del batch Sep 17-30 corregidas. Videos re-renderizados y re-subidos a Cloudinary.

## 2026-09-14

- **publish-pack.js fix:** Act 1 (Respiración) ya no muestra info de kin en timestamps. `schedule-buffer.js` actualizado para ser dinámico.

## 2026-09-13

- **kinCarta quota fix:** aplicado en club-sincronica frames.
- **Mux fix:** Remotion mete pista AAC muda. Fix: `-map 0:v:0 -map 1:a:0` en assemble.

## 2026-09-08

- **Lote completo club-sincronica:** 7 videos Sep 10-16 (Kin 15-21) producidos. Publicación via Buffer + YouTube directo.

## 2026-08-21

- **Grafo graphify inicial:** primer grafo generado del codebase completo.

## 2026-08-17 a 2026-08-24

- **Batch canónico club-sincronica:** videos de referencia con composición inteligente y aspecto garantizado vía `render.js` v2. Este batch es el ancla de calidad del proyecto.
