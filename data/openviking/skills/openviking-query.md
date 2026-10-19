# OpenViking Skill: openviking-query

## Purpose
Directory-recursive context retrieval for the OpenViking virtual file system. Enables hierarchical context delivery with traceability.

## Retrieval Path
`viking://{scope}/{path}`

## Description
The core retrieval mechanism that combines semantic matching with directory traversal. Unlike traditional vector stores that return flat chunks, OpenViking understands context structure.

### Retrieval Process (5-Step Strategy)

#### Step 1: Intent Analysis
```
Generate multiple retrieval conditions through intent analysis
Expands user request into typed queries with rerank
```

#### Step 2: Initial Positioning
```
Use vector retrieval to quickly locate high-scoring directories
Score propagation and convergence detection keep search accurate
```

#### Step 3: Fine Exploration
```
Perform secondary retrieval within directories
Updating candidate sets with high-scoring results
```

#### Step 4: Recursive Descent
```
If subdirectories exist, recursively repeat steps 2-3
Complete traces of directory browsing and file positioning preserved
```

#### Step 5: Result Aggregation
```
Return the most relevant context
Enables clear observation of problem sources
Guides retrieval logic optimization
```

## URI Structure

### Resource URIs
- `viking://resources/project-overview.md` - Project overview (L0: 256 chars)
- `viking://resources/pipeline-state-summary.md` - Pipeline state (L1: 4000 chars)
- `viking://resources/brand/marca.md` - Brand bible (full detail)

### Memory URIs
- `viking://user/tom_w/memories/pipeline-state-summary.md` - User memory state
- `viking://user/tom_w/memories/audit-reports/` - Audit history

### Skill URIs
- `viking://skills/token-diet` - Token-efficient retrieval skill
- `viking://skills/pipeline-coordinator` - Cross-pipeline state management

## Tier System

| Tier | Default Body Limit | Purpose |
|------|-------------------|---------|
| L0 | 256 characters | Vector search, quick filtering |
| L1 | 4000 characters | Rerank, content navigation |
| L2 | No uniform limit | Full content, on-demand loading |

## Usage

```javascript
// Basic retrieval with tier control
const result = await retrieve({
  uri: 'viking://resources/project-overview.md',
  tiers: ['L0'], // Fast query, minimal tokens
  strategy: 'directory-recursive'
});

// Full detail retrieval
const detailed = await retrieve({
  uri: 'viking://resources/brand/marca.md',
  tiers: ['L0', 'L1', 'L2'],
  strategy: 'directory-recursive'
});
```

## Traces

Every retrieval operation preserves:
- Directory browsing history
- File positioning at each level
- Score propagation path
- Candidate set evolution

This traceability enables:
- Optimization of repeated queries
- Identification of retrieval logic improvements
- Clear observation of problem sources