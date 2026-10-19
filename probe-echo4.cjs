const fs = require('fs');
const z = require('zlib');
const EOL = '\n';

const ROOT = 'C:/Users/tom_w/Documents/Default Project/cancionero-rojo/';
const DONOR = 'C:/Users/tom_w/Music/_Serato_/Program/Live/Resources/Core Library/Lessons/Sets/Live 10 Suite Empty.als';
const outDir = ROOT + 'ableton/.tmp/bisect/';

const donorXml = z.gunzipSync(fs.readFileSync(DONOR)).toString('utf8');
const t1Xml = z.gunzipSync(fs.readFileSync(outDir + 't1.als')).toString('utf8');

const TAG_RE = /<([A-Za-z][A-Za-z0-9.]*)\s[^>]*?\bId="(\d+)"[^>]*>/g;
const INDEX_LIKE = new Set([
  'ClipSlot', 'AutomationLane', 'TrackSendHolder', 'GroupTrackSlot', 'SendPreBool',
  'WarpMarker', 'AutomationEnvelope', 'ClipEnvelope', 'FloatEvent', 'BoolEvent',
  'EnumEvent', 'KeyTrack', 'DrumBranch', 'InstrumentBranch', 'MultiSamplePart',
  'RemoteableTimeSignature', 'MidiClip', 'AudioClip', 'Groove', 'BranchSourceContext',
  'SourceContext', 'RelativePathElement', 'FilePresetRef', 'AbletonDefaultPresetRef',
]);
function buildIndex(xml) {
  const idx = new Map();
  for (const m of xml.matchAll(TAG_RE)) {
    let ids = idx.get(m[1]);
    if (!ids) { ids = new Set(); idx.set(m[1], ids); }
    ids.add(m[2]);
  }
  return idx;
}
function cloneRenumber(srcText, docIndex, nextId) {
  const byNameId = new Map(), byId = new Map(), seen = new Map();
  for (const m of srcText.matchAll(TAG_RE)) {
    const key = `${m[1]}\u0000${m[2]}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  for (const m of srcText.matchAll(TAG_RE)) {
    const [, name, id] = m;
    if (INDEX_LIKE.has(name)) continue;
    const key = `${name}\u0000${id}`;
    if (seen.get(key) > 1) continue;
    if (byNameId.has(key)) continue;
    const ids = docIndex.get(name);
    if (ids && ids.has(id)) {
      const nid = String(nextId());
      byNameId.set(key, nid);
      if (!byId.has(id)) byId.set(id, new Set());
      byId.get(id).add(nid);
    }
  }
  let out = srcText;
  if (byNameId.size) {
    out = out.replace(TAG_RE, (m, name, id) => {
      const nid = byNameId.get(`${name}\u0000${id}`);
      return nid ? m.replace(`Id="${id}"`, `Id="${nid}"`) : m;
    });
    out = out.replace(/<PointeeId Value="(\d+)" \/>/g, (m, id) => {
      const n = byId.get(id);
      if (!n) return m;
      if (n.size !== 1) throw new Error('PointeeId ambiguo ' + id);
      return `<PointeeId Value="${[...n][0]}" />`;
    });
  }
  return out;
}
function extractElement(xml, tag, nth = 0) {
  const open = `<${tag} `;
  let i = -1;
  for (let n = 0; n <= nth; n++) { i = xml.indexOf(open, i + 1); if (i < 0) throw new Error('no encuentro ' + tag); }
  const close = `</${tag}>`;
  const end = xml.indexOf(close, i);
  if (end <= i) throw new Error('sin cierre ' + tag);
  const lineStart = xml.lastIndexOf(EOL, i) + 1;
  return xml.slice(lineStart, end + close.length);
}
const buildSrc = fs.readFileSync(ROOT + 'scripts/build-template.js', 'utf8');
function realFn(name) {
  const start = buildSrc.indexOf(`function ${name}(`);
  if (start < 0) throw new Error('missing ' + name);
  let depth = 0;
  for (let j = buildSrc.indexOf('{', start); j < buildSrc.length; j++) {
    if (buildSrc[j] === '{') depth++;
    else if (buildSrc[j] === '}') { depth--; if (depth === 0) return buildSrc.slice(start, j + 1); }
  }
}
const assert = (c, m) => { if (!c) throw new Error(m); };
const setParamInBlock = new Function('EOL', 'assert', 'return ' + realFn('setParamInBlock'))(EOL, assert);
const reindent = new Function('EOL', 'assert', 'return ' + realFn('reindent'))(EOL, assert);

const docIndex = buildIndex(donorXml);
const baseMax = Math.max(...[...t1Xml.matchAll(/\bId="(\d+)"/g)].map((m) => +m[1]));

function buildEchoVariant(nth, drywet) {
  let xml = t1Xml;
  let counter = baseMax;
  const nextId = () => ++counter;
  let dev = cloneRenumber(extractElement(donorXml, 'Echo', nth), docIndex, nextId);
  dev = reindent(dev, 1);
  if (drywet !== null) dev = setParamInBlock(dev, 'DryWet', drywet);
  const mtStart = xml.indexOf('<MasterTrack>');
  const mtEnd = xml.indexOf('</MasterTrack>', mtStart);
  let master = xml.slice(mtStart, mtEnd);
  const devClose = master.indexOf('</Devices>');
  const closeIndent = '\t'.repeat(5);
  const devIndent = '\t'.repeat(6);
  master = master.slice(0, devClose) + dev + EOL + closeIndent + master.slice(devClose);
  return xml.slice(0, mtStart) + master + xml.slice(mtEnd);
}

const jobs = [
  [0, null, 'e0-raw'],   // nested Echo (Id=11), sin DryWet edit
  [1, '0', 'e1-top'],    // top-level Echo (Id=29), con DryWet edit
  [0, '0', 'e0-dw'],     // = m-echo reference (should match)
];
for (const [nth, dw, name] of jobs) {
  const x = buildEchoVariant(nth, dw);
  fs.writeFileSync(outDir + name + '.als', z.gzipSync(Buffer.from(x, 'utf8')));
  console.log('wrote', name, x.length);
}
const mEcho = z.gunzipSync(fs.readFileSync(outDir + 'm-echo.als')).toString('utf8');
console.log('e0-dw == m-echo ?', buildEchoVariant(0, '0') === mEcho);
