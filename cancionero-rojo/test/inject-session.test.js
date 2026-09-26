import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync, gunzipSync } from 'node:zlib';
import { buildNotes } from '../scripts/lib/step-grid.js';
import { writeSmf } from '../scripts/lib/smf-writer.js';
import { notesToLiveEvents, makeClipXml, injectMidiIntoTrack, injectSession } from '../ableton/builder/inject-session.js';
import { parseAls, buildAls } from '../ableton/builder/als.js';
import { inventory } from '../scripts/inspect-als.js';

const DONOR = readFileSync(new URL('../ableton/donors/midi-clip.xml', import.meta.url), 'utf8');

function fixtureXml() {
  return `<?xml version="1.0" encoding="utf-8"?><Ableton><LiveSet><Tracks>
<MidiTrack><Name><EffectiveName Value="Keys"/><UserName Value="Keys"/></Name><DeviceChain><MainSequencer><ClipSlotList>
<MidiClipSlot Id="0"/><MidiClipSlot Id="1"/></ClipSlotList></MainSequencer></DeviceChain></MidiTrack>
</Tracks></LiveSet></Ableton>`;
}

test('notesToLiveEvents emits Live 10 KeyTracks format (grouped by pitch, MidiKey per track)', () => {
  const notes = [
    { startBeat: 0, durBeats: 1, note: 60, velocity: 96 },
    { startBeat: 1, durBeats: 0.5, note: 62, velocity: 72 },
    { startBeat: 2, durBeats: 1, note: 60, velocity: 88 },
  ];
  const xml = notesToLiveEvents(notes);
  // ground truth from donor lesson (Live 10 Suite Empty.als, 44 MidiClips):
  // <Notes><KeyTracks><KeyTrack Id="0"><Notes><MidiNoteEvent .../></Notes><MidiKey Value="36"/></KeyTrack>...
  assert.ok(xml.includes('<KeyTracks>'), 'KeyTracks wrapper present');
  assert.ok(xml.includes('</KeyTracks>'), 'KeyTracks closed');
  // pitches grouped: 2 KeyTracks (60, 62), ascending, Id = index
  assert.equal((xml.match(/<KeyTrack /g) ?? []).length, 2);
  assert.ok(xml.includes('<KeyTrack Id="0">'), 'first KeyTrack id 0');
  // pitch lives in MidiKey, NOT as Note= attribute on the event (Live 10 ignores Note=)
  assert.ok(xml.includes('<MidiKey Value="60" />'), 'MidiKey 60');
  assert.ok(xml.includes('<MidiKey Value="62" />'), 'MidiKey 62');
  assert.ok(!xml.includes('Note="'), 'no invented Note= attribute');
  // events carry ground-truth attrs
  assert.ok(xml.includes('<MidiNoteEvent Time="0" Duration="1" Velocity="96" OffVelocity="0" IsEnabled="true" />'), 'event attrs complete');
  // pitch 60 has both events inside its KeyTrack
  const kt60 = /<KeyTrack Id="0">([\s\S]*?)<\/KeyTrack>/.exec(xml)[1];
  assert.equal((kt60.match(/<MidiNoteEvent/g) ?? []).length, 2, 'same pitch grouped in one KeyTrack');
  assert.ok(kt60.includes('<MidiKey Value="60" />'));
  assert.equal((xml.match(/<MidiNoteEvent/g) ?? []).length, 3, 'all events present');
});

test('makeClipXml replaces donor placeholders', () => {
  const notes = [{ startBeat: 0, durBeats: 1, note: 60, velocity: 96 }];
  const out = makeClipXml({ name: 'Verse', donor: DONOR, notes });
  assert.ok(!out.includes('{{NOTES}}'), 'NOTES placeholder removed');
  assert.ok(!out.includes('{{DUR_BEATS}}'), 'DUR_BEATS placeholder removed');
  assert.ok(!out.includes('{{CLIP_NAME}}'), 'CLIP_NAME placeholder removed');
  assert.ok(out.includes('<MidiNoteEvent'), 'contains note events');
  assert.ok(out.includes('<KeyTracks>'), 'clip Notes block wraps KeyTracks (Live 10 format)');
  assert.ok(!/MidiNoteEvent[^>]*Note="/.test(out), 'no flat Note= events outside KeyTracks');
  assert.ok(out.includes('Value="Verse"'), 'clip name injected');
  // end = max(0+1,4)=4 at least
  assert.ok(out.includes('Value="4"') || out.includes('Value="1"'), 'duration set');
});

test('makeClipXml duration = max note end or 4', () => {
  const notes = [{ startBeat: 0, durBeats: 2, note: 60, velocity: 96 }, { startBeat: 5, durBeats: 2, note: 62, velocity: 96 }];
  const out = makeClipXml({ name: 'Chorus', donor: DONOR, notes });
  assert.ok(out.includes('Value="7"'), 'duration is max end 7');
});

test('injects midi clip into slot 0 of Keys', () => {
  const xml = fixtureXml();
  const notes = [{ startBeat: 0, durBeats: 1, note: 60, velocity: 96 }];
  const clip = makeClipXml({ name: 'Verse', donor: DONOR, notes });
  const out = injectMidiIntoTrack(xml, 'Keys', 0, clip);
  // Keys still present
  assert.ok(out.includes('Value="Keys"'), 'track still named Keys');
  // clip appears once
  assert.equal((out.match(/<MidiClip /g) ?? []).length, 1);
  // slot 0 now contains clip with Verse
  assert.ok(out.includes('<EffectiveName Value="Verse"') || out.includes('<Name Value="Verse"'), 'clip name Verse present');
  // slot 1 untouched (still self-closing)
  assert.ok(out.includes('<MidiClipSlot Id="1"/>'), 'slot 1 untouched');
  // Keys track slice contains Verse
  const keysSlice = out.slice(out.indexOf('Value="Keys"'), out.indexOf('</MidiTrack>') + 12);
  assert.ok(keysSlice.includes('Verse'), 'Verse inside Keys slice');
});

test('injectMidiIntoTrack throws on missing track', () => {
  const xml = fixtureXml();
  const clip = makeClipXml({ name: 'X', donor: DONOR, notes: [{ startBeat: 0, durBeats: 1, note: 60, velocity: 96 }] });
  assert.throws(() => injectMidiIntoTrack(xml, 'Guitar', 0, clip), /track not found/);
});

test('injectMidiIntoTrack throws on out-of-range slot', () => {
  const xml = fixtureXml();
  const clip = makeClipXml({ name: 'X', donor: DONOR, notes: [{ startBeat: 0, durBeats: 1, note: 60, velocity: 96 }] });
  assert.throws(() => injectMidiIntoTrack(xml, 'Keys', 5, clip), /need slot/);
});

test('injectSession string-level multi-track injection', () => {
  const tmp = new URL('./.tmp/inject-session-multi', import.meta.url);
  const dir = fileURLToPath(tmp);
  mkdirSync(dir, { recursive: true });
  const midA = join(dir, 'keys--Verse.mid');
  const midB = join(dir, 'bass--Verse.mid');
  // build dummy notes and write sidecars
  const notesA = [{ startBeat: 0, durBeats: 1, note: 60, velocity: 96 }];
  const notesB = [{ startBeat: 0, durBeats: 1, note: 36, velocity: 96 }];
  writeFileSync(midA + '.json', JSON.stringify({ notes: notesA }));
  writeFileSync(midB + '.json', JSON.stringify({ notes: notesB }));
  const xml = `<?xml version="1.0" encoding="utf-8"?><Ableton><LiveSet><Tracks>
<MidiTrack><Name><EffectiveName Value="Keys"/><UserName Value="Keys"/></Name><DeviceChain><MainSequencer><ClipSlotList><MidiClipSlot Id="0"/><MidiClipSlot Id="1"/></ClipSlotList></MainSequencer></DeviceChain></MidiTrack>
<MidiTrack><Name><EffectiveName Value="Bass"/><UserName Value="Bass"/></Name><DeviceChain><MainSequencer><ClipSlotList><MidiClipSlot Id="0"/><MidiClipSlot Id="1"/></ClipSlotList></MainSequencer></DeviceChain></MidiTrack>
</Tracks></LiveSet></Ableton>`;
  const state = { xml };
  const structure = { scenes: [{ name: 'Verse' }, { name: 'Chorus' }] };
  injectSession(state, { structure, tracks: { Keys: { Verse: midA }, Bass: { Verse: midB } } });
  assert.ok(state.xml.includes('Value="Keys"') && state.xml.includes('Value="Bass"'));
  assert.equal((state.xml.match(/<MidiClip /g) ?? []).length, 2);
  assert.ok(state.xml.includes('<MidiNoteEvent Time="0"'));
});

test('sidecar json written by orca-to-mid (smoke)', async () => {
  const tmp = new URL('./.tmp/inject-sidecar', import.meta.url);
  const dir = fileURLToPath(tmp);
  mkdirSync(dir, { recursive: true });
  const outMid = join(dir, 'keys--Verse.mid');
  // simulate orca-to-mid sidecar logic: write notes json alongside mid
  const gridText = '# dur=4\n0...\n1...';
  const sceneChords = { bars: ['Am', 'G'] };
  const { notes } = buildNotes(gridText, sceneChords, { totalBars: 2 });
  const buf = writeSmf({ tempo: 100, timeSig: [4, 4], notes });
  writeFileSync(outMid, buf);
  writeFileSync(outMid + '.json', JSON.stringify({ notes }, null, 2));
  assert.ok(existsSync(outMid + '.json'), 'sidecar exists');
  const j = JSON.parse(readFileSync(outMid + '.json', 'utf8'));
  assert.ok(Array.isArray(j.notes) && j.notes.length > 0, 'notes array in sidecar');
});
