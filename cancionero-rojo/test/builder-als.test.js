import test from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { parseAls, buildAls, setSceneNames, inventoryXml } from '../ableton/builder/als.js';

const XML = `<?xml version="1.0" encoding="utf-8"?>
<Ableton MajorVersion="5" MinorVersion="10.0_424"><LiveSet><MasterTrack><SessionView><Scenes>
<Scene Id="0"><Name><EffectiveName Value=""/></Name></Scene>
<Scene Id="1"><Name><EffectiveName Value=""/></Name></Scene>
</Scenes></SessionView></MasterTrack></LiveSet></Ableton>`;

test('parse→build roundtrip preserves structure', () => {
  const st = parseAls(gzipSync(Buffer.from(XML)));
  const out = buildAls(st);
  assert.ok(out.includes('<Ableton MajorVersion="5"'));
  assert.equal(inventoryXml(out).scenes, 2);
});

test('setSceneNames writes EffectiveName', () => {
  const st = parseAls(gzipSync(Buffer.from(XML)));
  setSceneNames(st, ['Intro', 'Verse']);
  const out = buildAls(st);
  assert.ok(out.includes('Value="Intro"') && out.includes('Value="Verse"'));
});
