# AGENTS.md — cancionero-rojo (karaoke backing tracks en Ableton Live)

Proyecto: pistas de acompañamiento en vivo para "Un cancionero rojo"
(Drive folder 1MrHKEMZdLrK6YahYtBMzjoHn_bHhwY7_). Spec:
docs/superpowers/specs/2026-09-24-cancionero-rojo-karaoke-design.md

## Pipeline por canción
style session (key/tempo/feel/escenas) → fetch fuentes → structure.json +
chords.json (validados) → grids orca (MIDI rítmica) + patterns strudel (texturas
WAV) → build.js (inyecta en template.als) → USUARIO abre en Live 10 (K2+APC) →
feedback → re-author sección → rebuild → PIPELINE-STATE.md.

## Reglas duras
- Roster del template (nombres EXACTOS): Mic Lead, Mic Guest, Keys, Guitar,
  Bass, Perc, Strings, Texture; returns A-Reverb, B-Delay; 16 escenas; 4/4.
- El builder SOLO toca: clip content, scene names, tempo, locators. NUNCA
  devices/mappings/routing/mics/returns/master.
- Assets por sección: stems/<part>--<section>.wav, clips/<part>--<section>.mid.
- Strudel: strudel-render.js resuelve el patrón con `join(ROOT, <patrón>)` donde
  ROOT = raíz de pipeline-viral → paths ABSOLUTOS rompen (ERR_MODULE_NOT_FOUND).
  render-stems.js ya arma esa ruta relativa; manual: pasar ruta relativa a `pipeline-viral/`.
- Sin Demucs/separación de voz. WAV/MP3 en .gitignore.
- Canción #1: "Je Veux" (Zaz) tonalidad original Am.

## Comandos
- Tests: npm test  (node --test)
- Fetch: python scripts/fetch-songbook.py --song je-veux
- Build: node ableton/builder/build.js songs/je-veux --dry-run
