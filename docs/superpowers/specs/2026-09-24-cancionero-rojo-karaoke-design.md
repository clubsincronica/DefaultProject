# Cancionero Rojo — Special Karaoke Backing Tracks for Ableton Live

**Date:** 2026-09-24
**Status:** Approved (design), pre-implementation
**Approach:** A (template + XML injection) with B (asset pack + manual drop-in) as fallback

---

## 1. Goal

Build new backing tracks for the songs of **"Un cancionero rojo"** (Google Drive songbook,
folder `1MrHKEMZdLrK6YahYtBMzjoHn_bHhwY7_`) as **Ableton Live 10 Suite performance sets**:

- Full band arrangements (piano/keys, guitar, bass, percussion + strings/pad/texture stems),
  composed per song with **Strudel** (texture → rendered WAV stems) and **Orca**
  (rhythm/keys sequencing → MIDI clips).
- Each song = one `.als`: **Arrangement view** for linear play-through **+ Session view
  scenes** for live section jumps/loops.
- **2 live mic channels** (lead + guest) with per-channel EQ/comp and reverb/delay sends,
  already routed.
- **Xone K2** controls: per-channel EQ, FX sends, master FX/builds.
- **APC Mini** controls: scene triggering (8 buttons), track faders (9), clip grid free.
- Style/feel decided **per song, together with the user** — not fixed to one genre.

Sources of truth per song: the songbook's **Google Doc lead sheet** (chords + lyrics) and
the **reference MP3** (feel/structure reference only — never used as audio source).

## 2. Context (learned during research)

- Local library: 2,469 audio files. Core taste: electro-swing/acid jazz (Parov Stelar,
  Kraak & Smaak), organic house/downtempo (Polo & Pan, Röyksopp, NTO, Solomun), world/
  ritual/folk, Latin (reggaeton + NW Argentina folk), jazz & chanson standards, meditation
  ambient. Accent material for arrangements — but arrangement style is per-song decision.
- Songbook: 4 blocks (Oldies EN INGLÉS, FOLKIES, EN FRANCAIS, SUDAMÉRICA), ~30 songs;
  each song = lead-sheet Doc + reference MP3. A "Lista de Canciones" doc is the canon.
- `Music/Pistas` shows the karaoke pattern: customized per performance (singer key,
  structure edits like "Larga ABAB sin Intro"). Karaoke = live-performance utility, not
  casual singalong.
- Existing tooling: `pipeline-viral/scripts/strudel-render.js` (headless Strudel → WAV,
  verified working: 5s smoke render OK), `orca-runtime.js` (grid → MIDI events),
  `orca-to-strudel.js`. Ableton Live 10 Suite installed (binary under
  `Music/_Serato_/Program/Live/`), User Library present. ffmpeg, yt-dlp, Python, Node 22.

## 3. Architecture (per song)

```
SOURCES                     AUTHORING                BUILD                DELIVERY
┌────────────────┐   ┌───────────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│ Lead sheet Doc │   │ Style session (user + │   │ Clone template   │   │ songs/<slug>/    │
│  (chords)      │──►│  me): key·tempo·feel· │──►│ .als XML, inject │──►│  output/         │
│ Reference MP3 ─┼─► │  scene map + arrangmt │   │  · session scenes│   │   <song>.als     │
│ (gdown)        │   ├───────────────────────┤   │  · arr. timeline │   │  clips/*.mid     │
└────────────────┘   │ MIDI parts: Orca      │   │  · tempo+markers │   │  stems/*.wav     │
                     │  grids → *.mid        │   └────────┬─────────┘   └──────────────────┘
                     │ Texture: Strudel      │            │ validate fails?
                     │  patterns → *.wav     │            ▼
                     │  (per section)        │   FALLBACK (B): asset pack +
                     └───────────────────────┘   manual drop into template.als
```

**Approach A:** one master template `.als` (exported from user's Live 10, authentic
schema) is cloned per song; a builder injects only clip content, scene names, tempo and
markers. **Approach B (fallback):** same generated assets delivered for manual drag-in.

### Structure model

Every song defines both views in one authoring step (`structure.json`):

- **Unique scenes** (Intro/Verse/Chorus/Bridge…) — Session rows for live jump/loop.
- **Linear arrangement** — sequence with repeats (Verse2 = repeat of Verse content) for
  play-through. Builder writes both views from the same section definitions.

Assets are **per-section**: one WAV per texture per section (session clips loop by
default → holding a verse repeats automatically); one MIDI clip per section.

Key/tempo fixed at authoring: all MIDI and stems written in the final key (singer range).
Single tempo per song in v1. The mic channels, routing, FX and controller mappings live
**only in the template** — the builder never touches them.

## 4. Composition methodology

**Input:** lead-sheet `.txt` (docs.google.com export), reference MP3. **Output:** clips,
stems, `structure.json`.

**Style session (human checkpoint, start of each song):** agree feel, tempo, key for the
lead singer, and the section map (bar counts per section). This replaces automatic
structure guessing; it is where "per-song, decided together" happens.

**Rhythm/keys → MIDI (Orca as sequencer brain):**
- Orca grids encode rhythm/velocity/articulation via `orca-runtime.js`.
- New small **chord-tone binder** maps grid hits onto the lead-sheet progression
  (grid = pattern per bar; binder resolves pitches to that bar's chord).
- Style templates parameterize grids: jazz comp, bossa, folk fingerpick, ballad arps,
  brush patterns (extended as songs require).
- Output: `.mid` per section in final key.

**Texture → stems (Strudel):** strings, pads, ambience. Per-section renders via the fast
`loopSec` path (short loop → in-memory extend), key-transposed, gain-shaped. On render
error: retry with simplified pattern; persistent failure → simpler sound.

**Verification:** stems auditioned as WAVs; MIDI verified in Live 10 (the real target; no
synthetic preview engine in v1). Feedback = listen in Live → re-author affected sections
only → rebuild.

## 5. Ableton template & set structure

Template = the rig. Built once (exported from Live 10) and cloned per song. Fixed roster:

| Type | Tracks | Carries |
|---|---|---|
| Audio | Mic Lead, Mic Guest | Ext.In 1/2, monitor=In (always live), Channel EQ + Comp, sends → A/B |
| MIDI | Keys, Guitar, Bass, Perc | Instrument device chains (Live 10 devices), per-track utility EQ |
| Audio | Strings, Texture | Injected stem clips (Texture carries pad/ambience/counter — sublayers mixed down at render time) |
| Return | A Reverb, B Delay | Mic + texture sends |
| Master | — | Master FX chain (Auto Filter builds/drops + Echo) for K2 |

Exactly **8 channel tracks → APC Mini's 8 faders, 1:1** (fader 9 = master). If a song
needs more texture layers, they are mixed into the Strings/Texture stems at render time;
a song may also gain extra tracks manually (kept outside the builder contract).

**Mappings (saved inside template .als → cloned to all songs):**
- **Xone K2** (18 knobs × 3 layers): L1 = mic EQ + mic sends; L2 = texture/instrument
  sends + master filter; L3 = master echo + spare. Exact knob assignment is decided
  interactively during the template-build session.
- **APC Mini:** 8 scene-launch buttons → rows; 9 faders → 8 tracks + master; clip
  grid free for section cues.

**Session view:** columns = roster, rows = scenes with injected section names. Template
ships 16 blank scenes — songs won't exceed that, so the builder never alters template
structure.

**Arrangement view:** sections laid linearly with repeats; same clip content mirrored.

**Builder contract:** touches only clip content, scene names, tempo, markers. Never
devices, mappings, mics, routing, returns, master.

## 6. File layout & git

```
Default Project/
├── cancionero-rojo/
│   ├── AGENTS.md              # project context + workflow rules
│   ├── sources/sheets/        # lead sheet .txt exports
│   ├── sources/reference/     # reference MP3s (gdown from Drive)
│   ├── songs/<slug>/
│   │   ├── structure.json     # key, tempo, scenes, arrangement
│   │   ├── orca/              # .orca grids per part
│   │   ├── patterns/          # strudel pattern .js per texture
│   │   ├── clips/*.mid        # generated MIDI
│   │   ├── stems/*.wav        # generated texture stems
│   │   └── output/<song>.als
│   ├── ableton/template.als   # the rig (once)
│   ├── ableton/builder/       # clone+inject scripts
│   └── scripts/               # chord binder, mid writer, fetch, audit
└── docs/superpowers/specs/    # this design doc
```

- Versioned in git: scripts, patterns, orca grids, structure.json, MIDI, template.als.
- Gitignored: WAV stems, reference MP3s (size).
- `PIPELINE-STATE.md` gains a `cancionero-rojo` section: song status + DO-NOT-REPEAT
  entries (repo continuity rule). Root `AGENTS.md` dispatcher gains the project keywords
  (`cancionero`, `karaoke`, `k2`, `apc`).

## 7. Iteration loop (per song)

1. Style session (chat): feel, key, tempo, sections.
2. Fetch sources: gdown reference MP3 + doc txt export → `sources/`.
3. Author orca grids + Strudel patterns → render assets.
4. User auditions WAV stems → fixes.
5. Build `.als` → user opens in Live 10 (K2 + APC) → plays → feedback.
6. Re-author affected sections only → rebuild → repeat until happy → mark song DONE in
   `PIPELINE-STATE.md`.

## 8. Risks & fallback rules

1. **Injection fails / Live repair dialog** → ship B-pack (same assets, manual drop into
   template) for that song + log root cause. After song #1: systematic → revisit approach;
   isolated → fix.
2. **Hand-written XML rejected** → **donor-clip strategy**: user saves a one-time "donor"
   set containing sample clips of every type; builder clones Live-authored fragments
   instead of hand-rolled XML.
3. **Instrument timbre wrong for a song** → user swaps device in Live (manual, trivial) or
   that part is re-rendered as a stem (B-style).
4. **Strudel render error** → retry simplified pattern → simpler sound.
5. **Drive fetch fails** → user drops MP3 into `sources/reference/` manually.
6. **Lead-sheet structure ambiguous** → resolved in the style session (human checkpoint).

## 9. Dependencies

- Existing: Node 22 + `pipeline-viral` Strudel stack. **v1 decision:** invoke
  `../pipeline-viral/scripts/strudel-render.js` directly with an *absolute* pattern path
  (`path.join` resolves absolute second args, so patterns live in `cancionero-rojo/songs/`
  and run against `pipeline-viral`'s node_modules — zero duplication). Revisit extraction
  to `toolbox/` only if the dependency becomes painful. ffmpeg, Python.
- New (small): `gdown` (Drive fetch), MIDI writer (hand-rolled or npm), XML parser
  (e.g. `fast-xml-parser`).
- **Not needed:** Demucs/vocal separation — this is fresh arrangement, not vocal removal.

## 10. Verification & phasing

- Builder `--dry-run`: XML parse + structural sanity (tracks/scenes counts, no orphan
  references) before writing.
- Golden round-trip: inject into empty template, diff, confirm only expected nodes change.
- **Human gate per song:** file opens in Live 10 without repair dialog and plays.
- `PIPELINE-STATE.md` updated on each completed song.

**Phasing:** Phase 1 = tooling + template + builder + **song #1** (proves Approach A end
to end). Phase 2 = remaining songbook songs, batched. Every phase gate is a song the user
has played in Live 10.

## 11. Out of scope (v1)

- K2 scene triggering (APC Mini handles scenes; K2 L3 left spare for later).
- Tempo changes within a song; count-in click; lyric video/visuals.
- Automatic structure detection from reference MP3.
- Songs beyond the songbook canon (Listá de Canciones doc).
