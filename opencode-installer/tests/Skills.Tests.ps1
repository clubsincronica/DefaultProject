# opencode-installer/tests/Skills.Tests.ps1 (Pester v3)
. (Join-Path $PSScriptRoot '..\Install-OpenCode.Core.ps1')
Describe 'Skill-set restore' {
    It 'restores all 5 skills to discovery paths' {
        $h = Join-Path ([IO.Path]::GetTempPath()) 'oc-test-skills'
        Write-SkillSet -PayloadSkillsDir 'C:\Users\tom_w\Documents\Default Project\opencode-setup\skills' -HomeRoot $h
        (Join-Path $h '.agents\skills\agent-reach\SKILL.md' | Test-Path) | Should Be $true
        (Join-Path $h '.agents\skills\archify\SKILL.md' | Test-Path) | Should Be $true
        (Join-Path $h '.config\opencode\skills\graphify\SKILL.md' | Test-Path) | Should Be $true
        (Join-Path $h '.config\opencode\skills\nlm-skill\SKILL.md' | Test-Path) | Should Be $true
        (Join-Path $h '.config\opencode\skills\youtube-watcher\SKILL.md' | Test-Path) | Should Be $true
    }
    It 'never vendors superpowers bodies' {
        $h = Join-Path ([IO.Path]::GetTempPath()) 'oc-test-skills'
        (Test-Path (Join-Path $h '.agents\skills\brainstorming')) | Should Be $false
    }
}
