// test/step-grid.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildNotes } from '../scripts/lib/step-grid.js';

const chords = JSON.parse(readFileSync(new URL('./fixtures/chords.fixture.json', import.meta.url), 'utf8'));
const grid = readFileSync(new URL('./fixtures/grid-verse.keys', import.meta.url), 'utf8');

test('grid rows map to bars, cells to beats', () => {
  const { notes } = buildNotes(grid, chords.sections.Verse, { totalBars: 8 });
  assert.ok(notes.length > 0, 'notes produced');
  // bar 0 tone0 = Am root (A=57 with center 60): first note is A3
  assert.equal(notes[0].note, 57);
  assert.equal(notes[0].startBeat, 0);
  // every note lands on a 16th grid
  for (const n of notes) assert.ok(Math.abs(n.startBeat * 4 - Math.round(n.startBeat * 4)) < 1e-9);
});

test('tone index cycles voicing, uppercase = accent', () => {
  const { notes } = buildNotes('0...\n1...\n2...\n3...', { bars: ['Am', 'G', 'F', 'E'] }, { totalBars: 4 });
  assert.equal(notes.length, 4);
  assert.equal(notes[3].velocity, 72);
  const acc = buildNotes('0.0.', { bars: ['Am'] }, { totalBars: 1 });
  // digits = 72; letters = 96:
  const acc2 = buildNotes('a.0.', { bars: ['Am'] }, { totalBars: 1 });
  assert.equal(acc2.notes[0].velocity, 96);
});

test('too few chord bars → warning', () => {
  const { warnings } = buildNotes('0000', { bars: ['Am'] }, { totalBars: 4 });
  assert.ok(warnings.some(w => w.includes('chord bars')));
});

test('dur=0 header → no notes emitted, warning present', () => {
  const { notes, warnings } = buildNotes('# dur=0\n0...', { bars: ['Am'] }, { totalBars: 1 });
  assert.equal(notes.length, 0);
  assert.ok(warnings.some(w => w.includes('dur')));
});
