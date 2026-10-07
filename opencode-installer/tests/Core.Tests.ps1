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
        $rlf = Join-Path $h '.config\opencode\rate-limit-fallback.json'
        (Test-Path $cfg) | Should Be $true
        (Test-Path $rlf) | Should Be $true
        $bytes = [IO.File]::ReadAllBytes($cfg)
        ($bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) | Should Be $false
        { Get-Content $cfg -Raw | ConvertFrom-Json } | Should Not Throw
        { Get-Content $rlf -Raw | ConvertFrom-Json } | Should Not Throw
        (Get-Content $cfg -Raw) | Should Not Match '<PROJECT_DIR>'
        (Get-Content $cfg -Raw) | Should Not Match '<HOME>'
        (Get-Content $rlf -Raw) | Should Not Match '<PROJECT_DIR>'
        (Get-Content $rlf -Raw) | Should Not Match '<HOME>'
    }
    It 'writes project scaffold with substituted paths' {
        $d = Join-Path ([IO.Path]::GetTempPath()) 'oc-test-proj'
        Write-ProjectScaffold -ProjectDir $d -TemplatesDir (Join-Path $PSScriptRoot '..\templates')
        $raw = Get-Content (Join-Path $d 'opencode.json') -Raw
        $raw | Should Not Match '<PROJECT_DIR>'
        $raw | Should Not Match '<HOME>'
        { Get-Content (Join-Path $d 'opencode.json') -Raw | ConvertFrom-Json } | Should Not Throw
        $raw | Should Match ([regex]::Escape($d.Replace('\', '\\')))
    }
    It 'copies graphify.js plugin when source exists' {
        $gSrc = Join-Path (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path '.opencode\plugins\graphify.js'
        if (-not (Test-Path $gSrc)) {
            Write-Warning "graphify.js fixture missing at $gSrc; skipping plugin copy assert."
            $true | Should Be $true
        }
        else {
            $d = Join-Path ([IO.Path]::GetTempPath()) ('oc-test-graphify-' + [guid]::NewGuid().ToString('N'))
            Write-ProjectScaffold -ProjectDir $d -TemplatesDir (Join-Path $PSScriptRoot '..\templates')
            (Join-Path $d '.opencode\plugins\graphify.js' | Test-Path) | Should Be $true
        }
    }
    It 'writes memory seeds as NoBOM JSON' {
        $h = Join-Path ([IO.Path]::GetTempPath()) ('oc-test-mem-home-' + [guid]::NewGuid().ToString('N'))
        $d = Join-Path ([IO.Path]::GetTempPath()) ('oc-test-mem-proj-' + [guid]::NewGuid().ToString('N'))
        Write-MemorySeeds -HomeRoot $h -ProjectDir $d -TemplatesDir (Join-Path $PSScriptRoot '..\templates')
        $gm = Join-Path $h '.config\opencode\memory.json'
        $pm = Join-Path $d 'data\memory.json'
        (Test-Path $gm) | Should Be $true
        (Test-Path $pm) | Should Be $true
        foreach ($f in @($gm, $pm)) {
            $b = [IO.File]::ReadAllBytes($f)
            ($b[0] -eq 0xEF -and $b[1] -eq 0xBB -and $b[2] -eq 0xBF) | Should Be $false
            { Get-Content $f -Raw | ConvertFrom-Json } | Should Not Throw
        }
    }
}
