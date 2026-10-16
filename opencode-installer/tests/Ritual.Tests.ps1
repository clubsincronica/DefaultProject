# opencode-installer/tests/Ritual.Tests.ps1 (Pester v3)
# Ritual del Sueno: preguntas, fallback AGENTS.md, Save-Ritual, encoding, LLM-offline.
$script:RitualPath = Join-Path $PSScriptRoot '..\Ritual-Del-Sueno.ps1'
. $script:RitualPath

Describe 'Ritual del Sueno' {
    It 'tiene exactamente 11 preguntas, en orden, completas' {
        $q = Get-RitualPreguntas
        $q.Count | Should Be 11
        ($q | ForEach-Object { $_.id }) -join ',' | Should Be '1,2,3,4,5,6,7,8,9,10,11'
        foreach ($p in $q) {
            ([string]$p.enunciado).Length | Should BeGreaterThan 5
            ([string]$p.pista).Length | Should BeGreaterThan 5
            ([string]$p.chiste).Length | Should BeGreaterThan 10
        }
        $q[0].enunciado | Should Match 'llam'
        $q[5].enunciado | Should Match 'sue'
        $q[10].enunciado | Should Match 'celebrando'
    }

    It 'el fallback genera un AGENTS.md con todas las secciones y respuestas' {
        $a = @{
            '1' = 'Mati'; '2' = 'la musica'; '3' = 'el tiempo'; '4' = 'componer';
            '5' = '30 minutos'; '6' = 'tener mi album listo'; '7' = 'siempre lo postergue';
            '8' = 'con carino y directo'; '9' = 'no me reganes'; '10' = 'Ozzy';
            '11' = 'estamos grabando el album'
        }
        $md = Build-AgentsMdFallback $a
        $md.Length | Should BeGreaterThan 500
        $md | Should Match '## Identidad'
        $md | Should Match '## Tu sue'
        $md | Should Match '## Reglas'
        $md | Should Match '## Tu faro'
        $md | Should Match 'Mati'
        $md | Should Match 'Ozzy'
        $md | Should Match 'tener mi album listo'
        $md | Should Match 'estamos grabando el album'
        $md | Should Match 'no me reganes'
        $md | Should Match '30 minutos'
    }

    It 'una respuesta vacia no rompe el fallback (placeholder)' {
        $a = @{ '1' = 'Mati'; '6' = 'mi sueño' }
        $md = Build-AgentsMdFallback $a
        $md | Should Match 'a.n sin respuesta'
        $md | Should Match 'Tu Asistente'
    }

    It 'Invoke-AgentsLlm sin keys en el entorno devuelve $null sin lanzar' {
        $oldN = $env:NVIDIA_API_KEY
        $oldO = $env:OPENROUTER_API_KEY
        try {
            $env:NVIDIA_API_KEY = ''
            $env:OPENROUTER_API_KEY = ''
            $a = @{ '1' = 'Mati'; '6' = 'album' }
            $r = Invoke-AgentsLlm $a
            ($null -eq $r) | Should Be $true
        } finally {
            $env:NVIDIA_API_KEY = $oldN
            $env:OPENROUTER_API_KEY = $oldO
        }
    }

    It 'Save-Ritual escribe AGENTS.md + backup + JSON redondo' {
        $d = Join-Path ([IO.Path]::GetTempPath()) ('oc-ritual-' + [guid]::NewGuid().ToString('N'))
        New-Item -ItemType Directory $d | Out-Null
        try {
            Set-Content (Join-Path $d 'AGENTS.md') 'AGENTS.md original'
            $a = @{ '1' = 'Mati'; '6' = 'mi album' }
            $md = Build-AgentsMdFallback $a
            $path = Save-Ritual -ProjectDir $d -Answers $a -AgentsMd $md -Generador 'plantilla'
            (Test-Path $path) | Should Be $true
            (Get-Content $path -Raw) | Should Match 'Mati'
            (Test-Path (Join-Path $d 'AGENTS.md.ritual-backup')) | Should Be $true
            (Get-Content (Join-Path $d 'AGENTS.md.ritual-backup') -Raw) | Should Match 'original'
            $j = Get-Content (Join-Path $d 'data\ritual-sueno.json') -Raw | ConvertFrom-Json
            $j.generador | Should Be 'plantilla'
            $j.respuestas.p1 | Should Be 'Mati'
            $j.preguntas.Count | Should Be 11
        } finally {
            Remove-Item $d -Recurse -Force -ErrorAction SilentlyContinue
        }
    }

    It 'Save-Ritual rechaza AGENTS.md vacio' {
        $d = Join-Path ([IO.Path]::GetTempPath()) ('oc-ritual-e-' + [guid]::NewGuid().ToString('N'))
        { Save-Ritual -ProjectDir $d -Answers @{} -AgentsMd ' ' -Generador 'plantilla' } | Should Throw
    }

    It 'Ritual-Del-Sueno.ps1 guarda UTF-8 con BOM (acentos sanos)' {
        $bytes = [IO.File]::ReadAllBytes((Resolve-Path $script:RitualPath))
        ($bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) | Should Be $true
    }
}
