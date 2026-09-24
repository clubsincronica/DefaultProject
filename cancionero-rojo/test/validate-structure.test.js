// test/validate-structure.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateStructure } from '../scripts/validate-structure.js';

const valid = JSON.parse(readFileSync(new URL('./fixtures/structure.valid.json', import.meta.url)));
const badScene = JSON.parse(readFileSync(new URL('./fixtures/structure.bad-missing-scene.json', import.meta.url)));

test('valid structure → no errors', () => {
  assert.deepEqual(validateStructure(valid), []);
});
test('arrangement referencing unknown scene → error', () => {
  const errs = validateStructure(badScene);
  assert.ok(errs.some(e => e.includes('Bridge')));
});
test('tempo out of range → error', () => {
  const errs = validateStructure({ ...valid, tempo: 400 });
  assert.ok(errs.some(e => e.includes('tempo')));
});
test('duplicate scene name → error', () => {
  const errs = validateStructure({ ...valid, scenes: [...valid.scenes, { name: 'Verse', bars: 4 }] });
  assert.ok(errs.some(e => e.includes('duplicat')));
});
test('scene without name → error', () => {
  const errs = validateStructure({ ...valid, scenes: [{ bars: 4 }] });
  assert.ok(errs.some(e => e.includes('scene name')));
});
test('parts outside roster → error', () => {
  const errs = validateStructure({ ...valid, parts: { midi: ['keys', 'organ'], audio: ['texture'] } });
  assert.ok(errs.some(e => e.includes('organ')));
});
test('optional scene tempo: valid 40-260 ok, out of range error', () => {
  const withTempo = { ...valid, scenes: valid.scenes.map(s => ({ ...s, tempo: 72 })) };
  assert.deepEqual(validateStructure(withTempo), []);
  const bad = { ...valid, scenes: [{ name: 'Intro', bars: 4, tempo: 400 }] };
  assert.ok(validateStructure(bad).some(e => e.includes('tempo')));
});
