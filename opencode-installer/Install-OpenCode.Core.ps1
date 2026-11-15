# opencode-installer/Install-OpenCode.Core.ps1
function Test-NetworkReachable {
    # ICMP first (cheap). Many networks and hotspots block ping but allow
    # HTTPS, and the npm registry is what Install-OpencodeCli really needs.
    if (Test-Connection 8.8.8.8 -Count 1 -Quiet -ErrorAction SilentlyContinue) { return $true }
    try {
        $null = Invoke-WebRequest -Uri 'https://registry.npmjs.org/-/ping' -UseBasicParsing -TimeoutSec 8 -ErrorAction Stop
        return $true
    } catch {
        if ($_.Exception.Response) { return $true }  # an HTTP answer still means we are online
    }
    return $false
}
function Update-ProcessPath {
    # A freshly installed Node (or the npm global folder) is not on the PATH of
    # this already-running process. Reload it from the registry so Get-Command
    # sees the new tools without asking the user to log off and back on.
    $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $user    = [Environment]::GetEnvironmentVariable('Path', 'User')
    $parts = @($machine, $user) | Where-Object { $_ }
    if ($parts.Count -gt 0) { $env:Path = ($parts -join ';') }
}
function Test-NodeReady {
    Update-ProcessPath
    ($null -ne (Get-Command node -ErrorAction SilentlyContinue)) -and
    ($null -ne (Get-Command npm -ErrorAction SilentlyContinue))
}
function Get-NodeLtsVersion {
    # Official index; the first entry flagged with an lts codename is the LTS line.
    $idx = Invoke-WebRequest -Uri 'https://nodejs.org/dist/index.json' -UseBasicParsing -TimeoutSec 30
    foreach ($i in ($idx.Content | ConvertFrom-Json)) {
        if ($i.lts) { return [string]$i.version }
    }
    throw 'nodejs.org/dist/index.json did not report any LTS release'
}
function Wait-ProcessPumping($Process) {
    # Keep the wizard repainting while an external installer runs, instead of
    # freezing the window for minutes (DoEvents on the same thread).
    while (-not $Process.HasExited) {
        try { [System.Windows.Forms.Application]::DoEvents() } catch { }
        Start-Sleep -Milliseconds 200
    }
}
function Install-NodeLts {
    # Returns the method that worked ('winget' / 'msi'), or $null.
    # 1) winget: silent when App Installer is present (Win10 1809+ / Win11).
    $wg = Get-Command winget -ErrorAction SilentlyContinue
    if ($wg) {
        $wgArgs = 'install --id OpenJS.NodeJS.LTS -e --silent --accept-package-agreements --accept-source-agreements'
        try {
            $p = Start-Process -FilePath $wg.Source -ArgumentList $wgArgs -PassThru -WindowStyle Hidden
            Wait-ProcessPumping $p
        } catch { }
        Update-ProcessPath
        if (Test-NodeReady) { return 'winget' }
    }
    # 2) Official MSI: works with no winget; one Windows UAC prompt (she clicks Yes).
    $ver = Get-NodeLtsVersion
    $url = "https://nodejs.org/dist/$ver/node-$ver-x64.msi"
    $msi = Join-Path $env:TEMP ("node-$ver-x64.msi")
    Invoke-WebRequest -Uri $url -OutFile $msi -UseBasicParsing -TimeoutSec 600
    $msiArgs = '/i "{0}" /qn /norestart' -f $msi
    $p = Start-Process -FilePath 'msiexec.exe' -ArgumentList $msiArgs -Verb RunAs -PassThru
    Wait-ProcessPumping $p
    # 0 = ok, 3010 = ok but a reboot is pending, 1641 = installer started a reboot.
    Update-ProcessPath
    if (Test-NodeReady) { return 'msi' }
    return $null
}
function Get-Preflight {
    $node = $null -ne (Get-Command node -ErrorAction SilentlyContinue)
    $npm  = $null -ne (Get-Command npm -ErrorAction SilentlyContinue)
    $net  = Test-NetworkReachable
    return @{ node = $node; npm = $npm; net = $net }
}
function Install-OpencodeCli {
    Update-ProcessPath
    if ($null -ne (Get-Command opencode -ErrorAction SilentlyContinue)) { return $true }
    # Prefer npm.cmd: Get-Command npm returns npm.ps1, which Start-Process
    # cannot launch as an executable. Pumping DoEvents keeps the wizard from
    # looking frozen while npm downloads the CLI.
    $npmExe = $null
    $cmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if ($cmd) { $npmExe = $cmd.Source }
    else {
        $node = Get-Command node -ErrorAction SilentlyContinue
        if ($node) {
            $cand = Join-Path (Split-Path $node.Source -Parent) 'npm.cmd'
            if (Test-Path -LiteralPath $cand) { $npmExe = $cand }
        }
    }
    $code = 1
    if ($npmExe) {
        $proc = Start-Process -FilePath $npmExe -ArgumentList @('install', '-g', 'opencode@latest') -PassThru -WindowStyle Hidden
        Wait-ProcessPumping $proc
        $code = $proc.ExitCode
    }
    else {
        & npm install -g opencode@latest
        $code = $LASTEXITCODE
    }
    Update-ProcessPath   # npm just created %APPDATA%\npm\opencode.cmd; reload PATH
    return ($code -eq 0)
}
function Invoke-InstallSteps {
    # The whole install sequence, shared by the wizard's Install button and by
    # the build self-test (which runs it against a throw-away HomeRoot/ProjectDir).
    # Logging goes through -Log so the GUI writes to its RichTextBox and the
    # self-test writes to a report file: one code path, two sinks.
    param(
        [Parameter(Mandatory = $true)][string]$ProjectDir,
        [Parameter(Mandatory = $true)][string]$TemplatesDir,
        [string]$HomeRoot = $env:USERPROFILE,
        [scriptblock]$Log = $null,
        [scriptblock]$OnProgress = $null,
        [switch]$SkipCliInstall
    )
    $say = { param($Text, $ColorName = 'Black') if ($Log) { & $Log $Text $ColorName } }
    $step = { param($Percent) if ($OnProgress) { & $OnProgress $Percent } }

    & $step 5
    & $say 'Running preflight checks...' 'Black'
    $pre = Get-Preflight
    if ($pre.node) { & $say 'node found.' 'Green' } else { & $say 'node NOT found.' 'Red' }
    if ($pre.npm) { & $say 'npm found.' 'Green' } else { & $say 'npm NOT found (it ships with Node.js).' 'Red' }

    if (-not ($pre.node -and $pre.npm)) {
        & $step 10
        & $say 'Installing Node.js LTS automatically. This takes 1-3 minutes; if Windows asks for permission, click Yes.' 'Black'
        $how = $null
        try { $how = Install-NodeLts }
        catch { & $say ("Node.js auto-install failed: $($_.Exception.Message)") 'Red' }
        if ($how) { & $say ("Node.js LTS installed ({0}). Checking again..." -f $how) 'Green' }
        else {
            & $say 'Could not install Node.js automatically. Opening nodejs.org: install the LTS version, then click Install again.' 'Red'
            try { Start-Process 'https://nodejs.org/en/download' } catch { }
        }
        $pre = Get-Preflight
        if ($pre.node) { & $say 'node found now.' 'Green' }
        if ($pre.npm) { & $say 'npm found now.' 'Green' }
    }

    if ($pre.net) { & $say 'network OK.' 'Green' }
    else { & $say 'network unreachable. Check your connection.' 'Red' }
    if (-not ($pre.node -and $pre.npm -and $pre.net)) {
        & $say 'Preflight failed. Fix the red items, then Install again.' 'Red'
        return $false
    }

    & $step 25
    & $say 'Installing opencode CLI (npm -g)...' 'Black'
    if ($SkipCliInstall) {
        & $say 'opencode CLI step skipped (self-test).' 'Black'
    } elseif (-not (Install-OpencodeCli)) {
        & $say 'opencode CLI install failed (npm error). Fix npm, then Install again.' 'Red'
        return $false
    }
    & $step 50
    & $say 'Writing global config...' 'Black'
    Write-GlobalConfig $HomeRoot $TemplatesDir
    & $step 70
    & $say ("Scaffolding project at $ProjectDir ...") 'Black'
    Write-ProjectScaffold $ProjectDir $TemplatesDir
    & $step 85
    & $say 'Writing memory seeds...' 'Black'
    Write-MemorySeeds $HomeRoot $ProjectDir $TemplatesDir
    & $step 100
    & $say 'Done. Click Test to verify, Get free keys for provider keys.' 'Green'
    & $say 'Tip: Dream Ritual (Ritual del Sueno) builds your personal AGENTS.md.' 'Black'
    return $true
}

function Write-Utf8NoBom($Path, $Text) {
    $dir = Split-Path $Path -Parent
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    [System.IO.File]::WriteAllText($Path, $Text, [System.Text.UTF8Encoding]::new($false))
}
function Get-GraphifySourcePath {
    # The plugin sits one level above the installer folder:
    #   payload\opencode-installer\        <- InstallerBase (this file)
    #   payload\.opencode\plugins\graphify.js
    # $PSScriptRoot is EMPTY inside a ps2exe exe, so ask the entry script for the
    # base it already resolved (dot-sourcing shares the caller's script scope).
    $cands = New-Object System.Collections.Generic.List[string]
    if ($PSScriptRoot) {
        $cands.Add([System.IO.Path]::Combine((Split-Path -Parent $PSScriptRoot), '.opencode\plugins\graphify.js'))
    }
    $base = $null
    foreach ($scope in @('Script', 'Global')) {
        $v = Get-Variable -Name InstallerBase -Scope $scope -ErrorAction SilentlyContinue
        if ($v -and $v.Value) { $base = $v.Value; break }
    }
    if ($base) {
        $cands.Add([System.IO.Path]::Combine((Split-Path -Parent $base), '.opencode\plugins\graphify.js'))
    }
    foreach ($c in $cands) {
        if (Test-Path -LiteralPath $c -PathType Leaf -ErrorAction SilentlyContinue) { return $c }
    }
    return $null
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
    $gSrc = Get-GraphifySourcePath
    if ($gSrc) {
        $gDst = Join-Path $ProjectDir '.opencode\plugins\graphify.js'
        New-Item -ItemType Directory (Split-Path $gDst) -Force | Out-Null
        Copy-Item $gSrc $gDst -Force
    }
    else {
        Write-Warning "graphify.js plugin not found (expected next to the installer folder, or in .opencode\plugins of the repo); skipping plugin copy."
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
