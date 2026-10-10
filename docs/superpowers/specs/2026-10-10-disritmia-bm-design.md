# Spec — Disritmia (Stefano Mota) en Bm — cancionero rojo #2

Fecha: 2026-10-10
Estado: aprobado (diseño conversacional, sesión 2026-10-10)

## Objetivo

Canción #2 del cancionero: "Disritmia" (Martinho da Vila) en la versión de
Stefano Mota (YouTube), **mismo tempo (136 BPM) pero +1 tono (2 semitonos)
arriba** respecto de la versión home de Stefano. Tonalidad final: **Bm**.

## Fuentes (verificadas en sesión)

- `sources/reference/disritmia-stefano.mp3` — home video Stefano
  (YouTube 8jLU3UCpuT4 / Wokf65PcvpQ), 142.6s.
  - Tempo: **136.0 BPM** (beat_track + onset tempo coinciden).
  - Key real: **Am** — verificado por (1) chroma intro A=0.69 dominante,
    (2) template fit Am7+D7 gana en intro y canción entera,
    (3) KS con roll correcto: Am en 15/17 ventanas de 8s.
  - **DO-NOT-REPEAT:** el KS de la sesión previa decía "D#m" por un
    `np.roll(prof,-i)` invertido (resultado espejo). El mismo bug aplicado
    al medley decía "Dmin" cuando el ground truth de las cifras en pantalla
    es Bbm — con roll `+i` el medley da exactamente Bbm. Regla: validar
    cualquier key-detection automática contra cifras en pantalla / audio
    known antes de transponer.
- Cifra completa: Cifra Club (chart del original en **Gm**).
  https://www.cifraclub.com/martinho-da-vila/disritmia/
- Cifras del medley de Stefano (5eUz8OEWU6E): **Bbm = Gm+3**, confirma el
  mapeo de transposición de Stefano respecto del chart.
- Relación: chart Gm → Stefano home Am (+2) → target Bm (+4 sobre el chart).

## Mapeo de acordes (Gm chart +4 → Bm)

- Intro/Verse vamp: `Gm7 C7(9)` → **`Bm7 E7(9)`** (i–IV7 dorian)
- Verse (resolución): `Dm7b5 G7` → `F#m7b5 B7`; `Cm` → `Em`
- Bajada cierre verse: `Cm Eb/Bb Cm/A Cm/G D/F# Gm`
  → **`Em G/D Em/C# Em/B F#/A# Bm`**
- Chorus: `Cm F7/A Bb6 | Eb7 Am7b5 D7 G7sus4 G7`
  → **`Em A7/C# D6 | G7 C#m7b5 F#7 B7sus4 B7`**, resolución final `Bm`.

## Estructura

`songs/disritmia/structure.json`:

```json
{
  "slug": "disritmia", "title": "Disritmia", "artist": "Stefano Mota",
  "key": "Bm", "tempo": 136, "timeSig": "4/4",
  "scenes": [
    { "name": "Intro",  "bars": 4 },
    { "name": "Verse",  "bars": 16 },
    { "name": "Chorus", "bars": 16 },
    { "name": "Outro",  "bars": 4 }
  ],
  "arrangement": ["Intro","Verse","Chorus","Verse","Chorus","Outro"],
  "parts": { "midi": ["keys","guitar","bass","perc"],
             "audio": ["strings","texture"] }
}
```

Los `bars` por escena se refinan con detección de boundaries sobre el MP3
(silence/onset segmentation) antes de renderizar stems — el total del audio
es 142.6s ≈ 81.6 compases a 136; el arreglo puede recortar/expandir el outro.

## Pipeline (mismo orden que Je Veux)

1. `structure.json` + `chords.json` manuales desde el chart.
2. Boundary detection (onsets + RMS) sobre el MP3 → ajustar bars.
3. `scripts/extract-melody.py` con **flag nueva `--transpose <semitos>`**
   (pYIN corre sobre el MP3 en Am; se transponen los pitch classes +2 al
   escribir melody.json). `--transpose 2` para esta canción.
4. `scripts/gen-guide.js` → `clips/guitar--<Scene>.mid` (Intro/Outro pulso
   de raíz; Verse/Chorus melodía + acento).
5. Grids orca (perc/bass, feel samba a 136) + patterns strudel para
   strings/texture. **Ley del engine: `cps = tempo/480`** (1 ciclo = 1 compás).
6. `render-stems.js` — duración EXACTA de sección, `loopSec=0`, warp off.
7. `ableton/builder/build.js songs/disritmia --dry-run` → build →
   `alsopentest` OPEN_OK. `npm test` verde.

## Gates (heredados, no negociables)

- XML: un solo `<Tempo><Manual Value="136">`, cero `Value="72"` (legacy).
- 0/20 audio clips warped; session loops = `bars*4`; arrangement
  `CurrentStart == Time`, loops relativos 0..contenido.
- Stems: onsets en líneas de compás (desv ≤ 0.083s), sin ceil de duración.
- `Echo nth=1` top-level (crash Live 10) — ya garantizado por el builder.
- Ningún path absoluto en strudel (`join(ROOT, <rel>)`).

## Riesgo conocido

- `extract-melody.py` no tiene `--transpose` hoy: único código nuevo.
- Si la estructura detectada difiere mucho de 4/16/16/4, re-evaluar escenas
  contra el audio antes de renderizar stems (no adivinar).
