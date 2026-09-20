# Default Project — Club Sincrónica

3 proyectos Node/React de contenido diario para @clubsincronica. Presupuesto €0.

## Qué produce

- **Shorts diarios** (60-120s): Kin del día → video para YouTube Shorts, TikTok, IG Reels, LinkedIn
- **Meditaciones largas** (10+ min): Kin Harmonic → video para YouTube con sonidosphere + voz re-versionada
- **Render lab** (Remotion): Bridge de render React que ambos pipelines usan

## Cómo producir el video de un día

### Club Sincrónica (short diario)

```bash
cd club-sincronica
node scripts/tzolkin.js YYYY-MM-DD        # 1. Motor Dreamspell
node scripts/astro.js YYYY-MM-DD          # 2. Tránsitos reales
node scripts/generate-day.js YYYY-MM-DD   # 3. Genera contexto.json
# 4. Escribir guión (humano + IA)
# 5. Grabar voz real (Alquimista)
node scripts/transcribe-timed.js YYYY-MM-DD   # 6. Whisper transcription
node scripts/validate-astro.js YYYY-MM-DD     # 7. Gate: ¿datos inventados?
node scripts/storyboard-audio.js YYYY-MM-DD   # 8. frames.json desde audio real
# 9. Componer patrón Strudel + renderizar música
node scripts/frames.js YYYY-MM-DD          # 10. SVG → PNG
node scripts/assemble.js YYYY-MM-DD        # 11. Ken Burns + voz → video
node scripts/publish-day.js YYYY-MM-DD     # 12. Textos + publicación
```

### Pipeline Viral (meditación larga)

```bash
cd pipeline-viral
node scripts/meditar.js YYYY-MM-DD                    # 1. Audio completo
node scripts/assemble-meditation.js YYYY-MM-DD        # 2. Montar MP4
node scripts/publish-pack.js YYYY-MM-DD               # 3. Textos publicación
```

## Proyectos

| Proyecto | Qué hace | AGENTS.md |
|----------|----------|-----------|
| `club-sincronica/` | Shorts diarios (Kin del día) | [lee](club-sincronica/AGENTS.md) |
| `pipeline-viral/` | Meditaciones largas (Kin Harmonic) | [lee](pipeline-viral/AGENTS.md) |
| `remotion-poc/` | Render lab (Remotion React) | [lee](remotion-poc/AGENTS.md) |

## Estado actual

Lee `PIPELINE-STATE.md` para el estado vivo de los 3 pipelines.

## Documentación

| Archivo | Propósito |
|---------|-----------|
| `AGENTS.md` | Dispatcher de proyectos por keyword |
| `PIPELINE-STATE.md` | Estado vivo + reglas DO-NOT-REPEAT |
| `SECRETS-MAP.md` | Inventario de credenciales (sin secretos) |
| `docs/ESTRUCTURA-CANONICA.md` | Reglas canónicas de calidad de video |
| `docs/CHANGELOG.md` | Historial de fixes (desde PIPELINE-STATE) |

## Credenciales

Ver `SECRETS-MAP.md`. Todas en carpetas `credentials/` o `assets/credentials/` (gitignored).

## Stack

- **Runtime:** Node.js v22, Python 3.13, ffmpeg 8.1.2
- **Render:** Remotion (React), SVG + sharp
- **Música:** Strudel (TidalCycles port)
- **Transcripción:** Whisper (Groq API)
- **Publicación:** Buffer API (FB/IG/TikTok/LinkedIn), YouTube Data API v3
- **Hosting video:** Cloudinary
- **AI auditor:** NVIDIA NIM (deepseek-v4-flash, gratis)
