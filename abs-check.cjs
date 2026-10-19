const fs = require('fs'), z = require('zlib');
const files = [
  'C:/Users/tom_w/Music/_Serato_/Program/Live/Resources/Core Library/Lessons/Sets/Live 10 Suite Empty.als',
  'C:/Users/tom_w/Documents/Default Project/cancionero-rojo/ableton/template.als',
  'C:/Users/tom_w/Documents/Default Project/cancionero-rojo/songs/je-veux/output/je-veux.als',
];
for (const f of files) {
  const x = z.gunzipSync(fs.readFileSync(f)).toString('utf8');
  const m = [...x.matchAll(/<RelativePathElement[^>]*Dir="([A-Za-z]:[^"]*)/g)];
  console.log(f.split('/').pop(), 'abs RelativePathElement:', m.length);
  for (const k of [...new Set(m.map(k => k[1]))].slice(0, 8)) console.log('  ', k);
}
