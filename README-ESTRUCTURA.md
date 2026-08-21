# Estructura del "Default Project" — Club Sincrónica

Mapa general de la carpeta raíz después de la reorganización de 2026-08-21.
Todos los proyectos giran en torno a **Club Sincrónica**: un canal esotérico en español
(YouTube / Facebook / Instagram / TikTok) que publica el "kin" diario (Maya Tzolkin/Dreamspell).

## Proyectos activos (raíz)

| Carpeta | Rol | Publicación |
|---------|-----|-------------|
| `club-sincronica/` | **Shorts diarios** (~30-45s) del kin del día + cielo astrológico. Pipeline: `tzolkin.js → astro.js → generate-day.js → storyboard.js → frames.js → assemble.js` | YouTube (API directa) + Buffer/Cloudinary (FB/IG/TikTok/LinkedIn) + n8n |
| `pipeline-viral/` | **Videos largos "Kin Harmonic"** (10+ min) = bloque de 4 kin consecutivos. Último publicado: **Harmonic 64** (kins 253-256, 2026-08-20) | Hoy MANUAL desde `publicacion.md` + thumbnail; MP3 a Google Drive vía `deliver.js` |
| `remotion-poc/` | **Laboratorio Remotion** (React+Chromium). Empezó como POC del teaser; hoy es la ruta de render de los videos largos. Lee de `pipeline-viral` y `club-sincronica` (solo lectura) | Produce `out/meditacion-*.mp4` (consumido por la publicación) |

## Cómo se conectan

```
club-sincronica  ──(maya-glyphs.js)──►  remotion-poc
      │                                    ▲
      └────(voz real del Alquimista)───────┤
                                           │
pipeline-viral  ──(audio-mezcla.wav, patrones Strudel)──►  remotion-poc
```

- `remotion-poc` **importa** `PATHS` de `club-sincronica/scripts/maya-glyphs.js`.
- `remotion-poc/scripts/mux-medi.mjs` y `build-medi.mjs` **leen** `audio-mezcla.wav` y patrones
  desde `pipeline-viral/content/meditation-output/`.
- `pipeline-viral` reversiona la voz real grabada en `club-sincronica`.

## Carpetas de soporte (raíz)

| Carpeta | Qué es |
|---------|--------|
| `data/` | Vacía salvo para el store de memoria de OpenCode (`data/memory.json`, creado por el MCP memory). |
| `graphify-out/` | Grafo de conocimiento generado por el plugin graphify. |
| `toolbox/` | Plugins/skills/opencode compartidos (tooling global). |
| `.opencode/` | Config/agents/commands de OpenCode para este workspace. |
| `opencode.json` | Config global de OpenCode (providers, MCP, plugins). |

## _legado/  (archivado — no es código activo)

Fragmentos y datos históricos movidos aquí para limpiar la raíz (sin borrar nada):

| Subcarpeta | Origen | Contenido |
|------------|--------|-----------|
| `club-fragmento/` | `club/sincronica/` | fragmento con un `guion.md` (2026-08-08) |
| `venv-tts-duplicado/` | `Project/club-sincronica/.venv-tts` | copia redundante del venv Pocket TTS (el real vive en `club-sincronica/.venv-tts`) |
| `data-voicebox-legado/` | `data/voicebox.db` + `data/backends/` | legacy de Voicebox (sustituido por Pocket TTS) |
| `scripts-utils/` | `scripts/*.py` | utilidades sueltas (`_dedup.py`, `_truncate.py`) |
| `docs-ops/` | `docs/superpowers/` | docs de operación (token diet) sueltas en la raíz |
| `sueltos-raiz/` | `publish_h64.js` (vacío), `reporte-coincidencias-remoto.md` | `publish_h64.js` estaba vacío; el `.md` es una búsqueda de empleo ajena al pipeline |

## Documentación de seguridad

- `SECRETS-MAP.md` — auditoría de credenciales/tokens (sin valores secretos): dónde viven,
  qué script las usa, y estado de `.gitignore`. Léelo antes de tocar credenciales.

## Notas de reorganización

- No se movió ningún proyecto activo. Solo se archivaron fragmentos/legado a `_legado/`.
- Las credenciales de ambos proyectos activos siguen bajo `.gitignore` (verificado).
- `data/` se conservó vacía para que el MCP memory de OpenCode pueda escribir `memory.json`.
