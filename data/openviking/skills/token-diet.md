# OpenViking Skill: token-diet

## Purpose
Token-efficient context delivery for AI agent operations, reducing input tokens by up to 63% through structured directory-recursive retrieval.

## Retrieval Path
`viking://user/{user_id}/skills/token-diet`

## Description
Organizes project context into three tiers for efficient LLM consumption across the Club Sincronica 3-pipeline architecture.

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

## Retrieval Strategy

OpenViking's directory-recursive strategy (63% token reduction vs flat vector):

1. **Intent Analysis**: Generate multiple retrieval conditions through intent analysis
2. **Initial Positioning**: Use vector retrieval to quickly locate high-scoring directories
3. **Fine Exploration**: Perform secondary retrieval within directories, updating candidate sets with high-scoring results
4. **Recursive Descent**: If subdirectories exist, recursively repeat steps 2-3
5. **Result Aggregation**: Return the most relevant context with complete traces preserved

## Cross-Pipeline Application

### club-sincronica
- Daily short video generation context
- Frame duration, color, numeral rules (14 DO-NOT-REPEAT entries)
- Astro validation, transcript timestamps

### pipeline-viral
- Long-form meditation videos (Kin Harmonic H1-H10)
- Voice real, whisper trim, mux audio rules (9 DO-NOT-REPEAT entries)
- Publish pack, thumbnail generation

### remotion-poc
- Render lab with Remotion compositions
- Crossfade logic, duration dynamic from frames.json
- Mux audio with `-map 0:v:0 -map 1:a:0`

## Usage Example

```javascript
// Quick state check (L0 + L1 only, no detail loading)
const quickState = await retrieve({
  uri: 'viking://user/tom_w/data/openviking/memories/pipeline-state-summary.md',
  tiers: ['L0', 'L1'],
  strategy: 'directory-recursive'
});

// Full analysis with details (includes L2)
const fullAnalysis = await retrieve({
  uri: 'viking://user/tom_w/data/openviking/memories/pipeline-state-summary.md',
  tiers: ['L0', 'L1', 'L2'],
  strategy: 'directory-recursive'
});
```