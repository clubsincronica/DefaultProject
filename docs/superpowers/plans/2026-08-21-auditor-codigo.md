# Auditor de Código (jcode de código) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `auditor-codigo.js` at the scaffolding root that audits the three active projects (club-sincronica, pipeline-viral, remotion-poc) for 4 dimensions — secret leaks, broken cross-project imports, hardcoded absolute paths/junk files, and doc-code drift — using a hybrid static + LLM (jcode/NIM) approach, delivering a markdown report plus an actionable task list, runnable manually and nightly via n8n.

**Architecture:** A single Node ESM script (`auditor-codigo.js`) exposes pure, unit-testable functions for each static check, a `jcode.exe` LLM wrapper reusing the existing provider chain (NIM-OmniRoute), and writers that emit `audit-code-YYYY-MM-DD.md` + `audit-code-tasks.json` + `audit-code-tareas.md`. Scope and excludes live in `auditor-codigo.config.json`. Tests use the built-in `node --test` runner.

**Tech Stack:** Node 22 ESM, node:fs/node:path/node:child_process, node:test (built-in, no deps), jcode.exe CLI (already at `C:/Users/tom_w/AppData/Local/jcode/bin/jcode.exe`), NVIDIA NIM / OmniRoute LLM providers.

## Global Constraints

- Node ESM; no new npm dependencies (use `node --test` built-in).
- Reuse the existing jcode provider chain: read `JCODE_NIM_KEY` / `JCODE_OMNI_KEY` from `club-sincronica/scripts/jcode-auditor.config.json` or `process.env`; call `jcode.exe` with `--provider-profile nim-api` / `omni` and `run <prompt>`; fallback NIM to OmniRoute.
- `jcode.exe` path is `C:/Users/tom_w/AppData/Local/jcode/bin/jcode.exe`.
- Use `execFileSync(argsInArray)` (never a shell string) to avoid PowerShell arg-mangling.
- Excludes (never scan): `node_modules`, `.git`, `credentials`, `graphify-out`, `_legado`, `out`, `dist`, `build`.
- The secret scan MUST mask values; never print a real secret to stdout or the report.
- Output files written at scaffolding root: `audit-code-YYYY-MM-DD.md`, `audit-code-tasks.json`, `audit-code-tareas.md`.
- LLM context budget: code sample = top 8 files by size, each truncated to ~6k chars; docs truncated to ~4k chars; max 5 improvement suggestions with `[regla]` tags and `Refs`.
- The script is read-only on source code; it only writes report/task files at root.
- If all LLM providers fail, static findings are still written and the LLM section is marked `no disponible`.

---

## File Structure

- **Create:** `auditor-codigo.config.json` — scope (`projects`, `docs`) + `exclude` list.
- **Create:** `auditor-codigo.js` — the auditor (pure functions + `main()`).
- **Create:** `test/auditor-codigo.test.js` — node:test suite covering every pure function, using temp fixtures via `fs.mkdtempSync` plus a real-repo integration test for junk-file detection.
- **Create:** `club-sincronica/n8n-workflows/audit-code-nightly.json` — nightly n8n workflow that runs the script.

Each exported function in `auditor-codigo.js` is importable by tests; `main()` runs only when the file is the entry point.

---

### Task 1: Config + file walker

**Files:**
- Create: `auditor-codigo.config.json`
- Create: `auditor-codigo.js` (scaffold: `ROOT`, `loadConfig`, `walk`, `scanFiles`, `scanFilesWithRoot`)
- Create: `test/auditor-codigo.test.js` (`loadConfig`, `scanFiles`)

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `loadConfig(path?)` to parsed JSON; `scanFiles(config, root?)` to absolute file paths under each `projects` entry, skipping `exclude` names.

- [ ] **Step 1: Write the failing test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { loadConfig, scanFiles, scanFilesWithRoot } from '../auditor-codigo.js';

const ROOT = dirname(fileURLToPath(import.meta.url));

test('loadConfig returns parsed scope', () => {
  const cfg = loadConfig(join(ROOT, '..', 'auditor-codigo.config.json'));
  assert.ok(Array.isArray(cfg.projects));
  assert.ok(Array.isArray(cfg.exclude));
});

test('scanFiles skips exclude dirs', () => {
  const base = mkdtempSync(join(tmpdir(), 'aud-walk-'));
  mkdirSync(join(base, 'proj', 'node_modules'), { recursive: true });
  writeFileSync(join(base, 'proj', 'a.js'), '');
  writeFileSync(join(base, 'proj', 'node_modules', 'b.js'), '');
  const cfg = { projects: ['proj'], exclude: ['node_modules'] };
  const files = scanFilesWithRoot(cfg, base);
  assert.deepEqual(files.sort(), [join(base, 'proj', 'a.js')].sort());
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/auditor-codigo.test.js`
Expected: FAIL (`loadConfig`/`scanFiles` not exported).

- [ ] **Step 3: Write minimal implementation**

`auditor-codigo.config.json`:
```json
{
  "projects": [
    "club-sincronica/scripts",
    "pipeline-viral/scripts",
    "remotion-poc/src",
    "remotion-poc/scripts"
  ],
  "docs": [
    "README-ESTRUCTURA.md",
    "SECRETS-MAP.md",
    "club-sincronica/AGENTS.md",
    "pipeline-viral/AGENTS.md",
    "pipeline-viral/PLAN-VIRAL.md"
  ],
  "exclude": ["node_modules", ".git", "credentials", "graphify-out", "_legado", "out", "dist", "build"]
}
```

`auditor-codigo.js` (scaffold):
```js
import { readFileSync, existsSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve, sep } from 'node:path';

export const ROOT = dirname(fileURLToPath(import.meta.url));

export function loadConfig(path) {
  const p = path || join(ROOT, 'auditor-codigo.config.json');
  if (!existsSync(p)) throw new Error('Falta auditor-codigo.config.json en ' + p);
  return JSON.parse(readFileSync(p, 'utf8'));
}

function walk(dir, exclude) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (exclude.includes(e.name)) continue;
    const fp = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(fp, exclude));
    else out.push(fp);
  }
  return out;
}

export function scanFiles(config, root = ROOT) {
  const files = [];
  for (const proj of config.projects) files.push(...walk(join(root, proj), config.exclude));
  return files;
}

export function scanFilesWithRoot(config, root) { return scanFiles(config, root); }

// main() added in Task 8
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/auditor-codigo.test.js`
Expected: PASS.

- [ ] **Step 5: Commit** (only within a project repo that tracks the root — see note in handoff)

---

### Task 2: Secret-scan static check

**Files:**
- Modify: `auditor-codigo.js` (`maskValue`, `checkSecrets`)
- Modify: `test/auditor-codigo.test.js`

**Interfaces:**
- Consumes: `scanFiles(config)`.
- Produces: `checkSecrets(files, root?)` to array of `{ file, line, severity, kind, detail }`; values masked; skips `credentials/` dirs and the auditor's own config.

- [ ] **Step 1: Write the failing test**

Append to `test/auditor-codigo.test.js`:
```js
import { checkSecrets } from '../auditor-codigo.js';

test('checkSecrets flags a token and masks it', () => {
  const base = mkdtempSync(join(tmpdir(), 'aud-secret-'));
  const f = join(base, 'x.js');
  writeFileSync(f, `const k = 'nvapi-ABCD1234EFGH5678';`);
  const out = checkSecrets([f], base);
  assert.equal(out.length, 1);
  assert.equal(out[0].severity, 'alta');
  assert.ok(!out[0].detail.includes('ABCD1234EFGH5678'), 'value must be masked');
});

test('checkSecrets skips credentials dir', () => {
  const base = mkdtempSync(join(tmpdir(), 'aud-secret2-'));
  const f = join(base, 'credentials', 'x.json');
  mkdirSync(join(base, 'credentials'), { recursive: true });
  writeFileSync(f, `{"token":"sk-abcdefghijklmnopqrstuvwx"}`);
  assert.equal(checkSecrets([f], base).length, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/auditor-codigo.test.js`
Expected: FAIL (`checkSecrets` not exported).

- [ ] **Step 3: Write minimal implementation**

In `auditor-codigo.js` add:
```js
const SECRET_RE = /(api[_]?key|secret|token|password|passwd|nvapi-[A-Za-z0-9]+|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16})|https?:\/\/[^:\s]+:[^@\s]+@/i;

export function maskValue(s) {
  if (!s || s.length <= 4) return '****';
  return s.slice(0, 3) + '****' + s.slice(-2);
}

export function checkSecrets(files, root = ROOT) {
  const out = [];
  for (const f of files) {
    if (/[\\/]credentials[\\/]/i.test(f)) continue;
    if (f.endsWith('auditor-codigo.config.json')) continue;
    let content;
    try { content = readFileSync(f, 'utf8'); } catch { continue; }
    content.split(/\r?\n/).forEach((ln, i) => {
      const m = ln.match(SECRET_RE);
      if (m) {
        const raw = m[0];
        const isUrl = /:\/\//.test(raw);
        out.push({
          file: relative(root, f), line: i + 1, severity: 'alta', kind: 'secret',
          detail: (isUrl ? 'URL con credencial embebida' : 'patron ' + raw.slice(0, 10)) + ' → ' + maskValue(raw),
        });
      }
    });
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/auditor-codigo.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

---

### Task 3: Broken cross-project import check

**Files:**
- Modify: `auditor-codigo.js` (`resolveModule`, `checkImports`)
- Modify: `test/auditor-codigo.test.js`

**Interfaces:**
- Consumes: `scanFiles`.
- Produces: `checkImports(files, root?)` to findings with `kind: 'broken-import'` for relative imports whose resolved target does not exist.

- [ ] **Step 1: Write the failing test**

```js
import { checkImports } from '../auditor-codigo.js';

test('checkImports flags a missing relative import', () => {
  const base = mkdtempSync(join(tmpdir(), 'aud-imp-'));
  const f = join(base, 'a.js');
  writeFileSync(f, `import { x } from './no-existe.js';`);
  const out = checkImports([f], base);
  assert.equal(out.length, 1);
  assert.equal(out[0].kind, 'broken-import');
});

test('checkImports accepts an existing relative import', () => {
  const base = mkdtempSync(join(tmpdir(), 'aud-imp2-'));
  writeFileSync(join(base, 'b.js'), '');
  const f = join(base, 'a.js');
  writeFileSync(f, `import { x } from './b.js';`);
  assert.equal(checkImports([f], base).length, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/auditor-codigo.test.js`

- [ ] **Step 3: Write implementation**

In `auditor-codigo.js` add:
```js
function resolveModule(baseDir, spec) {
  const cands = [spec, spec + '.js', spec + '.mjs', spec + '.ts', spec + '.cjs', join(spec, 'index.js'), join(spec, 'index.ts')];
  for (const c of cands) {
    const t = resolve(baseDir, c);
    if (existsSync(t) && statSync(t).isFile()) return t;
  }
  return null;
}

const IMPORT_RE = /(?:import\s+(?:[^'"]*?\s+from\s+)?|require\(\s*)['"]([^'"]+)['"]/g;

export function checkImports(files, root = ROOT) {
  const out = [];
  for (const f of files) {
    let content;
    try { content = readFileSync(f, 'utf8'); } catch { continue; }
    let m; IMPORT_RE.lastIndex = 0;
    while ((m = IMPORT_RE.exec(content))) {
      const spec = m[1];
      if (!spec.startsWith('.')) continue;
      if (!resolveModule(dirname(f), spec)) {
        out.push({ file: relative(root, f), line: 0, severity: 'alta', kind: 'broken-import', detail: 'import relativo roto: ' + spec });
      }
    }
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/auditor-codigo.test.js`

- [ ] **Step 5: Commit**

---

### Task 4: Absolute paths + junk/suspicious files

**Files:**
- Modify: `auditor-codigo.js` (`checkHardcodedPaths`, `checkJunkFiles`)
- Modify: `test/auditor-codigo.test.js`

**Interfaces:**
- Produces: `checkHardcodedPaths(files, root?)` to `kind: 'absolute-path'`; `checkJunkFiles(files, root?)` to `kind: 'empty-file'` / `'suspicious-name'`.

- [ ] **Step 1: Write the failing test**

```js
import { checkHardcodedPaths, checkJunkFiles } from '../auditor-codigo.js';

test('checkHardcodedPaths flags C:/Users path', () => {
  const base = mkdtempSync(join(tmpdir(), 'aud-abs-'));
  const f = join(base, 'a.js');
  writeFileSync(f, `const p = 'C:/Users/tom_w/foo.exe';`);
  const out = checkHardcodedPaths([f], base);
  assert.equal(out.length, 1);
  assert.equal(out[0].kind, 'absolute-path');
});

test('checkJunkFiles flags 0-byte and broken names', () => {
  const base = mkdtempSync(join(tmpdir(), 'aud-junk-'));
  const empty = join(base, '200');
  writeFileSync(empty, '');
  const broken = join(base, '{try{const');
  writeFileSync(broken, 'x');
  const good = join(base, 'ok.js');
  writeFileSync(good, 'x');
  const out = checkJunkFiles([empty, broken, good], base);
  const kinds = out.map(o => o.kind);
  assert.ok(kinds.includes('empty-file'));
  assert.ok(kinds.includes('suspicious-name'));
  assert.equal(out.filter(o => o.file.endsWith('ok.js')).length, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Write implementation**

In `auditor-codigo.js` add:
```js
const ABS_RE = /(?:[A-Za-z]:[\\/]|\\\\[?]\\[^\\]+\\[^\\]+|[\\/](?:Users|home|root)[\\/][^'"\s`]+)/;

export function checkHardcodedPaths(files, root = ROOT) {
  const out = [];
  for (const f of files) {
    let content;
    try { content = readFileSync(f, 'utf8'); } catch { continue; }
    content.split(/\r?\n/).forEach((ln, i) => {
      if (ABS_RE.test(ln)) out.push({ file: relative(root, f), line: i + 1, severity: 'media', kind: 'absolute-path', detail: 'path absoluto hardcodeado' });
    });
  }
  return out;
}

export function checkJunkFiles(files, root = ROOT) {
  const out = [];
  for (const f of files) {
    let st;
    try { st = statSync(f); } catch { continue; }
    const name = f.split(sep).pop();
    if (st.size === 0) out.push({ file: relative(root, f), line: 0, severity: 'baja', kind: 'empty-file', detail: 'archivo 0-byte' });
    if (/[{}()<>]/.test(name) || /^\d+$/.test(name)) out.push({ file: relative(root, f), line: 0, severity: 'baja', kind: 'suspicious-name', detail: 'nombre de archivo sospechoso/roto: ' + name });
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Commit**

---

### Task 5: Duplicate / dead-code (best-effort)

**Files:**
- Modify: `auditor-codigo.js` (`extractFunctions`, `hash`, `checkDuplicates`)
- Modify: `test/auditor-codigo.test.js`

**Interfaces:**
- Produces: `checkDuplicates(files, root?)` to `kind: 'duplicate'` when two files share an identical normalized function body.

- [ ] **Step 1: Write the failing test**

```js
import { checkDuplicates } from '../auditor-codigo.js';

test('checkDuplicates detects identical function bodies across files', () => {
  const base = mkdtempSync(join(tmpdir(), 'aud-dup-'));
  const fa = join(base, 'a.js');
  const fb = join(base, 'b.js');
  const same = `function dupe() { const x = 1; return x + 2; }`;
  writeFileSync(fa, same);
  writeFileSync(fb, same);
  const out = checkDuplicates([fa, fb], base);
  assert.equal(out.length, 1);
  assert.equal(out[0].kind, 'duplicate');
  assert.ok(out[0].detail.includes('a.js') && out[0].detail.includes('b.js'));
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Write implementation**

In `auditor-codigo.js` add:
```js
function extractFunctions(src) {
  const fns = [];
  const re = /\bfunction\s+([A-Za-z0-9_$]+)\s*\(/g;
  let m;
  while ((m = re.exec(src))) {
    const start = m.index;
    const i = src.indexOf('{', re.lastIndex);
    if (i === -1) continue;
    let depth = 0, j = i;
    for (; j < src.length; j++) {
      if (src[j] === '{') depth++;
      else if (src[j] === '}') { depth--; if (depth === 0) { j++; break; } }
    }
    fns.push({ name: m[1], body: src.slice(i, j) });
  }
  return fns;
}

function hash(s) {
  let h = 5381;
  const n = s.replace(/\s+/g, '');
  for (let i = 0; i < n.length; i++) h = ((h << 5) + h + n.charCodeAt(i)) >>> 0;
  return h;
}

export function checkDuplicates(files, root = ROOT) {
  const byHash = new Map();
  for (const f of files) {
    let content;
    try { content = readFileSync(f, 'utf8'); } catch { continue; }
    for (const fn of extractFunctions(content)) {
      const k = hash(fn.body);
      if (!byHash.has(k)) byHash.set(k, []);
      byHash.get(k).push({ file: relative(root, f), name: fn.name });
    }
  }
  const out = [];
  for (const [k, arr] of byHash) {
    const files2 = [...new Set(arr.map(a => a.file))];
    if (files2.length > 1) out.push({ severity: 'baja', kind: 'duplicate', detail: 'logica duplicada (hash ' + k + ') en: ' + arr.map(a => a.file + '#' + a.name).join(', ') });
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Commit**

---

### Task 6: LLM wrapper + prompt builder

**Files:**
- Modify: `auditor-codigo.js` (`JCODE`, `PROVIDERS`, `providerKey`, `runJcode`, `buildLlmPrompt`)
- Modify: `test/auditor-codigo.test.js` (`buildLlmPrompt` only; `runJcode` is integration)

**Interfaces:**
- Produces: `buildLlmPrompt(findings, config, root?)` to prompt string (no LLM call); `runJcode(prompt)` to cleaned LLM text or `null` on total failure.

- [ ] **Step 1: Write the failing test**

```js
import { buildLlmPrompt } from '../auditor-codigo.js';

test('buildLlmPrompt includes findings count and code/docs samples', () => {
  const cfg = { projects: [], docs: ['README-ESTRUCTURA.md'], exclude: [] };
  const findings = [{ kind: 'secret', severity: 'alta', file: 'x', detail: 'd' }];
  const p = buildLlmPrompt(findings, cfg, join(ROOT, '..'));
  assert.ok(p.includes('HALLAZGOS ESTATICOS'));
  assert.ok(p.includes('secret'));
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Write implementation**

In `auditor-codigo.js` add (and ensure `execFileSync` is imported from `node:child_process`):
```js
const JCODE = 'C:/Users/tom_w/AppData/Local/jcode/bin/jcode.exe';
const PROVIDERS = [
  { profile: 'nim-api', keyEnv: 'JCODE_NIM_KEY' },
  { profile: 'omni', keyEnv: 'JCODE_OMNI_KEY' },
];

export function providerKey(keyEnv, cfgPath) {
  if (process.env[keyEnv]) return process.env[keyEnv];
  const cfg = cfgPath || join(ROOT, 'club-sincronica', 'scripts', 'jcode-auditor.config.json');
  if (existsSync(cfg)) { try { return JSON.parse(readFileSync(cfg, 'utf8'))[keyEnv]; } catch {} }
  return '';
}

export function runJcode(prompt) {
  let lastErr = '';
  for (const prov of PROVIDERS) {
    const key = providerKey(prov.keyEnv);
    if (!key) { console.warn('  [fallback] ' + prov.profile + ': sin clave'); continue; }
    const env = { ...process.env, [prov.keyEnv]: key };
    try {
      const out = execFileSync(JCODE, ['--provider-profile', prov.profile, 'run', prompt], { env, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
      const cleaned = out.replace(/\n?\[Tokens\] upload:.*$/s, '').trim();
      if (!cleaned || /\[provider guardrail\]/.test(cleaned)) { lastErr = prov.profile + ': vacio'; continue; }
      return cleaned;
    } catch (e) {
      lastErr = '[' + prov.profile + '] ' + ((e.stderr || e.message || '').toString().slice(0, 200));
      continue;
    }
  }
  return null;
}

export function buildLlmPrompt(findings, config, root = ROOT) {
  const count = (k) => findings.filter(f => f.kind === k).length;
  const codeFiles = config.projects.flatMap(p => {
    const d = join(root, p);
    return existsSync(d) ? walk(d, config.exclude).filter(f => /\.(js|mjs|ts|tsx)$/.test(f)) : [];
  });
  const top = codeFiles.map(f => ({ f, size: statSync(f).size })).sort((a, b) => b.size - a.size).slice(0, 8);
  const codeSamples = top.map(({ f }) => '=== ' + relative(root, f) + ' ===\n' + readFileSync(f, 'utf8').slice(0, 6000)).join('\n');
  const docs = (config.docs || []).filter(d => existsSync(join(root, d)))
    .map(d => '=== ' + d + ' ===\n' + readFileSync(join(root, d), 'utf8').slice(0, 4000)).join('\n');
  return [
    'Eres el auditor de codigo de Club Sincronica (scaffolding de 3 proyectos Node/React, presupuesto cero).',
    'No uses herramientas. Responde SOLO con markdown con secciones: ## Calidad y ## Drift docs.',
    'REGLA: cada mejora lleva tag [regla] y bloque Refs con ruta de archivo exacta. Max 5 mejoras.',
    '',
    '=== HALLAZGOS ESTATICOS ===',
    JSON.stringify({ secretos: count('secret'), brokenImports: count('broken-import'), absPaths: count('absolute-path'), junk: count('empty-file') + count('suspicious-name'), duplicados: count('duplicate') }, null, 2),
    '',
    '=== MUESTRA DE CODIGO (top 8 por tamaño) ===',
    codeSamples,
    '',
    '=== DOCS DEL PROYECTO ===',
    docs,
  ].join('\n');
}
```

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Commit**

---

### Task 7: Report + tasks writers

**Files:**
- Modify: `auditor-codigo.js` (`fmtFindings`, `writeReport`, `writeTasks`)
- Modify: `test/auditor-codigo.test.js`

**Interfaces:**
- Produces: `writeReport(dateStr, sections, root?)` to path; `writeTasks(dateStr, sections, root?)` to `{ json, md }`. Sections shape: `{ secret, brokenImport, absPath, junk, quality?, drift? }`.

- [ ] **Step 1: Write the failing test**

```js
import { writeReport, writeTasks } from '../auditor-codigo.js';
import { existsSync, readFileSync } from 'node:fs';

test('writeReport and writeTasks emit structured files', () => {
  const base = mkdtempSync(join(tmpdir(), 'aud-out-'));
  const sections = {
    secret: [{ severity: 'alta', file: 'x.js:1', detail: 'patron nvapi-****' }],
    brokenImport: [], absPath: [], junk: [],
  };
  const rp = writeReport('2026-08-21', sections, base);
  const tp = writeTasks('2026-08-21', sections, base);
  assert.ok(existsSync(rp));
  assert.ok(existsSync(tp.json) && existsSync(tp.md));
  assert.ok(readFileSync(rp, 'utf8').includes('## Secretos'));
  const tasks = JSON.parse(readFileSync(tp.json, 'utf8'));
  assert.equal(tasks.length, 1);
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Write implementation**

In `auditor-codigo.js` add:
```js
function fmtFindings(arr) {
  if (!arr || !arr.length) return '_Sin hallazgos._\n';
  return arr.map(f => '- [' + f.severity + '] `' + f.file + '` — ' + f.detail + (f.ref ? ' (Refs: ' + f.ref + ')' : '')).join('\n') + '\n';
}

export function writeReport(dateStr, sections, root = ROOT) {
  const blocks = [
    '# Auditoría de Código — ' + dateStr + '\n',
    '## Secretos\n' + fmtFindings(sections.secret),
    '## Dependencias cruzadas\n' + fmtFindings(sections.brokenImport),
    '## Paths hardcodeados\n' + fmtFindings(sections.absPath),
    '## Archivos basura\n' + fmtFindings(sections.junk),
    '## Calidad (LLM)\n' + (sections.quality || 'no disponible') + '\n',
    '## Drift docs (LLM)\n' + (sections.drift || 'no disponible') + '\n',
  ];
  const p = join(root, 'audit-code-' + dateStr + '.md');
  writeFileSync(p, blocks.join('\n'), 'utf8');
  return p;
}

export function writeTasks(dateStr, sections, root = ROOT) {
  const flat = ['secret', 'brokenImport', 'absPath', 'junk', 'duplicate'].flatMap(k =>
    (sections[k] || []).map(f => ({
      project: f.file.split(/[\\/]/)[0],
      dimension: k, severity: f.severity, file: f.file, description: f.detail,
    }))
  );
  const pj = join(root, 'audit-code-tasks.json');
  writeFileSync(pj, JSON.stringify(flat, null, 2) + '\n', 'utf8');
  const md = '# Tareas de auditoría — ' + dateStr + '\n\n' +
    (flat.length ? flat.map((t, i) => (i + 1) + '. [' + t.severity + '] (' + t.project + ') ' + t.dimension + ': `' + t.file + '` — ' + t.description).join('\n') : '_Sin tareas._') + '\n';
  const pm = join(root, 'audit-code-tareas.md');
  writeFileSync(pm, md, 'utf8');
  return { json: pj, md: pm };
}
```

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Commit**

---

### Task 8: Orchestration (main) + manual run + real-repo autotest

**Files:**
- Modify: `auditor-codigo.js` (`main`, entry guard)
- Modify: `test/auditor-codigo.test.js` (integration test for junk-file detection on real repo)

**Interfaces:**
- Produces: `main(dateStr?)` returns `{ report, tasks }`; runs all checks, calls LLM, writes outputs.

- [ ] **Step 1: Write the failing test (real-repo autotest)**

```js
import { loadConfig, scanFiles, checkJunkFiles } from '../auditor-codigo.js';

test('integration: detects the 3 junk files in pipeline-viral/scripts', () => {
  const cfg = loadConfig();
  const files = scanFiles(cfg);
  const junk = checkJunkFiles(files);
  const names = junk.map(j => j.file);
  assert.ok(names.some(n => n.includes('pipeline-viral/scripts/200') || n.includes('pipeline-viral\\scripts\\200')), 'should flag empty "200" file');
});
```

- [ ] **Step 2: Run test to verify it fails** (main not yet defined / junk detection not wired)

- [ ] **Step 3: Write implementation**

In `auditor-codigo.js` ensure `execFileSync` is imported, then add:
```js
import { execFileSync } from 'node:child_process';

export function main(dateStr) {
  const date = dateStr || new Date().toISOString().slice(0, 10);
  const cfg = loadConfig();
  const files = scanFiles(cfg);
  const secret = checkSecrets(files);
  const brokenImport = checkImports(files);
  const absPath = checkHardcodedPaths(files);
  const junk = [...checkJunkFiles(files), ...checkDuplicates(files)];
  const sections = { secret, brokenImport, absPath, junk };
  const prompt = buildLlmPrompt([...secret, ...brokenImport, ...absPath, ...junk], cfg);
  const llm = runJcode(prompt);
  if (llm) {
    sections.quality = (llm.match(/## Calidad[\s\S]*?(?=^##|$)/m) || [llm])[0];
    sections.drift = (llm.match(/## Drift[\s\S]*?(?=^##|$)/m) || [llm])[0];
  }
  const rp = writeReport(date, sections);
  const tp = writeTasks(date, sections);
  console.log('Reporte: ' + rp);
  console.log('Tareas: ' + tp.json + ' / ' + tp.md);
  return { report: rp, tasks: tp };
}

if (import.meta.url === 'file://' + process.argv[1]) {
  main(process.argv[2]).catch(e => { console.error(e.message); process.exit(1); });
}
```

- [ ] **Step 4: Run the full test suite**

Run: `node --test test/auditor-codigo.test.js`
Expected: PASS.

- [ ] **Step 5: Manual smoke run (static-only path)** — with no provider keys set, confirm static findings still write and LLM section is `no disponible`:

Run: `cmd /c "set JCODE_NIM_KEY= & node auditor-codigo.js 2026-08-21"`
Expected: `audit-code-2026-08-21.md` created; LLM sections say `no disponible`; `audit-code-tareas.md` lists the 3 junk files + the absolute-path in `jcode-auditor.js`.

- [ ] **Step 6: Commit**

---

### Task 9: Nightly n8n workflow

**Files:**
- Create: `club-sincronica/n8n-workflows/audit-code-nightly.json`

**Interfaces:**
- Consumes: `auditor-codigo.js` (run with `node`).
- Produces: an n8n workflow JSON that runs the script daily and writes the report to the root.

- [ ] **Step 1: Write the workflow JSON**

```json
{
  "name": "audit-code-nightly",
  "nodes": [
    { "type": "n8n-nodes-base.scheduleTrigger", "name": "Diario 02:00", "parameters": { "rule": { "interval": [{ "field": "cronExpression", "expression": "0 2 * * *" }] } } },
    { "type": "n8n-nodes-base.executeCommand", "name": "Run auditor-codigo", "parameters": { "command": "node", "args": "C:/Users/tom_w/Documents/Default Project/auditor-codigo.js" } },
    { "type": "n8n-nodes-base.readWriteFile", "name": "Log reporte", "parameters": { "operation": "read", "filePath": "C:/Users/tom_w/Documents/Default Project/audit-code-{{$now.format('yyyy-MM-dd')}}.md" } }
  ],
  "connections": { "Diario 02:00": { "main": [[{ "node": "Run auditor-codigo" }]] }, "Run auditor-codigo": { "main": [[{ "node": "Log reporte" }]] } }
}
```
Adjust the cron/paths to match the host. Reuse the pattern from the existing `buffer-cross-post.json` in the same folder.

- [ ] **Step 2: Validate JSON** — `node -e "JSON.parse(require('fs').readFileSync('club-sincronica/n8n-workflows/audit-code-nightly.json','utf8'))"` (no throw).

- [ ] **Step 3: Commit**

---

## Self-Review Notes

- Spec coverage: all 4 dimensions implemented (secretos Task 2, dependencias cruzadas Task 3, paths/junk Task 4, drift docs Task 6/7); hibrido (Tasks 2-5 static, 6 LLM); reporte + tareas (Task 7); auto+manual (Tasks 8 + 9). OK.
- No placeholders: every task has real code/tests. OK.
- Type consistency: `sections` shape (`secret, brokenImport, absPath, junk, quality, drift`) is consistent between `main` (Task 8), `writeReport`/`writeTasks` (Task 7), and tests. OK.
- Ambiguity fixed: LLM sample = top 8 files, max 5 improvements (per spec). OK.
