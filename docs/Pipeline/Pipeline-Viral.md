---
title: Pipeline Viral - Content Production
date: 2026-09-20
tags:
  - pipeline
  - production
  - content
  - viral
aliases:
  - Content Pipeline
  - Production Pipeline
---

# Pipeline Viral - Content Production Pipeline

## Overview

The Pipeline Viral is the automated content production system for Club Sincrónica, generating daily Kin videos from audio recordings to final rendered output.

## Pipeline Components

### 1. Audio Processing
- **Input:** Raw voice recording (MP3/WAV)
- **Tool:** `storyboard-audio.js`
- **Output:** `frames.json` with timing beats
- **Rules:** Minimum 3.0s per frame, oracle threshold +3s

### 2. Music Generation
- **Tool:** `strudel-render.js`
- **Input:** Frame timing from storyboard
- **Output:** Ambient/harmonic soundtrack
- **Features:** LFO breathing, dynamic mixing

### 3. Visual Composition
- **Tool:** `render.js`
- **Input:** `frames.json` + brand rules
- **Output:** Composed frames with elements
- **Features:** `pickEl` (semantic classification), `elAspecto` (aspect composition)

### 4. Frame Encoding
- **Tool:** `frames.js`
- **Input:** Composed frames
- **Output:** Final frame images
- **Rules:** Maya numerals (GAP 26), oracle radius 240, subtitles 42/36/30px

### 5. Assembly
- **Tool:** `assemble.js`
- **Input:** Voice + bed music + frames
- **Output:** Final video file
- **Format:** MP4, 9:16 aspect ratio

## Harmonics Table

| Component | Input | Output | Key Rules |
|-----------|-------|--------|-----------|
| storyboard-audio.js | Audio file | frames.json | Min 3.0s, oracle +3s |
| strudel-render.js | frames.json | Music track | LFO breathing, ambient |
| render.js | frames.json + brand | Composed frames | pickEl, elAspecto |
| frames.js | Composed frames | Frame images | GAP 26, radius 240 |
| assemble.js | Voice + music + frames | Final video | MP4, 9:16 |

## Quality Gates

### Pre-Production
- [ ] Audio transcription complete
- [ ] Subtitle file generated
- [ ] Brand assets available

### Production
- [ ] Storyboard beats validated (min 3.0s)
- [ ] Music generated and mixed
- [ ] Visual composition follows brand rules

### Post-Production
- [ ] Maya numerals correct (no mojibake)
- [ ] Oracle timing correct (+3s after cartouche)
- [ ] Spelling verified ("Club Sincrónica")
- [ ] Aspect symbols centered (160px, 1.6 scale)

### Final Check
- [ ] Kin carta ≤25% of frame
- [ ] Subtitles at correct sizes
- [ ] Outro uses canonical phrase
- [ ] No fixed blue (DEEP) in card fills

## Output Structure

```
content/output/
├── 2026-08-24/          # Example canonical batch
│   ├── video.mp4
│   ├── subtitles.srt
│   └── report.md
├── 2026-08-25/
│   ├── video.mp4
│   ├── subtitles.srt
│   └── report.md
└── ...
```

## Monitoring & Alerts

### Automated Checks
- **Audio quality:** SNR threshold, silence detection
- **Visual quality:** Aspect detection, element positioning
- **Brand compliance:** Spelling, timing, composition rules

### Manual Review
- **Batch reports:** Generated after each production run
- **Regression detection:** Comparison with canonical examples
- **Quality metrics:** Frame duration, oracle timing, element placement

## Related Notes

- [[Marca]] - Brand guidelines and visual identity
- [[Tzolkin-Overview]] - Core calendar data
- [[Estructura-Canonica]] - Structural rules and quality standards
