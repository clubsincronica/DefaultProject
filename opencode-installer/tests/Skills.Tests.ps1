# opencode-installer/tests/Skills.Tests.ps1 (Pester v3)
. (Join-Path $PSScriptRoot '..\Install-OpenCode.Core.ps1')
$SkillsDir = Join-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) 'opencode-setup\skills'
if (-not (Test-Path -LiteralPath $SkillsDir)) {
    $SkillsDir = 'C:\Users\tom_w\Documents\Default Project\opencode-setup\skills'
}
Describe 'Skill-set restore' {
    It 'restores all 5 skills to discovery paths' {
        $h = Join-Path ([IO.Path]::GetTempPath()) 'oc-test-skills'
        Write-SkillSet -PayloadSkillsDir $SkillsDir -HomeRoot $h
        (Join-Path $h '.agents\skills\agent-reach\SKILL.md' | Test-Path) | Should Be $true
        (Join-Path $h '.agents\skills\archify\SKILL.md' | Test-Path) | Should Be $true
        (Join-Path $h '.config\opencode\skills\graphify\SKILL.md' | Test-Path) | Should Be $true
        (Join-Path $h '.config\opencode\skills\nlm-skill\SKILL.md' | Test-Path) | Should Be $true
        (Join-Path $h '.config\opencode\skills\youtube-watcher\SKILL.md' | Test-Path) | Should Be $true
    }
    It 'never vendors superpowers bodies' {
        $h = Join-Path ([IO.Path]::GetTempPath()) ('oc-test-skills-' + [guid]::NewGuid().ToString('N'))
        Write-SkillSet -PayloadSkillsDir $SkillsDir -HomeRoot $h
        foreach ($root in @((Join-Path $h '.agents\skills'), (Join-Path $h '.config\opencode\skills'))) {
            foreach ($n in @('brainstorming', 'writing-plans', 'systematic-debugging')) {
                (Test-Path (Join-Path $root $n)) | Should Be $false
            }
        }
    }
}
