# Remotion DailyShort — Subtle Visual Improvement Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the sharp→assemble pipeline with Remotion for daily shorts, keeping the same visual foundation (sharp-rendered PNGs) but adding smooth crossfades, responsive Ken Burns, and text entrance animations.

**Architecture:** DailyShort composition reads frames.json + contexto.json as props. Each frame is a `<Sequence>` with its pre-rendered PNG as background, Ken Burns animation per `motion` field, and subtitle text with fade-in. Crossfade transitions between sequences.

**Tech Stack:** Remotion 4.x, React 19, TypeScript, Node.js

---

## File Structure

| File | Role |
|------|------|
| `remotion-poc/src/DailyShort.tsx` | Main composition: sequences frames with crossfades |
| `remotion-poc/src/components/FrameScene.tsx` | Single frame: PNG bg + Ken Burns + subtitle overlay |
| `remotion-poc/src/components/SubtitleOverlay.tsx` | Animated subtitle text (fade-in per line) |
| `remotion-poc/src/Root.tsx` | Register DailyShort composition |
| `remotion-poc/scripts/render-daily.mjs` | CLI: reads frames.json, calls remotion render |

---

## Task 1: Create FrameScene component

**Files:**
- Create: `remotion-poc/src/components/FrameScene.tsx`

**What it does:** Renders a single frame's pre-rendered PNG with Ken Burns animation. Takes `src` (PNG path), `motion` type, `durationInFrames`, and optional `subtitle` lines.

- [ ] Create FrameScene.tsx with Ken Burns variants (hook: zoom 1.05→0.94 + pan, zoom-in: 1→1.08, zoom-out: 1.08→1, pan-up: translateY, pan-down: translateY)
- [ ] Add subtitle overlay with fade-in animation (opacity 0→1 over first 15 frames)

---

## Task 2: Create DailyShort composition

**Files:**
- Create: `remotion-poc/src/DailyShort.tsx`
- Modify: `remotion-poc/src/Root.tsx`

**What it does:** Takes `{ frames, ctx }` props. Maps each frame to a `<Sequence>` with `<FrameScene>`. Adds crossfade transitions (10-frame overlap between sequences).

- [ ] Create DailyShort.tsx: calculate startFrame per sequence from durSeg, render FrameScene for each
- [ ] Register composition in Root.tsx with placeholder defaultProps

---

## Task 3: Create render-daily.mjs script

**Files:**
- Create: `remotion-poc/scripts/render-daily.mjs`

**What it does:** Reads `contexto.json` + `frames.json` for a given date, passes as `--props` to `remotion render DailyShort`.

- [ ] Create script: parse date arg, read JSON files, construct props, call remotion CLI
- [ ] Test with Sep 10 data

---

## Task 4: Test end-to-end

- [ ] Render Sep 10 with Remotion, compare to sharp output
- [ ] Verify crossfades, Ken Burns, subtitle animations work
