import fs from 'node:fs';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';
const req = createRequire('C:/Users/tom_w/Documents/Default Project/cancionero-rojo/package.json');
const { XMLValidator } = req('fast-xml-parser');

const files = {
  tpl: 'cancionero-rojo/ableton/template.als',
  midi: 'cancionero-rojo/songs/je-veux-midi-only/output/je-veux-midi-only.als',
};
const xml = {};
for (const k in files) xml[k] = zlib.gunzipSync(fs.readFileSync(files[k])).toString('utf8');

for (const k in files) {
  const r = XMLValidator.validate(xml[k]);
  console.log(k, 'wellformed:', r === true ? 'OK' : JSON.stringify(r).slice(0, 600));
}

const ids = [...xml.midi.matchAll(/<MidiClip Id="(\d+)"/g)].map(m => m[1]);
console.log('MidiClip ids:', ids.join(','));
const injectedId = ids.find(id => +id > 1000);
const i = xml.midi.indexOf(`<MidiClip Id="${injectedId}"`);
console.log('injected clip @', i);
console.log('--- 700 chars BEFORE ---');
console.log(JSON.stringify(xml.midi.slice(i - 700, i)));
console.log('--- clip head 1000 ---');
console.log(JSON.stringify(xml.midi.slice(i, i + 1000)));
