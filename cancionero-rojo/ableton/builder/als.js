import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync, gzipSync } from 'node:zlib';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';

const P = new XMLParser({
  preserveOrder: true,
  ignoreAttributes: false,
  attributeName: '@_',
  allowBooleanAttributes: true,
  trimValues: false,
});
const B = new XMLBuilder({
  preserveOrder: true,
  ignoreAttributes: false,
  attributeName: '@_',
  allowBooleanAttributes: true,
  processEntities: true,
});

export function parseAls(buf) {
  const raw = buf[0] === 0x1f && buf[1] === 0x8b ? gunzipSync(buf) : buf;
  const xml = raw.toString('utf8');
  return { xml, tree: P.parse(xml), raw: buf };
}

export function buildAls(state) {
  const built = B.build(state.tree);
  // B.build already emits <?xml?> if tree has ?xml node; avoid double header
  if (built.trimStart().startsWith('<?xml')) return built;
  return '<?xml version="1.0" encoding="utf-8"?>' + built;
}

export function saveAls(state, outPath) {
  writeFileSync(outPath, gzipSync(Buffer.from(buildAls(state), 'utf8')));
}

export function inventoryXml(xml) {
  return {
    scenes: (xml.match(/<Scene Id=/g) ?? []).length,
    tracks: [...xml.matchAll(/<EffectiveName Value="([^"]*)"/g)].map((m) => m[1]),
  };
}

// Task-description aliases: loadAls / query / findTrackBody
export function loadAls(path) {
  const buf = readFileSync(path);
  const state = parseAls(buf);
  // also expose gzip/raw per brief's description
  return { ...state, path, gzip: buf, raw: state.xml, buffer: buf };
}

export function query(state) {
  const xml = typeof state === 'string' ? state : state.xml ?? buildAls(state);
  return inventoryXml(xml);
}

export function findTrackBody(xml, name) {
  // Find track block that contains EffectiveName Value="<name>"
  // Search for <MidiTrack / AudioTrack / GroupTrack / ReturnTrack with that name
  const needle = `<EffectiveName Value="${name}"`;
  const idx = xml.indexOf(needle);
  if (idx < 0) return null;
  // find enclosing track open tag backwards
  const trackOpenRe = /<(Midi|Audio|Group|Return)Track Id="\d+">/g;
  let start = -1;
  let type = null;
  let m;
  while ((m = trackOpenRe.exec(xml)) !== null) {
    if (m.index < idx && xml.indexOf(`</${m[1]}Track>`, m.index) > idx) {
      start = m.index;
      type = m[1];
    }
    if (m.index > idx) break;
  }
  if (start < 0) return null;
  const end = xml.indexOf(`</${type}Track>`, idx) + `</${type}Track>`.length;
  return { start, end, type };
}

export function setSceneNames(state, names) {
  const scenes = [];
  const walk = (arr) => {
    if (!Array.isArray(arr)) return;
    for (const obj of arr) {
      if (obj.Scene) scenes.push(obj);
      for (const [k, v] of Object.entries(obj)) {
        if (k === ':@') continue;
        if (Array.isArray(v)) walk(v);
      }
    }
  };
  walk(state.tree);
  if (scenes.length < names.length) throw new Error(`only ${scenes.length} scenes, need ${names.length}`);
  names.forEach((nm, i) => {
    const sceneObj = scenes[i];
    const sceneChildren = sceneObj.Scene;
    if (!Array.isArray(sceneChildren)) return;
    let nameNode = sceneChildren.find((x) => x.Name);
    if (!nameNode) {
      sceneChildren.unshift({ Name: [{ EffectiveName: [], ':@': { '@_Value': nm } }] });
      return;
    }
    const nameChildren = nameNode.Name;
    if (!Array.isArray(nameChildren)) return;
    let effNode = nameChildren.find((x) => 'EffectiveName' in x);
    if (effNode) {
      if (!effNode[':@']) effNode[':@'] = {};
      effNode[':@']['@_Value'] = nm;
      // also handle legacy representation where attribute stored as child element
      // ensure no stale '@_Value' inside array child
      if (Array.isArray(effNode.EffectiveName) && effNode.EffectiveName.length > 0) {
        const first = effNode.EffectiveName[0];
        if (first && typeof first === 'object' && '@_Value' in first) {
          first['@_Value'] = nm;
        }
      }
    } else {
      nameChildren.unshift({ EffectiveName: [], ':@': { '@_Value': nm } });
    }
  });
  // also patch state.xml for convenience if caller uses regex inventory
  try {
    state.xml = buildAls(state);
  } catch {}
}

export { readFileSync };
