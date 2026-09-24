// test/inspect-als.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { inventory } from '../scripts/inspect-als.js';

const MINI = `<?xml version="1.0" encoding="utf-8"?>
<Ableton MajorVersion="5" MinorVersion="10.0_424"><LiveSet>
<Tracks>
<MidiTrack><Name><EffectiveName Value="Keys"/></Name><DeviceChain><MidiClipSlots><MidiClipSlot Id="0"/><MidiClipSlot Id="1"/></MidiClipSlots></DeviceChain></MidiTrack>
<AudioTrack><Name><EffectiveName Value="Strings"/></Name><DeviceChain><AudioClipSlots><AudioClipSlot Id="0"/></AudioClipSlots></DeviceChain></AudioTrack>
</Tracks>
<MasterTrack><SessionView><Scenes><Scene Id="0"/><Scene Id="1"/></Scenes></SessionView></MasterTrack>
</LiveSet></Ableton>`;

test('inventory finds tracks/scenes/slots', () => {
  const inv = inventory(MINI);
  assert.deepEqual(inv.tracks.map(t => t.name), ['Keys', 'Strings']);
  assert.equal(inv.tracks[0].type, 'midi');
  assert.equal(inv.tracks[0].clipSlots, 2);
  assert.equal(inv.tracks[1].clipSlots, 1);
  assert.equal(inv.scenes, 2);
});

test('gzipped payload parses', () => {
  const gz = gzipSync(Buffer.from(MINI));
  const inv = inventory(gz); // accepts Buffer too
  assert.equal(inv.scenes, 2);
});

const LIVE10 = `<?xml version="1.0" encoding="utf-8"?>
<Ableton MajorVersion="5" MinorVersion="10.0_424"><LiveSet>
<Tracks>
<MidiTrack Id="1"><Name><EffectiveName Value="Bass"/></Name><DeviceChain><MainSequencer><ClipSlotList><ClipSlot Id="0"><ClipSlot><Value /></ClipSlot></ClipSlot><ClipSlot Id="1" /></ClipSlotList></MainSequencer><FreezeSequencer><ClipSlotList><ClipSlot Id="0" /><ClipSlot Id="1" /><ClipSlot Id="2" /></ClipSlotList></FreezeSequencer></DeviceChain></MidiTrack>
<AudioTrack Id="2"><Name><EffectiveName Value="Vox"/></Name><DeviceChain><Devices><Eq8 /><Compressor2 /></Devices><MainSequencer><ClipSlotList><ClipSlot Id="0" /><ClipSlot Id="1" /></ClipSlotList></MainSequencer><FreezeSequencer><ClipSlotList><ClipSlot Id="0" /></ClipSlotList></FreezeSequencer></DeviceChain></AudioTrack>
</Tracks>
<MasterTrack><SessionView><Scenes><Scene Id="0" /></Scenes></SessionView></MasterTrack>
<Tempo><LomId Value="0" /><Manual Value="128.5" /></Tempo>
</LiveSet></Ableton>`;

test('live-10 shapes: Id attrs, MainSequencer slots, top-level devices, tempo', () => {
  const inv = inventory(LIVE10);
  assert.deepEqual(inv.tracks.map(t => t.name), ['Bass', 'Vox']);
  assert.equal(inv.tracks[0].clipSlots, 2);
  assert.equal(inv.tracks[1].clipSlots, 2);
  assert.equal(inv.tracks[1].devices, 2);
  assert.equal(inv.scenes, 1);
  assert.equal(inv.tempo, '128.5');
});
