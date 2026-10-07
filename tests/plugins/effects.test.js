import test from 'node:test';
import assert from 'node:assert';
import { EffectsManager } from '../../club-sincronica/plugins/effects-manager.js';

test('effects are disposed on unload', () => {
  const mgr = new EffectsManager();
  let cleaned = false;
  mgr.register(() => {}, () => cleaned = true);
  mgr.dispose();
  assert.strictEqual(cleaned, true);
});
