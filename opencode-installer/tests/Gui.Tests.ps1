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
