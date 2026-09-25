// Uso: node scripts/extract-donors.js <source.als>
// Extrae fragmentos reales de Live como donors, con placeholders.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const srcPath = process.argv[2];
if (!srcPath) {
  console.error('Usage: node scripts/extract-donors.js <source.als>');
  process.exit(1);
}
let buf;
try {
  buf = readFileSync(srcPath);
} catch (e) {
  console.error(`Cannot read ${srcPath}: ${e.message}`);
  process.exit(1);
}
const src = (buf[0] === 0x1f && buf[1] === 0x8b ? gunzipSync(buf) : buf).toString('utf8');
const out = join(ROOT, 'ableton', 'donors');
mkdirSync(out, { recursive: true });

function grab(re, label, transform = (x) => x) {
  const m = src.match(re);
  if (!m) {
    console.warn(`NOT FOUND: ${label}`);
    return false;
  }
  const transformed = transform(m[0]);
  writeFileSync(join(out, label + '.xml'), transformed);
  console.log(`donor: ${label}.xml (${m[0].length} bytes -> ${transformed.length} bytes)`);
  return true;
}

// MidiClip: notes + duration + clip name placeholders
grab(
  /<MidiClip Id="[\d]+"[\s\S]*?<\/MidiClip>/,
  'midi-clip',
  (s) =>
    s
      .replace(/(<Notes>)[\s\S]*?(<\/Notes>)/, '$1{{NOTES}}$2')
      .replace(/(<CurrentEnd Value=")[\d.]+(")/, '$1{{DUR_BEATS}}$2')
      .replace(/(<LoopEnd Value=")[\d.]+(")/, '$1{{DUR_BEATS}}$2')
      .replace(/(<OutMarker Value=")[\d.]+(")/, '$1{{DUR_BEATS}}$2')
      .replace(/(<Name Value=")[^"]*(")/, '$1{{CLIP_NAME}}$2')
      .replace(/(<Name>[\s\S]*?<EffectiveName Value=")[^"]*(")/, '$1{{CLIP_NAME}}$2'),
);

// AudioClip: file path, size, md5 + name (Live 10 stores via FileRef/BrowserContentPath/FileSize)
grab(
  /<AudioClip Id="[\d]+"[\s\S]*?<\/AudioClip>/,
  'audio-clip',
  (s) =>
    s
      .replace(/(<Path Value=")[^"]*(")/g, '$1{{FILE_PATH}}$2')
      .replace(/(<BrowserContentPath Value=")[^"]*(")/g, '$1{{FILE_PATH}}$2')
      .replace(/(<FileSize Value=")\d+(")/g, '$1{{SIZE}}$2')
      .replace(/(<Size Value=")\d+(")/g, '$1{{SIZE}}$2')
      .replace(/(<AudioMd5 Value=")[^"]*(")/g, '$1{{MD5}}$2')
      .replace(/(<Crc Value=")[^"]*(")/g, '$1{{MD5}}$2')
      .replace(/(<Name Value=")[^"]*(")/, '$1{{CLIP_NAME}}$2')
      .replace(/(<Name>[\s\S]*?<EffectiveName Value=")[^"]*(")/, '$1{{CLIP_NAME}}$2'),
);

// ClipEvent: midi + audio variants - grab first match and split by type
const midiEvent = src.match(/<MidiClipEvent Id="[\d]+"[\s\S]*?<\/MidiClipEvent>/);
const audioEvent = src.match(/<AudioClipEvent Id="[\d]+"[\s\S]*?<\/AudioClipEvent>/);
const genericEvent = src.match(/<(?:Midi|Audio)ClipEvent Id="[\d]+"[\s\S]*?<\/(?:Midi|Audio)ClipEvent>/);
if (midiEvent) {
  const t = midiEvent[0].replace(/(<Time Value=")[\d.\-]+(")/, '$1{{TIME}}$2');
  writeFileSync(join(out, 'clip-event-midi.xml'), t);
  console.log(`donor: clip-event-midi.xml (${midiEvent[0].length} bytes)`);
}
if (audioEvent) {
  const t = audioEvent[0].replace(/(<Time Value=")[\d.\-]+(")/, '$1{{TIME}}$2');
  writeFileSync(join(out, 'clip-event-audio.xml'), t);
  console.log(`donor: clip-event-audio.xml (${audioEvent[0].length} bytes)`);
}
if (!midiEvent && !audioEvent && genericEvent) {
  const isMidi = genericEvent[0].includes('MidiClipEvent');
  const label = isMidi ? 'clip-event-midi' : 'clip-event-audio';
  const t = genericEvent[0].replace(/(<Time Value=")[\d.\-]+(")/, '$1{{TIME}}$2');
  writeFileSync(join(out, label + '.xml'), t);
  writeFileSync(join(out, 'clip-event.xml'), t);
  console.log(`donor: ${label}.xml (${genericEvent[0].length} bytes)`);
} else if (genericEvent && (midiEvent || audioEvent)) {
  // also write generic alias from whichever exists
  const t = genericEvent[0].replace(/(<Time Value=")[\d.\-]+(")/, '$1{{TIME}}$2');
  writeFileSync(join(out, 'clip-event.xml'), t);
  console.log(`donor: clip-event.xml (${genericEvent[0].length} bytes)`);
}
if (!midiEvent && !audioEvent && !genericEvent) {
  console.warn('NOT FOUND: clip-event');
}

// Locator
grab(/<Locator Id="[\d]+"[\s\S]*?<\/Locator>/, 'locator', (s) =>
  s.replace(/(<Name Value=")[^"]*(")/, '$1{{LOC_NAME}}$2').replace(/(<Time Value=")[\d.\-]+(")/, '$1{{TIME}}$2'),
);

// also try Time placeholder for locator: already done
