---
title: Frame Composition Improvement + Remotion Migration (Hybrid)
date: 2026-09-08
status: READY FOR IMPLEMENTATION (start new session)
tags:
  - plan
  - improvement
  - remotion
  - frame-composition
  - hybrid
aliases:
  - Frame Improvement Plan
  - Remotion Migration Plan
---

# Plan: Frame Composition Improvement + Remotion Migration (Hybrid)

**Date:** 2026-09-08
**Status:** READY FOR IMPLEMENTATION (start new session)
**Context:** New wavespell starting (Kin 15-21 batch done). 7 videos produced (Sep 10-16), ready to publish as fallback while improvements roll out.

---

## Problem Statement

Frame composition degenerates to 3-4 frames rotating endlessly. kinCarta (the catch-all default) dominates at 44-68% of frames, violating the ≤25% rule. The system has no semantic understanding — purely keyword-based `pickEl` with broken fallback.

### Root Causes

1. **Broken kinCarta quota** — `render.js` line 714: `else e = 'kinCarta'` bypasses KIN_MAX
2. **Two divergent pickElement implementations** — `storyboard-audio.js` (20 regexes) gets overwritten by `render.js` (5 regexes + null fallback)
3. **No metaphor detection** — "desde las alturas" = eagle, "reflejo" = mirror, but no regex
4. **No visual variety enforcement** — no used-elements tracking, no consecutive-identical blocking beyond kinCarta/cartaAstral
5. **contexto.json metadata unused** — aspectos[], oracleSeals[], wavespellSealId exist but pickEl never reads them
6. **Keyword conflicts** — "águila lunar" triggers lunaEclipse before aguila (luna match first)

### Evidence (3 sample days)

| Day | kinCarta % | Worst mismatch |
|-----|-----------|---------------|
| Sep 10 (Kin 15) | 44% | "Marte y la luna en trígono" → kinCarta (should be aspecto) |
| Sep 13 (Kin 18) | 68% | Almost all body frames = kinCarta |
| Sep 16 (Kin 21) | 47% | "desde las alturas el problema es un punto" → kinCarta (should be aguila) |

---

## Phase 1: Fix Sharp Pipeline (Quick Wins) — DO FIRST

### Task 1.1: Fix kinCarta quota bug
**File:** `scripts/render.js`
**Line:** 714
**Change:** When all quotas are full, cycle through available elements instead of defaulting to kinCarta.

```js
// BEFORE (line 714):
else e = 'kinCarta';

// AFTER:
else {
  // Cycle through non-kinCarta elements to enforce variety
  const cycle = ['cartaAstral', 'lunaEclipse', 'onda', 'aguila'];
  e = cycle.find(x => x !== prevEl) || 'kinCarta';
}
```

### Task 1.2: Merge pickElement into render.js
**File:** `scripts/render.js`
**Lines:** 546-567 (pickEl function)
**Change:** Replace the sparse `pickEl` with the richer regex cascade from `storyboard-audio.js` (lines 55-78), PLUS new metaphor patterns.

Unified `pickEl` should:
- Use NFD-normalized text (already done)
- Include all patterns from storyboard-audio.js ELEMENTS array
- Add metaphor patterns:

```js
// Eagle metaphors (trigger aguila)
/alturas?|volar?|vuela|plumas?|pico|cielo entero|el mapa|desde arriba|panorama|perspectiva|visión|punto de vista/i

// Mirror metaphors (trigger espejo)
/reflejo|reflejar|reflejas|mir[áa]r|te miras|espejo|devuelve|superficie|doble|eco|的形象/i

// Dragon metaphors (gated by isDragonDay)
/nace|nacer|\br[íi]o\b|caudal|\bgota\b|parir|resuena|semilla|tierra|ra[ií]z/i

// Wavespell metaphors (trigger onda when wavespell context)
/onda|encantada|sello magn[ée]tico|columna|giro|ciclo|rueda del tiempo/i
```

- Cross-reference beat text against `ctx.astro.aspectos[]`:
  - When beat mentions 2+ planets, check if those planets form an actual aspect in the day's data
  - If yes → return 'aspecto' even if only 1 aspect already used (up to 2-3 per day for real aspects)

### Task 1.3: Fix keyword conflicts
**File:** `scripts/render.js`
**Change:** In the unified pickEl, check "aguila" BEFORE "luna" to prevent "águila lunar" from matching lunaEclipse first.

Order priority: aguila → tormenta → viento → espejo → dragon → onda → oraculo → lunaEclipse → aspecto

### Task 1.4: Add visual variety tracker
**File:** `scripts/render.js`
**Change:** Add a `usedElements` Set that tracks what's been assigned. When pickEl returns an element already used 3+ times, prefer an underused element from the pool.

```js
const usedCounts = {};
// In the frame loop:
let e = pickEl(b, asp);
usedCounts[e] = (usedCounts[e] || 0) + 1;
// If any element exceeds 3 uses, prefer alternatives
if (usedCounts[e] > 3) {
  const pool = ['lunaEclipse', 'cartaAstral', 'onda', 'aguila', 'oraculo', 'aspecto'];
  const alt = pool.find(x => (usedCounts[x] || 0) < 2 && x !== prevEl);
  if (alt) { e = alt; usedCounts[e] = (usedCounts[e] || 0) + 1; }
}
```

### Task 1.5: Increase aspecto limit
**File:** `scripts/render.js`
**Change:** Allow up to 2-3 aspecto frames per day when the beat text mentions planets that actually form aspects in `ctx.astro.aspectos[]`. Keep the 1-aspect limit only for the fallback case (when pickEl guesses aspecto from generic planet mention).

### Task 1.6: Split long frames
**File:** `scripts/render.js`
**Change:** When a single transcription segment exceeds 8 seconds, consider splitting it into 2 frames at clause boundaries (period, comma before "y"/"pero"/"sino"/"que"). Add split logic in `buildFrames()`.

### Task 1.7: Normalize pickElement in storyboard-audio.js
**File:** `scripts/storyboard-audio.js`
**Change:** Align its ELEMENTS array with the unified render.js pickEl, so both produce consistent output. Keep the rich regexes, add metaphor patterns.

---

## Phase 2: Remotion Migration (Incremental) — NEXT WAVESPELL

### Task 2.1: Port astro chart to React component
**Source:** `club-sincronica/scripts/frames.js` lines ~1000-4000 (carte(), planet rendering, aspect lines)
**Target:** `remotion-poc/src/components/AstroChart.tsx`
**Components needed:**
- ZodiacWheel (12 signs, real positions)
- PlanetGlyphs (real ecliptic longitudes from contexto.json)
- AspectLines (dashed lines between aspected planets)
- LunarPhase (terminator drawing from elLunaEclipse)
- OracleDisplay (kin + guide + analogue + antipode + hidden with glyphs)

### Task 2.2: Build DailyShort composition
**File:** `remotion-poc/src/DailyShort.tsx`
**Structure:**
```
<Composition id="DailyShort">
  <Sequence from={0} durationInFrames={cartoucheFrames}>
    <CartoucheScene day={props.dayData} />
  </Sequence>
  {beats.map((beat, i) => (
    <Sequence key={i} from={beat.startFrame} durationInFrames={beat.durationFrames}>
      <BeatScene beat={beat} day={props.dayData} />
    </Sequence>
  ))}
  <Sequence from={outroStart} durationInFrames={outroFrames}>
    <OutroScene day={props.dayData} />
  </Sequence>
</Composition>
```

### Task 2.3: Build BeatScene component
**File:** `remotion-poc/src/components/BeatScene.tsx`
- Switches visual element based on beat.elemento (cartouche/lunaEclipse/aspecto/aguila/etc.)
- Ken Burns zoom on chart layer, static text overlay
- Animated transitions between scenes (crossfade from GlyphTunnelScene patterns)

### Task 2.4: Build SubtitleOverlay component
**File:** `remotion-poc/src/components/SubtitleOverlay.tsx`
- Reads timed transcription data (transcripcion-timed.md parsed to JSON)
- Positions text at blockCenter ~1450 (below chart zone)
- Wraps at 44 chars, sizes 42/36/30px per AGENTS.md rules

### Task 2.5: Wire daily pipeline to Remotion
**File:** New script `club-sincronica/scripts/render-remotion.js`
- Reads contexto.json + frames.json for a given date
- Passes data as Remotion `--props` CLI argument
- Calls `remotion render DailyShort out.mp4 --props='...'`
- Output: `content/output/YYYY-MM-DD/video-preview.mp4`

### Task 2.6: Hybrid fallback
- Keep sharp pipeline as fallback
- `render-remotion.js` tries Remotion first; if it fails, falls back to `render.js` + `assemble.js`
- Log which renderer was used for each day

---

## Implementation Order

1. **New session:** Task 1.1 + 1.2 + 1.3 (fix quota + unified pickEl + keyword conflicts) — immediate quality boost
2. **Same session:** Task 1.4 + 1.5 (variety tracker + aspecto limit) — enforce variety
3. **Same session:** Task 1.6 + 1.7 (split long frames + normalize storyboard-audio) — polish
4. **Test:** Re-run Sep 10 (Kin 15) through the improved pipeline, compare frames.json element distribution
5. **Next session:** Phase 2 tasks (Remotion migration)

---

## Key Files Reference

| File | Role | Lines |
|------|------|-------|
| `club-sincronica/scripts/render.js` | Frame composition + rendering | ~900 |
| `club-sincronica/scripts/storyboard-audio.js` | Beat detection from transcription | ~200 |
| `club-sincronica/scripts/frames.js` | Legacy frame renderer (source for Remotion port) | 5380 |
| `remotion-poc/src/Root.tsx` | Remotion composition registry | 110 |
| `remotion-poc/src/KinTeaser.tsx` | Daily teaser (partial coverage) | 38 |
| `remotion-poc/src/components/GlowBackground.tsx` | Animated gradient bg | 43 |
| `remotion-poc/src/components/MayaGlyph.tsx` | Seal glyph rendering | 28 |
| `remotion-poc/src/meditation/GlyphTunnelScene.tsx` | Complex animation patterns to reuse | 306 |

---

## DO-NOT-REPEAT (carry forward)

- **King Maya bug:** Whisper transcribes "Kin" as "King". Always fix transcriptions before processing.
- **MP3 recordings:** Pipeline expects WAV. Convert with ffmpeg `-ar 24000 -ac 1` before running pipeline.
- **Strudel bed patterns:** Reuse by seal (e.g., aguila-255.js for any Aguila kin). Don't compose new patterns unless the seal has no existing pattern.
- **Render.js overwrites storyboard-audio.js output:** Both have pickEl/pickElement. render.js is the final authority. Any element detection improvements MUST go in render.js (or unify them).
