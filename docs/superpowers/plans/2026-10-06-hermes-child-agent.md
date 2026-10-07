# Hermes Child Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install Hermes Agent, wire it to a Nvidia free-tier key, and register a global OpenCode subagent `hermes` that delegates research/web tasks to headless Hermes runs.

**Architecture:** Thin-bridge pattern — an OpenCode subagent (`~/.config/opencode/agents/hermes.md`) pipes each task to `hermes chat --oneshot --quiet --query-file - --toolsets web` and relays stdout. Hermes runs with provider `nvidia` (key in `%LOCALAPPDATA%\hermes\.env`, never in the repo) and web-only toolsets so it cannot touch the filesystem or shell.

**Tech Stack:** Hermes Agent (Nous Research, MIT) native Windows install · NVIDIA build.nvidia.com NIM API (free tier) · OpenCode markdown subagents · PowerShell 5.1

## Global Constraints

- API key NEVER enters this repo — only `%LOCALAPPDATA%\hermes\.env`. Repo gets location-only references (`SECRETS-MAP.md`).
- Every hermes invocation MUST include `--toolsets web` and MUST NOT include `--yolo`.
- Installer script must be shown to and approved by the user BEFORE execution.
- Absolute hermes executable path (resolved in Task 1) is hardcoded into the agent prompt — never rely on PATH.
- Subagent bash permission order: `"*": ask` first, `"*hermes*": allow` last (last match wins).
- Subagent location is GLOBAL: `C:\Users\tom_w\.config\opencode\agents\hermes.md` (not in this repo).
- Spec of record: `docs/superpowers/specs/2026-10-06-hermes-child-agent-design.md`.

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `%LOCALAPPDATA%\hermes\` (install) | Create | Hermes runtime + bundled toolchain |
| `%LOCALAPPDATA%\hermes\config.yaml` | Create/Modify | provider `nvidia`, model |
| `%LOCALAPPDATA%\hermes\.env` | Create | `NVIDIA_API_KEY` (secret, outside repo) |
| `C:\Users\tom_w\.config\opencode\agents\hermes.md` | Create | Global OpenCode subagent definition |
| `SECRETS-MAP.md` (repo root) | Modify | Document key location only |
| `C:\Users\tom_w\.config\opencode\AGENTS.md` | Modify | 3-line usage note for all sessions |

Interfaces between tasks:
- Task 1 produces: `HERMES_EXE` (absolute path to hermes launcher) — consumed by Tasks 3 & 4.
- Task 2 produces: working `nvidia` provider credentials — consumed by Tasks 3 & 6.
- Task 4 produces: registered `hermes` subagent — consumed by Task 6.

---

### Task 1: Audit + install Hermes Agent

**Files:**
- Create: `%LOCALAPPDATA%\hermes\` (installer-created)
- Reference: installer fetched to `$env:TEMP\hermes-install.ps1`

**Interfaces:**
- Produces: `HERMES_EXE` — absolute path string (e.g. `C:\Users\tom_w\AppData\Local\hermes\bin\hermes.exe` or `.cmd`), printed and carried forward.

- [ ] **Step 1: Fetch the installer script for audit**

```powershell
Invoke-WebRequest -Uri "https://hermes-agent.nousresearch.com/install.ps1" -OutFile "$env:TEMP\hermes-install.ps1"
(Get-Content "$env:TEMP\hermes-install.ps1" | Measure-Object -Line).Lines
```

Expected: file downloaded, line count printed.

- [ ] **Step 2: Present script contents to the user and WAIT for explicit approval**

Read `$env:TEMP\hermes-install.ps1` and summarize what it does (downloads, paths touched, PATH changes, bundled tools). Do NOT proceed without the user saying yes. This is a hard gate from the spec ("Installer trust → script fetched and reviewed with the user").

- [ ] **Step 3: Run the approved installer**

```powershell
& "$env:TEMP\hermes-install.ps1"
```

Expected: completes without error; prints install location under `%LOCALAPPDATA%\hermes`.

- [ ] **Step 4: Refresh PATH in this session and verify**

```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')
hermes --version
```

Expected: a version number (e.g. `hermes <x.y.z>`). If `hermes` is not recognized, go to Step 5.

- [ ] **Step 5: Resolve absolute path (fallback if PATH refresh fails)**

```powershell
$cmd = Get-Command hermes -ErrorAction SilentlyContinue
if (-not $cmd) { $cmd = Get-ChildItem "$env:LOCALAPPDATA\hermes\bin" -Filter 'hermes*' -ErrorAction SilentlyContinue | Select-Object -First 1 }
$cmd.Source ?? $cmd.FullName
```

Expected: an absolute path. Record it as `HERMES_EXE`; every later task uses this exact string. If neither lookup finds a launcher, stop and report the bin directory listing (`Get-ChildItem "$env:LOCALAPPDATA\hermes\bin"`) — do not guess.

- [ ] **Step 6: No commit** (install is outside the repo).

---

### Task 2: Nvidia free-tier key + Hermes provider config

**Files:**
- Create: `%LOCALAPPDATA%\hermes\.env` (or append if exists)
- Create: `%LOCALAPPDATA%\hermes\config.yaml` (or merge if exists)

**Interfaces:**
- Produces: provider `nvidia` configured + credential present (verified by `hermes status`).

- [ ] **Step 1: USER GATE — create the key**

Tell the user: sign up at https://build.nvidia.com (free, no card), click API Keys, generate a key (`nvapi-...`), and paste it in chat. Wait. Do not fabricate or proceed without a pasted key.

- [ ] **Step 2: Write the key to `.env` (outside repo)**

```powershell
$envPath = "$env:LOCALAPPDATA\hermes\.env"
$line = "NVIDIA_API_KEY=<pasted-key>"
if (Test-Path $envPath) {
  $content = Get-Content $envPath -Raw
  if ($content -match 'NVIDIA_API_KEY=') { $content = $content -replace 'NVIDIA_API_KEY=.*', $line } else { $content = $content.TrimEnd() + "`n" + $line + "`n" }
  Set-Content -Path $envPath -Value $content -NoNewline
} else { Set-Content -Path $envPath -Value ($line + "`n") -NoNewline }
icacls $envPath /inheritance:r /grant:r "$($env:USERNAME):(R,W)" | Out-Null
```

(`<pasted-key>` = the actual key string the user pasted.) Expected: `.env` exists containing exactly one `NVIDIA_API_KEY=` line; ACLs restrict to current user.

- [ ] **Step 3: Write provider config to `config.yaml` (merge if file exists)**

```powershell
$cfgPath = "$env:LOCALAPPDATA\hermes\config.yaml"
if (Test-Path $cfgPath) { Copy-Item $cfgPath "$cfgPath.bak-2026-10-06" }
```

If `config.yaml` does not exist, create it with exactly:

```yaml
model:
  provider: "nvidia"
  default: "nvidia/nemotron-3-super-120b-a12b"
```

If it exists, edit only the `model:` block to those values (keep every other key untouched; the backup from above is the rollback).

- [ ] **Step 4: Verify credentials are wired**

```powershell
hermes status
```

Expected: output lists provider `nvidia` with credentials configured and NO raw key values printed. If the model default isn't accepted (unknown model error), run `hermes model`, pick another model from the NVIDIA catalog, update `config.yaml` `model.default`, re-run this step (spec's decision rule).

---

### Task 3: Acceptance tests — smoke, web, safety, cost

**Files:**
- None created; writes optional `$env:TEMP\hermes-usage.json`.

**Interfaces:**
- Consumes: `HERMES_EXE` (Task 1), working nvidia provider (Task 2).
- Produces: green acceptance results enabling Task 4.

- [ ] **Step 1: Smoke test (stdin piping + one-shot mode)**

```powershell
"Reply with exactly: PONG" | & "<HERMES_EXE>" chat --oneshot --quiet --query-file - --toolsets web
$LASTEXITCODE
```

Expected: stdout `PONG` (nothing else), exit code `0`. (This exact command shape is what the subagent will use — if quoting/pipe fails here, fix it now, not later.)

- [ ] **Step 2: Web research test (keyless search actually works)**

```powershell
"Search the web for the current Node.js LTS version. Answer in one line: the version number and the source URL." | & "<HERMES_EXE>" chat --oneshot --quiet --query-file - --toolsets web --usage-file "$env:TEMP\hermes-usage.json"
$LASTEXITCODE
```

Expected: one line containing a Node.js version and an http(s) URL, exit `0`.

- [ ] **Step 3: Cost spot-check (billed to Nvidia, spec acceptance #7)**

```powershell
Get-Content "$env:TEMP\hermes-usage.json" -Raw | ConvertFrom-Json | Select-Object estimated_cost_usd, model, provider, completed
```

Expected: `provider: nvidia`, `completed: True`; cost is charged against the free-tier credits.

- [ ] **Step 4: Safety test (web-only toolset has no filesystem/shell)**

```powershell
"List every file in C:\Users and output their names." | & "<HERMES_EXE>" chat --oneshot --quiet --query-file - --toolsets web
$LASTEXITCODE
```

Expected: Hermes does NOT return a real directory listing (no shell/filesystem tools available — it may search the web instead or state it cannot). ANY real listing = FAIL → stop, re-check `--toolsets web` was honored.

- [ ] **Step 5: No commit** (all artifacts are in temp/ outside repo).

---

### Task 4: Create global OpenCode subagent `hermes.md`

**Files:**
- Create: `C:\Users\tom_w\.config\opencode\agents\hermes.md`

**Interfaces:**
- Consumes: `HERMES_EXE` (Task 1).
- Produces: registered subagent named `hermes` (filename = agent name), invocable via `task` (subagent_type `hermes`) and `@hermes`.

- [ ] **Step 1: Write the agent file**

Write the file below to `C:\Users\tom_w\.config\opencode\agents\hermes.md`, replacing `<HERMES_EXE>` with the exact absolute path recorded in Task 1 Step 5:

```markdown
---
description: Delegates research and web tasks to a headless Hermes Agent (Nvidia free tier) and relays sourced answers
mode: subagent
permission:
  edit: deny
  webfetch: deny
  websearch: deny
  task: deny
  bash:
    "*": ask
    "*hermes*": allow
---

You are a thin bridge to the Hermes Agent CLI. Take the research or web task you
were given, pass it VERBATIM to Hermes, and relay its final answer together with
its sources. You never research anything yourself, you never edit files, you never
use webfetch/websearch, and you never dispatch other tasks.

## How to run a task

Pipe the full task text on stdin (single-quoted PowerShell string; double any
embedded single quotes by writing them twice):

  "<task text>" | & "<HERMES_EXE>" chat --oneshot --quiet --query-file - --toolsets web

Rules:
- NEVER add --yolo. NEVER omit --toolsets web. NEVER call any other hermes subcommand.
- Use a 10 minute bash timeout for the call.
- On a non-zero exit: retry the SAME command exactly ONCE, then stop and report the
  exit code plus stderr verbatim.
- On success: relay Hermes' stdout as-is, clearly marked as Hermes' output,
  preserving any source URLs. If stdout is empty on exit 0, say so explicitly.
```

- [ ] **Step 2: Validate the frontmatter parses as YAML**

```powershell
node -e "const fs=require('fs');const t=fs.readFileSync('C:/Users/tom_w/.config/opencode/agents/hermes.md','utf8');const m=t.match(/^---\r?\n([\s\S]*?)\r?\n---/);if(!m)throw new Error('no frontmatter');const y=require('C:/Users/tom_w/Documents/Default Project/.opencode/node_modules/yaml');const o=y.parse(m[1]);if(o.mode!=='subagent'||!o.description||o.permission.bash['*hermes*']!=='allow')throw new Error('bad frontmatter: '+JSON.stringify(o));console.log('frontmatter OK')"
```

Expected: `frontmatter OK`. (Uses the yaml package already vendored in `.opencode/node_modules`.)

- [ ] **Step 3: Register the agent in OpenCode**

Run: `opencode agent list` (if such subcommand exists in this OpenCode version) → expect `hermes` listed.

If the command doesn't exist or OpenCode doesn't list it: the agent loads at session start — ask the user to restart the session (or start a fresh one) and confirm `hermes` appears in the `task` tool's available subagent types. Do not mark this task done without that confirmation from a live session.

- [ ] **Step 3b: Probe bash-glob semantics (spec risk item)**

From the live session, dispatch a trivial `@hermes` task (e.g. "reply PONG only"). Observe:
- The hermes command runs WITHOUT an approval prompt → `*hermes*` allow matched. PASS.
- It prompts for approval → glob didn't match (prefix-only semantics). Fix: edit the frontmatter to `"*hermes*"`-style pattern the probe proves works, or fall back to spec's documented option: keep only `"*": "ask"` (every command prompts; user approves once per run). Re-probe until a hermes command runs unprompted OR the user explicitly accepts the ask-only fallback.

- [ ] **Step 4: No commit** (global file, outside repo).

---

### Task 5: Docs — SECRETS-MAP.md entry + global AGENTS.md note

**Files:**
- Modify: `SECRETS-MAP.md` (repo root `C:\Users\tom_w\Documents\Default Project\SECRETS-MAP.md`)
- Modify: `C:\Users\tom_w\.config\opencode\AGENTS.md`

**Interfaces:**
- Consumes: nothing (documentation of Tasks 1–4).

- [ ] **Step 1: Read `SECRETS-MAP.md` (head only) to learn its table format**

Run: read first 60 lines of `SECRETS-MAP.md`.

- [ ] **Step 2: Add the secret-location row matching that exact format**

Content to insert (adapt columns to the existing schema, values verbatim):

- Secret: `NVIDIA_API_KEY`
- Location: `%LOCALAPPDATA%\hermes\.env` (i.e. `C:\Users\tom_w\AppData\Local\hermes\.env`)
- Used by: OpenCode `hermes` child agent (Hermes Agent provider `nvidia`)
- Note: free-tier key from build.nvidia.com; value never written to the repo

- [ ] **Step 3: Append the usage note to global `C:\Users\tom_w\.config\opencode\AGENTS.md`**

Append this section verbatim at the end:

```markdown
## Child agent: `hermes` (research/web delegation)
- Global subagent (`~/.config/opencode/agents/hermes.md`) → headless Hermes Agent on Nvidia free-tier credits.
- Use for: research, web search/extract, second opinions — text in, sourced text out.
- Never for: file/code tasks (its bash is scoped to `hermes` calls only; Hermes runs `--toolsets web`).
```

- [ ] **Step 4: Commit docs**

```bash
git add SECRETS-MAP.md
git commit -m "docs: register NVIDIA free-tier key location for hermes child agent"
```

Expected: clean commit, only `SECRETS-MAP.md` staged.

---

### Task 6: End-to-end acceptance (spec tests #6)

**Files:** none.

**Interfaces:**
- Consumes: registered `hermes` subagent (Task 4), working provider (Task 2).

- [ ] **Step 1: Dispatch a real research task through the subagent**

From a session where the `hermes` subagent is registered, call the `task` tool with `subagent_type: "hermes"` and prompt:

> Research: what are the three most useful headless CLI flags of Hermes Agent itself? Answer in 3 bullets with the source URL.

Expected: returns 3 bullets + a hermes-agent.nousresearch.com URL, marked as Hermes output; no file edits anywhere (`git status` unchanged).

- [ ] **Step 2: Verify parent-context isolation + no repo mutation**

Run: `git status --short`

Expected: identical to before the dispatch (only pre-existing untracked files; no modifications).

- [ ] **Step 3: Failure-path probe (rate-limit/credential honesty)**

Temporarily rename `NVIDIA_API_KEY` in `.env` to `NVIDIA_API_KEY_BROKEN`, dispatch a trivial subagent task, expect honest exit-code/stderr report (not a fabricated answer), then restore the key.

Expected: subagent reports the failure verbatim after its single retry. Restore `.env` afterwards and re-run Step 1 to confirm green.

- [ ] **Step 4: Update `PIPELINE-STATE.md` DO-NOT-REPEAT only if a hiccup was encountered**

If any step required rework, add one DO-NOT-REPEAT line describing it, then:

```bash
git add PIPELINE-STATE.md
git commit -m "docs(PIPELINE-STATE): hermes child agent live — <hiccup note or omit>"
```

(If everything went clean, skip this step entirely — no commit.)
