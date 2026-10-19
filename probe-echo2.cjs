const fs = require('fs');
const z = require('zlib');
const DONOR = 'C:/Users/tom_w/Music/_Serato_/Program/Live/Resources/Core Library/Lessons/Sets/Live 10 Suite Empty.als';
const xml = z.gunzipSync(fs.readFileSync(DONOR)).toString('utf8');

function ctxOf(pos) {
  // nearest enclosing track-like tag
  const tags = ['<MasterTrack>', '<MidiTrack Id=', '<AudioTrack Id=', '<ReturnTrack Id=', '<GroupTrack Id='];
  let best = -1, bestTag = '';
  for (const t of tags) { const i = xml.lastIndexOf(t, pos); if (i > best) { best = i; bestTag = t; } }
  const closeIdx = xml.indexOf('</', best > 0 ? xml.lastIndexOf('<', pos) : 0);
  // enclosing device: last '<Xxx Id=' with depth... approximate: nearest preceding line starting with tabs+<Name Id= at device depth
  const lineStart = xml.lastIndexOf('\n', best) + 1;
  const trackHead = xml.slice(lineStart, xml.indexOf('\n', lineStart));
  // find nearest preceding device-ish open tag (line with '<Name Id="n">' not closing)
  let d = -1, dTag = '';
  const re = /\n\t{7}<([A-Za-z][A-Za-z0-9]*) Id="\d+">/g;
  let m; while ((m = re.exec(xml)) && m.index < pos) { d = m.index; dTag = m[1]; }
  return { trackHead: trackHead.trim(), nearestDevice: dTag, devPos: d };
}

for (const m of xml.matchAll(/<Echo Id="(\d+)">/g)) {
  const c = ctxOf(m.index);
  console.log(`Echo Id=${m[1]} @${m.index} track=${c.trackHead} nearestDev7=${c.nearestDevice}`);
}
for (const m of xml.matchAll(/<AutoFilter Id="(\d+)">/g)) {
  const c = ctxOf(m.index);
  console.log(`AutoFilter Id=${m[1]} @${m.index} track=${c.trackHead} nearestDev7=${c.nearestDevice}`);
}

// first Echo = nth 0
const first = xml.indexOf('<Echo ');
const end = xml.indexOf('</Echo>', first);
const echo0 = xml.slice(first, end);
console.log('\n--- echo0 length', echo0.length);
const dw = echo0.indexOf('<DryWet>');
console.log('first <DryWet> at offset', dw);
console.log(echo0.slice(Math.max(0, dw - 300), dw + 400));
