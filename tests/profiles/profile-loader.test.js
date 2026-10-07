import test from 'node:test';
import assert from 'node:assert';
import { loadProfile } from '../../club-sincronica/profiles/profile-loader.js';

test('profile loader returns correct plugins', () => {
  const prof = loadProfile('club-daily');
  assert.ok(prof.plugins.includes('tzolkin'));
});
