import test from 'node:test';
import { runAll } from '../scripts/diagnostic-runner.js';
import assert from 'node:assert/strict';

test('runAll returns report for 4 projects', () => {
  const r = runAll(['club-sincronica','pipeline-viral','remotion-poc','cancionero-rojo']);
  assert(Object.keys(r).length === 4);
});
