# Orca + Obsidian Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate Orca as a procedural music sequencer layer in pipeline-viral, and adopt Obsidian as the living knowledge base.

**Architecture:** Two independent subsystems -- (1) Orca runs alongside strudel-render.js to generate kin-tone patterns, (2) Obsidian vault in docs/ with wikilinks.

**Tech Stack:** Orca (hundredrabbits/orca), Obsidian (markdown + plugins), Node.js

---

## Global Constraints

- Windows platform (win32)
- Node.js runtime, no paid services
- Existing pipeline: tzolkin -> chakra-freq -> journey-composer -> soundscape -> breath-sync -> visual-meditation -> assemble
- Orca is additive -- must NOT break existing strudel-render.js path

---

## Part A: Orca Integration

### Task 1: Install Orca terminal build

**Files:** None (binary installation)
**Interfaces:** Produces orca CLI on PATH

- [ ] Clone orca-c: git clone https://github.com/hundredrabbits/Orca-c.git
- [ ] Build with make (if Windows fails, go to Task 1-alt)
- [ ] Test: echo A...:d4. > test.orca && ./orca test.orca
- [ ] Commit decision

### Task 1-alt: JS Orca Runtime (fallback)

**Files:** Create pipeline-viral/scripts/orca-runtime.js
**Interfaces:** Consumes .orca pattern files, Produces MIDI events JSON

- [ ] Write minimal Orca interpreter (parseValue, evaluateGrid, renderPattern)
- [ ] Write test (pipeline-viral/test/orca-runtime.test.js)
- [ ] Run: node --test test/orca-runtime.test.js
- [ ] Commit

### Task 2: Orca kin-tone pattern generator

**Files:** Create pipeline-viral/scripts/orca-kin-tones.js
**Interfaces:** Consumes kin-data.js + chakra-freq.js, Produces Orca patterns

- [ ] Write generator (kinToOrcaGrid, generateBlockOrcaPatterns)
- [ ] Write test (test/orca-kin-tones.test.js)
- [ ] Run test
- [ ] Commit

### Task 3: Orca-to-Strudel bridge

**Files:** Create pipeline-viral/scripts/orca-to-strudel.js
**Interfaces:** Consumes Orca events, Produces Strudel pattern objects

- [ ] Write bridge (orcaEventsToStrudel, generateOrcaPattern)
- [ ] Write test (test/orca-to-strudel.test.js)
- [ ] Run test
- [ ] Commit

### Task 4: Integrate into meditar.js (--orca flag)

**Files:** Modify pipeline-viral/scripts/meditar.js
**Interfaces:** Consumes orca-to-strudel.js, adds Orca layer to audio

- [ ] Add --orca flag parsing
- [ ] Import and call Orca generator when flag present
- [ ] Test: node scripts/meditar.js 2026-09-21 --orca
- [ ] Commit

---

## Part B: Obsidian Knowledge Base

### Task 5: Set up vault structure

**Files:** Create docs/.obsidian/, docs/Kin-Data/, docs/Brand/, docs/Pipeline/

- [ ] Create docs/.obsidian/app.json and appearance.json
- [ ] Create docs/Kin-Data/Tzolkin-Overview.md (wikilinked)
- [ ] Create docs/Brand/Marca.md
- [ ] Create docs/Pipeline/Pipeline-Viral.md
- [ ] Create docs/Estructura-Canonica.md (copy + wikilinks)
- [ ] Commit

### Task 6: Add plugin recommendations

**Files:** Modify docs/.obsidian/community-plugins.json

- [ ] Create community-plugins.json (dataview, calendar, excalidraw, templater)
- [ ] Create docs/Plugins-Setup.md
- [ ] Commit

### Task 7: Migrate existing docs

**Files:** Move/restructure docs/ files

- [ ] Move CHANGELOG.md -> Changelog.md (add frontmatter)
- [ ] Move PLAN-frame-improvement-v2.md -> Plans/Frame-Improvement.md
- [ ] Create docs/Club-Sincronica.md (wikilinked)
- [ ] Commit

---

## Summary

After all tasks:
- Orca: 4 scripts + 4 test files, opt-in via --orca flag
- Obsidian: Full vault in docs/ with wikilinks and plugins
- Zero breakage: existing pipeline unchanged

## Verification

- Run: cd pipeline-viral && node --test
- Open docs/ folder in Obsidian app
