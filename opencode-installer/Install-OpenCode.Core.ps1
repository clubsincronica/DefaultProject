# opencode-installer/Install-OpenCode.Core.ps1
function Get-Preflight {
    $node = $null -ne (Get-Command node -ErrorAction SilentlyContinue)
    $npm  = $null -ne (Get-Command npm -ErrorAction SilentlyContinue)
    $net  = (Test-Connection 8.8.8.8 -Count 1 -Quiet)
    return @{ node = $node; npm = $npm; net = $net }
}
function Install-OpencodeCli {
    if ($null -ne (Get-Command opencode -ErrorAction SilentlyContinue)) { return $true }
    & npm install -g opencode@latest
    return ($LASTEXITCODE -eq 0)
}
function Write-Utf8NoBom($Path, $Text) {
    $dir = Split-Path $Path -Parent
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    [System.IO.File]::WriteAllText($Path, $Text, [System.Text.UTF8Encoding]::new($false))
}
function Write-GlobalConfig($HomeRoot, $TemplatesDir) {
    $dest = Join-Path $HomeRoot '.config\opencode'
    Write-Utf8NoBom (Join-Path $dest 'opencode.json') (Get-Content (Join-Path $TemplatesDir 'global.opencode.json') -Raw -Encoding UTF8)
    Write-Utf8NoBom (Join-Path $dest 'rate-limit-fallback.json') (Get-Content (Join-Path $TemplatesDir 'rate-limit-fallback.json') -Raw -Encoding UTF8)
}
function Write-ProjectScaffold($ProjectDir, $TemplatesDir) {
    $escDir = $ProjectDir.Replace('\', '\\')
    $escHome = $env:USERPROFILE.Replace('\', '\\')
    $raw = (Get-Content (Join-Path $TemplatesDir 'project.opencode.json') -Raw -Encoding UTF8).Replace('<PROJECT_DIR>', $escDir)
    $raw = $raw.Replace('<HOME>', $escHome)
    Write-Utf8NoBom (Join-Path $ProjectDir 'opencode.json') $raw
    Write-Utf8NoBom (Join-Path $ProjectDir '.opencode\opencode.jsonc') (Get-Content (Join-Path $TemplatesDir 'lean.opencode.jsonc') -Raw -Encoding UTF8)
    Write-Utf8NoBom (Join-Path $ProjectDir 'AGENTS.md') (Get-Content (Join-Path $TemplatesDir 'AGENTS.template.md') -Raw -Encoding UTF8)
    Write-Utf8NoBom (Join-Path $ProjectDir 'PIPELINE-STATE.md') (Get-Content (Join-Path $TemplatesDir 'PIPELINE-STATE.seed.md') -Raw -Encoding UTF8)
    Write-Utf8NoBom (Join-Path $ProjectDir '.gitignore') (Get-Content (Join-Path $TemplatesDir 'gitignore.template') -Raw -Encoding UTF8)
    Write-Utf8NoBom (Join-Path $ProjectDir 'SECRETS-MAP.md') (Get-Content (Join-Path $TemplatesDir 'secrets-map.template.md') -Raw -Encoding UTF8)
    $gSrc = Join-Path (Split-Path $PSScriptRoot -Parent) '.opencode\plugins\graphify.js'
    if (Test-Path $gSrc) {
        $gDst = Join-Path $ProjectDir '.opencode\plugins\graphify.js'
        New-Item -ItemType Directory (Split-Path $gDst) -Force | Out-Null
        Copy-Item $gSrc $gDst -Force
    }
    else {
        Write-Warning "graphify.js source not found at $gSrc; skipping plugin copy."
    }
}
function Write-MemorySeeds($HomeRoot, $ProjectDir, $TemplatesDir) {
    Write-Utf8NoBom (Join-Path $HomeRoot '.config\opencode\memory.json') (Get-Content (Join-Path $TemplatesDir 'memory-global.seed.json') -Raw -Encoding UTF8)
    Write-Utf8NoBom (Join-Path $ProjectDir 'data\memory.json') (Get-Content (Join-Path $TemplatesDir 'memory-project.seed.json') -Raw -Encoding UTF8)
}
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
        $parent = Split-Path $dst -Parent
        if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
        Copy-Item $src $dst -Recurse -Force
    }
}
