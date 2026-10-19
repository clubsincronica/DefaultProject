const { readFileSync } = require('fs');
const z = require('zlib');

function load(p) {
  let b = readFileSync(p);
  if (b[0] === 0x1f && b[1] === 0x8b) b = z.gunzipSync(b);
  return b.toString('utf8');
}

function firstMidiClip(xml, label) {
  const i = xml.indexOf('<MidiClip');
  if (i < 0) { console.log(`${label}: NO MidiClip`); return; }
  // match balanced-ish: find closing </MidiClip> after i
  const j = xml.indexOf('</MidiClip>', i);
  const clip = xml.slice(i, j + 11);
  console.log(`\n===== ${label} first MidiClip (${clip.length} bytes) =====`);
  // structural tags (first occurrence of each)
  const seen = new Set();
  const order = [];
  for (const m of clip.matchAll(/<([A-Za-z][A-Za-z0-9]*)\b[^>]*>/g)) {
    if (!seen.has(m[1])) { seen.add(m[1]); order.push(m[1]); }
  }
  console.log('tags:', order.join(','));
  for (const t of ['CurrentStart', 'CurrentEnd', 'LoopOn', 'LoopStart', 'LoopEnd', 'OutMarker', 'LaunchQuantisation', 'TimeSignature']) {
    const m = clip.match(new RegExp(`<${t}[^>]*Value="([^"]*)"`));
    console.log(`  ${t}=${m ? m[1] : 'ABSENT'}`);
  }
  const n = clip.match(/<Notes>([\s\S]*?)<\/Notes>/);
  if (n) console.log('  Notes inner head:', n[1].trim().slice(0, 300));
  else {
    const n2 = clip.match(/<Notes\b/);
    console.log('  Notes:', n2 ? 'present but no inner match' : 'ABSENT');
  }
}

firstMidiClip(load('cancionero-rojo/songs/je-veux/output/je-veux.als'), 'OUR je-veux');
firstMidiClip(load('C:/Users/tom_w/Music/NEW WAM Project/NEW WAM.als'), 'NEW WAM (user, works)');
firstMidiClip(load('C:/Users/tom_w/Music/GRABETA YO SOY TU/GRABETA YO SOY TU.als'), 'GRABETA (user, works)');
