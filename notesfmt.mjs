import fs from 'node:fs';
import zlib from 'node:zlib';

function load(p) {
  const b = fs.readFileSync(p);
  return (b[0] === 0x1f && b[1] === 0x8b ? zlib.gunzipSync(b) : b).toString('utf8');
}
const srcs = {
  donor: 'cancionero-rojo/ableton/donors/midi-clip.xml',
  fixture: 'cancionero-rojo/songs/_fixture/output/_fixture.als',
  midiOnly: 'cancionero-rojo/songs/je-veux-midi-only/output/je-veux-midi-only.als',
};
for (const [k, p] of Object.entries(srcs)) {
  if (!fs.existsSync(p)) { console.log(k, 'MISSING'); continue; }
  const x = load(p);
  const has = s => x.includes(s);
  console.log(k.padEnd(10),
    'KeyTracks:', has('<KeyTracks>'),
    '| flat MidiNoteEvent:', has('<Notes><MidiNoteEvent') || /<Notes>\s*<MidiNoteEvent/.test(x),
    '| EnvelopeTarget:', has('<EnvelopeTarget>'),
    '| PointeeId count:', (x.match(/<PointeeId /g) || []).length,
    '| MidiClip count:', (x.match(/<MidiClip /g) || []).length);
}
// show donor Notes structure
const donor = load(srcs.donor);
const ni = donor.indexOf('<Notes>');
console.log('\n--- donor Notes snippet ---');
console.log(JSON.stringify(donor.slice(ni, ni + 700)));
// fixture first MidiClip notes structure
const fx = load(srcs.fixture);
const fi = fx.indexOf('<MidiClip ');
const fNotes = fx.indexOf('<Notes>', fi);
console.log('\n--- fixture first MidiClip Notes snippet ---');
console.log(JSON.stringify(fx.slice(fNotes, fNotes + 400)));
