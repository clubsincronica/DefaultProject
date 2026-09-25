import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync, gunzipSync } from 'node:zlib';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DONOR = readFileSync(join(ROOT, 'ableton', 'donors', 'midi-clip.xml'), 'utf8');

// Convierte events del SMF builder (mismo formato que orca-to-mid) a Live MidiNoteEvent:
// Live 10 guarda Time/Duration en quarter-notes (float).
export function notesToLiveEvents(notes) {
  return notes.map(n =>
    `<MidiNoteEvent Time="${n.startBeat}" Duration="${n.durBeats}" Note="${n.note}" Velocity="${n.velocity}" />`).join('');
}

export function makeClipXml({ name, donor, notes, id }) {
  const d = donor ?? DONOR;
  const events = notesToLiveEvents(notes);
  const end = Math.max(...notes.map(n => n.startBeat + n.durBeats), 4);
  let xml = d
    .replace('{{NOTES}}', events)
    .replace(/\{\{DUR\}\}|Value="\{\{DUR_BEATS\}\}"/g, `Value="${end}"`)
    .replace(/(<Name(?:\.Value)? Value=")[^"]*(")/, `$1${name}$2`)
    .replace(/(<EffectiveName Value=")[^"]*(")/, `$1${name}$2`);
  if (id != null) {
    xml = xml.replace(/Id="\d+"/, `Id="${id}"`);
  } else {
    xml = xml.replace(/Id="\d+"/, `Id="${9000 + Math.floor(Math.random() * 900)}"`);
  }
  return xml;
}

// string-level injection: localiza el bloque del track y reescribe el slot destino
export function injectMidiIntoTrack(xml, trackName, sceneIndex, clipXml) {
  const trackRe = /<(Midi|Audio|Group|Return)Track\b[^>]*>[\s\S]*?<\/\1Track>/g;
  let body = null;
  let bodyStart = -1;
  let bodyEnd = -1;
  let m;
  while ((m = trackRe.exec(xml)) !== null) {
    if (m[0].includes(`<EffectiveName Value="${trackName}"`)) {
      if (!m[0].startsWith('<MidiTrack')) {
        throw new Error(`track ${trackName} is not a MidiTrack`);
      }
      body = m[0];
      bodyStart = m.index;
      bodyEnd = m.index + m[0].length;
      break;
    }
  }
  if (!body || bodyStart < 0) throw new Error(`track not found: ${trackName}`);
  const hasMidiClipSlot = body.includes('<MidiClipSlot');
  const hasClipSlot = body.includes('<ClipSlot Id=');
  if (hasMidiClipSlot) {
    const slots = [...body.matchAll(/<MidiClipSlot Id="\d+">[\s\S]*?<\/MidiClipSlot>|<MidiClipSlot Id="\d+"\/>/g)];
    if (slots.length <= sceneIndex) throw new Error(`track ${trackName}: need slot ${sceneIndex}, has ${slots.length}`);
    const mSlot = slots[sceneIndex];
    const target = mSlot[0];
    const targetIdxInBody = mSlot.index;
    const normalized = `<MidiClipSlot Id="${sceneIndex}">${clipXml}</MidiClipSlot>`;
    const newBody = body.slice(0, targetIdxInBody) + normalized + body.slice(targetIdxInBody + target.length);
    const out = xml.slice(0, bodyStart) + newBody + xml.slice(bodyEnd);
    if (out === xml) throw new Error('injection no-op');
    return out;
  }
  if (hasClipSlot) {
    const slots = [...body.matchAll(/<ClipSlot Id="\d+">[\s\S]*?<NeedRefreeze[^>]*\/>[\s\S]*?<\/ClipSlot>/g)];
    const actualSlots = slots.length ? slots : [...body.matchAll(/<ClipSlot Id="\d+">[\s\S]*?<\/ClipSlot>/g)];
    if (actualSlots.length <= sceneIndex) throw new Error(`track ${trackName}: need slot ${sceneIndex}, has ${actualSlots.length}`);
    const mSlot = actualSlots[sceneIndex];
    const target = mSlot[0];
    const targetIdxInBody = mSlot.index;
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

export function injectSession(state, { structure, tracks }) {
  const sceneNames = Array.isArray(structure)
    ? structure
    : (structure.scenes ?? structure.sections ?? []);
  const nameToIdx = new Map();
  sceneNames.forEach((s, i) => {
    const n = typeof s === 'string' ? s : (s.name ?? s);
    if (n) nameToIdx.set(n, i);
  });
  let xml = state.xml ?? '';
  if (!xml && state.tree) {
    // fallback: try to keep xml in sync later; for now treat missing xml as error
    throw new Error('state.xml missing and tree fallback not implemented — pass xml string');
  }
  for (const [trackName, sceneMap] of Object.entries(tracks ?? {})) {
    for (const [sceneName, midPath] of Object.entries(sceneMap)) {
      let idx = nameToIdx.get(sceneName);
      if (idx === undefined) {
        const parsed = parseInt(sceneName, 10);
        if (!Number.isNaN(parsed)) idx = parsed;
        else throw new Error(`scene not found in structure: ${sceneName}`);
      }
      let notes = [];
      try {
        const sidecar = midPath.endsWith('.json') ? midPath : midPath + '.json';
        const raw = readFileSync(sidecar, 'utf8');
        const j = JSON.parse(raw);
        notes = j.notes ?? j ?? [];
        if (!Array.isArray(notes)) notes = j.notes ?? [];
      } catch (e) {
        throw new Error(`cannot load notes sidecar for ${midPath}: ${e.message}`);
      }
      const clipXml = makeClipXml({ name: sceneName, donor: DONOR, notes });
      xml = injectMidiIntoTrack(xml, trackName, idx, clipXml);
    }
  }
  state.xml = xml;
  return state;
}

// CLI preview: node ableton/builder/inject-session.js <template.als> <structure.json> <sceneIdx> <track> <clip.mid> <out.als>
if (process.argv[1] && process.argv[1].endsWith('inject-session.js')) {
  const [templateAls, structureJson, sceneIdxStr, track, clipMid, outAls] = process.argv.slice(2);
  if (!templateAls || !outAls) {
    console.error('usage: node ableton/builder/inject-session.js <template.als> <structure.json> <sceneIdx> <track> <clip.mid> <out.als>');
    process.exit(1);
  }
  const rawIn = readFileSync(templateAls);
  let xml;
  try {
    xml = rawIn[0] === 0x1f && rawIn[1] === 0x8b ? gunzipSync(rawIn).toString('utf8') : rawIn.toString('utf8');
  } catch {
    xml = rawIn.toString('utf8');
  }
  let clipName = `Scene${sceneIdxStr}`;
  if (structureJson) {
    try {
      const struct = JSON.parse(readFileSync(structureJson, 'utf8'));
      const scenes = struct.scenes ?? struct.sections ?? [];
      const idx = parseInt(sceneIdxStr, 10);
      const s = scenes[idx];
      if (s) clipName = typeof s === 'string' ? s : (s.name ?? clipName);
    } catch {}
  }
  let notes = [];
  if (clipMid) {
    const sidecar = clipMid.endsWith('.json') ? clipMid : clipMid + '.json';
    try {
      const j = JSON.parse(readFileSync(sidecar, 'utf8'));
      notes = j.notes ?? [];
    } catch (e) {
      console.error(`cannot load notes sidecar ${sidecar}: ${e.message}`);
      process.exit(1);
    }
  }
  const sceneIdx = parseInt(sceneIdxStr, 10);
  const clipXml = makeClipXml({ name: clipName, donor: DONOR, notes });
  const outXml = injectMidiIntoTrack(xml, track, sceneIdx, clipXml);
  writeFileSync(outAls, gzipSync(Buffer.from(outXml, 'utf8')));
  console.log(`injected ${track} scene ${sceneIdx} (${clipName}) ${notes.length} notes -> ${outAls}`);
}
