const PPQ = 480;

export function encodeVlq(n) {
  const bytes = [n & 0x7f];
  n >>= 7;
  while (n > 0) { bytes.unshift((n & 0x7f) | 0x80); n >>= 7; }
  return bytes;
}

function metaTrack(tempo, [num, den]) {
  const usPerQn = Math.round(60_000_000 / tempo);
  const ev = [
    ...encodeVlq(0), 0xff, 0x51, 0x03, (usPerQn >> 16) & 0xff, (usPerQn >> 8) & 0xff, usPerQn & 0xff,
    ...encodeVlq(0), 0xff, 0x58, 0x04, num, Math.log2(den), 24, 8,
    ...encodeVlq(0), 0xff, 0x2f, 0x00,
  ];
  return Buffer.concat([Buffer.from('MTrk'), u32(ev.length), Buffer.from(ev)]);
}

const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32BE(n); return b; };

function noteTrack(notes, program) {
  const events = [];
  for (const n of notes) {
    events.push({ tick: Math.round(n.startBeat * PPQ), status: 0x90, a: n.note, b: n.velocity });
    events.push({ tick: Math.round((n.startBeat + n.durBeats) * PPQ), status: 0x80, a: n.note, b: 0 });
  }
  events.sort((x, y) => x.tick - y.tick || x.status - y.status);
  const ev = [];
  let last = 0;
  if (program != null) ev.push(...encodeVlq(0), 0xc0 | 0, program);
  for (const e of events) {
    ev.push(...encodeVlq(e.tick - last), e.status, e.a, e.b);
    last = e.tick;
  }
  ev.push(...encodeVlq(0), 0xff, 0x2f, 0x00);
  return Buffer.concat([Buffer.from('MTrk'), u32(ev.length), Buffer.from(ev)]);
}

export function writeSmf({ tempo, timeSig, notes = [], program }) {
  const tracks = [metaTrack(tempo, timeSig), noteTrack(notes, program)];
  const head = Buffer.concat([
    Buffer.from('MThd'), u32(6),
    Buffer.from([0x00, 0x01, 0x00, tracks.length, (PPQ >> 8) & 0xff, PPQ & 0xff]),
  ]);
  return Buffer.concat([head, ...tracks]);
}
