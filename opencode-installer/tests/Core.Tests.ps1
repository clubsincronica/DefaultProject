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
