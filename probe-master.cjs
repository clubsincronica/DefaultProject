const fs = require('fs');
const z = require('zlib');
const EOL = '\n';

const ROOT = 'C:/Users/tom_w/Documents/Default Project/cancionero-rojo/';
const DONOR = 'C:/Users/tom_w/Music/_Serato_/Program/Live/Resources/Core Library/Lessons/Sets/Live 10 Suite Empty.als';
const outDir = ROOT + 'ableton/.tmp/bisect/';

const donorXml = z.gunzipSync(fs.readFileSync(DONOR)).toString('utf8');
const t1Xml = z.gunzipSync(fs.readFileSync(outDir + 't1.als')).toString('utf8');

function TAG_RE() { return /<([A-Za-z][A-Za-z0-9.]*)\s[^>]*?\bId="(\d+)"[^>]*>/g; }
const INDEX_LIKE = new Set([
  'ClipSlot', 'AutomationLane', 'TrackSendHolder', 'GroupTrackSlot', 'SendPreBool',
  'WarpMarker', 'AutomationEnvelope', 'ClipEnvelope', 'FloatEvent', 'BoolEvent',
  'EnumEvent', 'KeyTrack', 'DrumBranch', 'InstrumentBranch', 'MultiSamplePart',
  'RemoteableTimeSignature', 'MidiClip', 'AudioClip', 'Groove', 'BranchSourceContext',
  'SourceContext', 'RelativePathElement', 'FilePresetRef', 'AbletonDefaultPresetRef',
]);
function buildIndex(xml) {
  const idx = new Map();
  for (const m of xml.matchAll(TAG_RE())) {
    let ids = idx.get(m[1]);
    if (!ids) { ids = new Set(); idx.set(m[1], ids); }
    ids.add(m[2]);
  }
  return idx;
}
function cloneRenumber(srcText, docIndex, nextId) {
  const byNameId = new Map(), byId = new Map(), seen = new Map();
  for (const m of srcText.matchAll(TAG_RE())) {
    const key = `${m[1]}\u0000${m[2]}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  for (const m of srcText.matchAll(TAG_RE())) {
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
    out = out.replace(TAG_RE(), (m, name, id) => {
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
// real setParamInBlock/reindent extracted from build-template.js below
const buildSrc = fs.readFileSync(ROOT + 'scripts/build-template.js', 'utf8');
function realFn(name) {
  const start = buildSrc.indexOf(`function ${name}(`);
  if (start < 0) throw new Error('missing ' + name);
  let depth = 0, i = buildSrc.indexOf('{', start);
  for (let j = i; j < buildSrc.length; j++) {
    if (buildSrc[j] === '{') depth++;
    else if (buildSrc[j] === '}') { depth--; if (depth === 0) return buildSrc.slice(start, j + 1); }
  }
}
const setParamInBlockSrc = realFn('setParamInBlock');
const reindentSrc = realFn('reindent');
const mkAssert = (cond, msg) => { if (!cond) throw new Error(msg); };
const setParamInBlock = new Function('EOL', 'assert', 'return ' + setParamInBlockSrc)(EOL, mkAssert);
const reindent = new Function('EOL', 'assert', 'return ' + reindentSrc)(EOL, mkAssert);

const docIndex = buildIndex(donorXml);
const baseMax = Math.max(...[...t1Xml.matchAll(/\bId="(\d+)"/g)].map((m) => +m[1]));

function insertDevices(xml, devs) {
  const mtStart = xml.indexOf('<MasterTrack>');
  const mtEnd = xml.indexOf('</MasterTrack>', mtStart);
  let master = xml.slice(mtStart, mtEnd);
  const devClose = master.indexOf('</Devices>');
  if (devClose < 0) throw new Error('master sin Devices');
  const closeIndent = '\t'.repeat(5);
  const devIndent = '\t'.repeat(6);
  master = master.slice(0, devClose) + devs.map(d => d + EOL + devIndent).join('').slice(0, -0)
    + master.slice(devClose);
  // exact same shape as builder: autoDev + EOL + devIndent + echoDev + EOL + closeIndent
  return xml.slice(0, mtStart) + master + xml.slice(mtEnd);
}
function buildVariant(mode) {
  let xml = t1Xml;
  let counter = baseMax;
  const nextId = () => ++counter;
  const parts = [];
  if (mode.includes('a')) {
    let dev = cloneRenumber(extractElement(donorXml, 'AutoFilter', 1), docIndex, nextId);
    dev = reindent(dev, 1);
    dev = setParamInBlock(dev, 'Cutoff', '133.25');
    parts.push(dev);
  }
  if (mode.includes('e')) {
    let dev = cloneRenumber(extractElement(donorXml, 'Echo', 0), docIndex, nextId);
    dev = reindent(dev, 1);
    dev = setParamInBlock(dev, 'DryWet', '0');
    parts.push(dev);
  }
  if (!parts.length) return xml;
  const mtStart = xml.indexOf('<MasterTrack>');
  const mtEnd = xml.indexOf('</MasterTrack>', mtStart);
  let master = xml.slice(mtStart, mtEnd);
  const devClose = master.indexOf('</Devices>');
  const closeIndent = '\t'.repeat(5);
  const devIndent = '\t'.repeat(6);
  const block = parts.join(EOL + devIndent);
  master = master.slice(0, devClose) + block + EOL + closeIndent + master.slice(devClose);
  return xml.slice(0, mtStart) + master + xml.slice(mtEnd);
}

for (const [mode, name] of [['a', 'm-auto'], ['e', 'm-echo'], ['ae', 'm-both']]) {
  const x = buildVariant(mode);
  fs.writeFileSync(outDir + name + '.als', z.gzipSync(Buffer.from(x, 'utf8')));
  console.log('wrote', name, x.length);
}
const t2 = z.gunzipSync(fs.readFileSync(outDir + 't2.als')).toString('utf8');
console.log('m-both == t2 ?', buildVariant('ae') === t2);
