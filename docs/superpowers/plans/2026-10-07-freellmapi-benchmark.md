# freellmapi Benchmark Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Instalar freellmapi en Windows, conectarlo a OpenCode sin tocar OmniRoute, y correr un benchmark A/B (latencia + calidad + failover) contra OmniRoute.

**Architecture:** App de bandeja freellmapi (`.exe` de Releases) sirve en `:3001`; OpenCode gana un provider `freellmapi` adicional vía `@ai-sdk/openai-compatible`; un script ESM `bench-freellm.mjs` mide ambos endpoints con `fetch`/SSE nativos y escribe `bench-results-*.json`.

**Tech Stack:** Node 22 (ESM, `node --test`, `fetch` nativo), PowerShell 5.1, GitHub CLI (`gh`), OpenCode config en `~/.config/opencode/opencode.json`.

**Spec:** `docs/superpowers/specs/2026-10-07-freellmapi-benchmark-design.md`

## Global Constraints

- **Nunca commitear secretos**: keys (OpenRouter, NVIDIA, Gemini, Groq, unified key) solo en dashboard/variables de entorno de usuario — nunca en git, nunca en claro en el repo (ver `SECRETS-MAP.md`).
- **NO tocar** los bloques `omniroute` ni `nvidia` de `opencode.json`; solo se agrega `freellmapi`.
- El modelo default de OpenCode (`opencode/deepseek-v4-flash-free`) **no cambia**.
- Repo raíz es ESM (`"type": "module"`); tests con `node --test` (existente: `test/auditor-codigo.test.js`).
- Plataforma: Windows + PowerShell 5.1 (sin Docker, sin `&&`; usar `; if ($?) { }`).
- Salida de benchmark `bench-results*.json` va a `.gitignore` (datos generados, pueden contener fragmentos de prompts).
- Idioma de mensajes/actualizaciones: español.

---

### Task 1: Instalar freellmapi y cargar keys

**Files:**
- Create: (nada en repo — instalación de sistema + variables de entorno de usuario)
- Modify: ninguno del repo

**Interfaces:**
- Produces: servicio `http://localhost:3001/v1` operativo + env var de usuario `FREELLMAPI_KEY` (unified key) + 4 provider keys cargadas en el dashboard.

- [ ] **Step 1: Obtener la URL del instalador de la última release**

Run:
```powershell
gh api repos/tashfeenahmed/freellmapi/releases/latest --jq "{tag: .tag_name, assets: [.assets[].name]}"
```
Expected: lista de assets; buscar el `.exe` de Windows (algo tipo `FreeLLMAPI-Setup-*.exe` o `FreeLLMAPI-Setup.exe`).

- [ ] **Step 2: Descargar el instalador a la carpeta temporal pre-aprobada**

Run (ajustar `ASSET` al nombre real del paso anterior):
```powershell
$asset = "<NOMBRE-ASSET.exe>"
$tag = (gh api repos/tashfeenahmed/freellmapi/releases/latest --jq .tag_name)
$url = "https://github.com/tashfeenahmed/freellmapi/releases/download/$tag/$asset"
$dest = "C:\Users\tom_w\AppData\Local\Temp\opencode\$asset"
Invoke-WebRequest -Uri $url -OutFile $dest
Get-Item $dest | Select-Object Name, Length
```
Expected: archivo descargado, tamaño > 1 MB.

- [ ] **Step 3: Ejecutar el instalador (requiere confirmación del usuario)**

Run:
```powershell
Start-Process -FilePath "C:\Users\tom_w\AppData\Local\Temp\opencode\<NOMBRE-ASSET.exe>" -Wait
```
**Nota:** esto instala software en el sistema — confirmar con el usuario antes de ejecutar. El instalador de freellmapi es click-through (bandeja + dashboard).

- [ ] **Step 4: Verificar que el router responda**

Run (reintentar hasta 10 veces con 3s de espera — la app tarda en levantar):
```powershell
1..10 | ForEach-Object { try { $r = Invoke-WebRequest -Uri "http://localhost:3001/v1/models" -UseBasicParsing -TimeoutSec 3; "OK $($r.StatusCode)"; break } catch { "intento $_ : no responde aún"; Start-Sleep 3 } }
```
Expected: `OK 200` (o 401 — cualquiera confirma que el servidor está vivo).

- [ ] **Step 5: El usuario carga las 4 keys en el dashboard**

Acción humana (no automatizable): abrir `http://localhost:3001` → página **Keys** → agregar:
1. OpenRouter key
2. NVIDIA NIM key
3. Google Gemini key
4. Groq key

Luego, en la misma página, copiar la **unified key** (empieza con `fla_`).

- [ ] **Step 6: Guardar la unified key como variable de entorno de usuario (fuera del repo)**

Preguntar al usuario por el valor de la unified key (tool `question`), luego:
```powershell
[Environment]::SetEnvironmentVariable('FREELLMAPI_KEY', '<fla_...>', 'User')
[Environment]::GetEnvironmentVariable('FREELLMAPI_KEY', 'User').Substring(0,8)
```
Expected: imprime `fla_....` (solo prefijo). **El valor jamás se escribe en archivos del repo ni en el plan.**

- [ ] **Step 7: Smoke test autenticado**

Run:
```powershell
$key = [Environment]::GetEnvironmentVariable('FREELLMAPI_KEY', 'User')
(Invoke-WebRequest -Uri "http://localhost:3001/v1/models" -Headers @{ Authorization = "Bearer $key" } -UseBasicParsing).StatusCode
```
Expected: `200`. Si es 403/401, la unified key está mal — repetir Step 6.

---

### Task 2: Provider `freellmapi` en opencode.json + smoke test

**Files:**
- Modify: `C:\Users\tom_w\.config\opencode\opencode.json` (bloque `provider`)
- Test: smoke manual vía CLI `opencode`

**Interfaces:**
- Consumes: `FREELLMAPI_KEY` en env de usuario (Task 1 Step 6), servicio en `:3001`.
- Produces: provider `freellmapi` con modelos `freellmapi/auto`, `freellmapi/auto:fast`, `freellmapi/auto:smart` seleccionables en OpenCode.

- [ ] **Step 1: Backup del config actual**

Run:
```powershell
Copy-Item "$env:USERPROFILE\.config\opencode\opencode.json" "$env:USERPROFILE\.config\opencode\opencode.json.bak-freellmapi"
```
Expected: archivo `.bak-freellmapi` creado.

- [ ] **Step 2: Insertar el bloque del provider**

Editar `C:\Users\tom_w\.config\opencode\opencode.json`: dentro del objeto `"provider"`, **después** del bloque `"nvidia"` (que sigue intacto), agregar:

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

- [ ] **Step 3: Validar el JSON**

Run:
```powershell
node -e "JSON.parse(require('fs').readFileSync(process.env.USERPROFILE+'\\.config\\opencode\\opencode.json','utf8')); console.log('JSON OK')"
```
Expected: `JSON OK`. Si falla, restaurar backup (`Copy-Item ...opencode.json.bak-freellmapi ...opencode.json`) y reintentar.

- [ ] **Step 4: Verificar que omniroute y nvidia siguen presentes**

Run:
```powershell
node -e "const c=JSON.parse(require('fs').readFileSync(process.env.USERPROFILE+'\\.config\\opencode\\opencode.json','utf8')); console.log(Object.keys(c.provider).join(','), '| default:', c.model)"
```
Expected: `omniroute,nvidia,freellmapi | default: opencode/deepseek-v4-flash-free`.

- [ ] **Step 5: Smoke test de OpenCode contra freellmapi**

Run (nueva sesión de OpenCode — el config se lee al arrancar):
```powershell
opencode run -m freellmapi/auto "Responde exactamente: OK"
```
Expected: respuesta que contiene `OK`. Fallas conocidas: `FREELLMAPI_KEY` no visible (abrir terminal NUEVA para que lea el env de usuario) o freellmapi apagado.

- [ ] **Step 6: Commit de cambios de repo (si los hay) + nota**

En esta tarea el repo no cambia (config fuera del repo). No commit. Solo verificar `git status` limpio respecto a esta tarea.

---

### Task 3: Núcleo de `bench-freellm.mjs` con tests (TDD)

**Files:**
- Create: `bench-freellm.mjs`
- Create: `test/bench-freellm.test.js`
- Modify: `package.json:5` (script `test`)

**Interfaces:**
- Produces (exportados de `bench-freellm.mjs`):
  - `parseSSE(buffer: string) → { events: object[], done: boolean }` — extrae `data: {...}` JSON y detecta `[DONE]`
  - `median(nums: number[]) → number`
  - `summarize(samples: {ttft, totalMs, chars, finished}[]) → {ttft, totalMs, chars, cut}` — medianas + `cut = !all finished`
  - `formatTable(rows: object[]) → string` — tabla markdown

- [ ] **Step 1: Escribir el test fallando**

Crear `test/bench-freellm.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSSE, median, summarize, formatTable } from '../bench-freellm.mjs';

test('parseSSE extrae eventos data y detecta [DONE]', () => {
  const chunk = 'data: {"choices":[{"delta":{"content":"Hola"}}]}\n\ndata: {"choices":[{"delta":{"content":" mundo"}}]}\n\ndata: [DONE]\n\n';
  const { events, done } = parseSSE(chunk);
  assert.equal(events.length, 2);
  assert.equal(events[0].choices[0].delta.content, 'Hola');
  assert.equal(done, true);
});

test('parseSSE con línea parcial no pierde datos', () => {
  const { events, done } = parseSSE('data: {"choices":[{"delta":{"content":"par"}}]}\n\ndata: [DO');
  assert.equal(events.length, 1);
  assert.equal(done, false);
});

test('median de impar, par y un elemento', () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 3, 2]), 2.5);
  assert.equal(median([7]), 7);
});

test('summarize calcula medianas y marca cut si algo no terminó', () => {
  const s = summarize([
    { ttft: 100, totalMs: 1000, chars: 50, finished: true },
    { ttft: 300, totalMs: 2000, chars: 60, finished: true },
    { ttft: 200, totalMs: 9999, chars: 5, finished: false },
  ]);
  assert.equal(s.ttft, 200);
  assert.equal(s.totalMs, 2000);
  assert.equal(s.cut, true);
});

test('formatTable produce markdown con encabezado y filas', () => {
  const md = formatTable([
    { prompt: 'corto', target: 'omniroute', ttft: 120, totalMs: 800, chars: 10, cut: false },
  ]);
  assert.match(md, /^\| prompt \| target \|/m);
  assert.match(md, /\| corto \| omniroute \|/);
});
```

- [ ] **Step 2: Correr el test y verlo fallar**

Run: `npm test`
Expected: FAIL — `Cannot find module '../bench-freellm.mjs'` (o error de import).

- [ ] **Step 3: Implementar el núcleo mínimo en `bench-freellm.mjs`**

Crear `bench-freellm.mjs` con SOLO lo que el test necesita (más abajo, Task 4 agrega `main`):

```js
#!/usr/bin/env node
// Benchmark A/B: OmniRoute (:20128) vs freellmapi (:3001)
// Uso: node bench-freellm.mjs [--failover] [--only <target>]

export function parseSSE(buffer) {
  const events = [];
  let done = false;
  const lines = buffer.split('\n');
  for (const raw of lines) {
    const line = raw.trim();
    if (!line.startsWith('data:')) continue;
    const payload = line.slice(5).trim();
    if (payload === '[DONE]') { done = true; continue; }
    try { events.push(JSON.parse(payload)); } catch { /* línea parcial o no-JSON */ }
  }
  return { events, done };
}

export function median(nums) {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function summarize(samples) {
  return {
    ttft: median(samples.map(s => s.ttft)),
    totalMs: median(samples.map(s => s.totalMs)),
    chars: median(samples.map(s => s.chars)),
    cut: !samples.every(s => s.finished),
  };
}

export function formatTable(rows) {
  const header = '| prompt | target | ttft_ms | total_ms | chars | cut |';
  const sep = '|---|---|---|---|---|---|';
  const body = rows.map(r =>
    `| ${r.prompt} | ${r.target} | ${r.ttft} | ${r.totalMs} | ${r.chars} | ${r.cut ? 'SÍ' : 'no'} |`
  );
  return [header, sep, ...body].join('\n');
}
```

- [ ] **Step 4: Correr el test y verlo pasar**

Run: `npm test`
Expected: PASS (los tests de auditor-codigo siguen pasando también).

- [ ] **Step 5: Actualizar el script `test` de package.json**

En `package.json`, cambiar:
```json
"test": "node --test test/auditor-codigo.test.js"
```
por:
```json
"test": "node --test test/"
```
Run: `npm test`
Expected: PASS — corre `test/auditor-codigo.test.js` y `test/bench-freellm.test.js`.

- [ ] **Step 6: Commit**

```powershell
git add bench-freellm.mjs test/bench-freellm.test.js package.json
git commit -m "bench: nucleo de bench-freellm (parseSSE, median, summarize, formatTable) con tests"
```

---

### Task 4: Orquestador (prompts, targets, reps, resultados)

**Files:**
- Modify: `bench-freellm.mjs` (agregar config + `runOnce` + `main`)
- Modify: `.gitignore` (agregar `bench-results*.json`)
- Test: `test/bench-freellm.test.js` (tests nuevos de orquestador)

**Interfaces:**
- Consumes: `parseSSE`, `median`, `summarize`, `formatTable` (Task 3).
- Produces: ejecución CLI `node bench-freellm.mjs` → tabla por consola + archivo `bench-results-YYYY-MM-DD.json`; export `runOnce(target, promptText)` → `{ttft, totalMs, chars, finished, routedVia}`.

- [ ] **Step 1: Escribir el test fallido de orquestación (sin red)**

Agregar a `test/bench-freellm.test.js`:

```js
import { buildLargoPrompt, PROMPTS, TARGETS } from '../bench-freellm.mjs';

test('PROMPTS cubre las 5 categorías del spec', () => {
  assert.deepEqual(PROMPTS.map(p => p.id), ['codigo', 'guion', 'razonamiento', 'largo', 'corto']);
});

test('TARGETS apunta a los dos routers con modelos del spec', () => {
  const omni = TARGETS.find(t => t.name === 'omniroute');
  const fla = TARGETS.find(t => t.name === 'freellmapi');
  assert.equal(omni.baseURL, 'http://localhost:20128/v1');
  assert.equal(omni.model, 'auto/best-free');
  assert.equal(fla.baseURL, 'http://localhost:3001/v1');
  assert.equal(fla.model, 'auto');
});

test('buildLargoPrompt genera relleno con pregunta final', () => {
  const p = buildLargoPrompt();
  assert.ok(p.length > 10000);
  assert.match(p, /¿Cuántos párrafos te di\?/);
});
```

- [ ] **Step 2: Correr y ver fallar**

Run: `npm test`
Expected: FAIL — `buildLargoPrompt`/`PROMPTS` no exportados.

- [ ] **Step 3: Implementar config, `buildLargoPrompt`, `runOnce` y `main`**

Agregar a `bench-freellm.mjs`:

```js
const KEY_OMNI = process.env.OMNIROUTE_API_KEY || 'local';
const KEY_FLA = process.env.FREELLMAPI_KEY || '';

export const TARGETS = [
  { name: 'omniroute', baseURL: 'http://localhost:20128/v1', model: 'auto/best-free', key: KEY_OMNI },
  { name: 'freellmapi', baseURL: 'http://localhost:3001/v1', model: 'auto', key: KEY_FLA },
];

export const PROMPTS = [
  { id: 'codigo', text: 'En JavaScript, ¿cuál es la diferencia entre == y ===? Muestra un bug clásico en 5 líneas o menos.' },
  { id: 'guion', text: 'Escribe un guion de 30 segundos para un short sobre el Kin Maya "Estrella Solar" en tono poético, empezando por un hook de 3 segundos.' },
  { id: 'razonamiento', text: 'Un reloj marca las 3:00. ¿Cuántos ángulos rectos forma entre las agujas? Razona en exactamente 3 pasos y termina con "RESPUESTA: N".' },
  { id: 'largo', text: null },
  { id: 'corto', text: 'Responde exactamente: OK' },
];

export function buildLargoPrompt() {
  const para = 'El tzolkin combina 20 sellos solares con 13 tintones para formar los 260 kin, un ciclo ceremonial maya usado para elegir días propicios y leer la cualidad del tiempo. ';
  const filler = Array.from({ length: 180 }, (_, i) => `Párrafo ${i + 1}: ${para}`).join('\n\n');
  return filler + '\n\n¿Cuántos párrafos te di? responde solo con el número.';
}

export async function runOnce(target, promptText, { timeoutMs = 60000 } = {}) {
  const t0 = Date.now();
  let ttft = null;
  let chars = 0;
  let finished = false;
  let routedVia = null;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(`${target.baseURL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${target.key}` },
      body: JSON.stringify({ model: target.model, stream: true, messages: [{ role: 'user', content: promptText }] }),
      signal: ac.signal,
    });
    routedVia = res.headers.get('x-routed-via');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const { events, done: sseDone } = parseSSE(buf);
      if (events.length && ttft === null) ttft = Date.now() - t0;
      chars += events.reduce((n, e) => n + (e.choices?.[0]?.delta?.content?.length || 0), 0);
      if (sseDone) { finished = true; break; }
    }
  } finally {
    clearTimeout(timer);
  }
  return { ttft: ttft ?? Date.now() - t0, totalMs: Date.now() - t0, chars, finished, routedVia };
}

async function healthCheck(target) {
  try {
    const res = await fetch(`${target.baseURL}/models`, { headers: { Authorization: `Bearer ${target.key}` } });
    return res.ok;
  } catch { return false; }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--failover')) {
    const fla = TARGETS.find(t => t.name === 'freellmapi');
    let r;
    try {
      r = await runOnce(fla, 'Responde solo: OK');
    } catch (err) {
      console.log(`FAILOVER-FAIL error=${err}`);
      process.exit(1);
    }
    const ok = r.finished && r.chars > 0 && r.routedVia !== null && !/dead/i.test(r.routedVia || '');
    console.log(`FAILOVER-${ok ? 'OK' : 'FAIL'} routedVia=${r.routedVia} chars=${r.chars} ${r.totalMs}ms`);
    process.exit(ok ? 0 : 1);
  }

  for (const t of TARGETS) {
    if (!(await healthCheck(t))) {
      console.error(`${t.name} no responde en ${t.baseURL} — ¿está corriendo?`);
      process.exit(2);
    }
  }

  const rows = [];
  const detail = [];
  for (const p of PROMPTS) {
    const text = p.id === 'largo' ? buildLargoPrompt() : p.text;
    for (const t of TARGETS) {
      const samples = [];
      for (let rep = 0; rep < 3; rep++) {
        try {
          samples.push(await runOnce(t, text));
        } catch (err) {
          samples.push({ ttft: -1, totalMs: -1, chars: 0, finished: false, error: String(err) });
        }
      }
      const s = summarize(samples);
      rows.push({ prompt: p.id, target: t.name, ...s });
      detail.push({ prompt: p.id, target: t.name, samples });
      process.stderr.write(`  listo: ${p.id} / ${t.name}\n`);
    }
  }
  console.log('\n' + formatTable(rows));
  const out = `bench-results-${new Date().toISOString().slice(0, 10)}.json`;
  const fs = await import('node:fs');
  fs.writeFileSync(out, JSON.stringify({ date: new Date().toISOString(), rows, detail }, null, 2));
  console.log(`\nResultados: ${out}`);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split(/[\\/]/).pop())) {
  main().catch(err => { console.error(err); process.exit(1); });
}
```

- [ ] **Step 4: Agregar `.gitignore`**

Append a `.gitignore`:
```
bench-results*.json
```

- [ ] **Step 5: Correr tests**

Run: `npm test`
Expected: PASS — todos (auditor + bench, viejos + nuevos).

- [ ] **Step 6: Verificar modo `--failover` falla limpio cuando la chain no está preparada**

Run: `node bench-freellm.mjs --failover`
Expected: imprime `FAILOVER-OK ...` (exit 0) o `FAILOVER-FAIL ...` (exit 1) — nunca un stack trace crudo. Si da FAIL con error de conexión, freellmapi está apagado (Task 1).

- [ ] **Step 7: Commit**

```powershell
git add bench-freellm.mjs test/bench-freellm.test.js .gitignore
git commit -m "bench: orquestador A/B (5 prompts x 2 targets x 3 reps) + modo --failover"
```

---

### Task 5: Forzar y verificar el failover en freellmapi

**Files:**
- Modify: ninguno del repo (config interna de freellmapi vía dashboard)
- Test: `node bench-freellm.mjs --failover`

**Interfaces:**
- Consumes: modo `--failover` (Task 4), dashboard en `:3001`.
- Produces: resultado `FAILOVER-OK` o `FAILOVER-FAIL` registrado para el veredicto.

- [ ] **Step 1: Crear proveedor "dead-end" en el dashboard**

Acción humana/guiada en `http://localhost:3001` → **Keys** → **Add custom provider**:
- Nombre: `dead-end`
- Base URL: `http://127.0.0.1:9/v1` (puerto de descarte: conexión rechazada → 5xx)
- API key: `dummy`
- Habilitarlo.

- [ ] **Step 2: Moverlo al tope de la Fallback Chain**

Dashboard → **Chain manager** → arrastrar `dead-end` al primer lugar → guardar.

- [ ] **Step 3: Correr el test de failover**

Run: `node bench-freellm.mjs --failover`
Expected: `FAILOVER-OK routedVia=<otro proveedor> ...` (el router saltó el 5xx del dead-end). Si da `FAILOVER-FAIL` (respuesta vacía o routedVia=dead-end), probar variante B: dejar `dead-end` pero apuntando a una key inválida de un proveedor real que esté primero; si tampoco salta, registrar `FAILOVER-FAIL` como hallazgo — no iterar más de 2 intentos.

- [ ] **Step 4: Restaurar la chain**

Dashboard → Chain manager → mover `dead-end` al último lugar (o deshabilitarlo) → guardar. Verificar con `node bench-freellm.mjs --failover` que sigue dando OK con el proveedor normal.

- [ ] **Step 5: Sin commit (config externa).** Anotar el resultado en el `bench-results-*.json` del Task 6 manualmente si hace falta.

---

### Task 6: Benchmark completo + veredicto + cierre

**Files:**
- Create: `bench-results-YYYY-MM-DD.json` (generado, gitignored)
- Modify: `PIPELINE-STATE.md` (estado + entrada nueva)

**Interfaces:**
- Consumes: Tasks 1-5 operativos.

- [ ] **Step 1: Correr el benchmark completo**

Run (tarda varios minutos: 5 prompts × 2 targets × 3 reps, con streaming):
```powershell
node bench-freellm.mjs
```
Expected: tabla markdown con 10 filas (5 prompts × 2 targets) + archivo `bench-results-*.json`. Celdas `cut=SÍ` o `-1` señalan cortes/errores a revisar.

- [ ] **Step 2: Veredicto humano de calidad**

Leer las respuestas de `detail` en el JSON (o reproducir prompts a mano) lado a lado: 5 prompts × 2 targets. Presentar al usuario: tabla de latencias + impresión de calidad + resultado del failover → el usuario emite veredicto:
- `gana-freellmapi` (swap de default en sesión futura),
- `gana-omniroute`,
- `siguen-conviviendo`.

- [ ] **Step 3: Actualizar PIPELINE-STATE.md**

Append/actualizar en `PIPELINE-STATE.md` (sección nueva tras la cabecera o en el área de estado global):

```markdown
- **freellmapi (2026-10-07):** instalado como app de bandeja (:3001), provider en opencode.json (CONVIVE con omniroute — no lo reemplaza). Keys: OpenRouter/NVIDIA/Gemini/Groq en dashboard (unified key en env FREELLMAPI_KEY). Benchmark: `node bench-freellm.mjs` → `bench-results-*.json` (gitignored). Failover: <OK/FAIL>. Veredicto: <veredicto del usuario>. Spec `docs/superpowers/specs/2026-10-07-freellmapi-benchmark-design.md`.
```

- [ ] **Step 4: Commit final**

```powershell
git add PIPELINE-STATE.md
git commit -m "estado: freellmapi instalado + benchmark A/B vs OmniRoute (<veredicto>)"
```

- [ ] **Step 5: Limpiar instalador temporal**

```powershell
Remove-Item "C:\Users\tom_w\AppData\Local\Temp\opencode\FreeLLMAPI*" -ErrorAction SilentlyContinue
```
