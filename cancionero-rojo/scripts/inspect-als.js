import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const TAG = /<(\/?)([A-Za-z][A-Za-z0-9]*)((?:[^>"]|"[^"]*")*?)(\s*\/)?>/g;

function countTopDevices(xml) {
  const st = [];
  let devLvl = -1;
  let n = 0;
  for (const m of xml.matchAll(TAG)) {
    const [, close, name, , selfClose] = m;
    if (close) {
      st.pop();
      if (st.length === devLvl) devLvl = -1;
      continue;
    }
    if (devLvl >= 0 && st.length === devLvl + 1) n++;
    if (name === 'Devices' && !selfClose) {
      if (devLvl < 0) devLvl = st.length;
      st.push(name);
      continue;
    }
    if (!selfClose) st.push(name);
  }
  return n;
}

export function inventory(input) {
  let buf = Buffer.isBuffer(input) ? input : Buffer.from(input, 'utf8');
  if (buf[0] === 0x1f && buf[1] === 0x8b) buf = gunzipSync(buf);
  const xml = buf.toString('utf8');
  const tracks = [];
  for (const m of xml.matchAll(/<(Midi|Audio)Track(?:\s[^>]*)?>([\s\S]*?)<\/\1Track>/g)) {
    const [, type, body] = m;
    const name = body.match(/<EffectiveName Value="([^"]*)"/)?.[1] ?? '?';
    const scope = body.match(/<MainSequencer[^>]*>[\s\S]*?<\/MainSequencer>/)?.[0] ?? body;
    tracks.push({ name, type: type.toLowerCase(), clipSlots: (scope.match(/<\w*ClipSlot\s[^>]*Id=/g) ?? []).length,
                  devices: countTopDevices(body) });
  }
  const scenes = (xml.match(/<Scene Id=/g) ?? []).length;
  const locators = (xml.match(/<Locator /g) ?? []).length;
  return { tracks, scenes, locators,
           returns: (xml.match(/<ReturnTrack\s/g) ?? []).length,
           tempo: xml.match(/<Tempo[^>]*>[\s\S]*?<Manual Value="([\d.]+)"/)?.[1] };
}

if (process.argv[1]?.endsWith('inspect-als.js') && process.argv[2]) {
  const data = readFileSync(process.argv[2]);
  const inv = inventory(data);
  if (process.argv.includes('--json')) console.log(JSON.stringify(inv, null, 2));
  else {
    console.log(`tracks: ${inv.tracks.map(t => `${t.name}(${t.type},${t.clipSlots} slots)`).join(', ')}`);
    console.log(`scenes: ${inv.scenes}, locators: ${inv.locators}, tempo: ${inv.tempo}`);
  }
}
