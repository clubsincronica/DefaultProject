import test from 'node:test';
import assert from 'node:assert/strict';
import { createSkillToolset } from '../../club-sincronica/adk/skill-toolset.js';

test('skill toolset loads brand skill', async () => {
  const ts = await createSkillToolset();
  const skills = await ts.listSkills();
  assert(skills.includes('brand-prompt'));
});
