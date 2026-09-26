import { readFileSync } from 'node:fs';
import { statSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DONOR = readFileSync(join(ROOT, 'ableton', 'donors', 'audio-clip.xml'), 'utf8');

// Replace every <tag>...</tag> block keeping each one's own indentation.
// buildInner(indent, blockIdx) returns the inner lines (without the open/close tag lines).
function replaceBlocks(xml, tag, buildInner) {
  let blockIdx = 0;
  return xml.replace(new RegExp(`<${tag}>[\\s\\S]*?</${tag}>`, 'g'), (m, off, str) => {
    const lineStart = str.lastIndexOf('\n', off) + 1;
    const indent = str.slice(lineStart, off);
    const inner = buildInner(indent, blockIdx++);
    return `<${tag}>\n${inner}\n${indent}</${tag}>`;
  });
}

function wrapHex(hex, indent) {
  const lines = [];
  for (let i = 0; i < hex.length; i += 80) lines.push(indent + hex.slice(i, i + 80));
  return lines.join('\n');
}

// Live 10 ground-truth FileRef for external audio (decoded from working sets:
// NEW WAM.als / GRABETA / Sin título.als):
//   HasRelativePath=true, RelativePathType=1, chain = dirs relative to the .als dir
//   (".." encoded as Dir=""), Data = UTF-16LE absolute path + null terminator,
//   PathHint = dir chain without drive (search fallback), Name = file name.
export function makeAudioClipXml({ name, wavPath, donor, id, setDir }) {
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
  let fileRefId = null;
  if (id != null) {
    out = out.replace(/Id="\d+"/, `Id="${id}"`);
    fileRefId = id + 5000; // inner FileRef offset keeps below NextPointeeId (max 165k +5k <173792)
  } else {
    const rnd = 9000 + Math.floor(Math.random() * 9000);
    out = out.replace(/Id="\d+"/, `Id="${rnd}"`);
    fileRefId = rnd + 5000;
  }
  // Renumber inner FileRef Id="21" (OriginalFileRef) to unique per clip — FileRef is not INDEX_LIKE
  if (fileRefId != null) {
    out = out.replace(/<FileRef Id="21"/, `<FileRef Id="${fileRefId}"`);
  }
  // Fix FileRef: point Name to actual stem file (both FileRef and OriginalFileRef)
  out = out.replaceAll('Value="Wavetable Pads.wav"', `Value="${base}"`);
  // Clear pack association (external file, not Core Library)
  out = out.replaceAll('<LivePackName Value="Core Library" />', '<LivePackName Value="" />');
  out = out.replaceAll('<LivePackId Value="www.ableton.com/0" />', '<LivePackId Value="" />');

  if (setDir) {
    const abs = resolve(wavPath);
    const relDir = dirname(relative(resolve(setDir), abs));
    const dirSegs = relDir === '.' ? [] : relDir.split(/[\\/]/);
    const encSegs = dirSegs.map((s) => (s === '..' ? '' : s));
    const hintSegs = abs.split(/[\\/]/).slice(1, -1);
    const dataHex = Buffer.concat([
      Buffer.from(abs, 'utf16le'),
      Buffer.from([0, 0]),
    ]).toString('hex').toUpperCase();

    // HasRelativePath stays donor=true (matches every working external ref)
    out = out.replaceAll('<RelativePathType Value="5" />', '<RelativePathType Value="1" />');
    out = replaceBlocks(out, 'RelativePath', (indent, bi) =>
      encSegs.length === 0
        ? `${indent}\t<!-- same-dir ref -->`
        : encSegs.map((seg, i) =>
            `${indent}\t<RelativePathElement Id="${40 + bi * 2 + i}" Dir="${seg}" />`
          ).join('\n')
    );
    out = replaceBlocks(out, 'Data', (indent) => wrapHex(dataHex, indent + '\t'));
    out = replaceBlocks(out, 'PathHint', (indent) =>
      hintSegs.map((seg, i) => `${indent}\t<RelativePathElement Id="${i}" Dir="${seg}" />`).join('\n')
    );
  } else {
    // Fallback (no setDir): legacy behavior — external flag off, Data zeroed.
    // Only used by tests that don't assert path fields.
    out = out.replaceAll('<HasRelativePath Value="true" />', '<HasRelativePath Value="false" />');
    out = out.replaceAll('<RelativePathType Value="5" />', '<RelativePathType Value="0" />');
    out = out.replace(/<Data>[\s\S]*?<\/Data>/g, '<Data>0000000000000000</Data>');
  }
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
