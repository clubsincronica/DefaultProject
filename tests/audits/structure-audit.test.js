import test from 'node:test';
import assert from 'node:assert/strict';
import { auditStructure } from '../../scripts/audits/structure-audit.js';

test('auditStructure detects missing README', () => {
  const result = auditStructure('.');
  assert.equal(result.readme, true);
  assert.equal(result.sprawl, 0);
  assert.equal(result.legacy, 0);
  assert.equal(result.gitignore, true);
  assert.equal(result.secrets, true);
});
