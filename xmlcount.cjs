const fs = require('fs');
const z = require('zlib');

function load(p) {
  const b = fs.readFileSync(p);
  return (b[0] === 0x1f && b[1] === 0x8b ? z.gunzipSync(b) : b).toString('utf8');
}
const lightPath = 'C:/Users/tom_w/AppData/Local/Temp/opencode/tpl-c4dee4e.als';
const fullPath = 'C:/Users/tom_w/AppData/Local/Temp/opencode/tpl-f6f6aa8.als';
const light = load(lightPath);
const full = load(fullPath);

console.log('light line 7673:', JSON.stringify(light.split('\n')[7672]));
console.log('full  line 7673:', JSON.stringify(full.split('\n')[7672]));

for (const [name, xml] of [['light', light], ['full', full]]) {
  console.log('=== ' + name);
  const occ = s => xml.split(s).length - 1;
  for (const t of ['<MidiToAudioDeviceChain>', '</MidiToAudioDeviceChain>', '<DeviceChain>', '</DeviceChain>', '<Operator ', '</Operator>', '<Devices>', '</Devices>']) {
    console.log('  ' + t + ' : ' + occ(t));
  }
}
// show all MidiToAudioDeviceChain occurrences with line numbers in light
light.split('\n').forEach((l, i) => {
  if (l.includes('MidiToAudioDeviceChain')) console.log('light L' + (i + 1) + ': ' + l.trim().slice(0, 100));
});
