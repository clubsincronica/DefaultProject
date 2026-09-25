import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { makeAudioClipXml, injectAudioIntoTrack } from '../ableton/builder/inject-audio.js';

test('audio clip gets real size + md5 + path', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cr-'));
  const wav = join(dir, 'strings--Intro.wav');
  const bytes = Buffer.alloc(4096, 7);
  writeFileSync(wav, bytes);
  const xml = makeAudioClipXml({ name: 'strings--Intro', wavPath: wav });
  assert.ok(xml.includes(wav.replace(/\\/g, '/')) || xml.includes(wav));
  assert.ok(xml.includes(`Size Value="${bytes.length}"`));
  const md5 = createHash('md5').update(bytes).digest('hex');
  assert.ok(xml.includes(`AudioMd5 Value="${md5}"`));
  // donor also keeps FileSize/Crc for Ableton
  assert.ok(xml.includes(`FileSize Value="${bytes.length}"`));
  assert.ok(xml.includes(`Crc Value="${md5}"`));
});

test('injectAudioIntoTrack injects clip into slot 0 of Strings (ClipSlot)', () => {
  const fixture = `<?xml version="1.0" encoding="utf-8"?><Ableton><LiveSet><Tracks>
<AudioTrack Id="1"><Name><EffectiveName Value="Strings"/><UserName Value="Strings"/></Name><DeviceChain><MainSequencer><ClipSlotList>
<ClipSlot Id="0"><LomId Value="0" /><ClipSlot><Value /></ClipSlot><HasStop Value="true" /><NeedRefreeze Value="true" /></ClipSlot>
<ClipSlot Id="1"><LomId Value="0" /><ClipSlot><Value /></ClipSlot><HasStop Value="true" /><NeedRefreeze Value="true" /></ClipSlot>
</ClipSlotList></MainSequencer></DeviceChain></AudioTrack>
</Tracks></LiveSet></Ableton>`;
  const dir = mkdtempSync(join(tmpdir(), 'cr-'));
  const wav = join(dir, 'strings--Verse.wav');
  writeFileSync(wav, Buffer.alloc(123, 1));
  const clip = makeAudioClipXml({ name: 'Verse', wavPath: wav });
  const out = injectAudioIntoTrack(fixture, 'Strings', 0, clip);
  assert.ok(out.includes('Value="Strings"'), 'track still named Strings');
  assert.equal((out.match(/<AudioClip /g) ?? []).length, 1);
  assert.ok(out.includes('Value="Verse"'), 'clip name Verse present');
  // slot 1 untouched still empty Value
  const slot1 = out.slice(out.indexOf('<ClipSlot Id="1"'));
  assert.ok(slot1.includes('<Value />') || slot1.includes('<Value/>'), 'slot 1 still empty');
  const stringsSlice = out.slice(out.indexOf('Value="Strings"'), out.indexOf('</AudioTrack>') + 14);
  assert.ok(stringsSlice.includes('Verse'), 'Verse inside Strings slice');
});

test('injectAudioIntoTrack throws on missing track', () => {
  const xml = `<?xml version="1.0" encoding="utf-8"?><Ableton><LiveSet><Tracks>
<AudioTrack Id="1"><Name><EffectiveName Value="Strings"/></Name><DeviceChain><MainSequencer><ClipSlotList><ClipSlot Id="0"><LomId Value="0" /><ClipSlot><Value /></ClipSlot></ClipSlot></ClipSlotList></MainSequencer></DeviceChain></AudioTrack>
</Tracks></LiveSet></Ableton>`;
  const dir = mkdtempSync(join(tmpdir(), 'cr-'));
  const wav = join(dir, 'x.wav');
  writeFileSync(wav, Buffer.from([1,2,3]));
  const clip = makeAudioClipXml({ name: 'X', wavPath: wav });
  assert.throws(() => injectAudioIntoTrack(xml, 'Guitar', 0, clip), /track not found/);
});

test('injectAudioIntoTrack throws on out-of-range slot', () => {
  const xml = `<?xml version="1.0" encoding="utf-8"?><Ableton><LiveSet><Tracks>
<AudioTrack Id="1"><Name><EffectiveName Value="Strings"/></Name><DeviceChain><MainSequencer><ClipSlotList><ClipSlot Id="0"><LomId Value="0" /><ClipSlot><Value /></ClipSlot></ClipSlot></ClipSlotList></MainSequencer></DeviceChain></AudioTrack>
</Tracks></LiveSet></Ableton>`;
  const dir = mkdtempSync(join(tmpdir(), 'cr-'));
  const wav = join(dir, 'y.wav');
  writeFileSync(wav, Buffer.from([1]));
  const clip = makeAudioClipXml({ name: 'X', wavPath: wav });
  assert.throws(() => injectAudioIntoTrack(xml, 'Strings', 5, clip), /need slot/);
});

test('injectAudioIntoTrack throws if track is MidiTrack', () => {
  const xml = `<?xml version="1.0" encoding="utf-8"?><Ableton><LiveSet><Tracks>
<MidiTrack Id="1"><Name><EffectiveName Value="Keys"/></Name><DeviceChain><MainSequencer><ClipSlotList><ClipSlot Id="0"><LomId Value="0" /><ClipSlot><Value /></ClipSlot></ClipSlot></ClipSlotList></MainSequencer></DeviceChain></MidiTrack>
</Tracks></LiveSet></Ableton>`;
  const dir = mkdtempSync(join(tmpdir(), 'cr-'));
  const wav = join(dir, 'z.wav');
  writeFileSync(wav, Buffer.from([9]));
  const clip = makeAudioClipXml({ name: 'X', wavPath: wav });
  assert.throws(() => injectAudioIntoTrack(xml, 'Keys', 0, clip), /not an AudioTrack/);
});
