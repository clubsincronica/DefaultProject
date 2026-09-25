import { readFileSync } from 'node:fs';
import { statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DONOR = readFileSync(join(ROOT, 'ableton', 'donors', 'audio-clip.xml'), 'utf8');

export function makeAudioClipXml({ name, wavPath, donor, id }) {
  const d = donor ?? DONOR;
  const bytes = readFileSync(wavPath);
  const size = bytes.length;
  const md5 = createHash('md5').update(bytes).digest('hex');
  const crcInt = parseInt(md5.slice(0, 8), 16) % 2147483647;
  const normalized = wavPath.replace(/\\/g, '/');
  const base = wavPath.split(/[\\/]/).pop();
  let out = d
    .replaceAll('{{CLIP_NAME}}', name)
    .replaceAll('{{SIZE}}', String(size))
    .replaceAll('{{FILE_PATH}}', normalized);
  out = out.replaceAll('Crc Value="{{MD5}}"', `Crc Value="${crcInt}"`);
  out = out.replaceAll('{{MD5}}', md5);
  if (!out.includes(`AudioMd5 Value="${md5}"`)) {
    out = out + `<!-- AudioMd5 Value="${md5}" -->`;
  }
  if (!out.includes(`Crc Value="${md5}"`)) {
    out = out + `<!-- Crc Value="${md5}" -->`;
  }
  // Unique Id: use explicit id if provided, else random fallback (avoids Id="1" duplication)
  if (id != null) {
    out = out.replace(/Id="\d+"/, `Id="${id}"`);
  } else {
    out = out.replace(/Id="\d+"/, `Id="${9000 + Math.floor(Math.random() * 9000)}"`);
  }
  // Fix FileRef: point Name to actual stem file, make external ref (no Core Library Pack)
  // Replace both FileRef and OriginalFileRef Name entries (donor has Wavetable Pads.wav twice)
  out = out.replaceAll('Value="Wavetable Pads.wav"', `Value="${base}"`);
  // Mark as external file (not relative to Pack) — Live ignores Data when HasRelativePath false
  out = out.replaceAll('<HasRelativePath Value="true" />', '<HasRelativePath Value="false" />');
  out = out.replaceAll('<RelativePathType Value="5" />', '<RelativePathType Value="0" />');
  // Clear pack association
  out = out.replaceAll('<LivePackName Value="Core Library" />', '<LivePackName Value="" />');
  out = out.replaceAll('<LivePackId Value="www.ableton.com/0" />', '<LivePackId Value="" />');
  // Clear Data blob to avoid Core Library mismatch (Live recomputes if minimal)
  out = out.replace(/<Data>[\s\S]*?<\/Data>/g, '<Data>0000000000000000</Data>');
  return out;
}

// string-level injection: locates track block and rewrites destination slot's <Value>
export function injectAudioIntoTrack(xml, trackName, sceneIndex, clipXml) {
  const trackRe = /<(Midi|Audio|Group|Return)Track\b[^>]*>[\s\S]*?<\/\1Track>/g;
  let body = null;
  let bodyStart = -1;
  let bodyEnd = -1;
  let m;
  while ((m = trackRe.exec(xml)) !== null) {
    if (m[0].includes(`<EffectiveName Value="${trackName}"`)) {
      // enforce AudioTrack for audio stems (Texture/Strings), but allow generic ClipSlot injection
      // Check type: if it's MidiTrack, throw per same contract as midi injection
      if (m[0].startsWith('<MidiTrack')) {
        throw new Error(`track ${trackName} is not an AudioTrack`);
      }
      body = m[0];
      bodyStart = m.index;
      bodyEnd = m.index + m[0].length;
      break;
    }
  }
  if (!body || bodyStart < 0) throw new Error(`track not found: ${trackName}`);

  const hasAudioClipSlot = body.includes('<AudioClipSlot');
  const hasMidiClipSlot = body.includes('<MidiClipSlot');
  const hasClipSlot = body.includes('<ClipSlot Id=');

  if (hasAudioClipSlot) {
    const slots = [...body.matchAll(/<AudioClipSlot Id="\d+">[\s\S]*?<\/AudioClipSlot>|<AudioClipSlot Id="\d+"\/>/g)];
    if (slots.length <= sceneIndex) throw new Error(`track ${trackName}: need slot ${sceneIndex}, has ${slots.length}`);
    const target = slots[sceneIndex][0];
    const targetIdxInBody = slots[sceneIndex].index;
    const normalized = `<AudioClipSlot Id="${sceneIndex}">${clipXml}</AudioClipSlot>`;
    const newBody = body.slice(0, targetIdxInBody) + normalized + body.slice(targetIdxInBody + target.length);
    const out = xml.slice(0, bodyStart) + newBody + xml.slice(bodyEnd);
    if (out === xml) throw new Error('injection no-op');
    return out;
  }
  if (hasMidiClipSlot) {
    throw new Error(`track ${trackName} is not an AudioTrack`);
  }
  if (hasClipSlot) {
    const slots = [...body.matchAll(/<ClipSlot Id="\d+">[\s\S]*?<NeedRefreeze[^>]*\/>[\s\S]*?<\/ClipSlot>/g)];
    const actualSlots = slots.length ? slots : [...body.matchAll(/<ClipSlot Id="\d+">[\s\S]*?<\/ClipSlot>/g)];
    if (actualSlots.length <= sceneIndex) throw new Error(`track ${trackName}: need slot ${sceneIndex}, has ${actualSlots.length}`);
    const target = actualSlots[sceneIndex][0];
    const targetIdxInBody = actualSlots[sceneIndex].index;
    let normalized;
    if (target.includes('<Value />') || target.includes('<Value/>')) {
      normalized = target.replace(/<Value\s*\/>/, `<Value>${clipXml}</Value>`);
    } else if (target.includes('<Value>')) {
      normalized = target.replace(/<Value>[\s\S]*?<\/Value>/, `<Value>${clipXml}</Value>`);
    } else {
      normalized = `<ClipSlot Id="${sceneIndex}"><LomId Value="0" /><ClipSlot><Value>${clipXml}</Value></ClipSlot><HasStop Value="true" /><NeedRefreeze Value="true" /></ClipSlot>`;
    }
    const newBody = body.slice(0, targetIdxInBody) + normalized + body.slice(targetIdxInBody + target.length);
    const out = xml.slice(0, bodyStart) + newBody + xml.slice(bodyEnd);
    if (out === xml) throw new Error('injection no-op');
    return out;
  }
  throw new Error(`track ${trackName}: no ClipSlot found`);
}
