import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { inventory } from '../scripts/inspect-als.js';

const T = new URL('../ableton/template.als', import.meta.url);
const REQUIRED = ['Mic Lead', 'Mic Guest', 'Keys', 'Guitar', 'Bass', 'Perc', 'Strings', 'Texture'];

test('template.als has the 8 roster tracks and 16 scenes', { skip: !existsSync(T) }, () => {
  const inv = inventory(readFileSync(T));
  for (const n of REQUIRED) assert.ok(inv.tracks.some(t => t.name === n), `missing track ${n}`);
  assert.equal(inv.scenes, 16);
});
