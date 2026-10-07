# AGENTS.md — <PROJECT_NAME>

Repo raíz del proyecto <PROJECT_NAME>. Este archivo es la autoridad de despacho:
antes de cualquier trabajo, identifica el contexto por palabras clave y carga los
documentos indicados.

## Proyectos y palabras clave (dispatcher)

Antes de cualquier trabajo, identifica el proyecto por estas palabras y CARGA su
`AGENTS.md` + su estado en `PIPELINE-STATE.md`:

- **<PROJECT_NAME>** (principal): `<PROJECT_NAME>`, palabras clave del proyecto.
  - Contexto: `<PROJECT_NAME>/AGENTS.md` (autoridad máxima para ese pipeline).

## REGLA DE CONTINUIDAD (evita regresiones)

> **SIEMPRE lee `PIPELINE-STATE.md` (en la raíz) ANTES de empezar trabajo en cualquier pipeline.**
> Es la fuente de verdad del estado actual, los hitos y la lista DO-NOT-REPEAT.
> Si descubres un hickup, una corrección que tuviste que repetir, o avanzas de etapa:
> **ACTUALIZA `PIPELINE-STATE.md` inmediatamente** y haz commit. Así la próxima sesión no repite el error.

- Cada pipeline avanza por ETAPAS. No reinicies desde cero salvo que `PIPELINE-STATE.md` lo diga.
- Las correcciones manuales a scripts NO deben perderse: si un script regenera un archivo desde plantilla y pisa ediciones, apúntalo en DO-NOT-REPEAT.
- Los 3 proyectos son repos git SEPARADOS; este repo raíz solo versiona el andamiaje (auditor, docs).
