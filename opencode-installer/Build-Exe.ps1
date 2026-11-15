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
# Output goes to dist\build\ (not dist\): some AV engines keep a per-path block
# on ...\dist\OpenCode-Setup.exe once they false-positive the ps2exe stub, and
# the build then dies with "CS0016: cannot write to output file, access denied".
$stageDir = Join-Path $PSScriptRoot 'dist\build'
$out = Join-Path $stageDir 'OpenCode-Setup.exe'
New-Item -ItemType Directory $stageDir -Force | Out-Null
Invoke-ps2exe -inputFile (Join-Path $PSScriptRoot 'Install-OpenCode.ps1') `
    -outputFile $out -noConsole -title 'opencode Setup' -version '1.0.0'

# 3. Stage the runtime payload next to the exe.
# The compiled exe finds Install-OpenCode.Core.ps1 via the folder of the running
# exe (the ps2exe host) and the core resolves graphify.js one level above, so
# dist\build\payload acts as the fake repo root:
#   payload\opencode-installer\ + payload\.opencode\ + payload\skills\
$payloadInstaller = Join-Path $stageDir 'payload\opencode-installer'
$payloadGraphify = Join-Path $stageDir 'payload\.opencode\plugins'
New-Item -ItemType Directory $payloadInstaller -Force | Out-Null
New-Item -ItemType Directory $payloadGraphify -Force | Out-Null
$coreDst = Join-Path $payloadInstaller 'Install-OpenCode.Core.ps1'
if (Test-Path -LiteralPath $coreDst) { Remove-Item -LiteralPath $coreDst -Recurse -Force }
Copy-Item (Join-Path $PSScriptRoot 'Install-OpenCode.Core.ps1') $payloadInstaller -Force
# Ritual del Sueno (UTF-8 with BOM; runtime file, not compiled into the exe).
$ritualDst = Join-Path $payloadInstaller 'Ritual-Del-Sueno.ps1'
if (Test-Path -LiteralPath $ritualDst) { Remove-Item -LiteralPath $ritualDst -Recurse -Force }
Copy-Item (Join-Path $PSScriptRoot 'Ritual-Del-Sueno.ps1') $ritualDst -Force
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
$payloadSkills = Join-Path $stageDir 'payload\skills'
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
[System.IO.File]::WriteAllText((Join-Path $stageDir 'SHA256.txt'), ($hashLine + "`r`n"), [System.Text.UTF8Encoding]::new($false))
Write-Output $hashLine

# 5. Real smoke gate: run the compiled exe in self-test mode.
# This is the only check that proves the payload resolver works inside a ps2exe
# exe (where $PSScriptRoot is empty) and that the writers produce every file.
# Test-Path on the exe alone let a broken build ship once: never again.
$report = Join-Path $stageDir 'selftest.txt'
if (Test-Path -LiteralPath $report) { Remove-Item -LiteralPath $report -Force }
# ps2exe swallows "-name" arguments as PowerShell parameters, so the switch is
# passed as an environment variable that the exe reads at startup.
$env:OPENCODE_SETUP_SELFTEST = $report
try {
    $proc = Start-Process -FilePath $out -PassThru
    if (-not $proc.WaitForExit(180000)) {
        try { $proc.Kill() } catch { }
        throw "Self-test timed out after 180s: the exe did not honour the self-test switch (it probably opened the GUI)."
    }
} finally {
    Remove-Item Env:\OPENCODE_SETUP_SELFTEST -ErrorAction SilentlyContinue
}
$code = $proc.ExitCode
if (Test-Path -LiteralPath $report) {
    Get-Content -LiteralPath $report | ForEach-Object { Write-Output "  $_" }
} else {
    throw "Self-test wrote no report at $report (exit $code)."
}
if ($code -ne 0) { throw "Self-test FAILED (exit $code). See $report" }
if (-not (Select-String -LiteralPath $report -Pattern 'RESULT=PASS' -Quiet)) {
    throw "Self-test report has no RESULT=PASS: $report"
}
Write-Output 'Self-test: PASS'

# 6. Package the zip that actually gets shared (exe + payload + GUIDE + hash).
# The -ES instructions ship inside the zip: the person receiving it unzips and
# finds plain-language steps right next to the exe.
$stage = Join-Path $stageDir 'ziproot'
if (Test-Path -LiteralPath $stage) { Remove-Item -LiteralPath $stage -Recurse -Force }
New-Item -ItemType Directory -Path $stage -Force | Out-Null
Copy-Item -LiteralPath $out -Destination $stage -Force
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'GUIDE.md') -Destination $stage -Force
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'INSTRUCCIONES-ES.txt') -Destination $stage -Force
Copy-Item -LiteralPath (Join-Path $stageDir 'SHA256.txt') -Destination $stage -Force
Copy-Item -LiteralPath (Join-Path $stageDir 'payload') -Destination (Join-Path $stage 'payload') -Recurse -Force
$zip = Join-Path $PSScriptRoot 'OpenCode-Setup.zip'
if (Test-Path -LiteralPath $zip) { Remove-Item -LiteralPath $zip -Force }
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip -CompressionLevel Optimal
Write-Output ("Zip: {0} ({1:N0} bytes)" -f $zip, (Get-Item -LiteralPath $zip).Length)
