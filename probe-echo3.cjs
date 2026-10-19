const fs = require('fs');
const z = require('zlib');
const DONOR = 'C:/Users/tom_w/Music/_Serato_/Program/Live/Resources/Core Library/Lessons/Sets/Live 10 Suite Empty.als';
const xml = z.gunzipSync(fs.readFileSync(DONOR)).toString('utf8');
const interest = /<(\/?)(MidiTrack|AudioTrack|ReturnTrack|MasterTrack|GroupTrack|Devices|DeviceChain|AudioEffectBranch|MidiEffectBranch|InstrumentGroupDevice|DrumGroupDevice|DrumPresetDevice|Chain|Echo|AutoFilter)\b[^>]*>/g;
const marks = [];
let m;
while ((m = interest.exec(xml))) marks.push({ i: m.index, close: m[1] === '/', tag: m[2] });
for (const em of xml.matchAll(/<Echo Id="(\d+)">/g)) {
  const depth = [];
  for (const mk of marks) {
    if (mk.i >= em.index) break;
    if (mk.close) { const j = depth.map(d => d).lastIndexOf(mk.tag); if (j >= 0) depth.splice(j, 1); }
    else depth.push(mk.tag);
  }
  const indent = (xml.slice(xml.lastIndexOf('\n', em.index) + 1, em.index).match(/\t/g) || []).length;
  console.log(`Echo Id=${em[1]} indent=${indent} stack: ${depth.join(' > ')}`);
}
