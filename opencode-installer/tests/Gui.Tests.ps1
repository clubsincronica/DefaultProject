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
    It 'resolves dist payload with dev-layout fallback (static)' {
        $raw = Get-Content (Join-Path $PSScriptRoot '..\Install-OpenCode.ps1') -Raw
        $raw | Should Match 'payload\\opencode-installer'
        $raw | Should Match 'Install-OpenCode\.Core\.ps1'
        $raw | Should Match 'InstallerBase'
        $raw | Should Match '\$PSScriptRoot'
    }
    It 'aborts before writers when npm install fails (static)' {
        # The install sequence lives in Invoke-InstallSteps (Core.ps1) since the
        # refactor, because the build self-test must run the same code path as
        # the Install button. The invariant still holds inside that function.
        $core = Get-Content (Join-Path $PSScriptRoot '..\Install-OpenCode.Core.ps1') -Raw
        $start = $core.IndexOf('function Invoke-InstallSteps')
        $end = $core.IndexOf('function Write-Utf8NoBom')
        ($start -ge 0 -and $end -gt $start) | Should Be $true
        $body = $core.Substring($start, $end - $start)
        $body | Should Match ([regex]::Escape('} elseif (-not (Install-OpencodeCli)) {'))
        $body.IndexOf('Install-OpencodeCli') -lt $body.IndexOf('Write-GlobalConfig') | Should Be $true
        # And the button really calls that function, not the writers directly.
        $wiz = Get-Content (Join-Path $PSScriptRoot '..\Install-OpenCode.ps1') -Raw
        $wiz | Should Match ([regex]::Escape('Invoke-InstallSteps -ProjectDir $state.ProjectDir'))
        $wiz.Contains('Write-GlobalConfig') | Should Be $false
    }
}
