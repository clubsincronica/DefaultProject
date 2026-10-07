import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPlugins } from '../../club-sincronica/plugins/plugin-loader.js';

test('plugin loader returns ordered plugins', () => {
  const plugins = loadPlugins('club-daily');
  assert.deepStrictEqual(plugins.map(p => p.name), ['tzolkin','astro','generate-day','storyboard','frames','assemble']);
});
