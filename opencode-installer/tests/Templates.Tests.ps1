# opencode-installer/tests/Templates.Tests.ps1 (Pester v3)
$T = Join-Path $PSScriptRoot '..\templates'
Describe 'Template pack' {
    It 'has all 8 template files' {
        $expect = @('global.opencode.json','rate-limit-fallback.json','project.opencode.json',
            'lean.opencode.jsonc','AGENTS.template.md','PIPELINE-STATE.seed.md',
            'gitignore.template','memory-global.seed.json','memory-project.seed.json')
        foreach ($f in $expect) { (Join-Path $T $f | Test-Path) | Should Be $true }
    }
    It 'all JSON templates parse' {
        Get-ChildItem $T -Filter '*.json*' | ForEach-Object {
            { Get-Content $_.FullName -Raw | ConvertFrom-Json } | Should Not Throw
        }
    }
    It 'contains zero secret material' {
        $raw = (Get-ChildItem $T -Recurse | Get-Content -Raw) -join "`n"
        $raw | Should Not Match 'nvapi-'
        $raw | Should Not Match 'sk-or-'
        $raw | Should Not Match 'eyJ'
    }
}
