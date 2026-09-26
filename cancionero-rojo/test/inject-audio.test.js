import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
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

test('external stem FileRef uses Live 10 resolvable format (type 1 + .. chain + utf16 Data)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cr-'));
  const setDir = join(dir, 'output');
  const stems = join(dir, 'stems');
  mkdirSync(stems, { recursive: true });
  const wav = join(stems, 'strings--Intro.wav');
  writeFileSync(wav, Buffer.alloc(32, 3));
  const abs = resolve(wav);
  const xml = makeAudioClipXml({ name: 'Intro', wavPath: wav, setDir });

  // format observed in working Live 10 sets (NEW WAM.als etc.)
  assert.ok(xml.includes('<HasRelativePath Value="true" />'), 'HasRelativePath stays true');
  assert.ok(xml.includes('<RelativePathType Value="1" />'), 'RelativePathType = 1 (absolute-outside-project ref)');
  assert.ok(!xml.includes('<RelativePathType Value="0" />'), 'type 0 never occurs in real sets');
  assert.ok(!xml.includes('<RelativePathType Value="5" />'), 'no pack-relative type 5');

  // chain = directories relative to the .als dir; ".." encoded as Dir=""
  const rp = /<RelativePath>([\s\S]*?)<\/RelativePath>/.exec(xml);
  assert.ok(rp, 'RelativePath present');
  const dirs = [...rp[1].matchAll(/Dir="([^"]*)"/g)].map((m) => m[1]);
  assert.deepEqual(dirs, ['', 'stems'], 'parent encoded as empty Dir, then stems');

  // Data = UTF-16LE hex of absolute path + null terminator (the field Live uses to locate)
  const expectedHex = Buffer.concat([Buffer.from(abs, 'utf16le'), Buffer.from([0, 0])]).toString('hex').toUpperCase();
  const data = /<Data>\s*([\s\S]*?)\s*<\/Data>/.exec(xml)[1].replace(/\s+/g, '');
  assert.equal(data, expectedHex, 'Data = UTF-16LE absolute path');
  assert.notEqual(data, '0000000000000000', 'Data not zeroed');

  // PathHint = full dir chain without drive letter (search fallback)
  const hint = /<PathHint>([\s\S]*?)<\/PathHint>/.exec(xml)[1];
  const hintDirs = [...hint.matchAll(/Dir="([^"]*)"/g)].map((m) => m[1]);
  const expectedHint = abs.split(/[\\/]/).slice(1, -1);
  assert.deepEqual(hintDirs, expectedHint, 'PathHint = dirs without drive');

  // pack association cleared
  assert.ok(xml.includes('<LivePackName Value="" />'));
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
