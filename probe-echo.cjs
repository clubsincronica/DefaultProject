const fs = require('fs');
const z = require('zlib');
const ROOT = 'C:/Users/tom_w/Documents/Default Project/cancionero-rojo/';
const f = process.argv[2] || ROOT + 'ableton/.tmp/bisect/m-echo.als';
const xml = z.gunzipSync(fs.readFileSync(f)).toString('utf8');
const DONOR = 'C:/Users/tom_w/Music/_Serato_/Program/Live/Resources/Core Library/Lessons/Sets/Live 10 Suite Empty.als';
const donor = z.gunzipSync(fs.readFileSync(DONOR)).toString('utf8');
const maxDonor = Math.max(...[...donor.matchAll(/\bId="(\d+)"/g)].map(m => +m[1]));
const ids = [...xml.matchAll(/\bId="(\d+)"/g)].map(m => +m[1]);
console.log('file', f, 'xmlLen', xml.length, 'maxDonor', maxDonor, 'maxHere', Math.max(...ids));
const dup = new Map();
for (const id of ids) dup.set(id, (dup.get(id) ?? 0) + 1);
const dups = [...dup].filter(([, n]) => n > 1);
console.log('duplicate Id values:', dups.length);
for (const [id, n] of dups.slice(0, 20)) {
  const positions = [];
  let i = -1;
  while ((i = xml.indexOf(`Id="${id}"`, i + 1)) >= 0) {
    const ls = xml.lastIndexOf('\n', i) + 1;
    positions.push(xml.slice(ls, xml.indexOf('\n', i)).trim().slice(0, 100));
  }
  console.log(`  Id=${id} x${n}:`, JSON.stringify(positions));
}
// Echo elements
for (const m of xml.matchAll(/<Echo Id="(\d+)">/g)) console.log('Echo Id=', m[1]);
for (const m of xml.matchAll(/<AutoFilter Id="(\d+)">/g)) console.log('AutoFilter Id=', m[1]);
