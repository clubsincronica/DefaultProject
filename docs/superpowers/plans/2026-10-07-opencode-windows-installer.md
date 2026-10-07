# Portable opencode Windows Installer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a double-click portable `OpenCode-Setup.exe` that reproduces the repo's low-cost opencode scaffolding on a fresh Windows machine with zero terminal use.

**Architecture:** `Install-OpenCode.Core.ps1` (testable functions, no GUI) + `Install-OpenCode.ps1` (WinForms click-only wizard) compiled via ps2exe into one unsigned `.exe`; templates are copied verbatim from the repo's existing sane configs.

**Tech Stack:** Windows PowerShell 5.1, WinForms (`System.Windows.Forms`), ps2exe module (installed on demand), Pester 3.4.0 (v3 syntax only), Node 24 + npm 11 for the opencode CLI.

## Global Constraints

- Windows 10/11, Windows PowerShell 5.1 (`powershell.exe`, NOT pwsh 7).
- Pester 3.4.0 syntax: `Should Be`, `Should Exist`, `Should Match` (v5 `Should -Be` does NOT exist here).
- Global config target is `$env:USERPROFILE\.config\opencode` (never `%APPDATA%\opencode`).
- JSON files written with `[System.IO.File]::WriteAllText($p, $j, [System.Text.UTF8Encoding]::new($false))` (NoBOM; `Out-File -Encoding utf8` writes BOM and causes mojibake per PIPELINE-STATE viral DNR #11).
- Guide-only keys: installer writes zero key material anywhere (no config files, no env vars, no input fields).
- No commits without explicit user request (each task ends in verification, not `git commit`).
- Placeholders `<PROJECT_DIR>` / `<HOME>` must be substituted with real paths at install time (never written literally).

---

## File map

- Create: `opencode-installer/templates/global.opencode.json` (copy of `opencode-setup/config/global.opencode.json`)
- Create: `opencode-installer/templates/rate-limit-fallback.json` (copy of `opencode-setup/config/rate-limit-fallback.json`)
- Create: `opencode-installer/templates/project.opencode.json` (copy of `opencode-setup/config/project.opencode.json`, placeholders intact for substitution)
- Create: `opencode-installer/templates/lean.opencode.jsonc` (copy of `opencode-setup/config/project.opencode.jsonc`)
- Create: `opencode-installer/templates/AGENTS.template.md` (dispatcher template)
- Create: `opencode-installer/templates/PIPELINE-STATE.seed.md` (continuity header + empty DO-NOT-REPEAT table)
- Create: `opencode-installer/templates/gitignore.template` (blocks `credentials/`, `*.env`, `auth.json`)
- Create: `opencode-installer/templates/memory-global.seed.json`, `opencode-installer/templates/memory-project.seed.json`
- Create: `opencode-installer/Install-OpenCode.Core.ps1` (5 functions, no GUI)
- Create: `opencode-installer/Install-OpenCode.ps1` (WinForms wizard, dot-sources core)
- Create: `opencode-installer/Build-Exe.ps1` (ps2exe compile + hash)
- Create: `opencode-installer/tests/Templates.Tests.ps1`, `Core.Tests.ps1`, `Gui.Tests.ps1`, `Skills.Tests.ps1`
- Bundle: `opencode-setup/skills/` (committed) → installer `payload/skills/` → user paths on target
- Modify: `opencode-installer/GUIDE.md` (click-only picture-steps for the two free keys)

---

### Task 1: Template pack + template tests

**Files:**
- Create: `opencode-installer/templates/` (8 files listed above)
- Test: `opencode-installer/tests/Templates.Tests.ps1`

**Interfaces:**
- Consumes: `opencode-setup/config/*.json*` (source of truth, read-only)
- Produces: template files other tasks copy; `Test-Templates` contract = every file exists, `*.json*` parses, zero secret patterns.

- [ ] **Step 1: Write the failing test**

```powershell
# opencode-installer/tests/Templates.Tests.ps1 (Pester v3)
$T = Join-Path $PSScriptRoot '..\templates'
Describe 'Template pack' {
    It 'has all 8 template files' {
        $expect = @('global.opencode.json','rate-limit-fallback.json','project.opencode.json',
            'lean.opencode.jsonc','AGENTS.template.md','PIPELINE-STATE.seed.md',
            'gitignore.template','memory-global.seed.json','memory-project.seed.json')
        foreach ($f in $expect) { (Join-Path $T $f | Test-Path) | Should Be $true }
    }
    It 'all JSON templates parse' {
        Get-ChildItem $T -Filter '*.json*' | ForEach-Object {
            { Get-Content $_.FullName -Raw | ConvertFrom-Json } | Should Not Throw
        }
    }
    It 'contains zero secret material' {
        $raw = (Get-ChildItem $T -Recurse | Get-Content -Raw) -join "`n"
        $raw | Should Not Match 'nvapi-'
        $raw | Should Not Match 'sk-or-'
        $raw | Should Not Match 'eyJ'
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `powershell -Command "Invoke-Pester opencode-installer/tests/Templates.Tests.ps1"`
Expected: FAIL (templates dir does not exist).

- [ ] **Step 3: Create the template files**

Copy the 4 JSON configs verbatim from `opencode-setup/config/`; write `AGENTS.template.md` (dispatcher table with `<PROJECT_NAME>` slots, continuity rule block copied from root `AGENTS.md:21-30`), `PIPELINE-STATE.seed.md` (`# PIPELINE-STATE.md` + continuity paragraph + `### DO-NOT-REPEAT` empty table), `gitignore.template` (`credentials/`, `assets/credentials/`, `*.env`, `auth.json`, `server-env.txt`), `memory-global.seed.json` (`{"identity":"opencode-windows","policies":"see AGENTS.md + PIPELINE-STATE.md"}`), `memory-project.seed.json` (`{"project":"","continuity":"read PIPELINE-STATE.md first every session"}`).

- [ ] **Step 4: Run test to verify it passes**

Run: `powershell -Command "Invoke-Pester opencode-installer/tests/Templates.Tests.ps1"`
Expected: PASS (3/3).

- [ ] **Step 5: Verify + report**

Run: `powershell -Command "Get-ChildItem opencode-installer/templates | Format-Table Name, Length"`
Expected: 9 files listed. Report done, no commit.

---

### Task 2: Core install functions (no GUI)

**Files:**
- Create: `opencode-installer/Install-OpenCode.Core.ps1`
- Test: `opencode-installer/tests/Core.Tests.ps1`

**Interfaces:**
- Consumes: template files from Task 1 (path via `-TemplatesDir`).
- Produces: `Get-Preflight` (returns hashtable `@{node=$bool; npm=$bool; net=$bool}`), `Install-OpencodeCli` (runs `npm i -g opencode@latest` only if missing), `Write-GlobalConfig -HomeRoot -TemplatesDir`, `Write-ProjectScaffold -ProjectDir -TemplatesDir` (substitutes `<PROJECT_DIR>` with `$ProjectDir`, `<HOME>` with `$env:USERPROFILE`), `Write-MemorySeeds -HomeRoot -ProjectDir -TemplatesDir`. All writers use NoBOM UTF-8.

- [ ] **Step 1: Write the failing test**

```powershell
# opencode-installer/tests/Core.Tests.ps1 (Pester v3)
. (Join-Path $PSScriptRoot '..\Install-OpenCode.Core.ps1')
Describe 'Core install functions' {
    It 'preflight returns the three keys' {
        $p = Get-Preflight
        $p.ContainsKey('node') | Should Be $true
        $p.ContainsKey('npm') | Should Be $true
        $p.ContainsKey('net') | Should Be $true
    }
    It 'writes global config to HomeRoot, NoBOM, no placeholders' {
        $h = Join-Path ([IO.Path]::GetTempPath()) 'oc-test-home'
        Write-GlobalConfig -HomeRoot $h -TemplatesDir (Join-Path $PSScriptRoot '..\templates')
        $cfg = Join-Path $h '.config\opencode\opencode.json'
        (Test-Path $cfg) | Should Be $true
        $bytes = [IO.File]::ReadAllBytes($cfg)
        ($bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) | Should Be $false
        { Get-Content $cfg -Raw | ConvertFrom-Json } | Should Not Throw
    }
    It 'writes project scaffold with substituted paths' {
        $d = Join-Path ([IO.Path]::GetTempPath()) 'oc-test-proj'
        Write-ProjectScaffold -ProjectDir $d -TemplatesDir (Join-Path $PSScriptRoot '..\templates')
        $raw = Get-Content (Join-Path $d 'opencode.json') -Raw
        $raw | Should Not Match '<PROJECT_DIR>'
        $raw | Should Not Match '<HOME>'
        $raw | Should Match ([regex]::Escape($d))
    }
    It 'copies graphify.js plugin when source exists' {
        $d = Join-Path ([IO.Path]::GetTempPath()) 'oc-test-proj'
        (Join-Path $d '.opencode\plugins\graphify.js' | Test-Path) | Should Be $true
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `powershell -Command "Invoke-Pester opencode-installer/tests/Core.Tests.ps1"`
Expected: FAIL (`Install-OpenCode.Core.ps1` not found).

- [ ] **Step 3: Write minimal implementation**

```powershell
# opencode-installer/Install-OpenCode.Core.ps1
function Get-Preflight {
    $node = $null -ne (Get-Command node -ErrorAction SilentlyContinue)
    $npm  = $null -ne (Get-Command npm -ErrorAction SilentlyContinue)
    $net  = (Test-Connection 8.8.8.8 -Count 1 -Quiet)
    return @{ node = $node; npm = $npm; net = $net }
}
function Install-OpencodeCli {
    if ($null -eq (Get-Command opencode -ErrorAction SilentlyContinue)) {
        & npm install -g opencode@latest
    }
}
function Write-Utf8NoBom($Path, $Text) {
    $dir = Split-Path $Path -Parent
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    [System.IO.File]::WriteAllText($Path, $Text, [System.Text.UTF8Encoding]::new($false))
}
function Write-GlobalConfig($HomeRoot, $TemplatesDir) {
    $dest = Join-Path $HomeRoot '.config\opencode'
    Write-Utf8NoBom (Join-Path $dest 'opencode.json') (Get-Content (Join-Path $TemplatesDir 'global.opencode.json') -Raw)
    Write-Utf8NoBom (Join-Path $dest 'rate-limit-fallback.json') (Get-Content (Join-Path $TemplatesDir 'rate-limit-fallback.json') -Raw)
}
function Write-ProjectScaffold($ProjectDir, $TemplatesDir) {
    $raw = (Get-Content (Join-Path $TemplatesDir 'project.opencode.json') -Raw) -replace '<PROJECT_DIR>', $ProjectDir
    $raw = $raw -replace '<HOME>', $env:USERPROFILE
    Write-Utf8NoBom (Join-Path $ProjectDir 'opencode.json') $raw
    Write-Utf8NoBom (Join-Path $ProjectDir '.opencode\opencode.jsonc') (Get-Content (Join-Path $TemplatesDir 'lean.opencode.jsonc') -Raw)
    Write-Utf8NoBom (Join-Path $ProjectDir 'AGENTS.md') (Get-Content (Join-Path $TemplatesDir 'AGENTS.template.md') -Raw)
    Write-Utf8NoBom (Join-Path $ProjectDir 'PIPELINE-STATE.md') (Get-Content (Join-Path $TemplatesDir 'PIPELINE-STATE.seed.md') -Raw)
    Write-Utf8NoBom (Join-Path $ProjectDir '.gitignore') (Get-Content (Join-Path $TemplatesDir 'gitignore.template') -Raw)
    $gSrc = Join-Path (Split-Path $PSScriptRoot -Parent) '.opencode\plugins\graphify.js'
    if (Test-Path $gSrc) {
        $gDst = Join-Path $ProjectDir '.opencode\plugins\graphify.js'
        New-Item -ItemType Directory (Split-Path $gDst) -Force | Out-Null
        Copy-Item $gSrc $gDst -Force
    }
}
function Write-MemorySeeds($HomeRoot, $ProjectDir, $TemplatesDir) {
    Write-Utf8NoBom (Join-Path $HomeRoot '.config\opencode\memory.json') (Get-Content (Join-Path $TemplatesDir 'memory-global.seed.json') -Raw)
    Write-Utf8NoBom (Join-Path $ProjectDir 'data\memory.json') (Get-Content (Join-Path $TemplatesDir 'memory-project.seed.json') -Raw)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `powershell -Command "Invoke-Pester opencode-installer/tests/Core.Tests.ps1"`
Expected: PASS (3/3).

- [ ] **Step 5: Verify + report**

Run: `powershell -Command "Invoke-Pester opencode-installer/tests/"`
Expected: all template + core tests PASS. Report done, no commit.

---

### Task 3: Click-only WinForms wizard

**Files:**
- Create: `opencode-installer/Install-OpenCode.ps1`
- Test: `opencode-installer/tests/Gui.Tests.ps1`

**Interfaces:**
- Consumes: the 5 core functions from Task 2 (dot-sourced, unchanged signatures).
- Produces: `Show-InstallerWizard` (no params; blocks until window closes). Buttons: Browse, Install, Get free keys, Test. Read-only log `TextBox`, progress `ProgressBar`, SmartScreen notice label.

- [ ] **Step 1: Write the failing test**

```powershell
# opencode-installer/tests/Gui.Tests.ps1 (Pester v3, static: never shows a window)
Describe 'Wizard script' {
    It 'parses with zero syntax errors' {
        $errs = $null
        [void][System.Management.Automation.PSParser]::Tokenize(
            (Get-Content (Join-Path $PSScriptRoot '..\Install-OpenCode.ps1') -Raw), [ref]$errs)
        $errs.Count | Should Be 0
    }
    It 'exposes Show-InstallerWizard and wires 4+ buttons' {
        $raw = Get-Content (Join-Path $PSScriptRoot '..\Install-OpenCode.ps1') -Raw
        $raw | Should Match 'function Show-InstallerWizard'
        ([regex]::Matches($raw, 'Add_Click')).Count -ge 4 | Should Be $true
        $raw | Should Match 'FolderBrowserDialog'
        $raw | Should Match 'More info'
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `powershell -Command "Invoke-Pester opencode-installer/tests/Gui.Tests.ps1"`
Expected: FAIL (wizard file not found).

- [ ] **Step 3: Write minimal implementation**

WinForms wizard (~120 lines): `Add-Type -AssemblyName System.Windows.Forms`; dot-source core via `$PSScriptRoot`; form with SmartScreen label (`"If Windows asks, click More info → Run anyway"`), `FolderBrowserDialog` for target dir, `Install` button (preflight → `Install-OpencodeCli` → writers → progress 100), `Get free keys` button (`Start-Process https://openrouter.ai/keys`; `Start-Process https://build.nvidia.com/`), `Test` button (runs `opencode --version` + `opencode debug config` captured, appends green/red lines to read-only log). No `Read-Host`, no text input boxes, no terminal output.

- [ ] **Step 4: Run test to verify it passes**

Run: `powershell -Command "Invoke-Pester opencode-installer/tests/Gui.Tests.ps1"`
Expected: PASS (2/2).

- [ ] **Step 5: Verify + report**

Run: `powershell -Command "Invoke-Pester opencode-installer/tests/"`
Expected: all suites PASS. Report done, no commit.

---

### Task 4: ps2exe build script

**Files:**
- Create: `opencode-installer/Build-Exe.ps1`

**Interfaces:**
- Consumes: `Install-OpenCode.ps1` + core + templates from Tasks 1–3.
- Produces: `opencode-installer/dist/OpenCode-Setup.exe` + `dist/SHA256.txt`.

- [ ] **Step 1: Write the build script**

```powershell
# opencode-installer/Build-Exe.ps1 — run from repo root in powershell.exe
if ($null -eq (Get-Module -ListAvailable ps2exe)) {
    Install-Module ps2exe -Scope CurrentUser -Force
}
Import-Module ps2exe
$out = Join-Path $PSScriptRoot 'dist\OpenCode-Setup.exe'
New-Item -ItemType Directory (Split-Path $out) -Force | Out-Null
Invoke-ps2exe -inputFile (Join-Path $PSScriptRoot 'Install-OpenCode.ps1') `
    -outputFile $out -noConsole -title 'opencode Setup' -version '1.0.0'
Get-FileHash $out -Algorithm SHA256 | Format-Table Hash, Path
```

- [ ] **Step 2: Run the build**

Run: `powershell -Command "opencode-installer/Build-Exe.ps1"`
Expected: `dist/OpenCode-Setup.exe` exists (`Test-Path True`, valid MZ/PE), SHA256 printed + `dist/SHA256.txt` written. Size is informational only (ps2exe 1.0.18 emits a ~41KB launcher stub; payload ships alongside in `dist/payload/`). (First run installs ps2exe; ~2 min.)

- [ ] **Step 3: Smoke-verify without launching GUI**

Run: `powershell -Command "Test-Path opencode-installer/dist/OpenCode-Setup.exe"`
Expected: `True`. Full GUI click-through stays manual (zero-terminal acceptance = human double-clicks once).

- [ ] **Step 4: Verify + report**

Report exe path + SHA256, no commit.

---

### Task 5: GUIDE.md picture-steps + dry-run acceptance

**Files:**
- Modify: `opencode-installer/GUIDE.md`

**Interfaces:**
- Consumes: wizard button order from Task 3, core writers from Task 2.
- Produces: click-only guide (numbered clicks, zero commands) + passing dry-run into a temp dir.

- [ ] **Step 1: Rewrite GUIDE.md as click-steps**

Sections: 1) Double-click `OpenCode-Setup.exe` (SmartScreen note), 2) Pick folder → Install (3 screenshots placeholders described as `docs/…png` slots the user fills with Snipping Tool), 3) Get free keys (openrouter.ai/keys → Sign in → Create key → copy; build.nvidia.com → Generate `nvapi-` key; paste keys nowhere in the installer — into Windows Settings → Environment variables via clicks), 4) Test button → green lines. Zero `npm`/terminal commands anywhere.

- [ ] **Step 2: Dry-run core into temp dirs**

Run: `powershell -Command ". opencode-installer/Install-OpenCode.Core.ps1; Write-ProjectScaffold -ProjectDir $env:TEMP\oc-accept -TemplatesDir opencode-installer/templates; Get-Content $env:TEMP\oc-accept/opencode.json -Raw | ConvertFrom-Json | Out-Null; echo OK"`
Expected: `OK`, temp `opencode.json` parses, no `<PROJECT_DIR>` literal.

- [ ] **Step 3: Full test-suite gate**

Run: `powershell -Command "Invoke-Pester opencode-installer/tests/"`
Expected: ALL PASS (10/10: 3 template + 5 core + 2 gui). Clean temp dirs afterwards.

- [ ] **Step 4: Verify + report**

Report suite result + GUIDE path, no commit.

---

### Task 6: Skill-set restore (vendored bodies)

**Files:**
- Create: `opencode-installer/tests/Skills.Tests.ps1`
- Modify: `Install-OpenCode.Core.ps1` (add `Write-SkillSet -PayloadSkillsDir -HomeRoot`), `Build-Exe.ps1` (stage `payload/skills/` from `opencode-setup/skills/` into `dist/`)

**Interfaces:**
- Consumes: `opencode-setup/skills/{agent-reach,archify,graphify,nlm-skill,youtube-watcher}/` (committed `c07d685`).
- Produces: `Write-SkillSet` (copies agent-reach+archify → `$HomeRoot\.agents\skills\`, graphify+nlm-skill+youtube-watcher → `$HomeRoot\.config\opencode\skills\`, verbatim). superpowers/* never copied (plugin URL self-updates).

- [ ] **Step 1: Write the failing test**

```powershell
# opencode-installer/tests/Skills.Tests.ps1 (Pester v3)
. (Join-Path $PSScriptRoot '..\Install-OpenCode.Core.ps1')
Describe 'Skill-set restore' {
    It 'restores all 5 skills to discovery paths' {
        $h = Join-Path ([IO.Path]::GetTempPath()) 'oc-test-skills'
        Write-SkillSet -PayloadSkillsDir 'C:\Users\tom_w\Documents\Default Project\opencode-setup\skills' -HomeRoot $h
        (Join-Path $h '.agents\skills\agent-reach\SKILL.md' | Test-Path) | Should Be $true
        (Join-Path $h '.agents\skills\archify\SKILL.md' | Test-Path) | Should Be $true
        (Join-Path $h '.config\opencode\skills\graphify\SKILL.md' | Test-Path) | Should Be $true
        (Join-Path $h '.config\opencode\skills\nlm-skill\SKILL.md' | Test-Path) | Should Be $true
        (Join-Path $h '.config\opencode\skills\youtube-watcher\SKILL.md' | Test-Path) | Should Be $true
    }
    It 'never vendors superpowers bodies' {
        $h = Join-Path ([IO.Path]::GetTempPath()) 'oc-test-skills'
        (Test-Path (Join-Path $h '.agents\skills\brainstorming')) | Should Be $false
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `powershell -Command "Invoke-Pester opencode-installer/tests/Skills.Tests.ps1"`
Expected: FAIL (`Write-SkillSet` not defined).

- [ ] **Step 3: Write minimal implementation**

```powershell
function Write-SkillSet($PayloadSkillsDir, $HomeRoot) {
    $map = @{
        'agent-reach'    = '.agents\skills'
        'archify'        = '.agents\skills'
        'graphify'       = '.config\opencode\skills'
        'nlm-skill'      = '.config\opencode\skills'
        'youtube-watcher'= '.config\opencode\skills'
    }
    foreach ($name in $map.Keys) {
        $src = Join-Path $PayloadSkillsDir $name
        if (-not (Test-Path $src)) { throw "payload skill missing: $name" }
        $dst = Join-Path $HomeRoot (Join-Path $map[$name] $name)
        if (Test-Path $dst) { Remove-Item $dst -Recurse -Force }
        Copy-Item $src (Split-Path $dst -Parent) -Recurse -Force
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `powershell -Command "Invoke-Pester opencode-installer/tests/Skills.Tests.ps1"`
Expected: PASS (2/2).

- [ ] **Step 5: Verify + report**

Run: `powershell -Command "Invoke-Pester opencode-installer/tests/"`
Expected: ALL PASS (12/12: 3 template + 5 core + 2 gui + 2 skills). Report done, no commit.

---

## Self-review

- Spec coverage: §1 architecture → Tasks 2–4; §2 files → Task 1; §3 data flow → Task 2 writers + fallback JSON untouched; §4 wizard → Task 3 + GUIDE Task 5; §5 policies → Task 1 templates; §6 skills → Task 6. Gap found: `.opencode/plugins/graphify.js` copy missing — folded into Task 2 `Write-ProjectScaffold` as a `Copy-Item` with `Test-Path` guard + extra `It` in Core.Tests (done inline above).
- Placeholder scan: all steps have literal code/commands; `docs/…png` screenshot slots in GUIDE are user-captured artifacts, explicitly labeled — acceptable, not a code placeholder.
- Type consistency: function names/signatures identical across Tasks 2–3 (`-HomeRoot`, `-ProjectDir`, `-TemplatesDir`); Pester v3 syntax throughout; `Write-Utf8NoBom($Path,$Text)` positional use consistent.

Fix applied inline: Task 2 implementation + test extended with the graphify.js copy guard.
