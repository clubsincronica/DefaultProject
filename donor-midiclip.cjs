const { readFileSync } = require('fs');
const z = require('zlib');
const DONOR = 'C:/Users/tom_w/Music/_Serato_/Program/Live/Resources/Core Library/Lessons/Sets/Live 10 Suite Empty.als';
let b = readFileSync(DONOR);
if (b[0] === 0x1f && b[1] === 0x8b) b = z.gunzipSync(b);
const x = b.toString('utf8');
console.log('donor MidiClip count:', (x.match(/<MidiClip/g) || []).length);
const i = x.indexOf('<MidiClip');
if (i >= 0) {
  const j = x.indexOf('</MidiClip>', i);
  const clip = x.slice(i, j + 11);
  const n = clip.match(/<Notes>([\s\S]*?)<\/Notes>/);
  console.log('donor first clip Notes:', n ? n[1].trim().slice(0, 500) : 'no <Notes>..</Notes>');
  console.log('donor clip CurrentEnd:', (clip.match(/<CurrentEnd Value="([^"]*)"/) || [])[1]);
  const order = [];
  const seen = new Set();
  for (const m of clip.matchAll(/<([A-Za-z][A-Za-z0-9]*)\b[^>]*>/g)) {
    if (!seen.has(m[1])) { seen.add(m[1]); order.push(m[1]); }
  }
  console.log('donor clip tags:', order.join(','));
}
