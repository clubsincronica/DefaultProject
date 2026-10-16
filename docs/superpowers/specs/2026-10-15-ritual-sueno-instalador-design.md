# Design: Ritual del Sueño (instalador → AGENTS.md personalizado)

Fecha: 2026-10-15
Estado: aprobado por el usuario (opción 1: ritual DURANTE/tras la instalación, interactivo, lúdico, con chistes)

## Objetivo

Que una persona con un proyecto de vida (pero que no sabe por dónde arrancar)
instale OpenCode y salga con un **AGENTS.md profundamente personalizado**:
su nombre, su sueño, sus límites, su estilo y su faro a un año. La instalación
se siente como **empezar una aventura**, no como hacer un trámite.

Es la pieza central del "Pack Sueños" (fase 1: gratis en el círculo interno del
Alquimista; fase 2: producto con web e i18n).

## Decisión de producto

- **Fase 1:** ritual de 11 preguntas, en español, interactivo y con chistes.
- **Dónde corre:** tras el scaffold del instalador (botón "Ritual del Sueno" en
  el wizard) **y** como script independiente re-ejecutable sobre cualquier
  carpeta de proyecto (para quienes ya tienen OpenCode instalado, p.ej. LAHUN).
- **Quién redacta el AGENTS.md:** un LLM gratis si hay key disponible
  (`NVIDIA_API_KEY` o `OPENROUTER_API_KEY` en el entorno); si no, un
  **generador determinístico** que interpola las 11 respuestas en una plantilla
  sólida. El instalador jamás pide ni guarda keys (regla "guide-only" vigente).

## Las 11 preguntas (orden aprobado)

1. ¿Cómo te llamás?
2. ¿Qué cosas te importan en la vida?
3. ¿Qué te frena hoy?
4. ¿En qué sos bueno/a?
5. ¿Cuánto tiempo por día le podés dedicar?
6. Ahora sí: ¿qué sueño tuyo te gustaría cumplir?
7. ¿Por qué te importa ese sueño en particular?
8. ¿Cómo te gusta que te hablen?
9. ¿Qué NO querés que te haga?
10. ¿Tu asistente tiene nombre? (o lo elige él — estilo "Ozzy")
11. Si todo sale bien dentro de un año, ¿qué estás celebrando?

Cada pregunta lleva: enunciado, pista (hint) suave y un **chiste/comentario
lúdico** que se muestra mientras la persona piensa.

## Componentes

### 1. `opencode-installer/Ritual-Del-Sueno.ps1` (nuevo)

UTF-8 **con BOM** (PowerShell 5.1 lo lee bien; el texto vive en payload, NO se
compila al exe — mantiene el "ASCII-only" del instalador compilado).

Funciones puras (testables, sin UI ni red):
- `Get-RitualPreguntas` → array de 11 objetos `{ id, enunciado, pista, chiste }`.
- `Build-AgentsMdFallback($Answers)` → string markdown con las respuestas
  interpoladas (identidad, misión/sueño, estilo, reglas/límites, tiempo, faro).
- `Invoke-AgentsLlm($Answers)` → llama a NIM u OpenRouter si hay key en env;
  devuelve markdown o `$null` (nunca lanza; fallback silencioso).
- `Save-Ritual($ProjectDir, $Answers, $AgentsMd)` → escribe `AGENTS.md`
  (respaldando el previo como `AGENTS.md.ritual-backup`) +
  `data/ritual-sueno.json` con las respuestas crudas.

UI (solo si se ejecuta directo): `Show-RitualWizard` — formulario WinForms de
11 pasos: barra "Pregunta N/11", enunciado, textbox multilinea, pista, chiste
rotativo, botones Atrás/Siguiente, y al final "Generar mi AGENTS.md".

### 2. Cableado en `Install-OpenCode.ps1`

Nuevo botón ASCII "Ritual del Sueno" (sin acentos en el exe compilado). Al
hacerlo click, ejecuta el script del payload apuntando al `$state.ProjectDir`.
El ritual es opcional: el instalador sigue funcionando sin él.

### 3. `Build-Exe.ps1`

Stagea `Ritual-Del-Sueno.ps1` al payload (`dist/payload/opencode-installer/`).

### 4. LLM (gratis, sin costo)

- **NVIDIA NIM:** `https://integrate.api.nvidia.com/v1/chat/completions`,
  modelo `deepseek-ai/deepseek-v4-flash` (el mismo del auditor jcode), key
  `$env:NVIDIA_API_KEY`.
- **OpenRouter (fallback de proveedor):** `https://openrouter.ai/api/v1/chat/completions`,
  modelo `openai/gpt-4o-mini`, key `$env:OPENROUTER_API_KEY`.
- Prompt de sistema (es): produce un `AGENTS.md` con secciones fijas —
  Identidad (nombre del asistente y del usuario), Tu sueño (misión), Cómo
  hablarte, Reglas (incl. lo que NO hacer), Tu tiempo, Tu faro a un año.
  Pide solo markdown, sin inventar datos, sin secretos. Se validan: no vacío,
  contiene el nombre del usuario; si no, fallback.

### 5. Generador determinístico (fallback y modo offline)

Interpola las 11 respuestas en una plantilla con las mismas secciones. Sin
dependencias de red. Es la base de los tests.

### 6. Tests `opencode-installer/tests/Ritual.Tests.ps1` (Pester)

- `Get-RitualPreguntas` devuelve exactamente 11, en el orden aprobado, con
  enunciado/pista/chiste no vacíos.
- `Build-AgentsMdFallback` produce markdown que contiene el nombre, el sueño,
  la celebración del año y las reglas "NO hacer"; no está vacío.
- `Invoke-AgentsLlm` sin keys en env devuelve `$null` (sin lanzar).
- El JSON de respuestas se escribe/lee redondo (Save-Ritual → data/ritual-sueno.json).
- Encoding: el .ps1 tiene BOM UTF-8 (los acentos no se rompen).

## Flujo de uso

1. Persona corre `OpenCode-Setup.exe` (o ya tiene OpenCode).
2. (Opcional) consigue keys gratis con el botón "Get free keys".
3. Abre el ritual → responde 11 preguntas divertidas.
4. El ritual genera su `AGENTS.md` (LLM si hay key; si no, plantilla).
5. Abre OpenCode en su proyecto: su asistente ya lo conoce y tiene un sueño.

## Seguridad / límites

- Keys solo de variables de entorno del usuario; el ritual las LEE, nunca las
  escribe ni las muestra.
- El AGENTS.md generado no lleva secretos ni datos sensibles.
- El ritual no instala nada ni toca la config global; solo escribe en el
  proyecto (AGENTS.md + data/ritual-sueno.json).

## Fuera de alcance (fase 2, por ahora)

- Web de onboarding, i18n multi-idioma, tienda/pagos, plantillas por vertical
  (creador/músico/emprendedor). El ritual es agnóstico al sueño.
