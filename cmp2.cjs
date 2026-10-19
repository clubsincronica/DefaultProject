const fs = require('fs');
const z = require('zlib');
const DONOR = 'C:/Users/tom_w/Music/_Serato_/Program/Live/Resources/Core Library/Lessons/Sets/Live 10 Suite Empty.als';
const d = z.gunzipSync(fs.readFileSync(DONOR)).toString('utf8');
const t1 = z.gunzipSync(fs.readFileSync('C:/Users/tom_w/Documents/Default Project/cancionero-rojo/ableton/.tmp/bisect/t1.als')).toString('utf8');
const t2 = z.gunzipSync(fs.readFileSync('C:/Users/tom_w/Documents/Default Project/cancionero-rojo/ableton/.tmp/bisect/t2.als')).toString('utf8');
const m = z.gunzipSync(fs.readFileSync('C:/Users/tom_w/Documents/Default Project/cancionero-rojo/ableton/.tmp/bisect/m-both.als')).toString('utf8');
const maxOf = s => Math.max(...[...s.matchAll(/\bId="(\d+)"/g)].map(x => +x[1]));
const idsOf = s => new Set([...s.matchAll(/\bId="(\d+)"/g)].map(x => +x[1]));
console.log('max donor', maxOf(d), 'max t1', maxOf(t1), 'max t2', maxOf(t2), 'max m-both', maxOf(m));
const donorIds = idsOf(d);
for (const [name, x] of [['t1', t1], ['m-both', m], ['t2', t2]]) {
  const fresh = [...idsOf(x)].filter(i => i > maxOf(d));
  console.log(name, 'ids > donorMax:', fresh.length, 'range', Math.min(...fresh), '..', Math.max(...fresh));
  const coll = [...idsOf(x)].filter(i => donorIds.has(i) && i > 165216);
  console.log(name, 'collisions in high range:', coll.slice(0, 10));
}
console.log('165352 in donor?', donorIds.has(165352), '165217 in donor?', donorIds.has(165217));
