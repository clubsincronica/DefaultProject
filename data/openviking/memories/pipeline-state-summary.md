# OpenViking Memory Summary — Club Sincronica Pipelines

## Current State (as of 2026-09-25)

### club-sincronica (shorts diarios)
- **Etapa:** produccion diaria (Fase 1, aprobacion humana)
- **LOTE COMPLETADO:** 7 videos Sep 10-16 (Kin 15-21)
- **Pipeline:** tzolkin → astro → generate-day → guion → grabacion → transcripcion → validate-astro → storyboard → musica → frames → assemble → publicacion
- **DO-NOT-REPEAT:** 14 hard rules (frame durations, colors, numerals, audio, etc.)

### pipeline-viral (Kin Harmonic 10min+)
- **Etapa:** H1-H8 COMPLETADO. H7 y H8 publicados
- **H7:** https://youtu.be/weebjoc890g (309MB)
- **H8:** https://youtu.be/JeS82kwTpZ0 (313MB)
- **Pipeline:** tzolkin → chakra-freq → journey-composer → soundscape → breath-sync → reversion → visual-meditation → assemble-meditation
- **DO-NOT-REPEAT:** 9 hard rules (mux, timestamps, voice real, whisper trim, etc.)

### remotion-poc (Render lab)
- **Etapa:** Render diario funcional (DailyShort) con crossfade suave
- **DECISIÓN:** assemble.js (ffmpeg directo) es SUFICIENTE
- **Issues:** imports relativos rotos en src/ (pending fix)
- **DO-NOT-REPEAT:** Crossfade: fadeIn * fadeOut, NOT Math.min()

## OpenViking Integration Benefits

### Token Diet (63% reduction)
- Context organized as virtual file system `viking://`
- Directory-recursive retrieval instead of flat vector chunks
- L0/L1/L2 tiered loading (abstract → overview → detail)

### Cross-Pipeline Continuity
- Single source of truth for DO-NOT-REPEAT rules
- Persistent memory across sessions
- Stable `viking://` URIs for all project context

### Retrieval Traces
- Complete directory browsing history preserved
- Enables optimization of repeated queries
- Guides retrieval logic improvement over time