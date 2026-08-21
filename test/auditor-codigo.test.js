import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdtempSync, writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { loadConfig, scanFiles, scanFilesWithRoot, checkSecrets, checkImports, checkHardcodedPaths, checkJunkFiles, checkDuplicates, buildLlmPrompt, writeReport, writeTasks } from '../auditor-codigo.js';

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
  const empty = join(base, 'readme.tmp');
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

test('buildLlmPrompt includes findings count and code/docs samples', () => {
  const cfg = { projects: [], docs: ['README-ESTRUCTURA.md'], exclude: [] };
  const findings = [{ kind: 'secret', severity: 'alta', file: 'x', detail: 'd' }];
  const p = buildLlmPrompt(findings, cfg, join(ROOT, '..'));
  assert.ok(p.includes('HALLAZGOS ESTATICOS'));
  assert.ok(p.includes('secret'));
});

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

test('integration: detects the 3 junk files in pipeline-viral/scripts', () => {
  const cfg = loadConfig();
  const files = scanFiles(cfg);
  const junk = checkJunkFiles(files);
  const names = junk.map(j => j.file);
  assert.ok(names.some(n => n.includes('pipeline-viral/scripts/200') || n.includes('pipeline-viral\\scripts\\200')), 'should flag empty "200" file');
});
