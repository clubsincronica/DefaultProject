# AGENTS.md — Default Project (scaffolding de Club Sincrónica)

Repo raíz que orquesta 3 proyectos Node/React de presupuesto cero. NO es un proyecto en sí: es el andamiaje (auditor, docs, estructura).

## Proyectos y palabras clave (dispatcher)

Antes de cualquier trabajo, identifica el proyecto por estas palabras y CARGA su `AGENTS.md` + su estado en `PIPELINE-STATE.md`:

- **club-sincronica** (shorts diarios): `club`, `sincronica`, `diario`, `short`, `kin del día`, `Buffer`, `YouTube Shorts`.
  - Contexto: `club-sincronica/AGENTS.md` (autoridad máxima para ese pipeline).
- **pipeline-viral** (videos Kin Harmonic 10min+): `viral`, `harmonic`, `kin harmonic`, `meditation`, `10 min`, `soundscape`.
  - Contexto: `pipeline-viral/AGENTS.md` + `pipeline-viral/PLAN-VIRAL.md`.
- **remotion-poc** (lab de render Remotion, puente): `remotion`, `poc`, `render lab`.
  - Lee de los otros dos; es el puente de render.
- **bible** (estructura canónica / "la biblia" — retoma desde donde quedamos): `bible`, `bible club`, `bible viral`, `canon`, `estructura canonica`, `keyword bible`.
  - Carga SIEMPRE: `docs/ESTRUCTURA-CANONICA.md` (bible de club-sincronica) + `PIPELINE-STATE.md` (estado vivo + DO-NOT-REPEAT). "bible viral" aún no tiene doc propio: usar la sección pipeline-viral de `PIPELINE-STATE.md` (H64 = blueprint).

## REGLA DE CONTINUIDAD (evita regresiones)

> **SIEMPRE lee `PIPELINE-STATE.md` (en la raíz) ANTES de empezar trabajo en cualquier pipeline.**
> Es la fuente de verdad del estado actual, los hitos y la lista DO-NOT-REPEAT.
> Si descubres un hickup, una corrección que tuviste que repetir, o avanzas de etapa:
> **ACTUALIZA `PIPELINE-STATE.md` inmediatamente** y haz commit. Así la próxima sesión no repite el error.

- Cada pipeline avanza por ETAPAS. No reinicies desde cero salvo que `PIPELINE-STATE.md` lo diga.
- Las correcciones manuales a scripts NO deben perderse: si un script regenera un archivo desde plantilla y pisa ediciones, apúntalo en DO-NOT-REPEAT.
- Los 3 proyectos son repos git SEPARADOS; este repo raíz solo versiona el andamiaje (auditor, docs).

## Auditor de código

`auditor-codigo.js` (raíz) escanea los 3 proyectos. Manual: `node auditor-codigo.js`. Nocturno: `n8n-workflows/audit-code-nightly.json`. No commitear secretos (ver `SECRETS-MAP.md`).
