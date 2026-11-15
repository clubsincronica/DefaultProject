# opencode-installer/Install-OpenCode.ps1
# Click-only installer wizard for opencode on Windows 10/11 (PowerShell 5.1).
# Guide-only keys: this wizard never asks for, writes, or stores key material.

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# ---------------------------------------------------------------------------
# Payload resolver.
# A ps2exe-compiled exe is NOT a script file: inside it $PSScriptRoot is EMPTY.
# The real folder has to come from the running process. Look, in order, at:
#   - $PSScriptRoot                                   (plain .ps1, Pester tests)
#   - <folder of the running exe>                     (compiled exe, flat layout)
#   - <folder of the running exe>\payload\opencode-installer  (shipped zip)
#   - $env:OPENCODE_INSTALLER_HOME                    (manual override)
# Do not let a bad path raise: ps2exe turns every error record into a modal
# MessageBox, so a throw here would spam popups instead of failing cleanly.
# ---------------------------------------------------------------------------
function Get-InstallerBase {
    $bases = New-Object System.Collections.Generic.List[string]
    if ($PSScriptRoot) { $bases.Add($PSScriptRoot) }
    try {
        $exePath = [System.Diagnostics.Process]::GetCurrentProcess().MainModule.FileName
        if ($exePath) {
            $exeDir = [System.IO.Path]::GetDirectoryName($exePath)
            if ($exeDir) { $bases.Add($exeDir) }
        }
    } catch { }
    if ($env:OPENCODE_INSTALLER_HOME) { $bases.Add($env:OPENCODE_INSTALLER_HOME) }
    $script:BaseCandidates = $bases
    foreach ($b in $bases) {
        foreach ($sub in @('', 'payload\opencode-installer')) {
            $cand = $b
            if ($sub) { $cand = [System.IO.Path]::Combine($b, $sub) }
            if (-not $cand) { continue }
            $probe = [System.IO.Path]::Combine($cand, 'Install-OpenCode.Core.ps1')
            if (Test-Path -LiteralPath $probe -PathType Leaf -ErrorAction SilentlyContinue) { return $cand }
        }
    }
    return $null
}

function Show-Fatal($Message) {
    try {
        [void][System.Windows.Forms.MessageBox]::Show(
            $Message, 'opencode Setup',
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Error)
    } catch { }
}

function Write-SelfTestReport($Path, $Lines) {
    try { [System.IO.File]::WriteAllLines($Path, [string[]]$Lines) } catch { }
}

# Build-time self-test: runs the whole install chain into a throw-away folder.
# It never touches the real profile, never runs npm, and exits with 0/1.
# Build-Exe.ps1 uses it as the smoke gate: "the exe resolved its payload and
# the writers produced every file" is the only thing that proves the exe works.
function Invoke-SelfTest($ReportPath) {
    $lines = New-Object System.Collections.Generic.List[string]
    $fail = $false
    $oldPref = $WarningPreference
    $WarningPreference = 'SilentlyContinue'
    try {
        $lines.Add("ps_version=$($PSVersionTable.PSVersion)")
        $lines.Add("psscriptroot=[$PSScriptRoot]")
        $lines.Add("candidates=[" + ($script:BaseCandidates -join '; ') + "]")
        $lines.Add("installer_base=[$script:InstallerBase]")
        $coreOk = [bool](Get-Command Get-Preflight -ErrorAction SilentlyContinue)
        $lines.Add("core_loaded=$coreOk")
        if (-not $coreOk) { $fail = $true }

        if (-not $fail) {
            $tpl = [System.IO.Path]::Combine($script:InstallerBase, 'templates')
            $tplOk = Test-Path -LiteralPath $tpl -PathType Container
            $lines.Add("templates_dir=$tpl exists=$tplOk")
            if (-not $tplOk) { $fail = $true }
            $ritual = [System.IO.Path]::Combine($script:InstallerBase, 'Ritual-Del-Sueno.ps1')
            $lines.Add("ritual_present=$(Test-Path -LiteralPath $ritual -PathType Leaf)")
        }

        if (-not $fail) {
            $tmp = [System.IO.Path]::Combine($env:TEMP, ('oc-selftest-' + [guid]::NewGuid().ToString('N')))
            $proj = [System.IO.Path]::Combine($tmp, 'project')
            New-Item -ItemType Directory -Path $tmp -Force | Out-Null
            $pre = Get-Preflight
            $lines.Add("preflight node=$($pre.node) npm=$($pre.npm) net=$($pre.net)")
            $lines.Add("node_ready=$(Test-NodeReady)")
            $lines.Add("winget_present=$([bool](Get-Command winget -ErrorAction SilentlyContinue))")
            if ($pre.net) {
                try { $lines.Add("node_lts_version=$(Get-NodeLtsVersion)") }
                catch { $lines.Add("node_lts_version=ERROR $($_.Exception.Message)"); $fail = $true }
            } else { $lines.Add('node_lts_version=skipped (offline)') }
            # Run the SAME sequence the Install button runs (Invoke-InstallSteps),
            # not the writers one by one: a gate that skips the button's code path
            # is how a broken build shipped once already.
            $log = {
                param($Text, $ColorName)
                $lines.Add("  step: $Text")
            }
            $progress = {
                param($Percent)
                $lines.Add("  progress: $Percent")
            }
            $ok = Invoke-InstallSteps -ProjectDir $proj -TemplatesDir $tpl -HomeRoot $tmp `
                -Log $log -OnProgress $progress -SkipCliInstall
            $lines.Add("install_steps_ok=$ok")
            if (-not $ok) { $fail = $true }
            $expected = @(
                [System.IO.Path]::Combine($tmp, '.config\opencode\opencode.json'),
                [System.IO.Path]::Combine($tmp, '.config\opencode\rate-limit-fallback.json'),
                [System.IO.Path]::Combine($tmp, '.config\opencode\memory.json'),
                [System.IO.Path]::Combine($proj, 'opencode.json'),
                [System.IO.Path]::Combine($proj, '.opencode\opencode.jsonc'),
                [System.IO.Path]::Combine($proj, 'AGENTS.md'),
                [System.IO.Path]::Combine($proj, 'PIPELINE-STATE.md'),
                [System.IO.Path]::Combine($proj, 'SECRETS-MAP.md'),
                [System.IO.Path]::Combine($proj, '.gitignore'),
                [System.IO.Path]::Combine($proj, 'data\memory.json'),
                [System.IO.Path]::Combine($proj, '.opencode\plugins\graphify.js')
            )
            foreach ($f in $expected) {
                $exists = Test-Path -LiteralPath $f -PathType Leaf
                $lines.Add("created=$exists $f")
                if (-not $exists) { $fail = $true }
            }
            $pj = Get-Content ([System.IO.Path]::Combine($proj, 'opencode.json')) -Raw
            $dirSub = -not $pj.Contains('<PROJECT_DIR>')
            $homeSub = -not $pj.Contains('<HOME>')
            $lines.Add("project_dir_substituted=$dirSub")
            $lines.Add("home_substituted=$homeSub")
            if (-not $dirSub) { $fail = $true }
            if (-not $homeSub) { $fail = $true }
            Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue
        }
    } catch {
        $lines.Add("EXCEPTION: $($_.Exception.Message)")
        $fail = $true
    }
    $WarningPreference = $oldPref
    $lines.Add("RESULT=" + $(if ($fail) { 'FAIL' } else { 'PASS' }))
    Write-SelfTestReport $ReportPath $lines
    if ($fail) { exit 1 } else { exit 0 }
}

$script:BaseCandidates = @()
$script:InstallerBase = Get-InstallerBase

# Hidden build switch. ps2exe parses any "-name" command-line argument as a
# PowerShell parameter, so the switch travels as an environment variable
# (Build-Exe.ps1 sets it) with a bare positional word as fallback.
$script:SelfTestReport = $env:OPENCODE_SETUP_SELFTEST
if (-not $script:SelfTestReport -and $args.Count -gt 0 -and "$($args[0])" -eq 'selftest') {
    if ($args.Count -gt 1) { $script:SelfTestReport = [string]$args[1] }
    else { $script:SelfTestReport = [System.IO.Path]::Combine($env:TEMP, 'opencode-installer-selftest.txt') }
}

if (-not $script:InstallerBase) {
    $where = if ($script:BaseCandidates.Count -gt 0) { ($script:BaseCandidates -join "`r`n  ") } else { '(none found)' }
    $msg = @"
The installer payload is missing.

The exe could not find Install-OpenCode.Core.ps1. It looked in:
  $where

Fix: extract the WHOLE zip and keep OpenCode-Setup.exe together with the
payload folder (payload\opencode-installer\...). Do not move the exe alone,
and do not run it from inside the zip viewer.

Falta el payload del instalador. Extrae el zip COMPLETO y deja
OpenCode-Setup.exe junto a la carpeta payload. No muevas solo el .exe
ni lo ejecutes desde el visor del zip.
"@
    if ($script:SelfTestReport) {
        Write-SelfTestReport $script:SelfTestReport (
            "candidates=[$($script:BaseCandidates -join '; ')]`r`ncore_loaded=False`r`nRESULT=FAIL")
        exit 1
    }
    Show-Fatal $msg
    exit 1
}

. ([System.IO.Path]::Combine($script:InstallerBase, 'Install-OpenCode.Core.ps1'))

if (-not (Get-Command Get-Preflight -ErrorAction SilentlyContinue)) {
    if ($script:SelfTestReport) {
        Write-SelfTestReport $script:SelfTestReport (
            "installer_base=[$script:InstallerBase]`r`ncore_loaded=False`r`nRESULT=FAIL")
        exit 1
    }
    Show-Fatal ("Install-OpenCode.Core.ps1 loaded from $script:InstallerBase but defined no functions.`r`nRe-extract the zip and try again.")
    exit 1
}

if ($script:SelfTestReport) { Invoke-SelfTest $script:SelfTestReport }

function Show-InstallerWizard {
    $templatesDir = Join-Path $script:InstallerBase 'templates'
    $defaultProject = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'opencode-project'
    # Test hook: the automation run points this at a throw-away folder.
    if ($env:OPENCODE_SETUP_PROJECT_DIR) { $defaultProject = $env:OPENCODE_SETUP_PROJECT_DIR }
    $state = @{ ProjectDir = $defaultProject }

    $form = New-Object System.Windows.Forms.Form
    $form.Text = 'opencode Windows Installer'
    $form.Size = New-Object System.Drawing.Size(580, 520)
    $form.StartPosition = 'CenterScreen'
    $form.FormBorderStyle = 'FixedDialog'
    $form.MaximizeBox = $false

    $notice = New-Object System.Windows.Forms.Label
    $notice.Text = 'If Windows asks, click More info -> Run anyway (SmartScreen).'
    $notice.Location = New-Object System.Drawing.Point(12, 12)
    $notice.Size = New-Object System.Drawing.Size(540, 20)
    $form.Controls.Add($notice)

    $dirCaption = New-Object System.Windows.Forms.Label
    $dirCaption.Text = 'Project folder:'
    $dirCaption.Location = New-Object System.Drawing.Point(12, 44)
    $dirCaption.Size = New-Object System.Drawing.Size(90, 20)
    $form.Controls.Add($dirCaption)

    $dirValue = New-Object System.Windows.Forms.Label
    $dirValue.Text = $state.ProjectDir
    $dirValue.Location = New-Object System.Drawing.Point(108, 44)
    $dirValue.Size = New-Object System.Drawing.Size(340, 20)
    $dirValue.AutoEllipsis = $true
    $form.Controls.Add($dirValue)

    $browseButton = New-Object System.Windows.Forms.Button
    $browseButton.Text = 'Browse...'
    $browseButton.Location = New-Object System.Drawing.Point(454, 40)
    $browseButton.Size = New-Object System.Drawing.Size(98, 26)
    $form.Controls.Add($browseButton)

    $installButton = New-Object System.Windows.Forms.Button
    $installButton.Text = 'Install'
    $installButton.Location = New-Object System.Drawing.Point(12, 78)
    $installButton.Size = New-Object System.Drawing.Size(120, 30)
    $form.Controls.Add($installButton)

    $testButton = New-Object System.Windows.Forms.Button
    $testButton.Text = 'Test'
    $testButton.Location = New-Object System.Drawing.Point(142, 78)
    $testButton.Size = New-Object System.Drawing.Size(120, 30)
    $form.Controls.Add($testButton)

    $keysButton = New-Object System.Windows.Forms.Button
    $keysButton.Text = 'Get free keys'
    $keysButton.Location = New-Object System.Drawing.Point(272, 78)
    $keysButton.Size = New-Object System.Drawing.Size(120, 30)
    $form.Controls.Add($keysButton)

    $ritualButton = New-Object System.Windows.Forms.Button
    $ritualButton.Text = 'Dream Ritual'
    $ritualButton.Location = New-Object System.Drawing.Point(402, 78)
    $ritualButton.Size = New-Object System.Drawing.Size(120, 30)
    $form.Controls.Add($ritualButton)

    $progressBar = New-Object System.Windows.Forms.ProgressBar
    $progressBar.Location = New-Object System.Drawing.Point(12, 120)
    $progressBar.Size = New-Object System.Drawing.Size(540, 22)
    $progressBar.Minimum = 0
    $progressBar.Maximum = 100
    $form.Controls.Add($progressBar)

    $logBox = New-Object System.Windows.Forms.RichTextBox
    $logBox.Multiline = $true
    $logBox.ReadOnly = $true
    $logBox.ScrollBars = [System.Windows.Forms.RichTextBoxScrollBars]::Vertical
    $logBox.Location = New-Object System.Drawing.Point(12, 152)
    $logBox.Size = New-Object System.Drawing.Size(540, 308)
    $form.Controls.Add($logBox)

    $script:LogFilePath = $env:OPENCODE_SETUP_LOG_FILE
    $addLog = {
        param([string]$Text, [string]$ColorName = 'Black')
        $logBox.SelectionStart = $logBox.TextLength
        $logBox.SelectionLength = 0
        $logBox.SelectionColor = [System.Drawing.Color]::FromName($ColorName)
        $logBox.AppendText("$Text`r`n")
        $logBox.SelectionColor = $logBox.ForeColor
        # Support hook: some runs set OPENCODE_SETUP_LOG_FILE so the same lines
        # also land in a plain text file (RichTextBox content is not readable
        # from outside the process). tests\GuiSmoke.ps1 clears it.
        if ($script:LogFilePath) {
            try { [System.IO.File]::AppendAllText($script:LogFilePath, "$Text`r`n") } catch { }
        }
    }.GetNewClosure()

    $browseButton.Add_Click({
        $dlg = New-Object System.Windows.Forms.FolderBrowserDialog
        $dlg.Description = 'Choose the project folder to scaffold'
        $dlg.SelectedPath = $state.ProjectDir
        if ($dlg.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
            $state.ProjectDir = $dlg.SelectedPath
            $dirValue.Text = $state.ProjectDir
        }
        $dlg.Dispose()
    })

    $installButton.Add_Click({
        $browseButton.Enabled = $false
        $installButton.Enabled = $false
        $testButton.Enabled = $false
        $keysButton.Enabled = $false
        $ritualButton.Enabled = $false
        $form.Cursor = [System.Windows.Forms.Cursors]::WaitCursor
        [System.Windows.Forms.Application]::DoEvents()
        try {
            $installer = {
                param($Text, $ColorName)
                & $addLog $Text $ColorName
            }
            $progress = {
                param($Percent)
                $progressBar.Value = $Percent
                [System.Windows.Forms.Application]::DoEvents()
            }
            [void](Invoke-InstallSteps -ProjectDir $state.ProjectDir -TemplatesDir $templatesDir `
                -HomeRoot $env:USERPROFILE -Log $installer -OnProgress $progress)
        } catch {
            & $addLog ("Install failed: $($_.Exception.Message)") 'Red'
        } finally {
            $browseButton.Enabled = $true
            $installButton.Enabled = $true
            $testButton.Enabled = $true
            $keysButton.Enabled = $true
            $ritualButton.Enabled = $true
            $form.Cursor = [System.Windows.Forms.Cursors]::Default
            [System.Windows.Forms.Application]::DoEvents()
        }
    })

    $keysButton.Add_Click({
        Start-Process https://openrouter.ai/keys
        Start-Process https://build.nvidia.com/
        & $addLog 'Opened key pages in your browser. Keys stay on provider sites; nothing is stored here.' 'Black'
    })

    $ritualButton.Add_Click({
        $ritualScript = Join-Path $script:InstallerBase 'Ritual-Del-Sueno.ps1'
        if (-not (Test-Path -LiteralPath $ritualScript)) {
            & $addLog 'Ritual script missing from payload (Ritual-Del-Sueno.ps1).' 'Red'
            return
        }
        & $addLog "Launching the Dream Ritual for $($state.ProjectDir) ..." 'Black'
        try {
            & powershell.exe -ExecutionPolicy Bypass -File $ritualScript -ProjectDir $state.ProjectDir
            if (Test-Path (Join-Path $state.ProjectDir 'AGENTS.md')) {
                & $addLog 'Ritual done. Your personal AGENTS.md is ready.' 'Green'
            }
        } catch {
            & $addLog ("Ritual failed: $($_.Exception.Message)") 'Red'
        }
    })

    $testButton.Add_Click({
        try {
            $verRaw = (& opencode --version 2>&1)
            $verOk = ($LASTEXITCODE -eq 0)
            $ver = ($verRaw | Out-String).Trim()
            if ($verOk) { & $addLog "opencode --version: $ver" 'Green' }
            else { & $addLog "opencode --version failed: $ver" 'Red' }
        } catch {
            & $addLog "opencode --version failed: $($_.Exception.Message)" 'Red'
        }
        try {
            $cfgRaw = (& opencode debug config 2>&1)
            $cfgOk = ($LASTEXITCODE -eq 0)
            $cfg = ($cfgRaw | Out-String).Trim()
            if ($cfgOk) { & $addLog "debug config OK: $cfg" 'Green' }
            else { & $addLog "debug config reported a problem: $cfg" 'Red' }
        } catch {
            & $addLog "debug config failed: $($_.Exception.Message)" 'Red'
        }
    })

    [void]$form.ShowDialog()
    $form.Dispose()
}

if ($MyInvocation.InvocationName -ne '.') {
    Show-InstallerWizard
}
