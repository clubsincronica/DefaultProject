import fs from 'node:fs';
import zlib from 'node:zlib';
const A = zlib.gunzipSync(fs.readFileSync('cancionero-rojo/ableton/template.als')).toString('utf8');
const B = zlib.gunzipSync(fs.readFileSync('cancionero-rojo/songs/je-veux-empty/output/je-veux-empty.als')).toString('utf8');
// sizes of each MidiClip block
function blocks(s, tag) {
  const out = []; let i = 0;
  while ((i = s.indexOf(tag, i)) !== -1) {
    const end = s.indexOf('</' + tag.slice(1), i);
    out.push(s.slice(i, end === -1 ? i + 500 : end)); i = end + 2;
  }
  return out;
}
for (const tag of ['MidiClip', 'Scene', 'MainSequencer', 'ArrangerAutomation']) {
  const ba = blocks(A, '<' + tag), bb = blocks(B, '<' + tag);
  console.log(tag, 'blocks', ba.length, bb.length, 'bytesA', ba.map(x => x.length).join(','), 'bytesB', bb.map(x => x.length).join(','));
}
// NextPointeeId occurrences
let idx = -1;
while ((idx = B.indexOf('NextPointeeId', idx + 1)) !== -1) console.log('B NextPointeeId @', idx, JSON.stringify(B.slice(idx - 120, idx + 80)));
idx = -1;
while ((idx = A.indexOf('NextPointeeId', idx + 1)) !== -1) console.log('A NextPointeeId @', idx, JSON.stringify(A.slice(idx - 120, idx + 80)));
// find biggest divergence: sample line-based diff count
const la = A.split('\n'), lb = B.split('\n');
console.log('lines', la.length, lb.length);
let first = -1;
for (let i = 0; i < Math.min(la.length, lb.length); i++) if (la[i] !== lb[i]) { first = i; break; }
console.log('first differing line', first);
if (first >= 0) {
  for (let i = Math.max(0, first - 3); i <= Math.min(la.length, first + 8); i++) console.log('A' + i, JSON.stringify(la[i].slice(0, 160)));
  for (let i = Math.max(0, first - 3); i <= Math.min(lb.length, first + 8); i++) console.log('B' + i, JSON.stringify(lb[i].slice(0, 160)));
}
