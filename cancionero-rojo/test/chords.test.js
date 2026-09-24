// test/chords.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseChordLine, splitSections, voicing } from '../scripts/lib/chords.js';

test('parseChordLine extracts tokens', () => {
  assert.deepEqual(parseChordLine('Am                                         G'), ['Am', 'G']);
  assert.deepEqual(parseChordLine('                                        F                 E'), ['F', 'E']);
  assert.deepEqual(parseChordLine('Am                                   G'), ['Am', 'G']);
  assert.deepEqual(parseChordLine('Donnez moi une suite au Ritz, je n\'en veux pas'), []);
  assert.deepEqual(parseChordLine('F  G'), ['F', 'G']);
});

test('voicing: Am near middle C', () => {
  assert.deepEqual(voicing('Am'), [57, 60, 64]); // A3 C4 E4
});
test('voicing: E major triad', () => {
  assert.deepEqual(voicing('E'), [52, 56, 59]);  // E3 G#3 B3
});
test('voicing slash chord adds bass', () => {
  assert.deepEqual(voicing('C/E'), [40, 60, 64, 67]); // E2 bass + C4 E4 G4
});
test('voicing: Am7 has G', () => {
  const v = voicing('Am7');
  assert.ok(v.includes(67), 'contains G4');
});
test('voicing: F#m7b5 half-diminished', () => {
  assert.deepEqual(voicing('F#m7b5'), [54, 57, 60, 64]); // F#3 A3 C4 E4
});

test('splitSections on real sheet excerpt', () => {
  const txt = readFileSync(new URL('./fixtures/sheet-je-veux-excerpt.txt', import.meta.url), 'utf8');
  const secs = splitSections(txt);
  assert.deepEqual(secs.map(s => s.section), ['Verse', 'Chorus']);
  const verseChordLine = secs[0].lines.find(l => l.startsWith('Am'));
  assert.deepEqual(parseChordLine(verseChordLine), ['Am', 'G']);
});
