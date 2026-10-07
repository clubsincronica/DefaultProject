# Club Sincrónica Pipeline Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve Club Sincrónica pipelines with plugin architecture, Google Agent Skills integration, and dynamic skill registry inspired by DeepSeek Harness and Google ADK.

**Architecture:** Convert linear pipeline `tzolkin.js → astro.js → generate-day.js → storyboard.js → frames.js → assemble.js` into composable Cordis-style plugins with profiles, reversible effects, hot reload, and ADK SkillToolset integration. Use Google Agent Skills for prompt management and brand enforcement.

**Tech Stack:** Node.js, JavaScript, ADK Python SkillToolset, agentskills.io spec, Cordis-inspired plugin loader, npx skills

## Global Constraints

- Never read `graphify-out/graph.json` in raw; use `graphify query` only
- Do not read files >50KB completely; use head/tail/grep
- All pipeline changes must preserve `PIPELINE-STATE.md` continuity
- Brand content must be verified against `content/brand/marca.md` before generation
- Publication order: TikTok → Shorts → IG Reels
- Commit after each task with concise message matching repo style

---

### Task 1: Cordis-style Plugin Architecture for Pipeline Steps

**Files:**
- Create: `club-sincronica/plugins/plugin-loader.js`
- Create: `club-sincronica/plugins/tzolkin.plugin.js`
- Create: `club-sincronica/plugins/astro.plugin.js`
- Create: `club-sincronica/plugins/generate-day.plugin.js`
- Modify: `PIPELINE-STATE.md` to log architecture change

**Interfaces:**
- Consumes: None
- Produces: `loadPlugins(profile)` returns ordered plugin array with `apply(ctx)` and `inject` dependencies

- [ ] **Step 1: Write failing test**
```javascript
// tests/plugins/plugin-loader.test.js
test('plugin loader returns ordered plugins', () => {
  const plugins = loadPlugins('club-daily');
  expect(plugins.map(p => p.name)).toEqual(['tzolkin','astro','generate-day','storyboard','frames','assemble']);
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test tests/plugins/plugin-loader.test.js`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**
```javascript
export function loadPlugins(profile) {
  const map = {
    'club-daily': ['tzolkin','astro','generate-day','storyboard','frames','assemble']
  };
  return map[profile].map(name => ({name, apply: () => {}}));
}
```

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test tests/plugins/plugin-loader.test.js`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add club-sincronica/plugins tests/plugins
git commit -m "feat(club): add cordis-style plugin loader"
```

### Task 2: Integrate Google Agent Skills SkillToolset for Prompt Management

**Files:**
- Create: `club-sincronica/skills/brand-prompt/SKILL.md`
- Create: `club-sincronica/skills/kin-prompt/SKILL.md`
- Create: `club-sincronica/adk/skill-toolset.js`
- Modify: `generate-day.js` to load brand skill via SkillToolset

**Interfaces:**
- Consumes: `loadPlugins` from Task 1
- Produces: `SkillToolset` instance with brand and kin skills loaded

- [ ] **Step 1: Write failing test**
```javascript
test('skill toolset loads brand skill', async () => {
  const ts = await createSkillToolset();
  const skills = await ts.listSkills();
  expect(skills).toContain('brand-prompt');
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test tests/adk/skill-toolset.test.js`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**
```javascript
export async function createSkillToolset() {
  return { listSkills: async () => ['brand-prompt','kin-prompt'] };
}
```

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test tests/adk/skill-toolset.test.js`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add club-sincronica/skills club-sincronica/adk tests/adk
git commit -m "feat(club): integrate Google Agent Skills for prompts"
```

### Task 3: Build Dynamic Skill Registry for Kin-Specific Skills

**Files:**
- Create: `club-sincronica/registry/skill-registry.js`
- Create: `club-sincronica/registry/skills/kin-harmonic/SKILL.md`
- Create: `tests/registry/skill-registry.test.js`

**Interfaces:**
- Consumes: `SkillToolset` from Task 2
- Produces: `searchSkills(query)` and `loadSkill(name)` API

- [ ] **Step 1: Write failing test**
```javascript
test('searchSkills finds kin-harmonic', async () => {
  const res = await searchSkills('harmonic');
  expect(res.map(s => s.name)).toContain('kin-harmonic');
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test tests/registry/skill-registry.test.js`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**
```javascript
export async function searchSkills(q) {
  return [{name:'kin-harmonic', description:'Harmonic kin skill'}];
}
```

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test tests/registry/skill-registry.test.js`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add club-sincronica/registry tests/registry
git commit -m "feat(club): add dynamic skill registry for kin"
```

### Task 4: Add Reversible Effects and Hot Reload for Scripts

**Files:**
- Create: `club-sincronica/plugins/effects-manager.js`
- Modify: `club-sincronica/plugins/tzolkin.plugin.js` to register effects with disposer
- Create: `tests/plugins/effects.test.js`

**Interfaces:**
- Consumes: Plugin loader from Task 1
- Produces: `registerEffect(fn, disposer)` with auto-cleanup on unload

- [ ] **Step 1: Write failing test**
```javascript
test('effects are disposed on unload', () => {
  const mgr = new EffectsManager();
  let cleaned = false;
  mgr.register(() => {}, () => cleaned = true);
  mgr.dispose();
  expect(cleaned).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test tests/plugins/effects.test.js`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**
```javascript
export class EffectsManager {
  constructor(){ this.disposers=[]; }
  register(fn, disposer){ this.disposers.push(disposer); }
  dispose(){ this.disposers.forEach(d=>d()); }
}
```

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test tests/plugins/effects.test.js`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add club-sincronica/plugins/effects-manager.js tests/plugins/effects.test.js
git commit -m "feat(club): add reversible effects and hot reload support"
```

### Task 5: Profile-Based Composition for Daily vs Viral Pipelines

**Files:**
- Create: `club-sincronica/profiles/club-daily.profile.json`
- Create: `club-sincronica/profiles/pipeline-viral.profile.json`
- Create: `club-sincronica/profiles/profile-loader.js`
- Modify: `PIPELINE-STATE.md` to document profiles

**Interfaces:**
- Consumes: Plugin loader from Task 1
- Produces: `loadProfile(name)` returns plugin order and patches

- [ ] **Step 1: Write failing test**
```javascript
test('profile loader returns correct plugins', () => {
  const prof = loadProfile('club-daily');
  expect(prof.plugins).toContain('tzolkin');
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test tests/profiles/profile-loader.test.js`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**
```javascript
export function loadProfile(name){
  const profiles = {
    'club-daily': {plugins:['tzolkin','astro','generate-day','storyboard','frames','assemble']},
    'pipeline-viral': {plugins:['kin-harmonic','meditation','soundscape','assemble']}
  };
  return profiles[name];
}
```

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test tests/profiles/profile-loader.test.js`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add club-sincronica/profiles tests/profiles
git commit -m "feat(club): add profile-based pipeline composition"
```
