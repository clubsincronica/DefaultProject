# OpenViking Resources for Club Sincronica

## Project Structure

This OpenViking context database organizes the Club Sincronica project across 3 pipelines:

### Resources
- `docs/` - Official documentation and specs
- `scripts/` - Production scripts for all pipelines
- `content/` - Generated content (contexto.json, guion.md, etc.)
- `club-sincronica/` - Daily shorts pipeline
- `pipeline-viral/` - Long-form meditation videos
- `remotion-poc/` - Render lab

### Memories (Session State)
- `PIPELINE-STATE.md` - Live state of all 3 pipelines
- `audit-code-*.md` - Code audit reports
- `Changelog.md` - Historical fixes

### Skills (Reusable Workflows)
- `openviking-query` - Directory-recursive context retrieval
- `token-diet` - Token-efficient context delivery (63% reduction)
- `pipeline-coordinator` - Cross-pipeline state management

## Key Directories

### Resources Tier L0 (Abstract - 256 chars)
Quick filtering and vector search summaries.

### Resources Tier L1 (Overview - 4000 chars)
Rerank, content navigation with full context.

### Resources Tier L2 (Detail - No limit)
Full content, on-demand loading for deep analysis.

## Retrieval Strategy

OpenViking uses directory-recursive retrieval:
1. **Intent Analysis**: Generate multiple retrieval conditions
2. **Initial Positioning**: Vector search to locate high-scoring directories
3. **Fine Exploration**: Secondary retrieval within directories
4. **Recursive Descent**: If subdirectories exist, repeat
5. **Result Aggregation**: Return most relevant context with full traces