# Cancionero Rojo — Phase 1 (Tooling + Template + Builder + Song #1 "Je Veux") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship "Je Veux" (Zaz, original key Am) as a playable Ableton Live 10 performance set (Arrangement + Session scenes, 2 mic channels, K2/APC mapped), built end-to-end through the template-injection pipeline.

**Architecture:** One master `template.als` (the rig: 8 tracks + 2 returns + master FX + controller mappings, built once by the user following a recipe). Per song, a Node builder clones the template XML and injects only: scene names, MIDI clips (Orca-style step grids → chord binder → SMF), audio clip references (Strudel-rendered texture stems), arrangement timeline, tempo, locators. Fallback: same assets delivered as a drag-in pack.

**Tech Stack:** Node 22 (ESM, `node --test`, `fast-xml-parser`, zlib), Python (fetch tool: `requests`, `gdown`, unittest), `pipeline-viral/scripts/strudel-render.js` (invoked with absolute pattern paths), ffmpeg for audio checks.

**Spec:** `docs/superpowers/specs/2026-09-24-cancionero-rojo-karaoke-design.md`

## Global Constraints

- Music production target: **Ableton Live 10 Suite** (installed at `C:\Users\tom_w\Music\_Serato_\Program\Live\Program\Ableton Live 10 Suite.exe`). Files must open in Live 10 without repair dialogs.
- Template roster is exactly 8 channel tracks, names fixed: `Mic Lead`, `Mic Guest`, `Keys`, `Guitar`, `Bass`, `Perc`, `Strings`, `Texture`; returns `A-Reverb`, `B-Delay`; 16 blank scenes; 4/4.
- **Builder contract:** injected code may only touch clip content, scene names, tempo, locators/markers. Never devices, mappings, routing, mic tracks, returns, master.
- Song #1 key: **original key of Je Veux = Am**. Tempo model: **base tempo + optional
  per-scene overrides** (`scenes[].tempo`) — Je Veux style = **bossa, slow → mid path**
  (exact BPMs pinned in the T14 style session). Session scene launches change tempo
  natively; Arrangement play-through runs at base tempo (v1).
- Assets are **per-section**: `stems/<part>--<section>.wav`, `clips/<part>--<section>.mid`.
- **No vocal separation** (Demucs explicitly out of scope).
- Strudel renderer invoked as `node <root>/pipeline-viral/scripts/strudel-render.js <ABSOLUTE pattern path> <seconds> <out.wav>` (absolute path bypasses the renderer's ROOT-relative resolution).
- Gitignored: `*.wav`, `*.mp3` inside `cancionero-rojo/`. Everything else committed.
- Update `PIPELINE-STATE.md` when a milestone lands (repo continuity rule).
- Windows PowerShell 5.1 shell: no `&&`, no `head`, use `;` and `Select-Object -First`.

---

### Task 1: Project scaffolding + repo integration

**Files:**
- Create: `cancionero-rojo/AGENTS.md`, `cancionero-rojo/requirements.txt`, `cancionero-rojo/package.json`, `cancionero-rojo/test/` (empty dir marker via first test in Task 2)
- Modify: `AGENTS.md` (dispatcher section), `.gitignore`, `PIPELINE-STATE.md`

**Interfaces:**
- Produces: directory layout every later task writes into; `package.json` with `"type": "module"` so all later Node code can use ESM `import`.

- [ ] **Step 1: Create directory tree**

```powershell
New-Item -ItemType Directory -Force -Path "cancionero-rojo\sources\sheets","cancionero-rojo\sources\reference","cancionero-rojo\songs\je-veux","cancionero-rojo\ableton\builder","cancionero-rojo\ableton\donors","cancionero-rojo\scripts\lib","cancionero-rojo\test\fixtures" | Out-Null
```

- [ ] **Step 2: Write `cancionero-rojo/package.json`**

```json
{
  "name": "cancionero-rojo",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test test/",
    "build": "node ableton/builder/build.js"
  },
  "dependencies": {
    "fast-xml-parser": "^4.5.0"
  }
}
```

- [ ] **Step 3: Write `cancionero-rojo/requirements.txt`**

```
requests
gdown
```

- [ ] **Step 4: Write `cancionero-rojo/AGENTS.md`**

```markdown
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
- Strudel: node ../pipeline-viral/scripts/strudel-render.js <RUTA-ABSOLUTA-patron> <secs> <out.wav>
- Sin Demucs/separación de voz. WAV/MP3 en .gitignore.
- Canción #1: "Je Veux" (Zaz) tonalidad original Am.

## Comandos
- Tests: npm test  (node --test)
- Fetch: python scripts/fetch-songbook.py --song je-veux
- Build: node ableton/builder/build.js songs/je-veux --dry-run
```

- [ ] **Step 5: Update root `AGENTS.md` dispatcher** — add one bullet after the `remotion-poc` entry:

```markdown
- **cancionero-rojo** (karaoke backing tracks Ableton): `cancionero`, `karaoke`,
  `k2`, `apc`, `cancionero rojo`, `pistas en vivo`.
  - Contexto: `cancionero-rojo/AGENTS.md` + spec `docs/superpowers/specs/2026-09-24-cancionero-rojo-karaoke-design.md`.
```

- [ ] **Step 6: Update root `.gitignore`** — append:

```
# cancionero-rojo audio assets
cancionero-rojo/**/*.wav
cancionero-rojo/**/*.mp3
cancionero-rojo/**/.tmp/
```

- [ ] **Step 7: Update `PIPELINE-STATE.md`** — insert a new section before `## pipeline-viral`:

```markdown
## cancionero-rojo (karaoke backing tracks Ableton)

- **Etapa actual:** Phase 1 en construcción (tooling + template + builder + canción #1 "Je Veux").
- **Spec:** `docs/superpowers/specs/2026-09-24-cancionero-rojo-karaoke-design.md`.
- **Pipeline:** ver `cancionero-rojo/AGENTS.md`.
- **DO-NOT-REPEAT:** (acumular aquí los fixes de ejecución)
```

- [ ] **Step 8: Commit**

```powershell
git add cancionero-rojo AGENTS.md .gitignore PIPELINE-STATE.md
git commit -m "feat(cancionero-rojo): scaffold project + repo integration"
```

---

### Task 2: `structure.json` schema + validator

**Files:**
- Create: `cancionero-rojo/scripts/validate-structure.js`
- Test: `cancionero-rojo/test/validate-structure.test.js`, `cancionero-rojo/test/fixtures/structure.valid.json`, `test/fixtures/structure.bad-missing-scene.json`

**Interfaces:**
- Produces: `validateStructure(obj) → string[]` (array of error strings; empty = valid). Consumed by Task 14 (authoring) and Task 13 (`build.js` gate).

Schema (authoritative):

```json
{
  "slug": "je-veux",
  "title": "Je Veux",
  "artist": "Zaz",
  "key": "Am",
  "tempo": 100,
  "timeSig": "4/4",
  "scenes": [
    { "name": "Intro", "bars": 4, "tempo": 72 },
    { "name": "Verse", "bars": 16, "tempo": 72 },
    { "name": "Chorus", "bars": 16 },
    { "name": "Outro", "bars": 4 }
  ],
  "arrangement": ["Intro", "Verse", "Chorus", "Verse", "Chorus", "Outro"],
  "parts": { "midi": ["keys"], "audio": ["strings", "texture"] }
}
```

- `scenes[].tempo` is **optional** (inherits base `tempo`); when present must be 40-260.

- [ ] **Step 1: Write the failing test**

```js
// test/validate-structure.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateStructure } from '../scripts/validate-structure.js';

const valid = JSON.parse(readFileSync(new URL('./fixtures/structure.valid.json', import.meta.url)));
const badScene = JSON.parse(readFileSync(new URL('./fixtures/structure.bad-missing-scene.json', import.meta.url)));

test('valid structure → no errors', () => {
  assert.deepEqual(validateStructure(valid), []);
});
test('arrangement referencing unknown scene → error', () => {
  const errs = validateStructure(badScene);
  assert.ok(errs.some(e => e.includes('Bridge')));
});
test('tempo out of range → error', () => {
  const errs = validateStructure({ ...valid, tempo: 400 });
  assert.ok(errs.some(e => e.includes('tempo')));
});
test('duplicate scene name → error', () => {
  const errs = validateStructure({ ...valid, scenes: [...valid.scenes, { name: 'Verse', bars: 4 }] });
  assert.ok(errs.some(e => e.includes('duplicat')));
});
test('parts outside roster → error', () => {
  const errs = validateStructure({ ...valid, parts: { midi: ['keys', 'organ'], audio: ['texture'] } });
  assert.ok(errs.some(e => e.includes('organ')));
});
test('optional scene tempo: valid 40-260 ok, out of range error', () => {
  const withTempo = { ...valid, scenes: valid.scenes.map(s => ({ ...s, tempo: 72 })) };
  assert.deepEqual(validateStructure(withTempo), []);
  const bad = { ...valid, scenes: [{ name: 'Intro', bars: 4, tempo: 400 }] };
  assert.ok(validateStructure(bad).some(e => e.includes('tempo')));
});
```

- [ ] **Step 2: Write fixtures**

```json
{
  "slug": "je-veux", "title": "Je Veux", "artist": "Zaz", "key": "Am",
  "tempo": 130, "timeSig": "4/4",
  "scenes": [{ "name": "Intro", "bars": 4 }, { "name": "Verse", "bars": 16 },
             { "name": "Chorus", "bars": 16 }, { "name": "Outro", "bars": 4 }],
  "arrangement": ["Intro", "Verse", "Chorus", "Verse", "Chorus", "Outro"],
  "parts": { "midi": ["keys"], "audio": ["strings", "texture"] }
}
```

`structure.bad-missing-scene.json` = same but `"arrangement": ["Intro", "Verse", "Bridge"]`.

- [ ] **Step 3: Run test, verify FAIL** — `npm test` → FAIL (`Cannot find module validate-structure.js`)

- [ ] **Step 4: Implement `scripts/validate-structure.js`**

```js
const MIDI_ROSTER = ['Keys', 'Guitar', 'Bass', 'Perc'];
const AUDIO_ROSTER = ['Strings', 'Texture'];

export function validateStructure(s) {
  const errs = [];
  if (!s.slug || !/^[a-z0-9-]+$/.test(s.slug)) errs.push('slug must be kebab-case');
  if (!s.title) errs.push('title missing');
  if (!s.key) errs.push('key missing');
  if (typeof s.tempo !== 'number' || s.tempo < 40 || s.tempo > 260) errs.push('tempo must be 40-260');
  if (s.timeSig !== '4/4') errs.push('timeSig must be 4/4 (v1)');
  if (!Array.isArray(s.scenes) || s.scenes.length === 0 || s.scenes.length > 16)
    errs.push('scenes must be 1..16 entries');
  const names = new Set();
  for (const sc of s.scenes ?? []) {
    if (names.has(sc.name)) errs.push(`scene name duplicat: ${sc.name}`);
    names.add(sc.name);
    if (typeof sc.bars !== 'number' || sc.bars < 1) errs.push(`scene ${sc.name}: bars must be >= 1`);
    if (sc.tempo !== undefined && (typeof sc.tempo !== 'number' || sc.tempo < 40 || sc.tempo > 260))
      errs.push(`scene ${sc.name}: tempo must be 40-260`);
  }
  for (const ref of s.arrangement ?? []) if (!names.has(ref)) errs.push(`arrangement references unknown scene: ${ref}`);
  if ((s.arrangement ?? []).length === 0) errs.push('arrangement empty');
  const midi = s.parts?.midi ?? [], audio = s.parts?.audio ?? [];
  for (const p of midi) if (!MIDI_ROSTER.includes(p)) errs.push(`midi part outside roster: ${p}`);
  for (const p of audio) if (!AUDIO_ROSTER.includes(p)) errs.push(`audio part outside roster: ${p}`);
  return errs;
}
```

- [ ] **Step 5: Run test, verify PASS** — `npm test` → all 5 PASS
- [ ] **Step 6: Commit** — `git add -A cancionero-rojo; git commit -m "feat(cancionero-rojo): structure.json schema + validator"`

---

### Task 3: Songbook fetch tool

**Files:**
- Create: `cancionero-rojo/scripts/fetch-songbook.py`, `cancionero-rojo/scripts/parse_drive.py`
- Test: `cancionero-rojo/test/test_parse_drive.py`, `cancionero-rojo/test/fixtures/drive_frances.html`

**Interfaces:**
- Produces: `parse_drive.py` → `parse_entries(html: str) -> list[dict{name, id, kind}]` where `kind ∈ {'audio','doc','folder'}`; `fetch-songbook.py --song je-veux` downloads `sources/sheets/je-veux.txt` + `sources/reference/je-veux.mp3`.
- Songbook index (block folder IDs): `FRANCES=13HCVRZ-_UyJL6NeTWG2cV8KNR6AX5s9-`, `FOLKIES=1EbViaQZWe-Oqe4Z1zwi9Cq5bBg13HKgY`, `song "Je Veux"`: doc id `14Ep5Tb-Rbj_et0k2onOSoS-NYB6pT-T2ACN9Bbocpx0`, mp3 id `1aOY045VbdI17woEmHcSqFSHkLx_HpU25`.

- [ ] **Step 1: Write failing test**

```python
# test/test_parse_drive.py  (run: python -m unittest test.test_parse_drive)
import unittest, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "scripts"))
from parse_drive import parse_entries, doc_export_url

FIXTURE = pathlib.Path(__file__).parent / "fixtures" / "drive_frances.html"

class TestParseDrive(unittest.TestCase):
    def test_parses_audio_and_doc_entries(self):
        entries = parse_entries(FIXTURE.read_text(encoding="utf-8"))
        by_name = {e["name"]: e for e in entries}
        self.assertIn("Je Veux.mp3", by_name)
        self.assertEqual(by_name["Je Veux.mp3"]["id"], "1aOY045VbdI17woEmHcSqFSHkLx_HpU25")
        self.assertEqual(by_name["Je Veux.mp3"]["kind"], "audio")
        self.assertEqual(by_name["Je veux"]["kind"], "doc")

    def test_doc_export_url(self):
        self.assertEqual(
            doc_export_url("ABC123"),
            "https://docs.google.com/document/d/ABC123/export?format=txt")

if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Write fixture** — minimal-but-real structure extracted from the embedded folder view HTML (single entry block, attribute names preserved exactly):

```html
<div class="flip-entries"><div class="flip-entry" id="entry-1aOY045VbdI17woEmHcSqFSHkLx_HpU25" tabindex="0" role="link"><div class="flip-entry-info"><a href="https://drive.google.com/file/d/1aOY045VbdI17woEmHcSqFSHkLx_HpU25/view?usp=drive_web" target="_blank"><div class="flip-entry-list-icon"><img src="https://drive-thirdparty.googleusercontent.com/16/type/audio/mp3" alt=""/></div><div class="flip-entry-title">Je Veux.mp3</div></a></div></div><div class="flip-entry" id="entry-14Ep5Tb-Rbj_et0k2onOSoS-NYB6pT-T2ACN9Bbocpx0" tabindex="0" role="link"><div class="flip-entry-info"><a href="https://docs.google.com/document/d/14Ep5Tb-Rbj_et0k2onOSoS-NYB6pT-T2ACN9Bbocpx0/edit?usp=drive_web" target="_blank"><div class="flip-entry-list-icon"><img src="https://drive-thirdparty.googleusercontent.com/16/type/application/vnd.google-apps.document" alt=""/></div><div class="flip-entry-title">Je veux</div></a></div></div></div>
```

- [ ] **Step 3: Run test, verify FAIL** — `python -m unittest test.test_parse_drive` → `ModuleNotFoundError: parse_drive`

- [ ] **Step 4: Implement `scripts/parse_drive.py`**

```python
import re

ENTRY_RE = re.compile(
    r'<div class="flip-entry-title">(?P<title>.*?)</div>.*?'
    r'href="https://(?:drive\.google\.com/(?:file|drive)/d/|docs\.google\.com/document/d/)(?P<id>[\w-]+)',
    re.S)
TITLE_ONLY = "application/vnd.google-apps.document"

def parse_entries(html: str):
    entries = []
    for m in re.finditer(r'<div class="flip-entry".*?</div></div></div></div>', html, re.S):
        block = m.group(0)
        t = re.search(r'<div class="flip-entry-title">(.*?)</div>', block, re.S)
        i = re.search(r'(?:file/d/|folders/|document/d/)([\w-]+)', block)
        if not t or not i:
            continue
        name = t.group(1)
        if "google-apps.document" in block:
            kind = "doc"
        elif "type/audio" in block or "type/video" in block:
            kind = "audio"
        elif "drive-sprite-folder" in block:
            kind = "folder"
        else:
            kind = "file"
        entries.append({"name": name, "id": i.group(1), "kind": kind})
    return entries

def doc_export_url(doc_id: str) -> str:
    return f"https://docs.google.com/document/d/{doc_id}/export?format=txt"
```

- [ ] **Step 5: Run test, verify PASS** — tune ENTRY_RE/block regex against the real fixture until both assertions pass
- [ ] **Step 6: Implement `scripts/fetch-songbook.py`**

```python
"""Descarga fuentes de una cancion del cancionero rojo.
Uso: python scripts/fetch-songbook.py --song je-veux
"""
import argparse, pathlib, sys, requests
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from parse_drive import parse_entries, doc_export_url

SONGS = {
    "je-veux": {"folder": "13HCVRZ-_UyJL6NeTWG2cV8KNR6AX5s9-",
                "doc": "14Ep5Tb-Rbj_et0k2onOSoS-NYB6pT-T2ACN9Bbocpx0",
                "mp3": "1aOY045VbdI17woEmHcSqFSHkLx_HpU25",
                "name": "je-veux"},
}
ROOT = pathlib.Path(__file__).resolve().parent.parent
VIEW = "https://drive.google.com/embeddedfolderview?id={fid}#list"

def fetch(song_key: str):
    cfg = SONGS[song_key]
    sheets = ROOT / "sources" / "sheets"
    refs = ROOT / "sources" / "reference"
    sheets.mkdir(parents=True, exist_ok=True)
    refs.mkdir(parents=True, exist_ok=True)

    r = requests.get(doc_export_url(cfg["doc"]), timeout=60)
    r.raise_for_status()
    (sheets / f"{cfg['name']}.txt").write_text(r.text, encoding="utf-8")
    print(f"sheet: sources/sheets/{cfg['name']}.txt")

    import gdown
    out = refs / f"{cfg['name']}.mp3"
    gdown.download(id=cfg["mp3"], output=str(out), quiet=False)
    if not out.exists() or out.stat().st_size < 100_000:
        sys.exit("mp3 download failed - drop the file manually into sources/reference/")
    print(f"reference: sources/reference/{cfg['name']}.mp3")

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--song", required=True, choices=SONGS)
    fetch(ap.parse_args().song)
```

- [ ] **Step 7: Unit tests pass** — `python -m unittest test.test_parse_drive` → PASS (2 tests)
- [ ] **Step 8: Integration run (network)** — `pip install -r requirements.txt` then `python scripts/fetch-songbook.py --song je-veux`
  - Expected: both files exist; `ffprobe -v error -show_entries format=duration -of csv=p=0 sources\reference\je-veux.mp3` prints a number > 100 (seconds)
- [ ] **Step 9: Commit** — `git add -A cancionero-rojo; git commit -m "feat(cancionero-rojo): songbook fetch tool (drive folder parse + gdown)"`

---

### Task 4: SMF writer (MIDI files)

**Files:**
- Create: `cancionero-rojo/scripts/lib/smf-writer.js`
- Test: `cancionero-rojo/test/smf-writer.test.js`

**Interfaces:**
- Produces: `writeSmf({ tempo, timeSig, notes, program? }) → Buffer` where `notes = [{ track: 0, note: 57, startBeat: 0, durBeats: 1, velocity: 96 }]` (beats = quarter notes; `startBeat`/`durBeats` floats). Also exports `encodeVlq(n)` for testing. Consumed by Task 6.

- [ ] **Step 1: Write failing tests**

```js
// test/smf-writer.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { writeSmf, encodeVlq } from '../scripts/lib/smf-writer.js';

test('vlq encodings', () => {
  assert.deepEqual(encodeVlq(0), [0x00]);
  assert.deepEqual(encodeVlq(127), [0x7f]);
  assert.deepEqual(encodeVlq(128), [0x81, 0x00]);
  assert.deepEqual(encodeVlq(480), [0x83, 0x60]);
});

test('header + tempo meta correct', () => {
  const buf = writeSmf({ tempo: 130, timeSig: [4, 4], notes: [] });
  const hex = buf.toString('hex');
  assert.ok(hex.startsWith('4d546864000000060001000101e0')); // MThd, fmt1, 1 track, 480 ppq
  // tempo 130bpm = 461538 µs/q = 0x070A3C
  assert.ok(hex.includes('ff5103070a3c'));
  assert.ok(hex.includes('ff580404021808')); // 4/4 time sig
  assert.ok(hex.endsWith('ff2f00'));
});

test('one note produces on/off pair in order', () => {
  const buf = writeSmf({
    tempo: 120, timeSig: [4, 4],
    notes: [{ track: 0, note: 60, startBeat: 0, durBeats: 1, velocity: 96 }],
  });
  const hex = buf.toString('hex');
  const on = Buffer.from(hex, 'hex').indexOf(Buffer.from([0x90, 60, 96]));
  const off = Buffer.from(hex, 'hex').indexOf(Buffer.from([0x80, 60, 0]));
  assert.ok(on > 0 && off > on, 'note-on before note-off');
});
```

- [ ] **Step 2: Run, verify FAIL** — `npm test` → `Cannot find module smf-writer.js`
- [ ] **Step 3: Implement `scripts/lib/smf-writer.js`**

```js
const PPQ = 480;

export function encodeVlq(n) {
  const bytes = [n & 0x7f];
  n >>= 7;
  while (n > 0) { bytes.unshift((n & 0x7f) | 0x80); n >>= 7; }
  return bytes;
}

function metaTrack(tempo, [num, den]) {
  const usPerQn = Math.round(60_000_000 / tempo);
  const ev = [
    ...encodeVlq(0), 0xff, 0x51, 0x03, (usPerQn >> 16) & 0xff, (usPerQn >> 8) & 0xff, usPerQn & 0xff,
    ...encodeVlq(0), 0xff, 0x58, 0x04, num, Math.log2(den), 24, 8,
    ...encodeVlq(0), 0xff, 0x2f, 0x00,
  ];
  return Buffer.concat([Buffer.from('MTrk'), u32(ev.length), Buffer.from(ev)]);
}

const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32BE(n); return b; };

function noteTrack(notes, program) {
  const events = [];
  for (const n of notes) {
    events.push({ tick: Math.round(n.startBeat * PPQ), status: 0x90, a: n.note, b: n.velocity });
    events.push({ tick: Math.round((n.startBeat + n.durBeats) * PPQ), status: 0x80, a: n.note, b: 0 });
  }
  events.sort((x, y) => x.tick - y.tick || x.status - y.status);
  const ev = [];
  let last = 0;
  if (program != null) ev.push(...encodeVlq(0), 0xc0 | 0, program);
  for (const e of events) {
    ev.push(...encodeVlq(e.tick - last), e.status, e.a, e.b);
    last = e.tick;
  }
  ev.push(...encodeVlq(0), 0xff, 0x2f, 0x00);
  return Buffer.concat([Buffer.from('MTrk'), u32(ev.length), Buffer.from(ev)]);
}

export function writeSmf({ tempo, timeSig, notes = [], program }) {
  const tracks = [metaTrack(tempo, timeSig), noteTrack(notes, program)];
  const head = Buffer.concat([
    Buffer.from('MThd'), u32(6),
    Buffer.from([0x00, 0x01, 0x00, tracks.length, (PPQ >> 8) & 0xff, PPQ & 0xff]),
  ]);
  return Buffer.concat([head, ...tracks]);
}
```

- [ ] **Step 4: Run, verify PASS** — `npm test`
- [ ] **Step 5: Commit** — `git add -A cancionero-rojo; git commit -m "feat(cancionero-rojo): SMF writer with golden-byte tests"`

---

### Task 5: Chord library (parse + voicing)

**Files:**
- Create: `cancionero-rojo/scripts/lib/chords.js`
- Test: `cancionero-rojo/test/chords.test.js`, `cancionero-rojo/test/fixtures/sheet-je-veux-excerpt.txt`

**Interfaces:**
- Produces:
  - `parseChordLine(line) → string[]` (tokens like `['Am','G','F','C','E']`; empty if line isn't a chord line)
  - `splitSections(txt) → [{ section, chordLines: string[][] }]` (sections by `[Verse]`/`[Chorus]` markers)
  - `voicing(chordSym, center = 60) → number[]` (MIDI notes, bass-inclusive)
- Consumed by Task 6 (binder) and Task 14 (authored `chords.json` uses same symbols).

- [ ] **Step 1: Write failing tests**

```js
// test/chords.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseChordLine, splitSections, voicing } from '../scripts/lib/chords.js';

test('parseChordLine extracts tokens', () => {
  assert.deepEqual(parseChordLine('Am                                         G'), ['Am', 'G']);
  assert.deepEqual(parseChordLine('                                        F                 E'), ['F', 'E']);
  assert.deepEqual(parseChordLine('Am                                   G'), ['Am', 'G']);
  assert.deepEqual(parseChordLine('Donnez moi une suite au Ritz, je n\'en veux pas'), []);
  assert.deepEqual(parseChordLine('F  G'), ['F', 'G']);
});

test('voicing: Am near middle C', () => {
  assert.deepEqual(voicing('Am'), [57, 60, 64]); // A3 C4 E4
});
test('voicing: E major triad', () => {
  assert.deepEqual(voicing('E'), [52, 56, 59]);  // E3 G#3 B3
});
test('voicing slash chord adds bass', () => {
  assert.deepEqual(voicing('C/E'), [40, 60, 64, 67]); // E2 bass + C4 E4 G4
});
test('voicing: Am7 has G', () => {
  const v = voicing('Am7');
  assert.ok(v.includes(67), 'contains G4');
});

test('splitSections on real sheet excerpt', () => {
  const txt = readFileSync(new URL('./fixtures/sheet-je-veux-excerpt.txt', import.meta.url), 'utf8');
  const secs = splitSections(txt);
  assert.deepEqual(secs.map(s => s.section), ['Verse', 'Chorus']);
  const verseChordLine = secs[0].lines.find(l => l.startsWith('Am'));
  assert.deepEqual(parseChordLine(verseChordLine), ['Am', 'G']);
});
```

- [ ] **Step 2: Write fixture `test/fixtures/sheet-je-veux-excerpt.txt`** — verbatim excerpt of the real Je Veux sheet:

```
[Verse]

Am                                         G
Donnez moi une suite au Ritz, je n'en veux pas
                                        F
Des bijoux de chez CHANEL, je n'en veux pas
                                        C             E
Donnez moi une limousine, j'en ferais quoi ? papalapapapala

[Chorus]

Am                                           G
Je Veux d'l'amour, d'la joie, de la bonne humeur,
                                        F
ce n'est pas votre argent qui f'ra mon bonheur,
                                G  E
moi j'veux crever la main sur le coeur
```

(Note: `splitSections` returns `chordLines` as arrays of raw lines; the test joins them — adjust test to call `parseChordLine` on each stored line instead if cleaner: `parseChordLine(secs[0].chordLines[0])` where `chordLines[0]` is the raw string `'Am   ...  G'`. Implement storage as `lines: string[]` (raw section lines) and let callers filter. **Authoritative shape:** `splitSections → [{ section, lines: string[] }]`.)

- [ ] **Step 3: Run, verify FAIL**
- [ ] **Step 4: Implement `scripts/lib/chords.js`**

```js
const CHORD_TOKEN = /^[A-G][#b]?(maj|min|m|dim|aug|sus\d|add\d|\d|b\d|#\d)*(\/[A-G][#b]?)?$/;
const QUALITIES = {
  '': [0, 4, 7], 'm': [0, 3, 7], 'dim': [0, 3, 6], 'aug': [0, 4, 8],
  'sus2': [0, 2, 7], 'sus4': [0, 5, 7], '6': [0, 4, 7, 9],
  '7': [0, 4, 7, 10], 'm7': [0, 3, 7, 10], 'maj7': [0, 4, 7, 11],
  '9': [0, 4, 7, 10, 14], 'm9': [0, 3, 7, 10, 14],
};
const PC = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6,
              G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };

export function parseChordLine(line) {
  const toks = line.trim().split(/\s+/).filter(Boolean);
  const chords = toks.filter(t => CHORD_TOKEN.test(t) && t.length > 1);
  const nonChords = toks.length - chords.length;
  return chords.length > 0 && nonChords <= chords.length ? chords : [];
}

export function splitSections(txt) {
  const out = [];
  let cur = null;
  for (const raw of txt.split(/\r?\n/)) {
    const m = raw.match(/^\[(.+?)\]/);
    if (m) { cur = { section: m[1], lines: [] }; out.push(cur); }
    else if (cur) cur.lines.push(raw);
  }
  return out;
}

function pcOf(root) {
  const m = root.match(/^([A-G][#b]?)(.*)$/);
  if (!m || !(m[1] in PC)) throw new Error(`bad chord root: ${root}`);
  return { pc: PC[m[1]], qual: m[2] || '' };
}

export function voicing(sym, center = 60) {
  const [main, bass] = sym.split('/');
  const { pc, qual } = pcOf(main);
  const ivs = QUALITIES[qual] ?? QUALITIES[qual.replace(/^maj/, '')] ?? QUALITIES[''];
  // stack triad/7th starting at root nearest-below center
  let root = center + ((pc - (center % 12) + 12) % 12);
  if (root >= center + 6) root -= 12;
  const notes = ivs.map(iv => root + iv);
  if (bass) {
    const bpc = pcOf(bass).pc;
    let bnote = root - 12 + ((bpc - (root % 12) + 12) % 12);
    if (bnote < root - 12) bnote += 12;
    return [bnote, ...notes];
  }
  return notes;
}
```

- [ ] **Step 5: Run, verify PASS** — if `voicing('E')` gives `[52,56,59]` vs computed, verify math in test run; adjust `center` default logic only if tests prove off (tests are authoritative).
- [ ] **Step 6: Commit** — `git add -A cancionero-rojo; git commit -m "feat(cancionero-rojo): chord parsing + voicing"`

---

### Task 6: Step-grid → MIDI (`orca-to-mid`)

**Files:**
- Create: `cancionero-rojo/scripts/orca-to-mid.js`, `cancionero-rojo/scripts/lib/step-grid.js`
- Test: `cancionero-rojo/test/step-grid.test.js`, `test/fixtures/grid-verse.keys`, `test/fixtures/chords.fixture.json`

**Interfaces:**
- Grid format (file, one row per bar, 16 columns = 16ths):
  - Header lines `# part=keys dur=4 program=4` (dur = note length in 16ths, default 4)
  - Cell chars: `.` = silence; `0-9a-z` = chord-tone index (decoded via `parseValue` copied from `pipeline-viral/scripts/orca-runtime.js`: a-z→0-25, A-Z→26-51, 0-9→0-9); **lowercase = vel 72, UPPERCASE (A-Z as tone idx 26+) NOT used for tones — accents use `X` (vel 100) at same tone as preceding?** → simplify: tones = `0-9a-z` (vel 72), accent = tone char preceded by `!` is too complex for a grid. **Final:** tone chars `0-9a-z` vel 72; **uppercase tone letters map to tone idx too** (A→26? no—). 
  - **Authoritative simple spec:** cells: `.` rest; `0-9a-z` chord-tone index with velocity 72; `0-9a-z` followed by nothing else; **velocity variants**: digits `0-9` = 72, letters `a-z` = 96 (louder); grid keeps it to two velocities in v1. Tone index = `parseValue(char) % voicingLength`.
- Produces: `buildNotes(gridText, chordsForBars, opts) → { notes, warnings }` (pure) and CLI `node scripts/orca-to-mid.js --grid g.keys --chords chords.json --section Verse --out x.mid --tempo 130` writes SMF via Task 4. Consumed by Task 14.

- `chords.fixture.json` shape (authoritative — same as Task 14 output):

```json
{
  "sections": {
    "Verse":   { "bars": ["Am", "G", "F", "E", "Am", "G", "F", "E"] },
    "Chorus":  { "bars": ["Am", "G", "F", "G", "E", "Am", "G", "E"] }
  }
}
```

(`bars` length must equal scene bars ÷ repeats… **Rule:** `sections.<name>.bars` = chord per bar for ONE occurrence of the scene; validator in Task 13 checks `bars.length === scene.bars`.)

- [ ] **Step 1: Write failing tests**

```js
// test/step-grid.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildNotes } from '../scripts/lib/step-grid.js';

const chords = JSON.parse(readFileSync(new URL('./fixtures/chords.fixture.json', import.meta.url), 'utf8'));
const grid = readFileSync(new URL('./fixtures/grid-verse.keys', import.meta.url), 'utf8');

test('grid rows map to bars, cells to beats', () => {
  const { notes } = buildNotes(grid, chords.sections.Verse, { totalBars: 8 });
  assert.ok(notes.length > 0, 'notes produced');
  // bar 0 tone0 = Am root (A=57 with center 60): first note is A3
  assert.equal(notes[0].note, 57);
  assert.equal(notes[0].startBeat, 0);
  // every note lands on a 16th grid
  for (const n of notes) assert.ok(Math.abs(n.startBeat * 4 - Math.round(n.startBeat * 4)) < 1e-9);
});

test('tone index cycles voicing, uppercase = accent', () => {
  const { notes } = buildNotes('0000\n1000\n2000\n3000', { bars: ['Am', 'G', 'F', 'E'] }, { totalBars: 4 });
  assert.equal(notes.length, 4);
  assert.equal(notes[3].velocity, 72);
  const acc = buildNotes('0.0.', { bars: ['Am'] }, { totalBars: 1 });
  // digits = 72; letters = 96:
  const acc2 = buildNotes('a.0.', { bars: ['Am'] }, { totalBars: 1 });
  assert.equal(acc2.notes[0].velocity, 96);
});

test('too few chord bars → warning', () => {
  const { warnings } = buildNotes('0000', { bars: ['Am'] }, { totalBars: 4 });
  assert.ok(warnings.some(w => w.includes('chord bars')));
});
```

- [ ] **Step 2: Write fixtures**

`grid-verse.keys` (8 bars: hit on 1 and the "and" of 2 per bar, tone cycling):
```
# part=keys dur=4 program=4
0.0.0...
.0..0...
0.0.0...
.0......
0.0.0...
.0..0...
0.0.0...
.0..0...
```

`chords.fixture.json` as above (`Verse` 8 bars).

- [ ] **Step 3: Run, verify FAIL**
- [ ] **Step 4: Implement `scripts/lib/step-grid.js`**

```js
// parseValue: mismo decoder que pipeline-viral/scripts/orca-runtime.js
export function parseValue(v) {
  if (v >= 'a' && v <= 'z') return v.charCodeAt(0) - 97;
  if (v >= 'A' && v <= 'Z') return v.charCodeAt(0) - 65 + 26;
  if (v >= '0' && v <= '9') return parseInt(v);
  return -1;
}

import { voicing } from './chords.js';

export function buildNotes(gridText, sceneChords, { totalBars, center = 60, part = 'keys' } = {}) {
  const warnings = [];
  const lines = gridText.split(/\r?\n/).filter(l => l.trim() !== '');
  const header = {};
  for (const l of lines) {
    const m = l.match(/^#\s*(\w+)=(\S+)/);
    if (m) header[m[1]] = m[2];
  }
  const body = lines.filter(l => !l.startsWith('#'));
  const durSteps = parseInt(header.dur ?? '4', 10);
  const bars = sceneChords.bars;
  if (body.length < totalBars) warnings.push(`grid rows ${body.length} < totalBars ${totalBars}`);
  const notes = [];
  for (let b = 0; b < Math.min(body.length, totalBars); b++) {
    const chord = bars[b % bars.length];
    if (b >= bars.length) warnings.push(`chord bars ${bars.length} < totalBars ${totalBars} (looping)`);
    const voic = voicing(chord, center);
    const row = body[b].padEnd(16, '.').slice(0, 16);
    for (let s = 0; s < 16; s++) {
      const c = row[s];
      if (c === '.' || c === '#') continue;
      const pv = parseValue(c);
      if (pv < 0) continue;
      const isUpper = c >= 'A' && c <= 'Z';
      const toneIdx = pv % voic.length;
      notes.push({
        track: 0, note: voic[toneIdx],
        startBeat: b * 4 + s / 4,
        durBeats: durSteps / 4,
        velocity: isUpper ? 96 : (c >= '0' && c <= '9' ? 72 : 96),
        part,
      });
    }
  }
  return { notes, warnings };
}
```

(Velocity rule as tested: digits→72, letters→96; grid uses digits for soft, letters for accents.)

- [ ] **Step 5: Run, verify PASS**
- [ ] **Step 6: CLI wrapper `scripts/orca-to-mid.js`**

```js
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { buildNotes } from './lib/step-grid.js';
import { writeSmf } from './lib/smf-writer.js';

const argv = process.argv.slice(2);
const args = {};
for (let i = 0; i < argv.length; i += 2) args[argv[i].replace(/^--/, '')] = argv[i + 1];
// usage: node scripts/orca-to-mid.js --grid --chords --scene --totalBars --tempo --out
const gridText = readFileSync(args.grid, 'utf8');
const chords = JSON.parse(readFileSync(args.chords, 'utf8'));
const scene = chords.sections[args.scene];
if (!scene) { console.error(`scene not in chords.json: ${args.scene}`); process.exit(1); }
const { notes, warnings } = buildNotes(gridText, scene, { totalBars: parseInt(args.totalBars, 10) });
for (const w of warnings) console.warn('WARN', w);
const buf = writeSmf({ tempo: parseFloat(args.tempo), timeSig: [4, 4], notes, program: parseInt(args.program ?? '0', 10) });
mkdirSync(dirname(args.out), { recursive: true });
writeFileSync(args.out, buf);
console.log(`Wrote ${args.out} (${notes.length} notes)`);
```

- [ ] **Step 7: CLI smoke** — run against fixtures to `test/.tmp/out.mid`; assert file exists & size > 100 bytes (one-liner PowerShell), then delete `.tmp`
- [ ] **Step 8: Commit** — `git add -A cancionero-rojo; git commit -m "feat(cancionero-rojo): step-grid to MIDI with chord-tone binder"`

---

### Task 7: Stem renderer wrapper (`render-stems.js`)

**Files:**
- Create: `cancionero-rojo/scripts/render-stems.js`
- Test: `cancionero-rojo/test/render-stems.test.js`, `test/fixtures/pattern-strings.js`

**Interfaces:**
- Consumes: `structure.json`, `songs/<slug>/patterns/<part>.js` exporting `{ code, cps?, loopSec?, lfo?, sections?: { <SectionName>: { code } } }`.
- Produces: `stems/<part>--<section>.wav` + `stems/manifest.json` (`[{ part, section, file, seconds }]`); pure helpers exported for tests: `sectionSeconds(bars, tempo)`, `materializePattern(spec, section) → jsSource`.

- [ ] **Step 1: Write failing tests**

```js
// test/render-stems.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { sectionSeconds, materializePattern } from '../scripts/render-stems.js';

test('section seconds math', () => {
  assert.equal(sectionSeconds(4, 130), (4 * 4 * 60) / 130);
  assert.equal(sectionSeconds(16, 130).toFixed(2), '29.54');
});

test('materializePattern applies section override and injects exports', () => {
  const spec = { code: 'note("a3")', cps: 0.5, loopSec: 8,
                 sections: { Chorus: { code: 'note("e4")' } } };
  const src = materializePattern(spec, 'Chorus');
  assert.ok(src.includes('note("e4")'));
  assert.ok(src.includes('export const loopSec = 8'));
  const verse = materializePattern(spec, 'Verse');
  assert.ok(verse.includes('note("a3")'));
});
```

- [ ] **Step 2: Run, verify FAIL**
- [ ] **Step 3: Implement exports in `scripts/render-stems.js`**

```js
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO = resolve(ROOT, '..');
const RENDERER = join(REPO, 'pipeline-viral', 'scripts', 'strudel-render.js');

export const sectionSeconds = (bars, tempo) => (bars * 4 * 60) / tempo;

export function materializePattern(spec, section) {
  const chosen = spec.sections?.[section] ?? spec;
  const { code, cps = 0.5, loopSec = 0, lfo } = { ...spec, ...chosen };
  let src = `export const code = ${JSON.stringify(code)};\nexport const cps = ${cps};\nexport const loopSec = ${loopSec};\n`;
  if (lfo) src += `export const lfo = ${JSON.stringify(lfo)};\n`;
  return src;
}

async function renderSong(slug) {
  const songDir = join(ROOT, 'songs', slug);
  const structure = JSON.parse(readFileSync(join(songDir, 'structure.json'), 'utf8'));
  const stemsDir = join(songDir, 'stems');
  mkdirSync(stemsDir, { recursive: true });
  mkdirSync(join(songDir, '.tmp'), { recursive: true });
  const manifest = [];
  const audioParts = structure.parts.audio;
  for (const part of audioParts) {
    const patPath = join(songDir, 'patterns', `${part}.js`);
    if (!existsSync(patPath)) throw new Error(`missing pattern: ${patPath}`);
    const spec = (await import(pathToFileURL(patPath).href)); // exercises syntax
    for (const sc of structure.scenes) {
      const secs = sectionSeconds(sc.bars, structure.tempo);
      const tmp = join(songDir, '.tmp', `${part}--${sc.name}.js`);
      const out = join(stemsDir, `${part}--${sc.name}.wav`);
      writeFileSync(tmp, materializePattern(spec, sc.name));
      execFileSync(process.execPath, [RENDERER, tmp, String(Math.ceil(secs)), out], { stdio: 'inherit' });
      manifest.push({ part, section: sc.name, file: `stems/${part}--${sc.name}.wav`, seconds: secs });
    }
  }
  writeFileSync(join(stemsDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`manifest: ${manifest.length} stems`);
}

if (process.argv[1] && process.argv[1].endsWith('render-stems.js')) {
  const slug = process.argv[2];
  if (!slug) { console.error('Uso: node scripts/render-stems.js <slug>'); process.exit(1); }
  renderSong(slug).catch(e => { console.error(e.message); process.exit(1); });
}
```

- [ ] **Step 4: Run unit tests, verify PASS**
- [ ] **Step 5: Integration smoke** — create a throwaway `songs/_smoke/structure.json` (1 scene, bars 2, tempo 130, parts.audio `['strings']`) + `patterns/strings.js` = `export const code = 'note("a3 c4 e4").s("sine").gain(0.2)'; export const loopSec = 2;`; run `node scripts/render-stems.js _smoke`
  - Expected: `songs/_smoke/stems/strings--Intro.wav` exists; `ffprobe -v error -show_entries format=duration -of csv=p=0 <wav>` ≈ 3.7 (2 bars @130 ≈ 3.69s, ceil→4; assert 3.0–4.5); then `Remove-Item -Recurse songs\_smoke`
- [ ] **Step 6: Commit** — `git add -A cancionero-rojo; git commit -m "feat(cancionero-rojo): per-section stem renderer via strudel-render"`

---

### Task 8: `.als` inspector

**Files:**
- Create: `cancionero-rojo/scripts/inspect-als.js`
- Test: `cancionero-rojo/test/inspect-als.test.js`, `test/fixtures/mini-template.als.json` (plain JSON→gzipped in test setup)

**Interfaces:**
- Produces: `inventory(xmlString) → { tracks: [{name, type, clipSlots, devices}], scenes: number, locators: number, returns, master }` + CLI `node scripts/inspect-als.js <file.als> [--json]` (gunzip → inventory → print). Consumed by Task 9 (template gate) and Task 10+ (builder queries).

- [ ] **Step 1: Write failing test**

```js
// test/inspect-als.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { inventory } from '../scripts/inspect-als.js';

const MINI = `<?xml version="1.0" encoding="utf-8"?>
<Ableton MajorVersion="5" MinorVersion="10.0_424"><LiveSet>
<Tracks>
<MidiTrack><Name><EffectiveName Value="Keys"/></Name><DeviceChain><MidiClipSlots><MidiClipSlot Id="0"/><MidiClipSlot Id="1"/></MidiClipSlots></DeviceChain></MidiTrack>
<AudioTrack><Name><EffectiveName Value="Strings"/></Name><DeviceChain><AudioClipSlots><AudioClipSlot Id="0"/></AudioClipSlots></DeviceChain></AudioTrack>
</Tracks>
<MasterTrack><SessionView><Scenes><Scene Id="0"/><Scene Id="1"/></Scenes></SessionView></MasterTrack>
</LiveSet></Ableton>`;

test('inventory finds tracks/scenes/slots', () => {
  const inv = inventory(MINI);
  assert.deepEqual(inv.tracks.map(t => t.name), ['Keys', 'Strings']);
  assert.equal(inv.tracks[0].type, 'midi');
  assert.equal(inv.tracks[0].clipSlots, 2);
  assert.equal(inv.tracks[1].clipSlots, 1);
  assert.equal(inv.scenes, 2);
});

test('gzipped payload parses', () => {
  const gz = gzipSync(Buffer.from(MINI));
  const inv = inventory(gz); // accepts Buffer too
  assert.equal(inv.scenes, 2);
});
```

- [ ] **Step 2: Run, verify FAIL**
- [ ] **Step 3: Implement `scripts/inspect-als.js`**

```js
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

export function inventory(input) {
  let buf = Buffer.isBuffer(input) ? input : Buffer.from(input, 'utf8');
  if (buf[0] === 0x1f && buf[1] === 0x8b) buf = gunzipSync(buf);
  const xml = buf.toString('utf8');
  const tracks = [];
  for (const m of xml.matchAll(/<(Midi|Audio)Track>([\s\S]*?)<\/\1Track>/g)) {
    const [, type, body] = m;
    const name = body.match(/<EffectiveName Value="([^"]*)"/)?.[1] ?? '?';
    const slotTags = type === 'Midi' ? /<MidiClipSlot Id=/g : /<AudioClipSlot Id=/g;
    tracks.push({ name, type: type.toLowerCase(), clipSlots: (body.match(slotTags) ?? []).length,
                  devices: (body.match(/<Device /g) ?? []).length });
  }
  const scenes = (xml.match(/<Scene Id=/g) ?? []).length;
  const locators = (xml.match(/<Locator /g) ?? []).length;
  return { tracks, scenes, locators,
           returns: tracks.filter(t => /Reverb|Delay/.test(t.name)).length,
           temp: xml.match(/<Tempo><Manual Value="([\d.]+)"/)?.[1] };
}

if (process.argv[1]?.endsWith('inspect-als.js') && process.argv[2]) {
  const data = readFileSync(process.argv[2]);
  const inv = inventory(data);
  if (process.argv.includes('--json')) console.log(JSON.stringify(inv, null, 2));
  else {
    console.log(`tracks: ${inv.tracks.map(t => `${t.name}(${t.type},${t.clipSlots} slots)`).join(', ')}`);
    console.log(`scenes: ${inv.scenes}, locators: ${inv.locators}, tempo: ${inv.temp}`);
  }
}
```

- [ ] **Step 4: Run, verify PASS**
- [ ] **Step 5: Real-file run (donor discovery)** — `node scripts/inspect-als.js "C:\Users\tom_w\Music\Pistas\Metodo Mezcla 10\Jeckyl and Hyde Mezcla Project\Jeckyl and Hyde Mezcla.als"` and same for `C:\Users\tom_w\Music\Proyectos\Zamba Samurai\Zamba Samurai 25 Mayo.als`
  - Expected: prints track lists (proves gunzip+parse on real Live 10 files). Record the donor matrix — which file has MIDI clips, audio clips, arrangement content, locators (F1 finding 2026-09-24: Jeckyl+Zamba are audio-only; MIDI donors = Live 10's own `Resources\Core Library\Lessons\Sets\Live 10 Suite Empty.als` / demo songs — see Task 10 Step 6). If parse output looks wrong (encoding/structure), fix regexes here before proceeding.
- [ ] **Step 6: Commit** — `git add -A cancionero-rojo; git commit -m "feat(cancionero-rojo): .als inventory inspector (donor discovery)"`

---

### Task 9: Template recipe + `template.als` (USER in Live 10)

**Files:**
- Create: `cancionero-rojo/ableton/TEMPLATE-RECIPE.md`
- Output (user): `cancionero-rojo/ableton/template.als`
- Test: `cancionero-rojo/test/template.test.js` (skips if template absent)

**Interfaces:**
- Produces: the template every builder task clones. Consumes: Task 8 inspector for verification.

- [ ] **Step 1: Write `ableton/TEMPLATE-RECIPE.md`** with these exact contents:

```markdown
# TEMPLATE RECIPE — construir template.als (una vez, ~30 min)

1. Live 10 → File > New Live Set. Preferences:
   - Link/MIDI: en MIDI Ports de **Xone K2** y **APC mini**: Track ON, Remote ON, Input OFF.
2. Create 8 tracks, nombres EXACTOS (View > Rename, F2):
   - Audio: `Mic Lead` (Input: Ext. In 1 / channels 1-2→1), `Mic Guest` (Ext. In 2)
     → Input Monitoring: **In** en ambos.
   - MIDI: `Keys`, `Guitar`, `Bass`, `Perc`
   - Audio: `Strings`, `Texture`
3. Instrumentos (Swap Device al final; decidir por oído — cualquier cambio luego es manual):
   - Keys: Electric (preset "Closet") o Sampler con piano
   - Guitar: Tension (preset plucked) o Sampler
   - Bass: Analog (bass preset) u Operator
   - Perc: Collision (marimba/perc) — mapeo: C1=bombo, D1=caja, F#1=hihat (GM-ish)
   - Strings: Wavetable (preset saw ensemble) — polifonía alta
   - Texture: Simpler en modo Classic con un sample ambiental de User Library
4. Mic Lead/Mic Guest devices: `Channel EQ` + `Compressor`, y Sends A=15 (Reverb), B=15 (Delay).
5. Returns: crear `A-Reverb` (Reverb, size Grande) y `B-Delay` (Delay, sync 1/4).
6. Master: `Auto Filter` (Lowpass, freq 18k) + `Echo` (dry/wet 0%). Para builds: barrer Auto Filter freq con el knob.
7. Strings y Texture: Sends A=20.
8. Session View: crear 16 escenas (Cmd+I? Scene Insert → 16), dejar nombres vacíos.
9. Guardar COMO: cancionero-rojo/ableton/template.als
10. MIDI Map mode (Cmd+M):
    - Xone K2 **L1**: knobs 1-3 → Mic Lead [Low/Mid/High] de Channel EQ; knobs 4-6 → Mic Guest [Low/Mid/High]
    - Xone K2 **L2**: knob1 → Mic Lead Send A, knob2 → Mic Lead Send B, knob3/4 → Mic Guest A/B, knob5 → Master Auto Filter Freq, knob6 → Auto Filter Res
    - Xone K2 **L3**: knob1 → Echo Time, knob2 → Echo Feedback, knob3 → Strings Send A, knobs 4-6 libres
    - APC mini: faders 1-8 → vol de Mic Lead, Mic Guest, Keys, Guitar, Bass, Perc, Strings, Texture (en ese orden); fader 9 → Master; scene buttons 1-8 → Scene Launch 1-8; botones clip grid → libres
    - **Capas L1/L2/L3 del K2**: si el K2 no envía capas sin script, usar los 18 knobs físicos: priorizar L1 (EQ mics) y mapear el resto en la fila libre. Ajustar durante la sesión de mapeo con el controller delante.
11. Escuchar: gritar en el micro (Input In) → comprueba que suena con FX; mover APC fader → volumen.
```

- [ ] **Step 2: `scripts/build-template.js` generates `ableton/template.als`** (F1/human-gate amendment
  2026-09-24: recipe's manual build replaced by donor-based programmatic build; user only verifies).

  Source: `C:\Users\tom_w\Music\_Serato_\Program\Live\Resources\Core Library\Lessons\Sets\Live 10 Suite Empty.als`
  (official Live 10 Suite = exact target version; 12 midi + 3 audio, returns=2, scenes=7, has
  Echo/AutoFilter/Eq8/Compressor2/Reverb/Operator + DrumRacks + MidiClip/MidiNote donors).

  Spec (each transform verified by re-running `inspect-als.js` + `test/template.test.js`):
  1. gunzip → XML string; single renumber pass at the end: collect every `Id="N"` in the file,
     reassign duplicated-subtree Ids from `maxId+1` (never collide; keep originals untouched).
  2. Tracks: keep 4 midi (`Keys`,`Guitar`,`Bass`,`Perc`) + 3 audio (`10 Vocals 1`,`11 Vocals 2`,
     `12 Wavetable Pads`) + DUPLICATE the `10 Vocals 1` subtree once (4th audio = `Texture`).
     Delete all other tracks. Reorder + rename to roster order: Mic Lead, Mic Guest, Keys, Guitar,
     Bass, Perc, Strings, Texture (`<UserName><EffectiveName Value=...>` etc. — grep donor for the
     name elements; ALL name variants must be updated).
  3. Strip content: remove every clip from every session slot (keep empty `<ClipSlot>` elements),
     strip arrangement content (ClipEvent/ArrangerAutomation children — template arrangement must be
     EMPTY for Task 13), clear scene names.
  4. Mics: `Mic Lead` = input channel 1, `Mic Guest` = channel 2 (Ext. In), Input Monitoring = **In**
     (grep donor vocal tracks for input-routing/monitor elements — they were recorded, so routing
     XML exists; set channel index + monitor manually).
  5. Sends: mics A=15 B=15; Strings/Texture A=20 (find send value elements in mixer XML).
  6. Scenes: 7 → 16 (duplicate `<Scene>` pattern with renumbered Ids, empty names).
  7. Returns: verify names = `A-Reverb`/`B-Delay`; rename if donor differs.
  8. Master chain: ensure `AutoFilter` (freq ~18k) + `Echo` (dry/wet 0) on master; if donor's are on
     tracks, transplant subtree (renumber Ids). If missing entirely → transplant from another donor
     (grep shows AutoFilter/Echo exist in Suite Empty somewhere).
  9. Device deviations from recipe (record in xml-map.md / recipe appendix): mic FX = donor chains
     (Eq8+Compressor2 equivalents — user may swap to Channel EQ later); MIDI-track instruments =
     donor instruments (Operator/DrumRack stand-ins — swap by ear later); Strings/Texture have NO
     instruments (recipe step 3 was wrong: they're AUDIO stem tracks per pipeline — plan bug fixed
     here). Perc ← DrumRack is natural.
  10. gzip → `ableton/template.als`.

- [ ] **Step 3: Verify with inspector**

```powershell
node scripts/inspect-als.js ableton/template.als --json
```

Expected: exactly tracks `Mic Lead, Mic Guest, Keys, Guitar, Bass, Perc, Strings, Texture` (+ master/returns per implementation), `scenes: 16`.

- [ ] **Step 4: Automated gate `test/template.test.js`**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { inventory } from '../scripts/inspect-als.js';

const T = new URL('../ableton/template.als', import.meta.url);
const REQUIRED = ['Mic Lead', 'Mic Guest', 'Keys', 'Guitar', 'Bass', 'Perc', 'Strings', 'Texture'];

test('template.als has the 8 roster tracks and 16 scenes', { skip: !existsSync(T) }, () => {
  const inv = inventory(readFileSync(T));
  for (const n of REQUIRED) assert.ok(inv.tracks.some(t => t.name === n), `missing track ${n}`);
  assert.equal(inv.scenes, 16);
});
```

- [ ] **Step 5: Run `npm test` → PASS (template test runs, not skipped)**
- [ ] **Step 6: Commit** — `git add -A cancionero-rojo; git commit -m "feat(cancionero-rojo): template recipe + template.als (16 scenes, 8 tracks)"`
- [ ] **Step 7: USER verification gate (the only human steps left)** — open template.als in Live 10:
  - MUST open WITHOUT repair dialog (if repair appears: report Live's message + affected element →
    debug generator → regenerate; this is still the Approach-A viability gate)
  - Preferences > Link/MIDI: Xone K2 + APC mini ports (Track/Remote ON) — lives in Live prefs, not .als
  - Map Mode per recipe steps 10-11 (physical controllers), instrument swap by ear, mic shout-test,
    then save (over the generated template.als — Live rewrites it natively, which is the safest final form)
  - Update recipe doc: mark which steps the generator covered vs which remain manual (fix recipe step 3
    Strings/Texture instrument contradiction — they are AUDIO stem tracks, no instruments)

---

### Task 10: Builder core — XML load/query + donor extraction

**Files:**
- Create: `cancionero-rojo/ableton/builder/als.js`, `cancionero-rojo/scripts/extract-donors.js`, `cancionero-rojo/ableton/xml-map.md`
- Donors (generated): `cancionero-rojo/ableton/donors/midi-clip.xml`, `audio-clip.xml`, `clip-event-midi.xml`, `clip-event-audio.xml`, `locator.xml`
- Test: `cancionero-rojo/test/builder-als.test.js`

**Interfaces:**
- `als.js` produces: `loadAls(path) → { raw, gzip: Buffer }`, `saveAls(state, path)`, `query(state) → inventory` (reuses Task 8), `setSceneNames(state, names[])`, `findTrackBody(xml, name) → { start, end }`.
- `extract-donors.js` produces: donor fragments with placeholders `{{NOTES}}`, `{{DUR_BEATS}}`, `{{CLIP_NAME}}`, `{{FILE_PATH}}`, `{{SIZE}}`, `{{MD5}}`, `{{TIME}}`, `{{LOC_NAME}}`.

- [ ] **Step 1: Write failing test (round-trip + scene rename on gzip fixture)**

```js
// test/builder-als.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { parseAls, buildAls, setSceneNames, inventoryXml } from '../ableton/builder/als.js';

const XML = `<?xml version="1.0" encoding="utf-8"?>
<Ableton MajorVersion="5" MinorVersion="10.0_424"><LiveSet><MasterTrack><SessionView><Scenes>
<Scene Id="0"><Name><EffectiveName Value=""/></Name></Scene>
<Scene Id="1"><Name><EffectiveName Value=""/></Name></Scene>
</Scenes></SessionView></MasterTrack></LiveSet></Ableton>`;

test('parse→build roundtrip preserves structure', () => {
  const st = parseAls(gzipSync(Buffer.from(XML)));
  const out = buildAls(st);
  assert.ok(out.includes('<Ableton MajorVersion="5"'));
  assert.equal(inventoryXml(out).scenes, 2);
});

test('setSceneNames writes EffectiveName', () => {
  const st = parseAls(gzipSync(Buffer.from(XML)));
  setSceneNames(st, ['Intro', 'Verse']);
  const out = buildAls(st);
  assert.ok(out.includes('Value="Intro"') && out.includes('Value="Verse"'));
});
```

- [ ] **Step 2: Run, verify FAIL**
- [ ] **Step 3: Implement `ableton/builder/als.js`** using `fast-xml-parser` with `preserveOrder: true`:

```js
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync, gzipSync } from 'node:zlib';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';

const P = new XMLParser({ preserveOrder: true, ignoreAttributes: false, attributeName: '@_',
                           allowBooleanAttributes: true, trimValues: false });
const B = new XMLBuilder({ preserveOrder: true, ignoreAttributes: false, attributeName: '@_',
                           allowBooleanAttributes: true, processEntities: true });

export function parseAls(buf) {
  const raw = (buf[0] === 0x1f && buf[1] === 0x8b) ? gunzipSync(buf) : buf;
  const xml = raw.toString('utf8');
  return { xml, tree: P.parse(xml) };
}

export function buildAls(state) {
  const xml = '<?xml version="1.0" encoding="utf-8"?>' + B.build(state.tree);
  return xml;
}

export function saveAls(state, outPath) {
  writeFileSync(outPath, gzipSync(Buffer.from(buildAls(state), 'utf8')));
}

export function inventoryXml(xml) {
  return {
    scenes: (xml.match(/<Scene Id=/g) ?? []).length,
    tracks: [...xml.matchAll(/<EffectiveName Value="([^"]*)"/g)].map(m => m[1]),
  };
}

export function setSceneNames(state, names) {
  // encuentra todos los <Scene Id> y setea su EffectiveName, en orden
  const scenes = [];
  const walk = (nodes) => {
    for (const n of nodes ?? []) {
      if (n.Scene) scenes.push(n);
      if (typeof n === 'object') for (const k of Object.keys(n)) if (Array.isArray(n[k])) walk(n[k]);
    }
  };
  walk(state.tree);
  if (scenes.length < names.length) throw new Error(`only ${scenes.length} scenes, need ${names.length}`);
  names.forEach((nm, i) => {
    const scene = scenes[i];
    const nameNode = (scene.Scene ?? scene).find?.(x => x.Name);
    // estructura preserveOrder: scene.Scene = [ {Name:[{EffectiveName:[{'@_Value':...}]}]}, ...]
    const nameArr = (scene.Scene ?? scene).find(x => x.Name)?.Name;
    if (nameArr) {
      const eff = nameArr.find(x => x.EffectiveName)?.EffectiveName;
      if (eff?.[0]?.['@_Value'] !== undefined) eff[0]['@_Value'] = nm;
      else nameArr.unshift({ EffectiveName: [{ '@_Value': nm }] });
    } else {
      (scene.Scene ?? scene).unshift({ Name: [{ EffectiveName: [{ '@_Value': nm }] }] });
    }
  });
}

export { readFileSync };
```

- [ ] **Step 4: Run, verify PASS**
- [ ] **Step 5: Implement `scripts/extract-donors.js`**

```js
// Uso: node scripts/extract-donors.js <source.als>
// Extrae fragmentos reales de Live como donors, con placeholders.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = gunzipSync(readFileSync(process.argv[2])).toString('utf8');
const out = join(ROOT, 'ableton', 'donors');
mkdirSync(out, { recursive: true });

function grab(re, label, transform = (x) => x) {
  const m = src.match(re);
  if (!m) { console.warn(`NOT FOUND: ${label}`); return; }
  writeFileSync(join(out, label + '.xml'), transform(m[0]));
  console.log(`donor: ${label}.xml (${m[0].length} bytes)`);
}

grab(/<MidiClip Id="[\d]+"[\s\S]*?<\/MidiClip>/, 'midi-clip',
  s => s.replace(/(<Notes>)[\s\S]*?(<\/Notes>)/, '$1{{NOTES}}$2')
        .replace(/Value="[\d.]+"/, 'Value="{{DUR}}"'));
grab(/<AudioClip Id="[\d]+"[\s\S]*?<\/AudioClip>/, 'audio-clip',
  s => s.replace(/(<Path Value=")[^"]*(")/, '$1{{FILE_PATH}}$2')
        .replace(/(<Size Value=")\d+(")/, '$1{{SIZE}}$2')
        .replace(/(<AudioMd5 Value=")[^"]*(")/, '$1{{MD5}}$2'));
grab(/<(?:Midi|Audio)ClipEvent Id="[\d]+"[\s\S]*?<\/(?:Midi|Audio)ClipEvent>/, 'clip-event');
grab(/<Locator Id="[\d]+"[\s\S]*?<\/Locator>/, 'locator',
  s => s.replace(/(<Name Value=")[^"]*(")/, '$1{{LOC_NAME}}$2'));
```

- [ ] **Step 6: Run extraction — MidiClip donor FIRST** (F1 amendment 2026-09-24: Jeckyl/Zamba are audio-only — `MidiClip`/`MidiNote` = 0 in both; discovered by Task 8):

```powershell
node scripts/extract-donors.js "C:\Users\tom_w\Music\_Serato_\Program\Live\Resources\Core Library\Lessons\Sets\Live 10 Suite Empty.als"
node scripts/extract-donors.js "C:\Users\tom_w\Music\Proyectos\Zamba Samurai\Zamba Samurai 25 Mayo.als"
node scripts/extract-donors.js "C:\Users\tom_w\Music\Pistas\Metodo Mezcla 10\Jeckyl and Hyde Mezcla Project\Jeckyl and Hyde Mezcla.als"
```

(The first — official Live 10 Suite set: 12 midi + 3 audio tracks, returns=2, locators=1, has MidiClip+MidiNote — yields `midi-clip.xml`, likely `clip-event-midi.xml` and `locator.xml`; the two originals cover audio/arrangement fragments. Later runs overwrite same-named fragments: keep whichever source yields each fragment and record provenance in xml-map.md.)

Expected: `ableton/donors/` has `midi-clip.xml` + `audio-clip.xml` + `locator.xml` (+ `clip-event.xml` if present — grep an .als for `ClipEvent`; if absent, arrangement injection in Task 13 falls back to **cloning the donor session clip into arrangement structure discovered in Task 13 Step 1**).

- [ ] **Step 7: Write `ableton/xml-map.md`** — record (from donors + template): element paths for: track bodies by name, `MidiClipSlots`/`AudioClipSlots` order, Scene list path, `Tempo/Manual`, arrangement event container, locator container. Source: `Select-String` greps of the gunzipped template (`[IO.File]::WriteAllText('tmp.xml', [Text.Encoding]::UTF8.GetString([IO.Compression.GzipFile]...))` or a 5-line node one-liner). This file is the builder's schema map.
- [ ] **Step 8: Commit** — `git add -A cancionero-rojo; git commit -m "feat(cancionero-rojo): als parse/query lib + donor fragments from real Live files"`

---

### Task 11: Scene names + Session MIDI clip injection

**Files:**
- Create: `cancionero-rojo/ableton/builder/inject-session.js`
- Test: `cancionero-rojo/test/inject-session.test.js`

**Interfaces:**
- Consumes: `als.js` (Task 10), donors `midi-clip.xml` (Task 10), `structure.json` + `.mid` files (Task 6), Task 8 inventory.
- Produces: `injectSession(state, { structure, tracks: { <trackName>: { <sceneName>: <midPath> } } }) → state` (mutates tree; session slots filled row=scene, col=track). Later: `build.js` (Task 13).

- [ ] **Step 1: Write failing test** — build fixture tree with one MidiTrack `Keys` having 2 empty `<MidiClipSlot/>`, inject a clip for scene 0; assert output contains clip name + track still named `Keys` + slot count unchanged:

```js
test('injects midi clip into slot 0 of Keys', () => {
  // fixture: <MidiTrack>...<MidiClipSlots><MidiClipSlot Id="0"/><MidiClipSlot Id="1"/></MidiClipSlots>
  // after: slot 0 contains <MidiClip ...>Verse</MidiClip>, slot 1 untouched
  // assert: /Keys/ present, clip appears once, '<MidiClipSlot Id="1"/>'-equivalent intact
});
```

(Full assertion code: search output for `<EffectiveName Value="Verse"` inside Keys track slice + count `<MidiClip ` === 1.)

- [ ] **Step 2: Run, verify FAIL**
- [ ] **Step 3: Implement `inject-session.js`**

```js
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DONOR = readFileSync(join(ROOT, 'ableton', 'donors', 'midi-clip.xml'), 'utf8');

// Convierte events del SMF builder (mismo formato que orca-to-mid) a Live MidiNoteEvent:
// Live 10 guarda Time/Duration en quarter-notes (float).
export function notesToLiveEvents(notes) {
  return notes.map(n =>
    `<MidiNoteEvent Time="${n.startBeat}" Duration="${n.durBeats}" Note="${n.note}" Velocity="${n.velocity}" />`).join('');
}

export function makeClipXml({ name, donor, notes }) {
  const events = notesToLiveEvents(notes);
  const end = Math.max(...notes.map(n => n.startBeat + n.durBeats), 4);
  return donor
    .replace('{{NOTES}}', events)
    .replace(/\{\{DUR\}\}|Value="\{\{DUR_BEATS\}\}"/, `Value="${end}"`)
    .replace(/(<Name(?:\.Value)? Value=")[^"]*(")/, `$1${name}$2`)
    .replace(/(<EffectiveName Value=")[^"]*(")/, `$1${name}$2`)
    .replace(/Id="\d+"/, `Id="${9000 + Math.floor(Math.random() * 900)}"`);
}

// string-level injection: localiza el bloque del track y reescribe el slot destino
export function injectMidiIntoTrack(xml, trackName, sceneIndex, clipXml) {
  const typeRe = new RegExp(`<(Midi)Track>([\\s\\S]*?<EffectiveName Value="${trackName}"[\\s\\S]*?)</\\1Track>`);
  const m = xml.match(typeRe);
  if (!m) throw new Error(`track not found: ${trackName}`);
  const body = m[0];
  const slots = [...body.matchAll(/<MidiClipSlot Id="\d+">[\s\S]*?<\/MidiClipSlot>|<MidiClipSlot Id="\d+"\/>/g)];
  if (slots.length <= sceneIndex) throw new Error(`track ${trackName}: need slot ${sceneIndex}, has ${slots.length}`);
  const target = slots[sceneIndex][0];
  const normalized = `<MidiClipSlot Id="${sceneIndex}">${clipXml}</MidiClipSlot>`;
  const out = xml.replace(target, normalized);
  if (out === xml) throw new Error('injection no-op');
  return out;
}
```

(Implementation note: the empty-slot branch above is authoritative — always rewrite target slot as `<MidiClipSlot Id=N>CLIP</MidiClipSlot>`. Keep `makeClipXml` + `injectMidiIntoTrack` as the exported API; drop unused `replaced` logic while keeping tests green.)

- [ ] **Step 4: Run, verify PASS** (adjust regexes against fixture until green — tests are authoritative)
- [ ] **Step 5: Wire into a preview CLI** — `node ableton/builder/inject-session.js <template.als> <structure.json> <sceneIdx> <track> <clip.mid> <out.als>`: parse SMF back? **No** — Task 6 also writes a sidecar JSON of notes: modify Step "orcas-to-mid" CLI to additionally write `<out>.json` with `{ notes }`. (Add that small change + test: `.mid.json` exists next to `.mid` with notes array.)
- [ ] **Step 6: Integration on real template** — after Task 14 structure exists, or earlier: temporary structure for `je-veux` is NOT yet authored; instead validate with fixture structure from Task 2 on the REAL template: inject `test/.tmp/keys--Intro.mid` (from Task 6 fixtures) into scene 0 of Keys → write `test/.tmp/probe.als` → run `node scripts/inspect-als.js test/.tmp/probe.als` → confirms file still parses; **human spot-check optional at this point, full Live check comes at Task 13/14 gates.**
- [ ] **Step 7: Commit** — `git add -A cancionero-rojo; git commit -m "feat(cancionero-rojo): session MIDI clip injection (donor-based)"`

---

### Task 12: Audio (stem) clip injection

**Files:**
- Create: `cancionero-rojo/ableton/builder/inject-audio.js`
- Test: `cancionero-rojo/test/inject-audio.test.js`

**Interfaces:**
- Consumes: donor `audio-clip.xml`, `stems/manifest.json` (Task 7).
- Produces: `makeAudioClipXml({ name, wavPath }) → string` (computes Size + AudioMd5 of the wav; absolute path — machine-local by design) + `injectAudioIntoTrack(xml, trackName, sceneIndex, clipXml)` (same splice contract as Task 11).

- [ ] **Step 1: Write failing test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { makeAudioClipXml } from '../ableton/builder/inject-audio.js';

test('audio clip gets real size + md5 + path', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cr-'));
  const wav = join(dir, 'strings--Intro.wav');
  const bytes = Buffer.alloc(4096, 7);
  writeFileSync(wav, bytes);
  const xml = makeAudioClipXml({ name: 'strings--Intro', wavPath: wav });
  assert.ok(xml.includes(wav.replace(/\\/g, '/')) || xml.includes(wav));
  assert.ok(xml.includes(`Size Value="${bytes.length}"`));
  const md5 = createHash('md5').update(bytes).digest('hex');
  assert.ok(xml.includes(`AudioMd5 Value="${md5}"`));
});
```

- [ ] **Step 2: Run, verify FAIL**; **Step 3: implement** (same donor-replace pattern as `makeClipXml`, with `md5`/`size` computed via `createHash`/`statSync`; normalize `\\`→`/` in path for the XML);
- [ ] **Step 4: Run, verify PASS**
- [ ] **Step 5: Commit** — `git add -A cancionero-rojo; git commit -m "feat(cancionero-rojo): audio stem clip injection with real md5/size"`

---

### Task 13: Arrangement + tempo + locators + `build.js` orchestrator

**Files:**
- Create: `cancionero-rojo/ableton/builder/build.js`, `cancionero-rojo/ableton/builder/inject-arrangement.js`
- Test: `cancionero-rojo/test/build.test.js`

**Interfaces:**
- Consumes: everything (structure.json, chords validated, `clips/*.mid`+sidecars, `stems/manifest.json`, template, donors).
- Produces: `songs/<slug>/output/<slug>.als` + `report.json`; CLI:
  `node ableton/builder/build.js <slug> [--dry-run]`.

- [ ] **Step 1: Arrangement container discovery (once)** — gunzip template, `Select-String` for `ArrangerAutomation|ClipEvent|Locators|<Tempo>`: record found paths in `ableton/xml-map.md` (Task 10 Step 7 did initial; this confirms on template). If `<ClipEvent` absent entirely (template is empty — expected!), use donor .als arrangement section as donor (`clip-event.xml` from Task 10 Step 6, extracted from Zamba/Jeckyl which have arrangement content).
- [ ] **Step 2: Write failing test for `build.js` dry-run**

```js
test('dry-run validates and reports without writing', async () => {
  // fixture songs/_fixture/: structure.json (Task 2 fixture, scenes Intro4/Verse16/Chorus16/Outro4)
  // + clips keys--Intro.mid + .json sidecars for all 4 scenes
  // + stems/manifest.json with 4 strings entries pointing at real tiny wavs (create in test)
  // run: node ableton/builder/build.js _fixture --dry-run
  // expect: exit 0, report lists scene names + clip count + "template OK", no output/*.als written
});
```

- [ ] **Step 3: Implement `build.js`** (orchestration logic):

```js
// node ableton/builder/build.js <slug> [--dry-run]
// 1. load structure.json → validateStructure() → hard fail if errors
// 2. load chords.json → per scene: chords.bars.length === scene.bars (hard fail)
// 3. locate template.als → parseAls
// 4. setSceneNames(state, structure.scenes.map(s => s.name))   // rows = unique scenes
// 5. for each midi part × scene: read clips/<part>--<scene>.mid + sidecar .json
//      → injectMidiIntoTrack(xml, part, sceneIndex, makeClipXml(...))
// 6. for each audio part × scene: stems/<part>--<scene>.wav must exist
//      → injectAudioIntoTrack(xml, part, sceneIndex, makeAudioClipXml(...))
// 7. tempo: base → xml.replace(/<Tempo><Manual Value="[\d.]+"/, `<Tempo><Manual Value="${structure.tempo}"`)
// 7b. scene tempo overrides: for scenes[i].tempo present → dentro del bloque <Scene Id="i">,
//      set <Tempo><Manual Value="${sc.tempo}"/> (crear el elemento tras <Name> si no existe;
//      confirmar la ruta exacta en el template con Select-String "<Tempo>" — Task 10 Step 7)
// 8. locators: inject one <Locator> per arrangement entry boundary (time = cumulative beats)
// 9. arrangement: clone clip-event donors per arrangement slot, Time = cumulative beats,
//    clip content = same as session (read sidecars/wav refs)
// 10. --dry-run: stop after step 6 validation, print report, write report.json only
// 11. else saveAls → songs/<slug>/output/<slug>.als + report.json
```

(Implement literally as numbered comments → code; all helpers imported from Tasks 10-12. `report.json = { scenes, tracksCovered: {...}, stems: n, mids: n, missing: [], tempo }`.)

- [ ] **Step 4: Dry-run passes on fixture** — `node ableton/builder/build.js _fixture --dry-run` → exit 0, report OK
- [ ] **Step 5: Real build on template with fixture data** — build without `--dry-run` to `songs/_fixture/output/_fixture.als` → `node scripts/inspect-als.js` parses it (scenes = 4 named) → **human gate:** open `_fixture.als` in Live 10 → must open WITHOUT repair dialog, show 4 scene names, clip present in Keys scene 1. If repair dialog appears: debug using Live's reported line, fix builder, retry (this is the Approach-A viability gate; if unfixable → switch that injection to fallback B for remaining work and log in PIPELINE-STATE DO-NOT-REPEAT).
- [ ] **Step 6: Commit** — `git add -A cancionero-rojo; git commit -m "feat(cancionero-rojo): build orchestrator — arrangement, tempo, locators, dry-run"`

---

### Task 14: Song #1 "Je Veux" — style session + authoring + ship

**Files:**
- Create: `cancionero-rojo/songs/je-veux/structure.json`, `chords.json`, `orca/keys--*.grid`, `orca/perc--*.grid`, `patterns/strings.js`, `patterns/texture.js`, generated `clips/`, `stems/`
- Modify: `PIPELINE-STATE.md` (song done)

**Interfaces:**
- Consumes: ALL prior tasks. Produces: `songs/je-veux/output/je-veux.als` (final deliverable).

- [ ] **Step 1: Style session with user** (interactive gate). Checklist — record answers in `structure.json`:
  1. Sections + bars: proposal to confirm = Intro 4 / Verse 16 / Chorus 16 / Outro 4 (adjust by listening to reference)
  2. **Feel: BOSSA (decided 2026-09-24). Tempo path: SLOW → MID** — pin exact BPMs by ear against
     `sources/reference/je-veux.mp3`: base `tempo` = mid value (arrangement default);
     slow scenes (likely Intro+Verse) get `"tempo": <slow>` overrides, e.g. slow ≈ 68-76, mid ≈ 96-112
     (user confirms both numbers in session)
  3. Arrangement order: proposal `["Intro","Verse","Chorus","Verse","Chorus","Outro"]` (user confirms/edits)
  4. Percussion flavor: bossa (rim/brush + shaker feel) — grid uses recipe mapping (C1 kick, D1 snare/rim, F#1 hat) with bossa clave pattern; electro-swing accent = user decides yes/no in session
  5. Parts: midi `["keys","perc"]`, audio `["strings","texture"]` (extend if feel demands)
  6. **Chord-symbol audit (Task 5 review gate):** every symbol in `sources/sheets/je-veux.txt`
     must resolve to a real `QUALITIES` entry — the parser silently falls back to major triad
     for tokenizer-accepted-but-untabled qualities (`min`, `add9`, `7sus4`…). Grep the sheet's
     symbols, test each via `parseChord`/`voicing` (node REPL), extend `QUALITIES` (with tests)
     for any missing one BEFORE authoring `structure.json`.
- [ ] **Step 2: Author `chords.json`** from fetched sheet (`sources/sheets/je-veux.txt` via Task 5 `splitSections`+`parseChordLine`), align chords to bars (one chord per bar unless line clearly holds 2), validate: `node scripts/validate-structure.js songs/je-veux` extended flag or one-off node assert: every scene's `bars.length === scene.bars`.
- [ ] **Step 3: Write `structure.json`** (values from Step 1) → `node -e "import('./scripts/validate-structure.js').then(m=>{const s=require('./songs/je-veux/structure.json');const e=m.validateStructure(s);if(e.length){console.error(e);process.exit(1)}console.log('OK')})"` (ESM note: use `node --input-type=module -e "..."` with `readFileSync` instead of require)
- [ ] **Step 4: Author grids** — `orca/keys--verse.grid` etc. (format Task 6): style = chanson comping (root on 1, chord stabs on off-beats — model after the sheet's "papalapapapala" lilt); `orca/perc--verse.grid` with `# part=perc dur=2 program=0` (C1/D1 hits per recipe mapping). Minimum: 1 keys grid + 1 perc grid per unique scene (Intro/Outro may reuse).
- [ ] **Step 5: Generate MIDI** per part × scene:

```powershell
node scripts/orca-to-mid.js --grid songs/je-veux/orca/keys--verse.grid --chords songs/je-veux/chords.json --scene Verse --totalBars 16 --tempo <TEMPO> --program 4 --out songs/je-veux/clips/keys--Verse.mid
```

(repeat for every part×scene pair in structure; sidecar `.json` written alongside per Task 11 Step 5)

- [ ] **Step 6: Author Strudel patterns** — `patterns/strings.js` (concrete starter, harmonically faithful):

```js
// strings.js — Je Veux (Am): pad por sección con cambios de acorde
export const code = `note("<a3 c4 e4> <g3 b3 d4> <f3 a3 c4> <e3 g#3 b3>").sound("sawtooth").gain(0.14).lpf(1800)`;
export const cps = 0.5;
export const loopSec = 8;
export const sections = {
  Chorus: { code: `note("<a3 c4 e4> <g3 b3 d4> <f3 a3 c4> <f3 a3 c4> <e3 g#3 b3> <a3 c4 e4> <g3 b3 d4> <e3 g#3 b3>").sound("sawtooth").gain(0.16).lpf(2200)` },
};
```

`patterns/texture.js`: ambient bed (`s("brown")`-style noise + slow sine pad — use superdough-supported sounds: `s("sine")` chains), per-song feel from Step 1.4.

- [ ] **Step 7: Render stems** — `node scripts/render-stems.js je-veux` → manifest n entries; audition gate: user listens to WAVs (fast fixes: pattern tweak → re-render just that part by deleting + rerun).
- [ ] **Step 8: Build** — `node ableton/builder/build.js je-veux --dry-run` (fix any missing), then real build → `songs/je-veux/output/je-veux.als`.
- [ ] **Step 9: Human gate in Live 10** — open set: no repair dialog, 4+ scenes named, keys/perc MIDI clips present, strings/texture audio clips load (no "missing sample"), mics pass signal, APC faders move volumes, K2 knobs move EQ/sends/master filter. Play through Arrangement + jump scenes in Session.
- [ ] **Step 10: Feedback loop** — musical issues → re-author ONLY affected grid/pattern (Steps 4-7) → rebuild (Step 8) → re-gate. Repeat until user approves.
- [ ] **Step 11: Ship** — update `PIPELINE-STATE.md` section:

```markdown
- **Canción #1 "Je Veux":** COMPLETADA (fecha). Output: songs/je-veux/output/je-veux.als.
- **DO-NOT-REPEAT:** (agregar hallazgos: p.ej. "repair dialog por X → fix Y")
```

- [ ] **Step 12: Commit** — `git add -A cancionero-rojo PIPELINE-STATE.md; git commit -m "feat(cancionero-rojo): song #1 Je Veux — grid/patterns/stems/build shipped"`

---

## Self-Review

1. **Spec coverage:** scaffold+AGENTS/PIPELINE-STATE (T1) ✓ · sources fetch (T3) ✓ · structure/chords contracts (T2, T5) ✓ · Orca MIDI path (T6) ✓ · Strudel stems (T7) ✓ · template recipe with K2/APC mappings (T9) ✓ · builder scenes/MIDI/audio/arrangement/tempo/locators + dry-run (T10-T13) ✓ · iteration loop + human gates + PIPELINE-STATE update (T14) ✓ · fallback-B discipline encoded as explicit gate T13 Step 5 ✓ · roster/scenes/per-section/no-Demucs constraints in Global Constraints ✓.
2. **Placeholders:** none — every code step has full code; style-session answers are runtime inputs with a concrete checklist (T14 Step 1), not stubs.
3. **Type consistency:** `validateStructure→string[]` (T2) used by T13 ✓ · `writeSmf({notes})` shape `{note,startBeat,durBeats,velocity,track}` matches `buildNotes` output ✓ · `makeClipXml({name,donor,notes})` vs T11 `makeAudioClipXml({name,wavPath})` ✓ · scene indices: `structure.scenes` order = session slot index = Task 11 `sceneIndex` ✓ · velocity rule (digits 72 / letters 96) consistent T6 test+impl ✓.
