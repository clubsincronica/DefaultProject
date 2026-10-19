const fs = require('fs'), z = require('zlib');
function decodeData(hex) {
  const b = Buffer.from(hex.replace(/\s+/g, ''), 'hex');
  return b.toString('utf16le').replace(/\0+$/, '');
}
function dump(label, block) {
  console.log('\n----- ' + label + ' -----');
  console.log(block.slice(0, 1600));
  const dataHex = (block.match(/<Data>([\s\S]*?)<\/Data>/) ?? [])[1];
  if (dataHex) {
    const full = decodeData(dataHex);
    console.log('DATA decoded:', JSON.stringify(full.slice(0, 300)));
  }
}
// 1) NEW WAM.als: first FileRef of type 1 (wav) and first of type 3
const raw1 = z.gunzipSync(fs.readFileSync('C:/Users/tom_w/Music/NEW WAM Project/NEW WAM.als')).toString('utf8');
let count = { 1: 0, 3: 0, 5: 0 };
for (const m of raw1.matchAll(/<FileRef>([\s\S]*?)<\/FileRef>/g)) {
  const t = ((m[1].match(/<RelativePathType Value="(\d+)" \/>/) ?? [])[1]) ?? '?';
  if (count[t] !== undefined && count[t] < 1) {
    count[t]++;
    const nm = (m[1].match(/<Name Value="([^"]*)"/) ?? [])[1];
    dump(`NEW WAM type=${t} name=${nm}`, m[0]);
  }
}
// 2) donor audio-clip.xml (template) full FileRefs
const donor = fs.readFileSync('C:/Users/tom_w/Documents/Default Project/cancionero-rojo/ableton/donors/audio-clip.xml', 'utf8');
let i = 0;
for (const m of donor.matchAll(/<FileRef(?: Id="\d+")?>([\s\S]*?)<\/FileRef>/g)) {
  dump(`donor audio-clip.xml FileRef #${i}`, m[0]);
  if (++i >= 3) break;
}
