const fs = require('fs');
const z = require('zlib');

function load(p) {
  const b = fs.readFileSync(p);
  return (b[0] === 0x1f && b[1] === 0x8b ? z.gunzipSync(b) : b).toString('utf8');
}
const targets = ['<MidiTrack', '<DeviceChain', '</DeviceChain>', '<Devices>', '</Devices>', '<MidiToAudioDeviceChain', '</MidiToAudioDeviceChain>', '<ReturnTrack', '<GroupTrack', '<MasterTrack'];
for (const [name, p] of [
  ['LIGHT', 'C:/Users/tom_w/AppData/Local/Temp/opencode/tpl-c4dee4e.als'],
  ['FULL', 'C:/Users/tom_w/AppData/Local/Temp/opencode/tpl-f6f6aa8.als'],
]) {
  console.log('===== ' + name);
  const lines = load(p).split('\n');
  lines.forEach((l, i) => {
    const t = l.trim();
    for (const tg of targets) {
      if (t.startsWith(tg)) { const depth = l.length - l.trimStart().length; console.log((i + 1) + ' d' + depth + ': ' + t.slice(0, 70)); break; }
    }
  });
}
