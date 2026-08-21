# Diseño: Auditor de Código para todo el Scaffolding (jcode de código)

Fecha: 2026-08-21
Estado: Aprobado (diseño)
Autor: opencode (sesión de brainstorming)

## Contexto

Club Sincrónica tiene tres proyectos de código activos en la raíz (`club-sincronica`,
`pipeline-viral`, `remotion-poc`) que comparten dependencias cruzadas (p.ej. `remotion-poc`
importa `PATHS` de `club-sincronica/scripts/maya-glyphs.js` y lee audio de `pipeline-viral`).
Ya existe un auditor nocturno de *contenido* (`club-sincronica/scripts/jcode-auditor.js`)
que revisa el guion diario contra las reglas de marca y produce `critica-*.md`.

Este diseño propone un **auditor de código** nuevo, de alcance scaffolding-wide, que cubre
4 dimensiones: calidad/limpieza, seguridad (fugas de secretos), salud de dependencias
cruzadas, y drift docs↔código. Es híbrido (estático determinista + LLM vía jcode/NIM),
se ejecuta manual y nocturno, y entrega reporte + tareas.

## Decisiones ya tomadas (con el usuario)

- **Dimensiones:** calidad/limpieza, seguridad/fugas, dependencias cruzadas, drift docs↔código.
- **Ejecución:** ambos — nocturno automático (n8n) + manual on-demand.
- **Motor:** híbrido (estático determinista + LLM jcode/NIM).
- **Entregable:** reporte markdown legible + lista de tareas accionables.
- **Enfoque:** A — nuevo `auditor-codigo.js` en la raíz que reusa la cadena de proveedores.

## 1. Arquitectura y componentes

- **`auditor-codigo.js`** (raíz, Node ESM): orquestador único. Funciones:
  `staticChecks()`, `llmChecks()`, `writeReport()`, `writeTasks()`, `main()`.
- **`auditor-codigo.config.json`** (raíz): alcance y excludes.
  ```json
  {
    "projects": [
      "club-sincronica/scripts",
      "pipeline-viral/scripts",
      "remotion-poc/src",
      "remotion-poc/scripts"
    ],
    "docs": [
      "README-ESTRUCTURA.md",
      "SECRETS-MAP.md",
      "club-sincronica/AGENTS.md",
      "pipeline-viral/AGENTS.md",
      "pipeline-viral/PLAN-VIRAL.md"
    ],
    "exclude": ["node_modules", ".git", "credentials", "graphify-out", "_legado", "out", "dist", "build"]
  }
  ```
- **Reuso de infra jcode:** lee `JCODE_NIM_KEY` / `JCODE_OMNI_KEY` desde
  `club-sincronica/scripts/jcode-auditor.config.json` (o `process.env`) y llama al mismo
  `jcode.exe` (`C:/Users/tom_w/AppData/Local/jcode/bin/jcode.exe`) con fallback
  `nim-api` → `omni`. Usa `execFileSync` (args en array) para evitar el arg-mangling de PowerShell.
- Sin módulos extra (YAGNI). Todo en un script.

## 2. Chequeos estáticos (deterministas, $0)

1. **Secretos:** regex sobre código + config:
   `api_key|secret|token|password|passwd|nvapi-[A-Za-z0-9]|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}`
   y URLs con credenciales embebidas (`https?://user:pass@`). Nunca imprime el valor:
   reporta `archivo:línea` + severidad + valor **enmascarado** (`nvapi-****…`).
   Excluye `credentials/` y el propio `auditor-codigo.config.json`.
2. **Dependencias cruzadas:** parsea `import ... from '...'` y `require('...')` con rutas
   relativas (empiezan por `.` o `..`). Resuelve el target relativo al archivo y marca los
   que no existen (detecta el puente `remotion-poc → club-sincronica/pipeline-viral` roto).
   También detecta imports de paquetes inexistentes (best-effort vía `node_modules` presente).
3. **Paths absolutos hardcodeados:** detecta `C:/Users/...`, `D:/...`, `/Users/...`,
   `/home/...` en código → riesgo de portabilidad (p.ej. la constante `JCODE` en
   `jcode-auditor.js`).
4. **Archivos basura / 0-byte / orphan:** reporta archivos vacíos o con nombres rotos
   (hay 3 en `pipeline-viral/scripts`: `200`, `{try{const`, `console.error(e))`).
5. **Duplicados / código muerto (best-effort, severidad baja):**
   - Hash de cuerpos de función (normalizados) para detectar lógica duplicada entre archivos.
   - Heurística de exports no referenciados dentro del set escaneado.

## 3. Chequeos LLM (jcode/NIM)

- **Calidad de código:** envía los **8 archivos más grandes por tamaño** (top 8, recortados a
  ~6k chars cada uno) + resumen de hallazgos estáticos; pide **≤5 mejoras** concretas con
  tag tipo `[regla]` y `Refs` (ruta de archivo + fragmento).
- **Drift docs↔código:** envía `AGENTS.md` (por proyecto) + `README-ESTRUCTURA.md` +
  `SECRETS-MAP.md` + la estructura real observada (árbol de carpetas escaneadas); pide
  señalar reglas obsoletas, rutas que ya no existen, o afirmaciones falsas.

El prompt LLM prohíbe herramientas y exige solo texto plano con la estructura de secciones
del reporte (igual patrón que el auditor de contenido actual).

## 4. Flujo de datos y salida

```
proyectos (carpetas de código) + docs raíz
        │
        ▼
staticChecks()  ──► hallazgos estáticos (JSON interno)
        │
        ▼
llmChecks()  ──► empaqueta contexto + hallazgos ──► jcode.exe (NIM→OmniRoute)
        │
        ▼
consolidar ──► writeReport() + writeTasks()
```

- **Salida 1 — `audit-code-YYYY-MM-DD.md`:** secciones
  `## Secretos`, `## Dependencias cruzadas`, `## Paths hardcodeados`,
  `## Archivos basura`, `## Calidad`, `## Drift docs`. Cada hallazgo con
  severidad (alta/media/baja) + `Refs` (ruta de archivo exacta).
- **Salida 2 — `audit-code-tasks.json`:** arreglo
  `{id, project, dimension, severity, file, description, ref}`.
- **Salida 2b — `audit-code-tareas.md`:** versión legible de las tareas agrupadas por proyecto.

## 5. Triggers e integración

- **Manual:** `node auditor-codigo.js [YYYY-MM-DD]` (fecha = etiqueta del reporte).
  Usa `execFileSync` como el auditor actual.
- **Nocturno:** nuevo workflow n8n `audit-code-nightly.json` en
  `club-sincronica/n8n-workflows/` que ejecuta el script y deja el reporte en la raíz
  (patrón reutilizado de `buffer-cross-post.json` / `youtube-upload.json`).

## 6. Manejo de errores y límites

- Fallback NIM → OmniRoute; si todos fallan, **los resultados estáticos se escriben igual**
  y la sección LLM queda marcada `no disponible`.
- Si falta un proyecto configurado, se omite con `console.warn` (no aborta).
- El escaneo de secretos **enmascara valores**; nunca los vuelca al reporte.
- El script **solo lectura** sobre el código: no modifica archivos de código, solo escribe
  reportes/tareas en la raíz.
- Límites de tamaño: recorta el contexto LLM (código a ~6k chars por archivo top-N, docs a
  ~4k chars) para controlar tokens (presupuesto cero / dieta de tokens del proyecto).

## 7. Verificación

- **Autotest de estáticos:** la primera corrida sobre el estado actual debe detectar los 3
  archivos basura de `pipeline-viral/scripts` y el path absoluto en `jcode-auditor.js`.
- **Baseline:** el reporte de la primera corrida sirve de línea base; las siguientes miden
  regresión/mejora.
- **LLM:** verificar que el fallback funciona y que, sin clave, la sección queda
  `no disponible` sin romper el reporte.

## Fuera de alcance (YAGNI)

- No aplica fixes automáticos (solo reporta + tareas).
- No escanea `node_modules` ni `credentials` (ya gitignored).
- No reemplaza ESLint/Prettier donde ya existan; es una capa de auditoría de scaffolding,
  no de formato.
- No audita el contenido diario (eso lo sigue haciendo `jcode-auditor.js`).
