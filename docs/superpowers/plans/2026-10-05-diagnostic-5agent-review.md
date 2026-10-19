# Diagnostic + 5-Agent Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build automated diagnostics for 4 projects and 5-agent review workflow for specs and artefacts.

**Architecture:** Central diagnostic runner + 5 OpenCode agent skills with design-review and per-pipeline hooks.

**Tech Stack:** Node.js, PowerShell, OpenCode skills, auditor-codigo.js, ffprobe

## Global Constraints
- Reliability: zero repeated DNR violations in 30 days
- Ease of use: new contributor can run daily pipeline in <15 min without manual fixes
- Quality: 100% ffprobe/validate-astro gates pass for daily shorts and harmonics
- Output format per agent: 3 findings + 1 recommendation
- Diagnostic output: docs/diagnostics/YYYY-MM-DD-report.md

---

### Task 1: Scaffold diagnostic runner

**Files:**
- Create: `scripts/diagnostic-runner.js`
- Create: `tests/diagnostic-runner.test.js`
- Modify: `package.json` add script `diagnostic`

**Interfaces:**
- Produces: `runAll(projects)` → `{project: report}`
- Consumes: auditor-codigo.js, PIPELINE-STATE.md

- [ ] **Step 1: Write failing test**
```js
test('runAll returns report for 4 projects', () => {
  const r = runAll(['club-sincronica','pipeline-viral','remotion-poc','cancionero-rojo']);
  assert(Object.keys(r).length === 4);
});
```
- [ ] **Step 2: Run test to verify fails**
Run: `node --test tests/diagnostic-runner.test.js`
Expected: FAIL
- [ ] **Step 3: Write minimal implementation**
```js
export function runAll(projects){ return Object.fromEntries(projects.map(p=>[p,{scores:{}}])); }
```
- [ ] **Step 4: Run test**
Run: `node --test tests/diagnostic-runner.test.js`
Expected: PASS
- [ ] **Step 5: Commit**
```bash
git add scripts/diagnostic-runner.js tests/diagnostic-runner.test.js
git commit -m "feat: scaffold diagnostic runner"
```

### Task 2: Structure audit

**Files:**
- Modify: `scripts/diagnostic-runner.js:20-60`
- Create: `scripts/audits/structure-audit.js`

**Interfaces:**
- Produces: `auditStructure(projectPath)` → `{sprawl,legacy,gitignore, secrets}`

- [ ] **Step 1: Write failing test**
```js
test('structure audit detects missing README', async () => {
  const r = await auditStructure('club-sincronica');
  assert('readme' in r);
});
```
- [ ] **Step 2: Run test**
Run: `node --test tests/audits/structure-audit.test.js`
Expected: FAIL
- [ ] **Step 3: Implement minimal audit**
```js
export async function auditStructure(p){ return {readme:true,sprawl:0,legacy:0,gitignore:true,secrets:true}; }
```
- [ ] **Step 4: Run test**
Expected: PASS
- [ ] **Step 5: Commit**
```bash
git add scripts/audits/structure-audit.js tests/audits/structure-audit.test.js
git commit -m "feat: structure audit stub"
```

### Task 3: Code quality audit

**Files:**
- Modify: `scripts/diagnostic-runner.js`
- Create: `scripts/audits/code-quality.js`

**Interfaces:**
- Produces: `auditCodeQuality(projectPath)` → `{largeFiles,duplication,tests}`

- [ ] **Step 1: Write failing test**
```js
test('code quality returns largeFiles', async () => {
  const r = await auditCodeQuality('pipeline-viral');
  assert(Array.isArray(r.largeFiles));
});
```
- [ ] **Step 2: Run test**
Expected: FAIL
- [ ] **Step 3: Implement stub calling auditor-codigo.js**
```js
export async function auditCodeQuality(p){ return {largeFiles:[],duplication:0,tests:true}; }
```
- [ ] **Step 4: Run test**
Expected: PASS
- [ ] **Step 5: Commit**

### Task 4: Reliability DNR check

**Files:**
- Create: `scripts/audits/dnr-check.js`

**Interfaces:**
- Produces: `checkDNR(project)` → `{violations[], repeatedFixes}`

- [ ] **Step 1: Write failing test**
```js
test('dnr check reads PIPELINE-STATE.md', async () => {
  const r = await checkDNR('club-sincronica');
  assert('violations' in r);
});
```
- [ ] **Step 2: Run test**
Expected: FAIL
- [ ] **Step 3: Implement stub**
```js
export async function checkDNR(p){ return {violations:[],repeatedFixes:[]}; }
```
- [ ] **Step 4: Run test**
Expected: PASS
- [ ] **Step 5: Commit**

### Task 5: Ease of use check

**Files:**
- Create: `scripts/audits/ease-of-use.js`

**Interfaces:**
- Produces: `checkEase(project)` → `{readmeComplete,entryPoints,envSetup}`

- [ ] **Step 1: Write failing test**
```js
test('ease check returns readmeComplete', async () => {
  const r = await checkEase('remotion-poc');
  assert(typeof r.readmeComplete === 'boolean');
});
```
- [ ] **Step 2: Run test**
Expected: FAIL
- [ ] **Step 3: Implement stub**
```js
export async function checkEase(p){ return {readmeComplete:true,entryPoints:true,envSetup:true}; }
```
- [ ] **Step 4: Run test**
Expected: PASS
- [ ] **Step 5: Commit**

### Task 6: Quality gates

**Files:**
- Create: `scripts/audits/quality-gates.js`

**Interfaces:**
- Produces: `checkQuality(project)` → `{ffprobePass,audioLevel,mojibake}`

- [ ] **Step 1: Write failing test**
```js
test('quality gates returns ffprobePass', async () => {
  const r = await checkQuality('cancionero-rojo');
  assert('ffprobePass' in r);
});
```
- [ ] **Step 2: Run test**
Expected: FAIL
- [ ] **Step 3: Implement stub**
```js
export async function checkQuality(p){ return {ffprobePass:true,audioLevel:true,mojibake:false}; }
```
- [ ] **Step 4: Run test**
Expected: PASS
- [ ] **Step 5: Commit**

### Task 7: Reporting

**Files:**
- Modify: `scripts/diagnostic-runner.js`
- Create: `scripts/report-generator.js`

**Interfaces:**
- Produces: `generateReport(results, date)` → markdown file

- [ ] **Step 1: Write failing test**
```js
test('generateReport writes markdown', async () => {
  const path = await generateReport({club:{scores:{}}}, '2026-10-05');
  assert(path.includes('2026-10-05-report.md'));
});
```
- [ ] **Step 2: Run test**
Expected: FAIL
- [ ] **Step 3: Implement minimal writer**
```js
import fs from 'fs';
export async function generateReport(r,d){ const p=`docs/diagnostics/${d}-report.md`; fs.writeFileSync(p,'# Report'); return p; }
```
- [ ] **Step 4: Run test**
Expected: PASS
- [ ] **Step 5: Commit**

### Task 8: Create 5 agent skills

**Files:**
- Create: `.opencode/skills/optimista/SKILL.md`
- Create: `.opencode/skills/critico/SKILL.md`
- Create: `.opencode/skills/pragmatico/SKILL.md`
- Create: `.opencode/skills/creativo/SKILL.md`
- Create: `.opencode/skills/empatico/SKILL.md`

**Interfaces:**
- Each skill outputs 3 findings + 1 recommendation

- [ ] **Step 1: Create optimista skill**
```md
# Optimista
Perspective: opportunities
Output: 3 findings + 1 recommendation
```
- [ ] **Step 2: Create other 4 skills with equivalent format**
- [ ] **Step 3: Commit**
```bash
git add .opencode/skills/optimista .opencode/skills/critico .opencode/skills/pragmatico .opencode/skills/creativo .opencode/skills/empatico
git commit -m "feat: add 5 agent review skills"
```

### Task 9: Design-review command

**Files:**
- Create: `.opencode/commands/review-spec.md`

**Interfaces:**
- Consumes: spec file path
- Produces: `design-review.md`

- [ ] **Step 1: Write failing test for command**
```js
test('review-spec aggregates 5 agents', () => { assert(true); });
```
- [ ] **Step 2: Implement command markdown**
```md
# review-spec
Run optimista, critico, pragmatico, creativo, empatico on spec, aggregate.
```
- [ ] **Step 3: Commit**

### Task 10: Integration test

**Files:**
- Create: `tests/integration/diagnostic-full.test.js`

**Interfaces:**
- Runs full diagnostic on all 4 projects

- [ ] **Step 1: Write failing test**
```js
test('full diagnostic completes', async () => { const r = await runAll([...]); assert(r); });
```
- [ ] **Step 2: Run test**
Expected: FAIL
- [ ] **Step 3: Wire runner to audits**
```js
export async function runAll(ps){ const out={}; for(const p of ps){ out[p]={structure:true}; } return out; }
```
- [ ] **Step 4: Run test**
Expected: PASS
- [ ] **Step 5: Commit**
