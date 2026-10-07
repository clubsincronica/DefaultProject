# Opencode Windows Self-Installing Installer — Design

Date: 2026-10-07
Status: spec (approved in chat §1–§5, pending file review)
Scope: portable `.exe` for Windows that reproduces the current low-cost opencode architecture + scaffolding. Zero terminal, zero manual file edits.

## 1. Architecture

Single `Install-OpenCode.ps1` compiled with ps2exe to a portable, unsigned `.exe` (first launch shows Windows SmartScreen; wizard's Welcome screen tells the user to click "More info → Run anyway", keeping everything click-only). Double-click runs 6 ordered steps: 1) preflight (Windows 10/11, Node ≥18, network), 2) `npm i -g opencode@latest` if missing, 3) write global config to `%USERPROFILE%\.config\opencode\`, 4) write project scaffolding into the user-picked folder, 5) seed global + per-project `memory.json`, 6) open the key guide and self-test (`opencode --version` + `opencode debug config`). Guide-only keys: the installer never asks for, stores, or writes any secret; placeholders stay as `{env:VAR}`.

## 2. Components / files written

- Global (`%USERPROFILE%\.config\opencode\`): `opencode.json` (free default model `opencode/deepseek-v4-flash-free`, providers omniroute `localhost:20128` + NVIDIA NIM, `{env:}` placeholders), `rate-limit-fallback.json` (6-tier free chain).
- Project dir (user-picked via GUI folder dialog): `opencode.json` (MCP: filesystem, context7, memory, headroom, linkedin; providers: headroom, deepseek, glm, groq; plugins graphify + superpowers), `.opencode/opencode.jsonc` (lean plugins), `.opencode/plugins/graphify.js` (copied), `AGENTS.md` dispatcher template, `PIPELINE-STATE.md` seed, `SECRETS-MAP.md`, `.gitignore` (`credentials/`, `*.env`, `auth.json`), `data/memory.json` seed.
- Installer sources (`opencode-installer/`): `Install-OpenCode.ps1`, `Build-Exe.ps1` (ps2exe compile), `GUIDE.md` (picture steps), checksums.
- Fixes vs current broken `.bat`: correct global path (was `%APPDATA%\opencode`), real `$env:` expansion (was `''$config''` / `%VAR%` inside PowerShell single quotes), substituted project paths (was literal `<PROJECT_DIR>` / `<HOME>`), UTF-8 NoBOM JSON (was mojibake-prone `Out-File` default).

## 3. Data flow

opencode precedence: global (free default model + fallback chain) under project (MCPs/plugins/providers). First run resolves the free DeepSeek model via omniroute; on 429 `@azumag/opencode-rate-limit-fallback` cycles the 6 free models (NVIDIA NIM next), paid headroom models last resort (~95% zero-cost). Memory: global seed (identity + policies pointer) plus per-project `data/memory.json` seed; the MCP memory server reads/writes the project file so sessions persist across restarts with no cloud. Keys never flow through the installer; user sets `OMNIROUTE_API_KEY` / `NVIDIA_API_KEY` in their own env afterwards following the picture-steps. The installer writes no key material anywhere (neither config files nor env vars).

## 4. Zero-terminal UX + error handling

Click-only wizard, no console, no typing, no file edits. Screens: Welcome → GUI folder picker → **Install** (progress bar + read-only log) → **Get free keys** (opens OpenRouter + NVIDIA pages with 3 picture-steps each) → **Test** (silent `opencode --version` + `debug config`, green ✓ / red ✗). Failures become dialogs with **Retry**: no Node → "Install Node" button (LTS `.msi`); no network → retry; opencode start fails pre-keys → informational notice, not an error. No key-entry fields exist anywhere in the wizard.

## 5. Policies + communication

Bakes in repo rules: `AGENTS.md` dispatcher (keyword → project), `PIPELINE-STATE.md` seed ("read + update every session", empty DO-NOT-REPEAT table), `SECRETS-MAP.md` + `.gitignore` ("versiona la forma, no las credenciales"). Memory seeds point at the same policies. No telemetry; only network calls are npm/Node downloads and the two key-guide pages.

## 6. Skill-set bundling (vendored bodies)

The installer ships skill BODIES, not just references, from `opencode-setup/skills/` (committed `c07d685`): `agent-reach`, `archify` (trimmed: no `examples/`, no `test/`), `graphify`, `nlm-skill`, `youtube-watcher` (~3.5MB total, secret-scanned clean). At install time the wizard copies them to their discovery paths: `%USERPROFILE%\.agents\skills\` (agent-reach, archify) and `%USERPROFILE%\.config\opencode\skills\` (graphify, nlm-skill, youtube-watcher). `superpowers/*` is NOT vendored: it self-updates via its plugin URL and would drift if frozen. Re-sync rule: after any skill update on the source machine, run `skills/sync-skills.ps1` + commit before rebuilding the `.exe`. Dist ships as `OpenCode-Setup.zip` (exe + `payload/` with templates + skills) so everything stays visible and auditable.

## Non-goals

- No opencode Desktop app install (separate Electron app; CLI only).
- No MSI, no signing, no admin rights, no auto-provisioning of keys.
- No repo cloning (templates are embedded; private repos stay private).
