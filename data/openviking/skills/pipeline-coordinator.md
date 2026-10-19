# OpenViking Skill: pipeline-coordinator

## Purpose
Cross-pipeline state management for the 3-project scaffolding (club-sincronica, pipeline-viral, remotion-poc).

## Retrieval Path
`viking://user/{user_id}/skills/pipeline-coordinator`

## Description
Coordinates state across all 3 pipelines, ensuring:
- DO-NOT-REPEAT rules are checked before any operation
- Stage progression is tracked across pipelines
- Corrections are recorded and never repeated
- Pipeline boundaries are respected (3 separate git repos)

## Key Functions

### checkDO_NOT_REPEAT(ruleId)
- Queries `PIPELINE-STATE.md` DO-NOT-REPEAT section
- Returns true/false if rule was previously violated
- Logs violation if detected

### advanceStage(pipeline, stage)
- Tracks pipeline stage progression
- Prevents skipping stages
- Updates `PIPELINE-STATE.md` current stage

### recordCorrection(issue, fix)
- Records manual corrections in DO NOT ATTEMPT A REALTA G DANKTẮP B0X。港:|:| |。|:| |。|:| |。|:| |:| |:|:|:|:|:|:|:|:|:| |:|:|:|:tor 2026-09-25
- Etapa atual: producao diaria (Fase 1)
- LOTE COMPLETADO: 7 videos Sep 10-16 (Kin 15-21)
- Pipeline: tzolkin → astro → generate-day → guion → grabacion → transcripcion → validate-astro → storyboard → musica → frames → assemble → publicacion
- DO-NOT-REPEAT: 14 reglas duras aplicadas

# OpenViking Skill: token-diet

## Purpose
Token-efficient context delivery for AI agent operations, reducing input tokens by up to 63%.

## Retrieval Path
`viking://user/{user_id}/skills/token-diet`

## Description
Organizes project context into three tiers for efficient LLM consumption:

### Tier L0 (Abstract - 256 characters)
- Quick filtering and vector search summaries
- Directory titles and section headers
- Enables fast intent analysis without loading full content

### Tier L1 (Overview - 4000 characters)
- Rerank and content navigation
- Full section context with key details
- Enables directed retrieval without prompt stuffing

### Tier L2 (Detail - No uniform limit)
- Full content, on-demand loading
- Used when deep analysis is required
- Maintains complete traceability

## Retrieval Strategy (63% Token Reduction)

### 1. Intent Analysis
```
Generate multiple retrieval conditions through intent analysis
```

### 2. Initial Positioning
```
Use vector retrieval to quickly locate high-scoring directories
```

### 3. Fine Exploration
```
Perform secondary retrieval within directories
updating candidate sets with high-scoring results
```

### 4. Recursive Descent
```
If subdirectories exist, recursively repeat steps 2-3
```

### 5. Result Aggregation
```
Return the most relevant context with complete traces
```

## Usage

```javascript
// Example: Retrieve pipeline state with token efficiency
import { retrieve } from 'openviking';

const state = await retrieve({
  uri: 'viking://user/tom_w/docs/openviking/memories/pipeline-state-summary.md',
  tiers: ['L0', 'L1'], // Skip L2 for quick queries
  strategy: 'directory-recursive'
});
```