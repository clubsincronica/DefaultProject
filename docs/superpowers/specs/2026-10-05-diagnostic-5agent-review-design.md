# Diagnostic + 5-Agent Review System – Design

Date: 2026-10-05
Owner: Default Project
Scope: club-sincronica, pipeline-viral, remotion-poc, cancionero-rojo

## Objective
Improve pipeline reliability, ease of use, and end-product quality via automated diagnostics and multi-perspective review.

## Architecture
Central diagnostic runner + 5-agent review layer.

**Diagnostic runner:** `scripts/diagnostic-runner.js`
- Runs auditor-codigo.js per project
- jcode analysis
- Pipeline health checks from PIPELINE-STATE.md DNR
- Structure audit, code quality, ease of use, end-product quality gates
Output: `docs/diagnostics/YYYY-MM-DD-report.md`

**Review layer:** 5 agents as OpenCode skills/commands
- Optimista, Crítico/Juez, Pragmático, Creativo, Empático
Design-review hook on spec changes → `/review-spec`
Per-pipeline hooks: `/review-guion`, `/review-als`, `/review-render`

## Components

### Diagnostic Components
Per project:
- Structure audit: sprawl, legacy, .gitignore, SECRETS-MAP
- Code quality: auditor-codigo, duplication, large files >500 LOC, tests
- Reliability: DNR violations scan, gate failures, repeated fixes
- Ease of use: README completeness, entry points, env setup
- Quality: ffprobe duration, audio levels, asset naming, JSON mojibake

Report sections: Executive summary, per-project scores, top 5 risks, top 5 improvements, DO-NOT-REPEAT updates

### 5-Agent Implementation
Each agent prompt outputs 3 findings + 1 recommendation.

Optimista – potential, benefits, viable solutions
Crítico – failures, risks, contradictions, limitations
Pragmático – viability, resources, time, costs
Creativo – non-conventional alternatives, new ideas
Empático – human impact, wellbeing, social context

Design-review: all 5 agents run on spec → aggregate table with consensus + dissent → `design-review.md`
Per-pipeline: run on artefact → checklist

## Data Flow
Spec/artefact change → trigger → diagnostic or agent review → results to docs/ → update PIPELINE-STATE.md if DNR changes

## Error Handling
- Diagnostic runner fails per project, logs to logs/diagnostic-runner.log
- Agent review time-boxed 60s per agent, timeout → partial report with warning
- Gate: design-review must be approved before implementation plan

## Testing
- Unit tests for diagnostic runner on synthetic projects
- Golden-file tests for agent prompts
- Integration test nightly via n8n workflow

## Phasing
Phase A: Diagnostic + OpenCode design-review agents
Phase B: Per-pipeline artefact agents

## Success Criteria
- Reliability: zero repeated DNR violations in 30 days
- Ease of use: new contributor can run daily pipeline in <15 min without manual fixes
- Quality: 100% ffprobe/validate-astro gates pass for daily shorts and harmonics
