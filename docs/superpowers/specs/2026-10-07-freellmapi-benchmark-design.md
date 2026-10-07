# Spec: freellmapi — instalación, conexión a OpenCode y benchmark A/B vs OmniRoute

Fecha: 2026-10-07
Estado: aprobado en diseño, pendiente de revisión del spec
Decisión Alquimista: enfoque A (script de benchmark automatizado)

## Objetivo

Instalar freellmapi como **alternativa que convive** con OmniRoute (no lo reemplaza),
conectarlo a OpenCode, y medir latencia + calidad + failover contra OmniRoute para
decidir con datos cuál queda como router principal.

## Contexto

- OpenCode hoy: provider `omniroute` en `http://localhost:20128/v1` (primario),
  provider `nvidia` directo, plugin `@azumag/opencode-rate-limit-fallback`.
- freellmapi: router open-source (MIT) de 34 providers gratis con failover,
  un solo endpoint OpenAI-compatible en `http://localhost:3001/v1`.
- Máquina Windows sin Docker, Node v22 disponible. Por eso: instalador `.exe`
  de GitHub Releases (app de bandeja, no ensucia el PATH).
- Keys disponibles para cargar: **OpenRouter, NVIDIA NIM, Google Gemini, Groq**.
- Repo: raíz `Default Project` (solo andamiaje local, no commitear secretos).

## Componentes

### 1. Instalación (manual asistida)

- Descargar `FreeLLMAPI-Setup.exe` desde
  `https://github.com/tashfeenahmed/freellmapi/releases/latest`.
- Instalar; verificar que el tray sirva `http://localhost:3001` y abra el dashboard.
- Las 4 keys se cargan en la página **Keys** del dashboard (input humano o entorno;
  jamás en git, ni en opencode.json en claro — ver `SECRETS-MAP.md`).

### 2. Integración con OpenCode

Agregar un bloque `freellmapi` en `~/.config/opencode/opencode.json`, **sin tocar**
el provider `omniroute` ni `nvidia`:

```json
"freellmapi": {
  "npm": "@ai-sdk/openai-compatible",
  "name": "FreeLLMAPI",
  "options": {
    "baseURL": "http://localhost:3001/v1",
    "apiKey": "{env:FREELLMAPI_KEY}"
  },
  "models": {
    "auto": { "name": "Auto (freellmapi)" },
    "auto:fast": { "name": "Auto Fast (freellmapi)" },
    "auto:smart": { "name": "Auto Smart (freellmapi)" }
  }
}
```

- `FREELLMAPI_KEY` = unified key del dashboard; se define como variable de entorno
  de usuario (fuera del repo) o en el arranque de OpenCode. Nunca en texto en git.
- El modelo por defecto de OpenCode (`opencode/deepseek-v4-flash-free`) **no cambia**
  en esta iteración.

### 3. Benchmark A/B — `bench-freellm.mjs` (raíz del repo)

Script Node sin dependencias (usa `fetch` nativo) que:

1. **Prompts**: set de 5, uno por categoría:
   - código (pedir un fix/refactor concreto),
   - guion (uno tipo guion de short del Club Sincrónica),
   - razonamiento ( puzzle lógico corto ),
   - contexto largo (~3k tokens de relleno + pregunta),
   - conversacional corto ("hola, ¿qué model sos?").
2. **Targets**: `http://localhost:20128/v1` (OmniRoute, modelo actual
   `auto/best-free` o `oc/deepseek-v4-flash-free`) vs `http://localhost:3001/v1`
   (freellmapi, `auto`). Misma prompt, misma forma de mensaje, `stream: true`.
3. **Métricas por corrida**: TTFT (ms hasta primer chunk), latencia total (ms),
   chars de respuesta, flag de corte (fin sin `finish_reason`/DONE).
   3 repeticiones por prompt → mediana.
4. **Failover (solo freellmapi)**: freellmapi salta de modelo en 429/5xx, así que
   la chain temporal se fuerza con (a) un modelo inexistente y (b) una key
   inválida, como dos intentos; se registra cuál dispara el salto. Verificar que
   la petición igual responde y que el header `X-Routed-Via` apunta a otro
   modelo. Si ninguno salta → `FAILOVER-FAIL`. Se revierte la chain después.
5. **Salida**: tabla markdown por consola + `bench-results.json` (fechado) en la
   raíz (agregar `bench-results*.json` a `.gitignore`).

**Fuera de alcance de calidad**: el juicio de calidad es humano (leer las 5
respuestas lado a lado). No hay LLM-as-judge.

### 4. Cierre

- Presentar tabla + veredicto; el humano decide.
- Actualizar `PIPELINE-STATE.md` (nueva sección/estado + DO-NOT-REPEAT si aplica)
  y commitear.
- Si gana freellmapi, el swap de default queda **pendiente para otra sesión**
  (fuera de este spec).

## Manejo de errores

- Si `:3001` no responde → el script aborta con mensaje "freellmapi no está corriendo".
- Si `:20128` no responde → igual con OmniRoute.
- Si una key falta en freellmapi → esa corrida se registra como `ERROR` en la
  tabla, no rompe el script.
- Failover no salta → registrar `FAILOVER-FAIL` como resultado negativo explícito.

## Criterios de éxito

1. freellmapi corriendo en bandeja con 4 keys cargadas y `curl` de prueba OK.
2. `freellmapi` seleccionable como provider en OpenCode (sin romper omniroute/nvidia).
3. `node bench-freellm.mjs` produce tabla con ambas columnas + test de failover.
4. Humano emite veredicto (OmniRoute vs freellmapi vs "sigue conviviendo").
5. `PIPELINE-STATE.md` actualizado y commiteado.

## Testing

- Smoke: `curl http://localhost:3001/v1/models` con unified key → 200.
- Smoke OpenCode: elegir modelo `freellmapi/auto` en una sesión y pedir una
  respuesta corta.
- Bench: correr el script completo 1 vez limpio y 1 vez con una key apagada
  (degradación controlada).
