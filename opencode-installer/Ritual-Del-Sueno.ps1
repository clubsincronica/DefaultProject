# opencode-installer/Ritual-Del-Sueno.ps1
# Ritual del Sueño: 11 preguntas lúdicas -> AGENTS.md personalizado.
# Corre desde el instalador (botón "Ritual del Sueno") o standalone:
#   powershell -ExecutionPolicy Bypass -File Ritual-Del-Sueno.ps1 [-ProjectDir <dir>]
# Lee API keys SOLO del entorno (NVIDIA_API_KEY / OPENROUTER_API_KEY); nunca
# las escribe ni las muestra. Sin key => generador determinístico (plantilla).
# Este archivo va en UTF-8 con BOM (PowerShell 5.1 + acentos).

param(
    [string]$ProjectDir = (Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'opencode-project')
)

function Get-RitualPreguntas {
    @(
        @{ id = 1;  enunciado = '¿Cómo te llamás?';                      pista = 'Tu nombre, como te digan tus amigos.';                     chiste = 'Sin datos no hay servicio. Tranqui: no es el DNI, solo tu nombre bonito.' },
        @{ id = 2;  enunciado = '¿Qué cosas te importan en la vida?';    pista = 'Lo que te hace levantarte aunque el snooze sea tentador.'; chiste = 'Todo lo que te importa cabe en un tupper... bueno, acá en un párrafo.' },
        @{ id = 3;  enunciado = '¿Qué te frena hoy?';                    pista = 'Tiempo, dinero, miedo, no saber por dónde empezar...';     chiste = 'Todos tenemos el freno de mano puesto. Vamos a ver cuál es el tuyo (spoiler: todos tenemos uno).' },
        @{ id = 4;  enunciado = '¿En qué sos bueno/a?';                  pista = 'Sí, vos. Aunque sea en elegir series, hay algo.';           chiste = 'Todos somos buenos en algo. Si no se te ocurre nada, acá te esperamos la respuesta más tarde.' },
        @{ id = 5;  enunciado = '¿Cuánto tiempo por día le podés dedicar?'; pista = 'Minutos por día, redondo, sin vergüenza.';               chiste = '"Un rato" no es una unidad de medida. Prometé lo que puedas cumplir, que esto es para siempre... o al menos para el desayuno.' },
        @{ id = 6;  enunciado = 'Ahora sí: ¿qué sueño tuyo te gustaría cumplir?'; pista = 'El grande. El que da un poco de vértigo decirlo en voz alta.'; chiste = 'Respirá. Nadie te va a juzgar. Bueno, tal vez un poco el universo, pero con onda.' },
        @{ id = 7;  enunciado = '¿Por qué te importa ese sueño en particular?'; pista = 'La historia detrás. Esto le da alma a tu AGENTS.md.';   chiste = 'El "por qué" es el combustible. Sin él, los sueños se quedan en juntadas de fotos viejas.' },
        @{ id = 8;  enunciado = '¿Cómo te gusta que te hablen?';          pista = 'Con cariño, directo, con chistes, serio... definí el tono.'; chiste = '¿Coach motivacional o amigo de boliche? Definí el tono, que después no hay reclamo.' },
        @{ id = 9;  enunciado = '¿Qué NO querés que te haga?';            pista = 'También sirve para poner límites.';                        chiste = '"No me hables como si fuera un manual de instrucciones" es una respuesta perfectamente válida.' },
        @{ id = 10; enunciado = '¿Tu asistente tiene nombre?';           pista = 'Dejalo en blanco y el ritual elige uno para vos.';          chiste = 'Puede ser como "Ozzy", puede ser el que elijas vos. Spoiler: no va a ser Clippy.' },
        @{ id = 11; enunciado = 'Si todo sale bien dentro de un año, ¿qué estás celebrando?'; pista = 'Pintá la escena del final del camino.'; chiste = 'Un año. ¿Qué brindamos? Champagne imaginario por ahora, real cuando llegue el día.' }
    )
}

function Get-RitualRespuesta($Answers, [string]$Id) {
    $v = [string]$Answers[$Id]
    if ([string]::IsNullOrWhiteSpace($v)) { return '(aún sin respuesta)' }
    return $v.Trim()
}

function Build-AgentsMdFallback($Answers) {
    $nombre     = Get-RitualRespuesta $Answers '1'
    $importan   = Get-RitualRespuesta $Answers '2'
    $frena      = Get-RitualRespuesta $Answers '3'
    $bueno      = Get-RitualRespuesta $Answers '4'
    $tiempo     = Get-RitualRespuesta $Answers '5'
    $sueno      = Get-RitualRespuesta $Answers '6'
    $porQue     = Get-RitualRespuesta $Answers '7'
    $tono       = Get-RitualRespuesta $Answers '8'
    $noHacer    = Get-RitualRespuesta $Answers '9'
    $nombreAsis = Get-RitualRespuesta $Answers '10'
    if ($nombreAsis -eq '(aún sin respuesta)') { $nombreAsis = 'Tu Asistente' }
    $faro       = Get-RitualRespuesta $Answers '11'

    return @"
# AGENTS.md — el rincón de $nombre

Este archivo es la constitución de tu asistente. Léelo (y actualízalo) antes
de cada sesión importante. Si algo acá choca con lo que $nombreAsis entiende
del mundo, manda este archivo.

## Identidad

- **Te acompañás vos, $nombre.** Tu asistente se llama **$nombreAsis**.
- **Te habla así:** $tono.
- Lo que te importa (y nunca se pierde de vista): $importan.
- Sos bueno/a en: $bueno.

## Tu sueño

> $sueno

**Por qué te importa:** $porQue

Este es el norte. Todo lo que haga $nombreAsis debe acercarte a este sueño,
o no se hace.

## Cómo trabajan juntos

- **Tiempo real por día:** $tiempo. Ni un minuto más exigido, ni uno menos
  prometido. Constancia gana a intensidad.
- **Primero el por qué, después el qué:** si algo no conecta con el sueño,
  se corta sin drama.
- **Los errores se cuentan:** si algo sale mal, se anota en `PIPELINE-STATE.md`
  para no repetirlo. Regla de oro: nadie aprende de un éxito que no entiende,
  pero todos aprenden de un error bien documentado.

## Reglas

1. **NO hacer:** $noHacer.
2. **Nada de humo:** respuestas concretas, pasos accionables, ceropromesas mágicas.
3. **Datos reales o nada:** si no sabés algo, decilo; nunca inventes.
4. **Sin secretos:** nunca pidas ni guardes contraseñas en este archivo.
5. **El sueño manda:** $sueno — si una tarea no lo sirve, se descarta.

## Tu faro (celebración del año)

> $faro

Eso es lo que están construyendo entre los dos. Cuando la IA escriba algo
que hable de ese futuro, ya saben que van por el camino correcto.

---
*Generado por el Ritual del Sueño. Revisalo, editalo, es tuyo.*
"@
}

function Invoke-AgentsLlm($Answers) {
    $nombreAsis = Get-RitualRespuesta $Answers '10'
    if ($nombreAsis -eq '(aún sin respuesta)') { $nombreAsis = 'Tu Asistente' }
    $nombreUser = Get-RitualRespuesta $Answers '1'

    $sistema = 'Sos el arquitecto de archivos AGENTS.md para un asistente de IA personal en español cercano (rioplatense, cálido, con humor sutil pero profesional). ' +
        'A partir de las respuestas de una persona, escribí UN archivo AGENTS.md en markdown con EXACTAMENTE estas secciones: ' +
        '## Identidad (nombre del usuario y del asistente, tono de habla, le importa..., es bueno/a en...), ' +
        '## Tu sueño (el sueño textual + por qué le importa; remarca que todo debe servir a ese sueño), ' +
        '## Cómo trabajan juntos (tiempo por día, regla de errores documentados), ' +
        '## Reglas (incluye SIEMPRE la regla "NO hacer" tal cual la persona la pidió, más: nada de humo, datos reales o nada, sin secretos, el sueño manda), ' +
        '## Tu faro (la celebración a un año como visión de futuro). ' +
        'Reglas duras: NO inventes datos que no estén en las respuestas; NO incluyas contraseñas ni datos sensibles; NO agregues secciones fuera de las pedidas; ' +
        'si una respuesta dice "(aún sin respuesta)", no la completes, dejala como está o omite el detalle. ' +
        'Devolvé SOLO el markdown del archivo, sin explicaciones ni prefijos.'

    $lineas = @('Respuestas del ritual (11 preguntas):')
    foreach ($p in (Get-RitualPreguntas)) {
        $lineas += ('P' + $p.id + ' ' + $p.enunciado + ': ' + (Get-RitualRespuesta $Answers ([string]$p.id)))
    }
    $usuario = $lineas -join "`n"

    $endpoints = @()
    if (-not [string]::IsNullOrWhiteSpace($env:NVIDIA_API_KEY)) {
        $endpoints += @{ key = $env:NVIDIA_API_KEY; url = 'https://integrate.api.nvidia.com/v1/chat/completions'; model = 'z-ai/glm-5.3-flash'; nombre = 'NVIDIA NIM' }
    }
    if (-not [string]::IsNullOrWhiteSpace($env:OPENROUTER_API_KEY)) {
        $endpoints += @{ key = $env:OPENROUTER_API_KEY; url = 'https://openrouter.ai/api/v1/chat/completions'; model = 'openai/gpt-4o-mini'; nombre = 'OpenRouter' }
    }
    if ($endpoints.Count -eq 0) { return $null }

    foreach ($ep in $endpoints) {
        try {
            $body = @{
                model = $ep.model
                messages = @(
                    @{ role = 'system'; content = $sistema },
                    @{ role = 'user';   content = $usuario }
                )
                temperature = 0.7
                max_tokens = 8000
            } | ConvertTo-Json -Depth 6
            $r = Invoke-RestMethod -Method Post -Uri $ep.url `
                -Headers @{ Authorization = ('Bearer ' + $ep.key) } `
                -ContentType 'application/json' -Body $body -TimeoutSec 240
            $md = [string]$r.choices[0].message.content
            if ([string]::IsNullOrWhiteSpace($md)) { continue }
            $md = $md -replace '(?s)^\s*```(?:markdown)?\s*', '' -replace '(?s)\s*```\s*$', ''
            $md = $md.Trim()
            # Validación mínima: que sea sustancioso y mencione al usuario.
            if ($md.Length -lt 200) { continue }
            if ($nombreUser.Length -ge 3 -and $md.IndexOf($nombreUser, [StringComparison]::OrdinalIgnoreCase) -lt 0) { continue }
            if ($md -notmatch '^#') { continue }
            return $md
        } catch {
            continue
        }
    }
    return $null
}

function Write-RitualUtf8($Path, $Text) {
    $dir = Split-Path $Path -Parent
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    [System.IO.File]::WriteAllText($Path, $Text, [System.Text.UTF8Encoding]::new($false))
}

function Save-Ritual($ProjectDir, $Answers, $AgentsMd, [string]$Generador) {
    if ([string]::IsNullOrWhiteSpace($AgentsMd)) { throw 'AGENTS.md vacío: nada que guardar.' }
    if (-not (Test-Path $ProjectDir)) { New-Item -ItemType Directory -Path $ProjectDir -Force | Out-Null }
    $agentsPath = Join-Path $ProjectDir 'AGENTS.md'
    if (Test-Path $agentsPath) {
        Copy-Item $agentsPath (Join-Path $ProjectDir 'AGENTS.md.ritual-backup') -Force
    }
    Write-RitualUtf8 $agentsPath $AgentsMd
    $dataDir = Join-Path $ProjectDir 'data'
    $respuestas = [ordered]@{}
    foreach ($p in (Get-RitualPreguntas)) { $respuestas[('p' + $p.id)] = (Get-RitualRespuesta $Answers ([string]$p.id)) }
    $registro = [ordered]@{
        fecha     = (Get-Date -Format 'yyyy-MM-ddTHH:mm:ss')
        generador = $Generador
        preguntas = @(Get-RitualPreguntas | ForEach-Object { $_.enunciado })
        respuestas = $respuestas
    }
    Write-RitualUtf8 (Join-Path $dataDir 'ritual-sueno.json') ($registro | ConvertTo-Json -Depth 5)
    return $agentsPath
}

function Update-RitualStep($st) {
    $p = $st.preguntas[$st.idx]
    $st.progresso.Text = 'Pregunta ' + ($st.idx + 1) + ' de ' + $st.preguntas.Count
    $st.enunciado.Text = $p.enunciado
    $st.pista.Text = 'Pista: ' + $p.pista
    $st.chiste.Text = $p.chiste
    $st.form.Text = 'Ritual del Sueno - paso ' + ($st.idx + 1) + ' de ' + $st.preguntas.Count
    $k = [string]$p.id
    $st.caja.Text = ''
    if ($st.respuestas.ContainsKey($k)) { $st.caja.Text = $st.respuestas[$k] }
    if ($st.idx -eq ($st.preguntas.Count - 1)) { $st.btnSiguiente.Text = 'Generar mi AGENTS.md' }
    else { $st.btnSiguiente.Text = 'Siguiente' }
    $st.estado.Text = ''
    [void]$st.caja.Focus()
}

function Show-RitualWizard($ProjectDir) {
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing

    $st = @{
        ProjectDir = $ProjectDir
        preguntas  = Get-RitualPreguntas
        respuestas = @{}
        idx        = 0
    }

    $form = New-Object System.Windows.Forms.Form
    $form.Text = 'Ritual del Sueno - paso 1 de 1'
    $form.Size = New-Object System.Drawing.Size(620, 500)
    $form.StartPosition = 'CenterScreen'
    $form.FormBorderStyle = 'FixedDialog'
    $form.MaximizeBox = $false
    $form.BackColor = [System.Drawing.Color]::FromArgb(250, 248, 240)

    $progresso = New-Object System.Windows.Forms.Label
    $progresso.Size = New-Object System.Drawing.Size(200, 22)
    $progresso.Location = New-Object System.Drawing.Point(390, 12)
    $progresso.TextAlign = [System.Drawing.ContentAlignment]::TopRight
    $progresso.Font = New-Object System.Drawing.Font('Segoe UI', 10, [System.Drawing.FontStyle]::Bold)
    $progresso.ForeColor = [System.Drawing.Color]::FromArgb(80, 80, 120)
    $form.Controls.Add($progresso)

    $chiste = New-Object System.Windows.Forms.Label
    $chiste.Size = New-Object System.Drawing.Size(570, 40)
    $chiste.Location = New-Object System.Drawing.Point(14, 12)
    $chiste.Font = New-Object System.Drawing.Font('Segoe UI', 9, [System.Drawing.FontStyle]::Italic)
    $chiste.ForeColor = [System.Drawing.Color]::FromArgb(110, 110, 160)
    $form.Controls.Add($chiste)

    $enunciado = New-Object System.Windows.Forms.Label
    $enunciado.Size = New-Object System.Drawing.Size(570, 40)
    $enunciado.Location = New-Object System.Drawing.Point(14, 60)
    $enunciado.Font = New-Object System.Drawing.Font('Segoe UI', 13, [System.Drawing.FontStyle]::Bold)
    $enunciado.ForeColor = [System.Drawing.Color]::FromArgb(40, 40, 70)
    $form.Controls.Add($enunciado)

    $pista = New-Object System.Windows.Forms.Label
    $pista.Size = New-Object System.Drawing.Size(570, 36)
    $pista.Location = New-Object System.Drawing.Point(14, 104)
    $pista.Font = New-Object System.Drawing.Font('Segoe UI', 9)
    $pista.ForeColor = [System.Drawing.Color]::FromArgb(90, 90, 90)
    $form.Controls.Add($pista)

    $caja = New-Object System.Windows.Forms.TextBox
    $caja.Multiline = $true
    $caja.ScrollBars = 'Vertical'
    $caja.Location = New-Object System.Drawing.Point(14, 148)
    $caja.Size = New-Object System.Drawing.Size(570, 210)
    $caja.Font = New-Object System.Drawing.Font('Segoe UI', 11)
    $form.Controls.Add($caja)

    $estado = New-Object System.Windows.Forms.Label
    $estado.Size = New-Object System.Drawing.Size(570, 60)
    $estado.Location = New-Object System.Drawing.Point(14, 366)
    $estado.Font = New-Object System.Drawing.Font('Segoe UI', 9, [System.Drawing.FontStyle]::Italic)
    $estado.ForeColor = [System.Drawing.Color]::FromArgb(70, 130, 70)
    $form.Controls.Add($estado)

    $btnAtras = New-Object System.Windows.Forms.Button
    $btnAtras.Text = 'Atrás'
    $btnAtras.Size = New-Object System.Drawing.Size(110, 34)
    $btnAtras.Location = New-Object System.Drawing.Point(14, 420)
    $btnAtras.Font = New-Object System.Drawing.Font('Segoe UI', 10)
    $form.Controls.Add($btnAtras)

    $btnSiguiente = New-Object System.Windows.Forms.Button
    $btnSiguiente.Text = 'Siguiente'
    $btnSiguiente.Size = New-Object System.Drawing.Size(200, 34)
    $btnSiguiente.Location = New-Object System.Drawing.Point(384, 420)
    $btnSiguiente.Font = New-Object System.Drawing.Font('Segoe UI', 10, [System.Drawing.FontStyle]::Bold)
    $btnSiguiente.BackColor = [System.Drawing.Color]::FromArgb(90, 120, 200)
    $btnSiguiente.ForeColor = [System.Drawing.Color]::White
    $btnSiguiente.FlatStyle = 'Flat'
    $form.Controls.Add($btnSiguiente)

    # Los controles entran al hashtable compartido (referencias; los handlers
    # capturan $st con GetNewClosure y todos ven el mismo estado mutable).
    $st.form = $form
    $st.progresso = $progresso
    $st.chiste = $chiste
    $st.enunciado = $enunciado
    $st.pista = $pista
    $st.caja = $caja
    $st.estado = $estado
    $st.btnAtras = $btnAtras
    $st.btnSiguiente = $btnSiguiente

    $btnSiguiente.Add_Click({
        $p = $st.preguntas[$st.idx]
        $st.respuestas[[string]$p.id] = $st.caja.Text
        if ($st.idx -lt ($st.preguntas.Count - 1)) {
            $st.idx++
            Update-RitualStep $st
            return
        }
        # Última pregunta: generar.
        $st.btnSiguiente.Enabled = $false
        $st.btnAtras.Enabled = $false
        $st.form.Cursor = [System.Windows.Forms.Cursors]::WaitCursor
        [System.Windows.Forms.Application]::DoEvents()
        try {
            $st.estado.Text = 'Consultando a las estrellas (y a las API gratis)...'
            [System.Windows.Forms.Application]::DoEvents()
            $md = Invoke-AgentsLlm $st.respuestas
            $generador = 'plantilla'
            if ($md) { $generador = 'llm' }
            else {
                $md = Build-AgentsMdFallback $st.respuestas
                $st.estado.Text = 'Sin API key: usando la plantilla del ritual (igual sale linda).'
                [System.Windows.Forms.Application]::DoEvents()
            }
            $agentsPath = Save-Ritual -ProjectDir $st.ProjectDir -Answers $st.respuestas -AgentsMd $md -Generador $generador
            [System.Windows.Forms.MessageBox]::Show(
                ("Listo. Tu AGENTS.md quedó en:`n" + $agentsPath + "`n`nGenerado con: " + $generador +
                 "`n`nLa próxima vez que abras OpenCode en esa carpeta, ya te conoce. Ponete cómodo: arrancó la aventura."),
                'Ritual del Sueno completo', 'OK', 'Information') | Out-Null
            $st.form.Close()
        } catch {
            $st.estado.Text = ('Algo salió raro: ' + $_.Exception.Message)
            $st.btnSiguiente.Enabled = $true
            $st.btnAtras.Enabled = $true
        } finally {
            $st.form.Cursor = [System.Windows.Forms.Cursors]::Default
        }
    }.GetNewClosure())

    $btnAtras.Add_Click({
        if ($st.idx -gt 0) {
            $st.respuestas[[string]$st.preguntas[$st.idx].id] = $st.caja.Text
            $st.idx--
            Update-RitualStep $st
        }
    }.GetNewClosure())

    Update-RitualStep $st
    [void]$form.ShowDialog()
    $form.Dispose()
}

if ($MyInvocation.InvocationName -ne '.') {
    Show-RitualWizard -ProjectDir $ProjectDir
}
