---
title: Club Sincrónica
date: 2026-09-20
tags:
  - club
  - sincronica
  - pipeline
  - shorts
  - daily
aliases:
  - Club Sincronica
  - Daily Shorts Pipeline
---

# Club Sincrónica — Daily Shorts Pipeline

## Overview

Club Sincrónica produces daily short-form videos (YouTube Shorts, TikTok, Instagram Reels, Facebook) featuring [[Tzolkin-Overview|Tzolkin]] wisdom for each Kin day. The pipeline generates automated content from audio recordings to final rendered output.

## Pipeline Components

### Core Pipeline
1. **Tzolkin Engine** (`tzolkin.js`) — Calculates daily kin, seal, tone
2. **Astro Context** (`astro.js`) — Generates astrological aspects for the day
3. **Generate Day** (`generate-day.js`) — Produces day metadata
4. **Storyboard** (`storyboard-audio.js`) — Beat detection from transcription
5. **Music Generation** (`strudel-render.js`) — LFO breathing patterns per seal
6. **Frame Composition** (`render.js`) — Visual element selection and rendering
7. **Assembly** (`assemble.js`) — Final video composition with ffmpeg

### Visual Elements
- **Carta Astral** — Astrological chart with real planetary positions
- **Luna Eclipse** — Lunar phase terminator drawing
- **Oráculo del día** — Kin guide, analogue, antipode, hidden seal
- **Aspecto** — Planetary aspects with glyph rendering
- **Onda** — Wavespell energy patterns
- **Águila** — Eagle metaphor frames

## Quality Standards

See [[ESTRUCTURA-CANONICA]] for canonical quality rules.

### Key Rules
- **kinCarta quota:** ≤25% of frames
- **Aspecto guarantee:** At least 1 real aspect per day
- **Frame duration:** Minimum 3.0 seconds
- **Subtitle layout:** `ty=-40`, `blockCenter=1500`, max 4 lines
- **Encoding:** UTF-8, no mojibake (PowerShell corrupts unicode)

## DO-NOT-REPEAT

Critical rules that must never be violated:
1. **No "King Maya"** — Always "Kin Maya" (Whisper bug)
2. **Use both** `storyboard-audio.js` + `render.js` (never one alone)
3. **rm+mkdir+cp always** in render-daily (never `if (!existsSync)`)
4. **Mux AAC silent track** — Must use `-map 0:v:0 -map 1:a:0`
5. **Pan law compensation** — `volume=1.41254` for mono→stereo

## Related Documents

- [[Tzolkin-Overview]] — Calendar system reference
- [[Marca]] — Brand guidelines and voice
- [[Pipeline-Viral]] — Extended meditation pipeline
- [[ESTRUCTURA-CANONICA]] — Quality standards bible
- [[Changelog]] — Historical fixes and decisions
- [[Plans/Frame-Improvement]] — Improvement roadmap

## Output Platforms

| Platform | Format | Schedule |
|----------|--------|----------|
| YouTube Shorts | 60s vertical | Daily |
| TikTok | 60s vertical | Daily |
| Instagram Reels | 60s vertical | Daily |
| Facebook | 60s vertical | Daily |
| LinkedIn | 60s vertical | Daily |

Buffer manages cross-posting to all platforms.
