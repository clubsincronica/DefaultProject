import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { loadConfig, scanFiles, scanFilesWithRoot, checkSecrets } from '../auditor-codigo.js';

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
