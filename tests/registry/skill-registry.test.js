import test from 'node:test';
import assert from 'node:assert/strict';
import { searchSkills } from '../../club-sincronica/registry/skill-registry.js';

test('searchSkills finds kin-harmonic', async () => {
  const res = await searchSkills('harmonic');
  assert(res.map(s => s.name).includes('kin-harmonic'));
});
