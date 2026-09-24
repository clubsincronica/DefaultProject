const CHORD_TOKEN = /^[A-G][#b]?(maj|min|m|dim|aug|sus\d|add\d|\d|b\d|#\d)*(\/[A-G][#b]?)?$/;
const QUALITIES = {
  '': [0, 4, 7], 'm': [0, 3, 7], 'dim': [0, 3, 6], 'aug': [0, 4, 8],
  'sus2': [0, 2, 7], 'sus4': [0, 5, 7], '6': [0, 4, 7, 9],
  '7': [0, 4, 7, 10], 'm7': [0, 3, 7, 10], 'maj7': [0, 4, 7, 11],
  'm7b5': [0, 3, 6, 10],
  '9': [0, 4, 7, 10, 14], 'm9': [0, 3, 7, 10, 14],
};
const PC = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6,
              G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };

export function parseChordLine(line) {
  const toks = line.trim().split(/\s+/).filter(Boolean);
  const chords = toks.filter(t => CHORD_TOKEN.test(t) && t.length > 0);
  const nonChords = toks.length - chords.length;
  return chords.length > 0 && nonChords <= chords.length ? chords : [];
}

export function splitSections(txt) {
  const out = [];
  let cur = null;
  for (const raw of txt.split(/\r?\n/)) {
    const m = raw.match(/^\[(.+?)\]/);
    if (m) { cur = { section: m[1], lines: [] }; out.push(cur); }
    else if (cur) cur.lines.push(raw);
  }
  return out;
}

function pcOf(root) {
  const m = root.match(/^([A-G][#b]?)(.*)$/);
  if (!m || !(m[1] in PC)) throw new Error(`bad chord root: ${root}`);
  return { pc: PC[m[1]], qual: m[2] || '' };
}

export function voicing(sym, center = 60) {
  const [main, bass] = sym.split('/');
  const { pc, qual } = pcOf(main);
  const ivs = QUALITIES[qual] ?? QUALITIES[qual.replace(/^maj/, '')] ?? QUALITIES[''];
  // stack triad/7th starting at root nearest-below (or equal) center
  let root = center - ((center % 12 - pc + 12) % 12);
  const notes = ivs.map(iv => root + iv);
  if (bass) {
    const bpc = pcOf(bass).pc;
    const bnote = root - 24 + ((bpc - (root % 12) + 12) % 12);
    return [bnote, ...notes];
  }
  return notes;
}
