#!/usr/bin/env node
// build-template.js — genera ableton/template.als a partir del donor oficial
// "Live 10 Suite Empty.als" (SOLO LECTURA). Spec: task-9-brief.md (10 transforms).
// Descubrimiento de rutas XML: ableton/xml-map.md (Task 10).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { gunzipSync, gzipSync } from 'node:zlib';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { XMLValidator } from 'fast-xml-parser';
import { inventory } from './inspect-als.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const DONOR = 'C:/Users/tom_w/Music/_Serato_/Program/Live/Resources/Core Library/Lessons/Sets/Live 10 Suite Empty.als';
const OUT = resolve(ROOT, 'ableton/template.als');

const EOL = '\n';
const SCENE_COUNT = 16;
const SLOT_COUNT = 16;
// Send "silenciado": el floor que el propio donor almacena (10^-3.5).
const SEND_FLOOR = '0.0003162277571';

// Elementos cuyo Id es un INDICE local (se repiten por diseño en todo el donor:
// slots 0..6 por lista, lanes, eventos, paths...). Nunca se renumeran.
const INDEX_LIKE = new Set([
  'ClipSlot', 'AutomationLane', 'TrackSendHolder', 'GroupTrackSlot', 'SendPreBool',
  'WarpMarker', 'AutomationEnvelope', 'ClipEnvelope', 'FloatEvent', 'BoolEvent',
  'EnumEvent', 'KeyTrack', 'DrumBranch', 'InstrumentBranch', 'MultiSamplePart',
  'RemoteableTimeSignature', 'MidiClip', 'AudioClip', 'Groove', 'BranchSourceContext',
  'SourceContext', 'RelativePathElement', 'FilePresetRef', 'AbletonDefaultPresetRef',
]);

const ROSTER = [
  { name: 'Mic Lead',  srcId: '96', input: { target: 'AudioIn/External/M0', lower: '1' }, monitor: '0', sends: { 0: '0.15', 1: '0.15' } },
  { name: 'Mic Guest', srcId: '93', input: { target: 'AudioIn/External/M1', lower: '2' }, monitor: '0', sends: { 0: '0.15', 1: '0.15' } },
  { name: 'Keys',      srcId: '78' },
  { name: 'Guitar',    srcId: '79' },
  { name: 'Bass',      srcId: '72' },
  { name: 'Perc',      srcId: '95' },
  { name: 'Strings',   srcId: '98', sends: { 0: '0.2' } },
  { name: 'Texture',   cloneOf: '96', sends: { 0: '0.2' } },
];
const RETURNS = [
  { name: 'A-Reverb', srcId: '2' },
  { name: 'B-Delay',  srcId: '3' },
];

const TAG_RE = /<([A-Za-z][A-Za-z0-9.]*)\s[^>]*?\bId="(\d+)"[^>]*>/g;

function fail(msg) { throw new Error(msg); }
function assert(cond, msg) { if (!cond) fail(msg); }

function buildIndex(xml) {
  const idx = new Map();
  for (const m of xml.matchAll(TAG_RE)) {
    let ids = idx.get(m[1]);
    if (!ids) { ids = new Set(); idx.set(m[1], ids); }
    ids.add(m[2]);
  }
  return idx;
}

// Clona un subarbol renumerando TODO Id cuyo valor ya exista en el documento
// bajo el mismo nombre de elemento (los index-like nunca se tocan). Los
// <PointeeId Value> internos se actualizan en la misma tanda.
function cloneRenumber(srcText, docIndex, nextId) {
  const byNameId = new Map(); // `${name}\u0000${id}` -> newId
  const byId = new Map();     // id -> Set(newId) (para PointeeId)
  const seen = new Map();     // conteo de (name,id) dentro del clon
  for (const m of srcText.matchAll(TAG_RE)) {
    const key = `${m[1]}\u0000${m[2]}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  for (const m of srcText.matchAll(TAG_RE)) {
    const [, name, id] = m;
    if (INDEX_LIKE.has(name)) continue;
    const key = `${name}\u0000${id}`;
    // (name,id) repetido dentro del clon => ese id es indice local para ese
    // nombre (p.ej. dos <FileRef Id="0"> en la misma pista): no se renumera.
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
      assert(n.size === 1, `PointeeId ${id} ambiguo (${n.size} destinos)`);
      return `<PointeeId Value="${[...n][0]}" />`;
    });
  }
  return out;
}

function extractTracks(xml) {
  const out = [];
  const re = /<(Midi|Audio|Group|Return)Track Id="(\d+)">/g;
  for (const m of xml.matchAll(re)) {
    const close = `</${m[1]}Track>`;
    const closeIdx = xml.indexOf(close, m.index);
    assert(closeIdx > 0, `sin cierre ${close}`);
    const lineStart = xml.lastIndexOf(EOL, m.index) + 1;
    const lineEnd = closeIdx + close.length;
    out.push({ type: m[1], id: m[2], text: xml.slice(lineStart, lineEnd) });
  }
  return out;
}

function extractElement(xml, tag, nth = 0) {
  const open = `<${tag} `;
  let i = -1;
  for (let n = 0; n <= nth; n++) {
    i = xml.indexOf(open, i + 1);
    assert(i >= 0, `no encuentro ocurrencia ${nth} de <${tag}`);
  }
  const close = `</${tag}>`;
  const end = xml.indexOf(close, i);
  assert(end > i, `sin cierre ${close}`);
  const lineStart = xml.lastIndexOf(EOL, i) + 1;
  return xml.slice(lineStart, end + close.length);
}

function indentOfLine(text, idx) {
  const lineStart = text.lastIndexOf(EOL, idx) + 1;
  return text.slice(lineStart, idx);
}

function renameTrack(text, name) {
  const out = text
    .replace(/<EffectiveName Value="[^"]*" \/>/, `<EffectiveName Value="${name}" />`)
    .replace(/<UserName Value="[^"]*" \/>/, `<UserName Value="${name}" />`);
  assert(out.includes(`<EffectiveName Value="${name}" />`), `rename falló: ${name}`);
  return out;
}

function rewriteRouting(text, tag, buildInner) {
  const re = new RegExp(`<${tag}>[\\s\\S]*?</${tag}>`);
  const m = text.match(re);
  assert(m, `sin <${tag}>`);
  const openIdx = text.indexOf(m[0]);
  const closeTabs = indentOfLine(text, openIdx);
  const tabs = closeTabs + '\t';
  return text.replace(re, `<${tag}>${EOL}${buildInner(tabs)}${EOL}${closeTabs}</${tag}>`);
}

function setTrackOutputToMaster(text) {
  if (!text.includes('AudioOut/GroupTrack')) return text;
  return rewriteRouting(text, 'AudioOutputRouting', (t) => [
    `${t}<Target Value="AudioOut/Master" />`,
    `${t}<UpperDisplayString Value="Master" />`,
    `${t}<LowerDisplayString Value="" />`,
  ].join(EOL));
}

function setTrackInput(text, { target, lower }) {
  return rewriteRouting(text, 'AudioInputRouting', (t) => [
    `${t}<Target Value="${target}" />`,
    `${t}<UpperDisplayString Value="Ext. In" />`,
    `${t}<LowerDisplayString Value="${lower}" />`,
  ].join(EOL));
}

function setSend(text, holderId, value, label = '') {
  const re = new RegExp(`(<TrackSendHolder Id="${holderId}">[\\s\\S]*?<Manual Value=")[^"]*(")`);
  assert(re.test(text), `sin TrackSendHolder Id=${holderId} en ${label} (len=${text.length} holders=${(text.match(/<TrackSendHolder/g) ?? []).length})`);
  return text.replace(re, `$1${value}$2`);
}

function emptySlotTemplate(indent, id) {
  const t = indent;
  return [
    `${t}<ClipSlot Id="${id}">`,
    `${t}\t<LomId Value="0" />`,
    `${t}\t<ClipSlot>`,
    `${t}\t\t<Value />`,
    `${t}\t</ClipSlot>`,
    `${t}\t<HasStop Value="true" />`,
    `${t}\t<NeedRefreeze Value="true" />`,
    `${t}</ClipSlot>`,
  ].join(EOL);
}

// Quita clips de sesion (deja slots vacios) y lleva cada ClipSlotList a 16 slots.
function normalizeClipSlots(text) {
  return text.replace(/<ClipSlotList>([\s\S]*?)<\/ClipSlotList>/g, (whole, inner) => {
    const slots = [];
    let depth = 0, start = -1;
    const re = /<ClipSlot(?:\s[^>]*)?>|<\/ClipSlot>/g;
    let m;
    while ((m = re.exec(inner)) !== null) {
      if (m[0].startsWith('</')) {
        depth--;
        assert(depth >= 0, 'ClipSlot desbalanceado');
        if (depth === 0) slots.push({ start, end: m.index + m[0].length });
      } else {
        if (depth === 0) start = m.index;
        depth++;
      }
    }
    assert(depth === 0 && slots.length > 0, 'ClipSlotList sin slots');
    const first = slots[0], last = slots[slots.length - 1];
    const indent = indentOfLine(inner, first.start);
    const firstLineStart = inner.lastIndexOf(EOL, first.start) + 1;
    const head = inner.slice(0, firstLineStart);
    const tail = inner.slice(last.end);
    const out = slots.map((s) => {
      const body = inner.slice(s.start, s.end);
      if (body.includes('<MidiClip ') || body.includes('<AudioClip ')) {
        const id = body.match(/^<ClipSlot Id="(\d+)">/)[1];
        return emptySlotTemplate(indent, id);
      }
      return indent + body;
    });
    for (let id = slots.length; id < SLOT_COUNT; id++) {
      out.push(emptySlotTemplate(indent, String(id)));
    }
    assert(out.length === SLOT_COUNT, `slots=${out.length}`);
    return `<ClipSlotList>${head}${out.join(EOL)}${tail}</ClipSlotList>`;
  });
}

// Defensa: arrangement vacio (solo tocamos ArrangerAutomation de pistas).
function emptyArrangement(text) {
  return text.replace(/<ArrangerAutomation>([\s\S]*?)<\/ArrangerAutomation>/g, (whole, inner) => {
    if (/<Events\s*\/>/.test(inner)) return whole;
    return `<ArrangerAutomation>${inner.replace(
      /<Events>[\s\S]*?<\/Events>/,
      `<Events />`,
    )}</ArrangerAutomation>`;
  });
}

function setParamInBlock(text, block, value) {
  const re = new RegExp(`(<${block}>[\\s\\S]*?<Manual Value=")[^"]*(")`);
  assert(re.test(text), `sin bloque <${block}>`);
  return text.replace(re, `$1${value}$2`);
}

function reindent(text, tabs) {
  return text.split(EOL).map((l) => (l.startsWith('\t') ? l.slice(tabs) : l)).join(EOL);
}

function processTrack(text, entry) {
  let t = renameTrack(text, entry.name);
  t = t.replace(/<TrackGroupId Value="-?\d+" \/>/, '<TrackGroupId Value="-1" />');
  t = setTrackOutputToMaster(t);
  if (entry.input) t = setTrackInput(t, entry.input);
  if (entry.monitor) t = t.replace(/<MonitoringEnum Value="\d+" \/>/g, `<MonitoringEnum Value="${entry.monitor}" />`);
  // Receta: mics A/B=0.15, Strings/Texture A=0.2; el resto silenciado al floor
  // (borra sends de la lección del donor que no están en la receta).
  t = setSend(t, '0', entry.sends?.[0] ?? SEND_FLOOR, entry.name);
  t = setSend(t, '1', entry.sends?.[1] ?? SEND_FLOOR, entry.name);
  t = normalizeClipSlots(t);
  t = emptyArrangement(t);
  return t;
}

// ---------------------------------------------------------------- validations
function dupPairs(xml) {
  const seen = new Map(), dups = new Set();
  for (const m of xml.matchAll(TAG_RE)) {
    const k = `${m[1]}\u0000${m[2]}`;
    if (seen.has(k)) dups.add(k); else seen.set(k, true);
  }
  return dups;
}

function validate(xml, donorXml) {
  const problems = [];

  const wellformed = XMLValidator.validate(xml);
  if (wellformed !== true) problems.push(`XML invalido: ${JSON.stringify(wellformed)}`);

  const inv = inventory(xml);
  const names = ROSTER.map((r) => r.name);
  const gotNames = inv.tracks.map((t) => t.name);
  if (JSON.stringify(gotNames) !== JSON.stringify(names)) {
    problems.push(`tracks != roster: ${JSON.stringify(gotNames)}`);
  }
  if (inv.scenes !== SCENE_COUNT) problems.push(`scenes=${inv.scenes}`);
  if (inv.returns !== 2) problems.push(`returns=${inv.returns}`);

  const ids = new Set([...xml.matchAll(/\bId="(\d+)"/g)].map((m) => m[1]));
  const unresolved = [...xml.matchAll(/<PointeeId Value="(\d+)" \/>/g)]
    .map((m) => m[1]).filter((v) => !ids.has(v));
  if (unresolved.length) problems.push(`PointeeId sin resolver: ${[...new Set(unresolved)].join(',')}`);

  const donorDups = dupPairs(donorXml);
  for (const k of dupPairs(xml)) {
    const [name] = k.split('\u0000');
    if (INDEX_LIKE.has(name)) continue;
    if (!donorDups.has(k)) problems.push(`Id duplicado nuevo: ${k.replace('\u0000', ' id=')}`);
  }

  if (xml.includes('AudioOut/GroupTrack')) problems.push('queda salida a GroupTrack');
  if (/<TrackGroupId Value="85" \/>/.test(xml)) problems.push('queda referencia al grupo 85');

  for (const m of xml.matchAll(/<(Midi|Audio)Track Id="\d+">([\s\S]*?)<\/\1Track>/g)) {
    const n = (m[2].match(/<ClipSlot Id="/g) ?? []).length;
    if (n !== SLOT_COUNT * 2) problems.push(`track ${m[2].match(/EffectiveName Value="([^"]*)"/)?.[1]} slots=${n}`);
  }

  const sceneNames = [...xml.matchAll(/<Scene Id="\d+" Value="([^"]*)"/g)].map((m) => m[1]);
  if (sceneNames.length !== SCENE_COUNT || sceneNames.some((v) => v !== '')) {
    problems.push(`scene names: ${JSON.stringify(sceneNames)}`);
  }

  // Extraction precisa por pista (el regex tonto puede cruzar pistas).
  const trackByName = (name) => {
    const at = xml.indexOf(`<EffectiveName Value="${name}" />`);
    if (at < 0) return '';
    const open = xml.lastIndexOf('<AudioTrack Id=', at);
    const close = xml.indexOf('</AudioTrack>', at);
    return open >= 0 && close > open ? xml.slice(open, close + 13) : '';
  };
  const micLead = trackByName('Mic Lead');
  const micGuest = trackByName('Mic Guest');
  if (!/AudioIn\/External\/M0/.test(micLead) || !/<MonitoringEnum Value="0" \/>/.test(micLead)) {
    problems.push('Mic Lead sin M0/monitor In');
  }
  if (!/AudioIn\/External\/M1/.test(micGuest) || !/<MonitoringEnum Value="0" \/>/.test(micGuest)) {
    problems.push('Mic Guest sin M1/monitor In');
  }

  // Sends: solo los valores de la receta (mics .15, Strings/Texture .2, resto floor).
  const allowed = new Set(['0.15', '0.2', SEND_FLOOR]);
  for (const sm of xml.matchAll(/<TrackSendHolder Id="\d+">[\s\S]*?<Manual Value="([^"]*)"/g)) {
    if (!allowed.has(sm[1])) problems.push(`send inesperado: ${sm[1]}`);
  }

  const master = xml.match(/<MasterTrack>[\s\S]*?<\/MasterTrack>/)?.[0] ?? '';
  if (!master.includes('<AutoFilter ') || !master.includes('<Echo ')) problems.push('master sin AutoFilter/Echo');
  if (/<Cutoff>[\s\S]*?<Manual Value="133.25" \/>/.test(master) === false) problems.push('AutoFilter Cutoff != 18k');
  if (/<DryWet>[\s\S]*?<Manual Value="0" \/>/.test(master) === false) problems.push('Echo DryWet != 0');

  const retA = xml.match(/<ReturnTrack Id="\d+">[\s\S]*?<\/ReturnTrack>/)?.[0] ?? '';
  if (!retA.includes('EffectiveName Value="A-Reverb"')) problems.push('return A sin renombrar');
  const retB = [...xml.matchAll(/<ReturnTrack Id="\d+">[\s\S]*?<\/ReturnTrack>/g)].pop()?.[0] ?? '';
  if (!retB.includes('EffectiveName Value="B-Delay"')) problems.push('return B sin renombrar');

  if (xml.includes('Value="Scene 1"')) problems.push('quedan nombres de escena de donador');

  return problems;
}

// ------------------------------------------------------------------------ main
function main() {
  const donorBuf = readFileSync(DONOR);
  const donorXml = gunzipSync(donorBuf).toString('utf8');
  assert(donorXml.startsWith('<?xml'), 'donor no es XML');
  let xml = donorXml;

  const donorInv = inventory(donorXml);
  assert(donorInv.tracks.length === 15 && donorInv.scenes === 7 && donorInv.returns === 2,
    `donor inesperado: ${donorInv.tracks.length}p/${donorInv.scenes}e/${donorInv.returns}r`);

  const maxSeen = Math.max(...[...donorXml.matchAll(/\bId="(\d+)"/g)].map((m) => +m[1]));
  let counter = maxSeen;
  const nextId = () => ++counter;

  const docIndex = buildIndex(xml);
  const donorTracks = new Map(extractTracks(xml).map((t) => [t.id, t]));
  assert(donorTracks.get('96')?.type === 'Audio', 'donor 96 no es AudioTrack');

  // 1. Subarbol clonado: Texture = copia de "10 Vocals 1" con Ids renumerados.
  const textureText = cloneRenumber(donorTracks.get('96').text, docIndex, nextId);

  // 2. Trasplantes de devices al master (AutoFilter #2 y Echo #1, de pistas que
  //    se borran; se renumeran igualmente contra el documento vivo).
  let autoDev = cloneRenumber(extractElement(xml, 'AutoFilter', 1), docIndex, nextId);
  let echoDev = cloneRenumber(extractElement(xml, 'Echo', 0), docIndex, nextId);
  autoDev = reindent(autoDev, 1);
  echoDev = reindent(echoDev, 1);
  autoDev = setParamInBlock(autoDev, 'Cutoff', '133.25'); // 18k (escala log del donor)
  echoDev = setParamInBlock(echoDev, 'DryWet', '0');

  const mtStart = xml.indexOf('<MasterTrack>');
  const mtEnd = xml.indexOf('</MasterTrack>', mtStart);
  assert(mtStart >= 0 && mtEnd > mtStart, 'sin MasterTrack');
  let master = xml.slice(mtStart, mtEnd);
  const devClose = master.indexOf('</Devices>');
  assert(devClose > 0, 'master sin <Devices>');
  const closeIndent = '\t'.repeat(5);
  const devIndent = '\t'.repeat(6);
  master = master.slice(0, devClose)
    + autoDev + EOL + devIndent + echoDev + EOL + closeIndent
    + master.slice(devClose);
  xml = xml.slice(0, mtStart) + master + xml.slice(mtEnd);

  // 3. Escenas: 7 -> 16, nombres vacios, Ids nuevos.
  const snStart = xml.indexOf('<SceneNames>');
  const snEnd = xml.indexOf('</SceneNames>', snStart);
  assert(snStart >= 0 && snEnd > snStart, 'sin SceneNames');
  const sceneBlock = xml.slice(snStart, snEnd);
  const sceneOpen = sceneBlock.indexOf('<Scene Id=');
  const sceneClose = sceneBlock.indexOf('</Scene>', sceneOpen) + '</Scene>'.length;
  const sceneTpl = sceneBlock.slice(sceneOpen, sceneClose)
    .replace(/(<Scene Id="\d+" Value=")[^"]*(")/, '$1$2');
  const scenes = [];
  let cursor = sceneOpen;
  while (true) {
    const o = sceneBlock.indexOf('<Scene Id=', cursor);
    if (o < 0) break;
    const c = sceneBlock.indexOf('</Scene>', o) + '</Scene>'.length;
    const raw = sceneBlock.slice(o, c);
    scenes.push(raw.replace(/(<Scene Id="\d+" Value=")[^"]*(")/, '$1$2'));
    cursor = c;
  }
  assert(scenes.length === 7, `scenes donor=${scenes.length}`);
  while (scenes.length < SCENE_COUNT) {
    scenes.push(sceneTpl.replace(/(<Scene Id=")\d+(")/, (m, a, b) => `${a}${nextId()}${b}`));
  }
  const sceneIndent = indentOfLine(sceneBlock, sceneOpen);
  const snCloseIndent = indentOfLine(sceneBlock, snEnd);
  xml = xml.slice(0, snStart) + '<SceneNames>' + EOL
    + scenes.map((s) => sceneIndent + s).join(EOL) + EOL
    + snCloseIndent + xml.slice(snEnd);

  // 4. Pistas: roster en orden + returns al final.
  const byId = donorTracks;
  const segments = [];
  for (const entry of ROSTER) {
    const src = entry.cloneOf ? textureText : byId.get(entry.srcId)?.text;
    assert(src, `falta pista fuente ${entry.srcId ?? entry.cloneOf}`);
    segments.push(processTrack(src, entry));
  }
  for (const entry of RETURNS) {
    const src = byId.get(entry.srcId)?.text;
    assert(src, `falta return ${entry.srcId}`);
    segments.push(renameTrack(src, entry.name));
  }

  const tStart = xml.indexOf('<Tracks>');
  const tEnd = xml.indexOf('</Tracks>', tStart) + '</Tracks>'.length;
  assert(tStart >= 0 && tEnd > tStart, 'sin <Tracks>');
  xml = xml.slice(0, tStart) + '<Tracks>' + EOL
    + segments.join(EOL) + EOL + '\t\t'
    + xml.slice(tEnd - '</Tracks>'.length);

  // 5. NextPointeeId por encima de todo Id usado.
  const npm = xml.match(/<NextPointeeId Value="(\d+)" \/>/);
  assert(npm, 'sin NextPointeeId');
  if (counter >= +npm[1]) {
    xml = xml.replace(/<NextPointeeId Value="\d+" \/>/, `<NextPointeeId Value="${counter + 1}" />`);
  }

  // 6. Validaciones (no se escribe nada si algo falla).
  const problems = validate(xml, donorXml);
  if (problems.length) {
    mkdirSync(resolve(ROOT, 'ableton/.tmp'), { recursive: true });
    writeFileSync(resolve(ROOT, 'ableton/.tmp/failed.xml'), xml);
    console.error('VALIDACION fallida (volcado en ableton/.tmp/failed.xml):');
    for (const p of problems) console.error('  - ' + p);
    process.exit(1);
  }

  const gz = gzipSync(Buffer.from(xml, 'utf8'));
  const back = gunzipSync(gz).toString('utf8');
  assert(back === xml, 'gzip roundtrip != xml');
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, gz);

  const inv = inventory(gz);
  console.log(JSON.stringify({
    out: OUT,
    bytes: gz.length,
    xmlBytes: xml.length,
    tracks: inv.tracks.map((t) => `${t.name}(${t.type},${t.clipSlots} slots,${t.devices} dev)`),
    scenes: inv.scenes, returns: inv.returns, tempo: inv.tempo,
    freshIds: counter - maxSeen,
    nextPointeeId: npm[1],
  }, null, 2));
}

main();
