# opencode-installer/Install-OpenCode.ps1
# Click-only installer wizard for opencode on Windows 10/11 (PowerShell 5.1).
# Guide-only keys: this wizard never asks for, writes, or stores key material.

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Payload resolver: the compiled exe runs from dist/ while the payload stages
# to dist/payload/opencode-installer/. Pick the first candidate holding the
# core script; fall back to $PSScriptRoot (dev layout).
$script:InstallerBase = $PSScriptRoot
foreach ($c in @($PSScriptRoot, (Join-Path $PSScriptRoot 'payload\opencode-installer'))) {
    if (Test-Path (Join-Path $c 'Install-OpenCode.Core.ps1')) { $script:InstallerBase = $c; break }
}
. (Join-Path $script:InstallerBase 'Install-OpenCode.Core.ps1')

function Show-InstallerWizard {
    $templatesDir = Join-Path $script:InstallerBase 'templates'
    $state = @{ ProjectDir = (Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'opencode-project') }

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

    $addLog = {
        param([string]$Text, [string]$ColorName = 'Black')
        $logBox.SelectionStart = $logBox.TextLength
        $logBox.SelectionLength = 0
        $logBox.SelectionColor = [System.Drawing.Color]::FromName($ColorName)
        $logBox.AppendText("$Text`r`n")
        $logBox.SelectionColor = $logBox.ForeColor
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
        $form.Cursor = [System.Windows.Forms.Cursors]::WaitCursor
        [System.Windows.Forms.Application]::DoEvents()
        try {
            $progressBar.Value = 5
            & $addLog 'Running preflight checks...' 'Black'
            $pre = Get-Preflight
            if ($pre.node) { & $addLog 'node found.' 'Green' }
            else { & $addLog 'node NOT found. Install Node.js LTS first.' 'Red' }
            if ($pre.npm) { & $addLog 'npm found.' 'Green' }
            else { & $addLog 'npm NOT found. Install Node.js LTS first.' 'Red' }
            if ($pre.net) { & $addLog 'network OK.' 'Green' }
            else { & $addLog 'network unreachable. Check your connection.' 'Red' }
            if (-not ($pre.node -and $pre.npm -and $pre.net)) {
                & $addLog 'Preflight failed. Fix the red items, then Install again.' 'Red'
                return
            }
            $progressBar.Value = 25
            & $addLog 'Installing opencode CLI (npm -g)...' 'Black'
            [System.Windows.Forms.Application]::DoEvents()
            if (-not (Install-OpencodeCli)) {
                & $addLog 'opencode CLI install failed (npm error). Fix npm, then Install again.' 'Red'
                $browseButton.Enabled = $true
                $installButton.Enabled = $true
                $testButton.Enabled = $true
                $keysButton.Enabled = $true
                $form.Cursor = [System.Windows.Forms.Cursors]::Default
                return
            }
            [System.Windows.Forms.Application]::DoEvents()
            $progressBar.Value = 50
            & $addLog 'Writing global config...' 'Black'
            [System.Windows.Forms.Application]::DoEvents()
            Write-GlobalConfig $env:USERPROFILE $templatesDir
            [System.Windows.Forms.Application]::DoEvents()
            $progressBar.Value = 70
            & $addLog ("Scaffolding project at $($state.ProjectDir) ...") 'Black'
            [System.Windows.Forms.Application]::DoEvents()
            Write-ProjectScaffold $state.ProjectDir $templatesDir
            [System.Windows.Forms.Application]::DoEvents()
            $progressBar.Value = 85
            & $addLog 'Writing memory seeds...' 'Black'
            [System.Windows.Forms.Application]::DoEvents()
            Write-MemorySeeds $env:USERPROFILE $state.ProjectDir $templatesDir
            [System.Windows.Forms.Application]::DoEvents()
            $progressBar.Value = 100
            & $addLog 'Done. Click Test to verify, Get free keys for provider keys.' 'Green'
        } catch {
            & $addLog ("Install failed: $($_.Exception.Message)") 'Red'
        } finally {
            $browseButton.Enabled = $true
            $installButton.Enabled = $true
            $testButton.Enabled = $true
            $keysButton.Enabled = $true
            $form.Cursor = [System.Windows.Forms.Cursors]::Default
            [System.Windows.Forms.Application]::DoEvents()
        }
    })

    $keysButton.Add_Click({
        Start-Process https://openrouter.ai/keys
        Start-Process https://build.nvidia.com/
        & $addLog 'Opened key pages in your browser. Keys stay on provider sites; nothing is stored here.' 'Black'
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
