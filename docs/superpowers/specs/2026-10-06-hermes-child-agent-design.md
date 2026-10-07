# Design: Hermes Agent as OpenCode child agent (Nvidia free tier)

**Date:** 2026-10-06
**Status:** Approved (design), pending spec review → implementation plan
**Scope:** Global OpenCode subagent `hermes` that delegates research & web tasks to a headless Hermes Agent run powered by NVIDIA build.nvidia.com free-tier API key.

## Context

The main OpenCode session needs a disposable child agent to run research and web tasks
without burning the primary model's context. [Hermes Agent](https://hermes-agent.nousresearch.com/)
(Nous Research, MIT) is a full CLI agent with first-class headless modes and a first-class
`nvidia` provider. Web search/extract works keyless out of the box (Hermes rotates free
tiers: Exa, Parallel, Firecrawl, Keenable + DuckDuckGo fallback), so the only credential
required is one Nvidia key.

Investigation confirmed:

- Native Windows installer: `iex (irm https://hermes-agent.nousresearch.com/install.ps1)`
  → installs to `%LOCALAPPDATA%\hermes` (isolated bundled toolchain; system untouched).
- Headless: `hermes chat --oneshot --query-file - --quiet` = prompt on stdin, answer on
  stdout, no interactive layers. Exit codes: `0` completed, `1` failed/partial/budget/init
  failure, `130` interrupted.
- Nvidia provider: `NVIDIA_API_KEY` in `~/.hermes/.env`, provider id `nvidia`, base
  `https://integrate.api.nvidia.com/v1`, example model
  `nvidia/nemotron-3-super-120b-a12b`.
- OpenCode subagents: markdown files in `~/.config/opencode/agents/` (global) with
  `description` + `mode: subagent` frontmatter; invoked via the `task` tool or `@mention`.

## Goals

1. Install Hermes on this Windows machine (installer script audited with the user first).
2. Configure Hermes with a Nvidia free-tier key (user creates the key; we wire it).
3. Register a global OpenCode subagent `hermes` that dispatches research tasks to
   headless Hermes and relays the answer with sources.
4. Keep the child strictly read-only w.r.t. this workspace and the machine.

## Non-goals (v1)

- Hermes messaging gateway, cron scheduling, desktop app, Nous Portal.
- Hermes memory providers (incl. OpenViking integration) — one-shot runs, no memory.
- MCP / ACP integration of Hermes into OpenCode (approach B/C — rejected).
- Using Hermes for code or file tasks (research & web only).
- Paid search backends (Brave/Firecrawl keys) — default keyless rotation is enough.

## Components

| # | Component | Location | Notes |
|---|-----------|----------|-------|
| 1 | Hermes Agent install | `%LOCALAPPDATA%\hermes` | Official PowerShell installer, audited by user before running |
| 2 | Nvidia provider config | `~/.hermes/config.yaml` + `~/.hermes/.env` | key never enters the repo |
| 3 | Subagent definition | `C:\Users\tom_w\.config\opencode\agents\hermes.md` | global, available in all sessions |
| 4 | Docs | `SECRETS-MAP.md` (root repo) + global `AGENTS.md` | key location + one-line usage note |

## Configuration details

### 2. Nvidia provider (`~/.hermes/`)

```yaml
# ~/.hermes/config.yaml  (i.e. %LOCALAPPDATA%\hermes\config.yaml)
model:
  provider: "nvidia"
  default: "nvidia/nemotron-3-super-120b-a12b"
```

```
# ~/.hermes/.env
NVIDIA_API_KEY=nvapi-...        # created by user at build.nvidia.com, pasted during setup
```

- Model availability on the free tier is verified during setup with a live call; if the
  default model is not available to the account, pick another from `hermes model`'s
  Nvidia catalog and update `config.yaml` (same decision rule, no design change).
- `web.backend` left unset → auto keyless free-tier ring (documented default behavior).

### 3. Subagent (`~/.config/opencode/agents/hermes.md`)

Draft (binding decisions below; wording polish allowed during implementation):

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

You are a thin bridge to the Hermes Agent CLI. Take the research/web task you were
given, pass it verbatim to Hermes, and relay its final answer with sources. You do
not research anything yourself.

Invocation (PowerShell; single-quoted string, double any embedded single quotes):
  <ABSOLUTE_HERMES_PATH> chat --oneshot --quiet --query-file - --toolsets web
  with the task text piped on stdin.

Rules:
- Only run Hermes commands. Never edit files, never use webfetch/websearch, never dispatch tasks.
- Timeout 10 min; on non-zero exit retry ONCE, then report exit code + stderr verbatim.
- Relay the answer as-is (mark it as Hermes output); preserve source URLs.
```

Decisions baked into this definition:

- **Absolute path** for the hermes executable is resolved during setup and hardcoded
  into the prompt (non-interactive OpenCode shells often lack the installer's PATH
  changes) — deterministic across sessions.
- **`--toolsets web`**: Hermes itself cannot touch the filesystem or shell → no approval
  prompts can block a headless run, so `--yolo` is never used.
- **bash permission**: last-match-wins — unknown commands fall to `ask` (human approval),
  Hermes commands run freely. Prevents silent misuse while staying autonomous in normal use.
- **No `model:` field**: the bridge inherits the parent's model; the heavy lifting runs
  on Nvidia's side.
- **stdin piping** (`--query-file -`) avoids all PowerShell quoting/escaping problems.

## Data flow

```
user / main agent
   │  task tool  or  @hermes mention
   ▼
opencode subagent "hermes"  (thin bridge, own session → parent context untouched)
   │  pipes task on stdin, 10-min timeout
   ▼
hermes chat --oneshot --quiet --query-file - --toolsets web
   │  provider nvidia (free-tier credits) · keyless web_search/web_extract
   ▼
final answer + sources on stdout  ──►  relayed to parent
```

## Error handling

| Failure | Detection | Action |
|---|---|---|
| Rate limit / transient Nvidia error | non-zero exit, error on stderr | retry once after short wait; then report exit code + stderr |
| Hermes init/credentials failure | exit `1` with credential error | report verbatim; do not loop |
| Partial / budget exceeded | exit `1`, partial output | relay whatever stdout contains, flag as partial |
| Interrupted | exit `130` | report as interrupted |
| Task exceeds 10 min | bash timeout | report timeout; no auto-retry |

## Execution order

1. Fetch `install.ps1` → present contents to user → **user approves** → run installer.
2. `hermes --version` sanity check; resolve absolute executable path.
3. **User creates free Nvidia key** at build.nvidia.com (no card) → pastes it.
4. Write `config.yaml` + `.env`; `hermes status` shows provider `nvidia` with credentials.
5. Verify (acceptance tests below).
6. Write `hermes.md` subagent; verify OpenCode loads it.
7. Docs: `SECRETS-MAP.md` entry, global `AGENTS.md` usage note.
8. Commit spec + doc changes.

## Verification (acceptance tests)

1. `hermes --version` prints a version.
2. `hermes status` shows `nvidia` provider + credentials present (key value redacted).
3. Smoke: `echo "Reply with exactly: PONG" | hermes chat --oneshot --quiet --query-file - --toolsets web`
   → stdout `PONG`, exit 0.
4. Web research: one-shot task "Search the web for the current Node.js LTS version;
   answer in one line with the source URL" → correct answer containing a URL.
5. Safety: one-shot task asking to list local files → Hermes (web-only toolset) has no
   filesystem/shell access and must not perform it.
6. End-to-end: dispatch a real research task from this OpenCode session via the `task`
   tool → sourced summary returns; parent context unaffected beyond the task result.
7. Cost: spot-check `--usage-file` output once → billed against Nvidia free credits.

## Docs updates

- `SECRETS-MAP.md`: `NVIDIA_API_KEY` → stored in `%LOCALAPPDATA%\hermes\.env`; used by
  the hermes child agent; never committed.
- Global `~/.config/opencode/AGENTS.md`: 2–3 lines — the `hermes` subagent exists,
  what it's for (research/web delegation), and that it runs on Nvidia free-tier credits.

## Risks & mitigations

- **Windows PATH in non-interactive shells** → hardcoded absolute path in agent prompt.
- **Free-tier model availability/quota changes** → decision rule: switch model via
  `hermes model` catalog; failure surfaced honestly by acceptance test 3.
- **Installer trust** → script fetched and reviewed with the user before execution.
- **bash glob semantics for `*hermes*`** → verified during implementation with a probe
  command; fallback if unsupported: `"*": "ask"` alone (every command prompts, Hermes
  commands approved once).
