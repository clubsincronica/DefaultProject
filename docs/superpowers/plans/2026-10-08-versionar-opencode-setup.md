# Versionar opencode-setup + .opencode (A1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Meter al repo raíz todo el andamiaje OpenCode (harness `.opencode/` parcial + `opencode-setup/` completo) con ignores granulares, cero secretos, y re-build del installer.

**Architecture:** Se reemplazan las dos reglas blanket del `.gitignore` (`opencode-setup/`, `.opencode/`) por reglas granulares que solo excluyen `node_modules`, `graphify-out`, `memory*.json`, `server-env.txt`, `dist` y el zip. Un gate de seguridad por grep verifica que ningún archivo staged contenga secretos reales antes de cada commit. `Build-Exe.ps1` no cambia: consume las mismas rutas ahora versionadas.

**Tech Stack:** git, PowerShell 5.1, Pester (suite del installer), ps2exe.

## Global Constraints

- Solo placeholders `{env:NOMBRE_VAR}` en configs; ningún valor de clave real en el repo.
- `opencode-setup/` y `.opencode/` quedan en rutas raíz (no se mueven; `Build-Exe.ps1:55` espera `opencode-setup/skills`).
- Commits separados por concerns (gitignore+contenido / docs / build).
- ASCII-only en mensajes de commit.
- PowerShell 5.1 (`powershell.exe`), no pwsh.

---

### Task 1: Ajustar `.gitignore` y verificar qué desbloquea

**Files:**
- Modify: `.gitignore`

**Interfaces:**
- Consumes: estado actual del índice (`git status`).
- Produces: rutas desbloqueadas para Task 2 (`git status` lista `opencode-setup/` y `.opencode/` salvo los patrones ignorados).

- [ ] **Step 1: Reemplazar las reglas blanket**

Edit `.gitignore`. Quitar estas dos líneas:

```
opencode-setup/
```
(línea 6, dentro del bloque "Project repos") y
```
.opencode/
```
(línea 23, bloque "# Tooling").

Añadir al bloque "# Tooling" (donde estaba `.opencode/`):

```
# Tooling
.opencode/node_modules/
.opencode/graphify-out/
opencode-setup/skills/**/node_modules/
opencode-setup/**/memory*.json
opencode-setup/**/server-env.txt
opencode-installer/OpenCode-Setup.zip
```

Resultado final del archivo debe conservar todas las demás líneas intactas (`club-sincronica/`, `dist/`, `*.env`, `credentials/`, etc.).

- [ ] **Step 2: Verificar exclusiones con check-ignore**

Run:
```powershell
git check-ignore -v .opencode/node_modules; git check-ignore -v opencode-setup/skills/agent-reach; if (-not $?) { "OK: skills NOT ignored" }
```
Expected: `.opencode/node_modules` matchea `.gitignore`; `opencode-setup/skills/agent-reach` NO está ignorado (sale "OK: skills NOT ignored" o error de check-ignore).

- [ ] **Step 3: Verificar que nada pesado/sensible aparece en status**

Run:
```powershell
git status --porcelain | Select-String -Pattern 'node_modules|graphify-out|memory|server-env|OpenCode-Setup.zip|dist/'
```
Expected: 0 matches.

- [ ] **Step 4: Commit**

```powershell
git add .gitignore
git commit -m "chore(gitignore): granular rules for .opencode and opencode-setup"
```

---

### Task 2: Gate de seguridad + staging del andamiaje

**Files:**
- Modify: índice git (staging)
- Read (gate): todos los archivos a commitear de `opencode-setup/` y `.opencode/`

**Interfaces:**
- Consumes: Task 1 (rutas desbloqueadas).
- Produces: índice limpio sin secretos para commit.

- [ ] **Step 1: Listar qué entrará**

Run:
```powershell
git status --porcelain opencode-setup .opencode
```
Expected: archivos `??` de `opencode-setup/` (skills, config, sync-skills.ps1, README.md) y de `.opencode/` (plugins/graphify.js, opencode.json, opencode.jsonc, .gitignore). NO debe haber `node_modules` ni `memory*`.

- [ ] **Step 2: Grep de secretos sobre candidatos**

Run:
```powershell
$files = git ls-files --others --exclude-standard opencode-setup .opencode
$hits = Select-String -Path $files -Pattern 'sk-[a-zA-Z0-9]{20}','nvapi-[a-zA-Z0-9]','Bearer [a-zA-Z0-9]','password\s*[=:]\s*[^\s{<]','api_secret\s*[=:]\s*[^\s{<]','(sk|key|token)\s*[:=]\s*["'']?(sk-|nvapi-|ya29|ghp_|xox)' -CaseSensitive:$false -ErrorAction SilentlyContinue
$hits | ForEach-Object { "$($_.Filename):$($_.LineNumber): $($_.Line)" }
```
Expected: 0 hits. Si hay hit → identificar el archivo, agregar patrón a `.gitignore`, repetir Step 1.

- [ ] **Step 3: Staging**

```powershell
git add opencode-setup .opencode
git status --porcelain --staged 2>$null; git diff --cached --stat | Select-Object -Last 3
```
Expected: ~files de skills/templates/graphify.js staged; 0 node_modules.

- [ ] **Step 4: Re-gate sobre lo staged (definitivo)**

Run:
```powershell
$staged = git diff --cached --name-only
$hits = Select-String -Path $staged -Pattern 'sk-[a-zA-Z0-9]{20}','nvapi-[a-zA-Z0-9]{8}' -ErrorAction SilentlyContinue
$hits
```
Expected: empty.

- [ ] **Step 5: Commit**

```powershell
git add docs/superpowers/specs/2026-10-08-versionar-opencode-setup-design.md
git commit -m "feat(repo): version opencode-setup skills + .opencode harness (A1)"
```

---

### Task 3: Docs de continuidad (SECRETS-MAP + PIPELINE-STATE)

**Files:**
- Modify: `SECRETS-MAP.md` (sección 5, fila de hermes/harness)
- Modify: `PIPELINE-STATE.md` (párrafo de contexto línea 8)

**Interfaces:**
- Consumes: Task 2 (qué quedó versionado).
- Produces: estado vivo actualizado.

- [ ] **Step 1: Actualizar SECRETS-MAP.md**

Añadir fila en la tabla "## 5. Variables de entorno / externas":

```
| Harness OpenCode versionado (repo raíz) | `.opencode/opencode.json`, `opencode-setup/` → GitHub `clubsincronica/DefaultProject` | Solo placeholders `{env:...}`; ningún valor real. Gate de grep previo a cada commit |
```

- [ ] **Step 2: Actualizar PIPELINE-STATE.md**

En el párrafo de contexto (línea 8), añadir al final:

```
**Andamiaje OpenCode VERSIONADO 2026-10-08:** `.opencode/` parcial (plugins/graphify.js, configs) + `opencode-setup/` completo (5 skills) entran al repo raíz con `.gitignore` granular (solo node_modules/graphify-out/memory/env/dist fuera). Gate de grep anti-secretos antes de cada commit de estas rutas. Spec: `docs/superpowers/specs/2026-10-08-versionar-opencode-setup-design.md`.
```

- [ ] **Step 3: Commit**

```powershell
git add SECRETS-MAP.md PIPELINE-STATE.md
git commit -m "docs: record opencode harness versioned + secrets gate"
```

---

### Task 4: Build + tests del installer

**Files:**
- Run: `opencode-installer/Build-Exe.ps1`
- Run: `opencode-installer/tests/*.Tests.ps1`

**Interfaces:**
- Consumes: Tasks 1-2 (rutas versionadas existen tal cual).
- Produces: `opencode-installer/dist/OpenCode-Setup.exe` + `dist/SHA256.txt` (staged NO commiteado — `dist/` sigue ignorado).

- [ ] **Step 1: Re-build del exe**

Run:
```powershell
powershell -ExecutionPolicy Bypass -File opencode-installer\Build-Exe.ps1
```
Expected: `Smoke verify Test-Path dist/OpenCode-Setup.exe: True`, línea SHA256 impresa; warnings solo si falta graphify.js (no debe faltar).

- [ ] **Step 2: Suite Pester**

Run:
```powershell
powershell -ExecutionPolicy Bypass -Command "Invoke-Pester -Path opencode-installer\tests -Output Detailed"
```
Expected: 15/15 PASS (última suite registrada: 15/15, commit `c64cbbc`).

- [ ] **Step 3: Verificar que dist/ NO se coló en el índice**

Run:
```powershell
git status --porcelain | Select-String 'dist/|OpenCode-Setup'
```
Expected: 0 staged (puede aparecer `?? opencode-installer/OpenCode-Setup.zip`? NO — Task 1 lo ignora; debe dar 0 líneas).

- [ ] **Step 4: Push (si el usuario lo confirma)**

```powershell
git push origin main
```
Esperar confirmación explícita del usuario antes de push (regla de la casa: no pushear sin pedirlo).

---

## Self-Review

- **Spec coverage:** alcance (Task 2), gitignore (Task 1), gate (Task 2 Steps 2+4), post-commit docs (Task 3), re-build (Task 4). "No objetivo" cubierto: sin cambios de ruta ni de wizard.
- **Placeholders:** ninguno; todos los comandos y textos son literales.
- **Consistencia:** rutas `opencode-setup/skills` idénticas entre tareas y a `Build-Exe.ps1:55`.
