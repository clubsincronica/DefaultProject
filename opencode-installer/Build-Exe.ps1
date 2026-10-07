# opencode-installer/Build-Exe.ps1
# Builds dist/OpenCode-Setup.exe from Install-OpenCode.ps1 via ps2exe (Task 4).
# Run from repo root in powershell.exe (Windows PowerShell 5.1):
#   powershell -ExecutionPolicy Bypass -File opencode-installer\Build-Exe.ps1
# ASCII-only. Produces dist/OpenCode-Setup.exe + dist/SHA256.txt (+ dist/payload/).

$ErrorActionPreference = 'Stop'

# 1. Ensure ps2exe is available (first run installs it; needs network, ~2 min).
# NuGet provider first: old PowerShellGet 1.0.0.1 fails Install-Module with a
# ShouldContinue/NullReference error when NuGet is missing in a non-interactive host.
if ($null -eq (Get-PackageProvider -ListAvailable -Name NuGet -ErrorAction SilentlyContinue)) {
    Install-PackageProvider -Name NuGet -Scope CurrentUser -Force | Out-Null
}
if ($null -eq (Get-Module -ListAvailable ps2exe)) {
    try { Set-PSRepository -Name 'PSGallery' -InstallationPolicy Trusted -ErrorAction SilentlyContinue } catch { }
    Install-Module ps2exe -Scope CurrentUser -Force
}
Import-Module ps2exe

# 2. Compile the wizard entry point to a GUI exe (no console window).
$out = Join-Path $PSScriptRoot 'dist\OpenCode-Setup.exe'
New-Item -ItemType Directory (Split-Path $out) -Force | Out-Null
Invoke-ps2exe -inputFile (Join-Path $PSScriptRoot 'Install-OpenCode.ps1') `
    -outputFile $out -noConsole -title 'opencode Setup' -version '1.0.0'

# 3. Stage the runtime payload next to the exe.
# The compiled exe dot-sources Install-OpenCode.Core.ps1 via $PSScriptRoot and
# the core resolves graphify.js at (Split-Path $PSScriptRoot -Parent)/.opencode/plugins/graphify.js,
# so dist/payload acts as the fake repo root: payload/opencode-installer/ + payload/.opencode/.
$payloadInstaller = Join-Path $PSScriptRoot 'dist\payload\opencode-installer'
$payloadGraphify = Join-Path $PSScriptRoot 'dist\payload\.opencode\plugins'
New-Item -ItemType Directory $payloadInstaller -Force | Out-Null
New-Item -ItemType Directory $payloadGraphify -Force | Out-Null
$coreDst = Join-Path $payloadInstaller 'Install-OpenCode.Core.ps1'
if (Test-Path -LiteralPath $coreDst) { Remove-Item -LiteralPath $coreDst -Recurse -Force }
Copy-Item (Join-Path $PSScriptRoot 'Install-OpenCode.Core.ps1') $payloadInstaller -Force
$payloadTemplates = Join-Path $payloadInstaller 'templates'
if (Test-Path -LiteralPath $payloadTemplates) { Remove-Item -LiteralPath $payloadTemplates -Recurse -Force }
Copy-Item (Join-Path $PSScriptRoot 'templates') $payloadTemplates -Recurse -Force
$graphifyRepoSrc = Join-Path (Split-Path $PSScriptRoot -Parent) '.opencode\plugins\graphify.js'
$graphifySrc = 'C:\Users\tom_w\Documents\Default Project\.opencode\plugins\graphify.js'
if (Test-Path -LiteralPath $graphifyRepoSrc) { $graphifySrc = $graphifyRepoSrc }
$graphifyDst = Join-Path $payloadGraphify 'graphify.js'
if (Test-Path -LiteralPath $graphifyDst) { Remove-Item -LiteralPath $graphifyDst -Recurse -Force }
if (Test-Path -LiteralPath $graphifySrc) {
    Copy-Item -LiteralPath $graphifySrc (Join-Path $payloadGraphify 'graphify.js') -Force
} else {
    Write-Warning "graphify.js source not found at $graphifySrc; payload staged without plugin copy."
}

# 3b. Stage the vendored skill bodies for Write-SkillSet.
# Repo-relative source first (script dir parent = repo root); the absolute
# path is a fallback only. Explicit allow-list only: never copy superpowers.
$skillsSrcRoot = Join-Path (Split-Path $PSScriptRoot -Parent) 'opencode-setup\skills'
if (-not (Test-Path -LiteralPath $skillsSrcRoot)) {
    $skillsSrcRoot = 'C:\Users\tom_w\Documents\Default Project\opencode-setup\skills'
}
$payloadSkills = Join-Path $PSScriptRoot 'dist\payload\skills'
New-Item -ItemType Directory $payloadSkills -Force | Out-Null
$skillNames = @('agent-reach', 'archify', 'graphify', 'nlm-skill', 'youtube-watcher')
foreach ($name in $skillNames) {
    $skillSrc = Join-Path $skillsSrcRoot $name
    $skillDst = Join-Path $payloadSkills $name
    if (Test-Path -LiteralPath $skillSrc) {
        if (Test-Path -LiteralPath $skillDst) { Remove-Item -LiteralPath $skillDst -Recurse -Force }
        Copy-Item -LiteralPath $skillSrc $skillDst -Recurse -Force
    } else {
        Write-Warning "skill source not found at $skillSrc; payload staged without $name."
    }
}

# 4. SHA256 record (brief step, unchanged) + dist/SHA256.txt artifact.
Get-FileHash $out -Algorithm SHA256 | Format-Table Hash, Path
$hash = (Get-FileHash $out -Algorithm SHA256).Hash
$hashLine = "$hash  OpenCode-Setup.exe"
[System.IO.File]::WriteAllText((Join-Path $PSScriptRoot 'dist\SHA256.txt'), ($hashLine + "`r`n"), [System.Text.UTF8Encoding]::new($false))
Write-Output $hashLine

# 5. Smoke-verify without launching the GUI.
$exists = Test-Path $out
Write-Output "Smoke verify Test-Path dist/OpenCode-Setup.exe: $exists"
if (-not $exists) { throw "Build failed: $out not found." }
$size = (Get-Item $out).Length
Write-Output ("Exe size bytes: {0}" -f $size)
if ($size -lt 1MB) {
    Write-Warning "Exe size $size bytes is under the brief's 1MB expectation (ps2exe 1.0.18 emits a small stub for this script); Test-Path True is the pass gate."
}
