# opencode-installer/tests/GuiSmoke.ps1
# Safe end-to-end smoke test for the compiled wizard window.
#
# What it proves (and what it does NOT):
#   + the ps2exe exe starts, resolves its payload, and shows the window titled
#     "opencode Windows Installer" (the Mercedes bug was the exe dying here);
#   + no error dialog pops up on startup (ps2exe shows a MessageBox for every
#     error record, which is what she saw as chained popups);
#   - it does NOT click Install: the install sequence itself is covered by the
#     build self-test gate, which runs the exact same Invoke-InstallSteps.
#
# Why not click: WinForms controls from a ps2exe host expose no UI Automation
# patterns (every element is ControlType.Pane), and BM_CLICK / posted mouse
# messages do not raise Click. Redirecting USERPROFILE makes the host emit its
# own error popup. Clicking for real would overwrite the live
# %USERPROFILE%\.config\opencode config, so the safe check is render-only.
#
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File tests\GuiSmoke.ps1
# Exit code 0 = window appeared, no popups, payload resolved.

$ErrorActionPreference = 'Stop'
$exe = Join-Path (Split-Path -Parent $PSScriptRoot) 'dist\build\OpenCode-Setup.exe'
if (-not (Test-Path -LiteralPath $exe)) { throw "build the exe first: $exe not found" }

# Keep the wizard pointed at a throw-away folder so nothing real is targeted,
# even though this test never presses a button.
$sandbox = Join-Path $env:TEMP ('opencode-gui-smoke-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
New-Item -ItemType Directory -Path $sandbox -Force | Out-Null
$env:OPENCODE_SETUP_PROJECT_DIR = Join-Path $sandbox 'project'
Remove-Item Env:\OPENCODE_SETUP_SELFTEST -ErrorAction SilentlyContinue
Remove-Item Env:\OPENCODE_SETUP_LOG_FILE -ErrorAction SilentlyContinue

Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
$AE = [System.Windows.Automation.AutomationElement]
$TS = [System.Windows.Automation.TreeScope]

$proc = Start-Process -FilePath $exe -PassThru
$win = $null
for ($i = 0; $i -lt 60 -and -not $win; $i++) {
    Start-Sleep -Milliseconds 500
    if ($proc.HasExited) { throw "exe exited before showing a window (exit $($proc.ExitCode))" }
    $cond = New-Object System.Windows.Automation.PropertyCondition($AE::NameProperty, 'opencode Windows Installer')
    $win = $AE::RootElement.FindFirst($TS::Children, $cond)
}

$problems = New-Object System.Collections.Generic.List[string]
if (-not $win) {
    $problems.Add('wizard window never appeared (payload resolver or startup error)')
} else {
    Write-Output 'wizard window: found'
    # Any extra top-level window owned by this process is a ps2exe error
    # MessageBox: the failure mode that made Mercedes see popups.
    $tops = $AE::RootElement.FindAll($TS::Children, [System.Windows.Automation.Condition]::TrueCondition)
    for ($i = 0; $i -lt $tops.Count; $i++) {
        $e = $tops.Item($i)
        if ($e.Current.ProcessId -eq $proc.Id -and $e.Current.Name -ne 'opencode Windows Installer') {
            $problems.Add("extra dialog window: [$($e.Current.Name)] class=$($e.Current.ClassName)")
        }
    }
}

try { $proc.CloseMainWindow() | Out-Null } catch { }
Start-Sleep -Milliseconds 500
try { if (-not $proc.HasExited) { $proc.Kill() } } catch { }
Remove-Item Env:\OPENCODE_SETUP_PROJECT_DIR -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $sandbox -Recurse -Force -ErrorAction SilentlyContinue

if ($problems.Count -gt 0) {
    Write-Output 'GUI SMOKE: FAIL'
    $problems | ForEach-Object { Write-Output "  - $_" }
    exit 1
}
Write-Output 'GUI SMOKE: PASS'
exit 0
