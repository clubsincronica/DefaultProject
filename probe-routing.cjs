const fs = require('fs');
const z = require('zlib');
const EOL = '\n';

const inPath = 'C:/Users/tom_w/Documents/Default Project/cancionero-rojo/ableton/.tmp/bisect/t6.als';
const outDir = 'C:/Users/tom_w/Documents/Default Project/cancionero-rojo/ableton/.tmp/bisect/';

const xml = z.gunzipSync(fs.readFileSync(inPath)).toString('utf8');

function rewriteRouting(text, tag, buildInner) {
  const re = new RegExp(`<${tag}>[\\s\\S]*?</${tag}>`);
  const m = text.match(re);
  if (!m) throw new Error('sin <' + tag + '>');
  const openIdx = text.indexOf(m[0]);
  const lineStart = text.lastIndexOf(EOL, openIdx) + 1;
  const closeTabs = text.slice(lineStart, openIdx);
  const tabs = closeTabs + '\t';
  return text.replace(re, `<${tag}>${EOL}${buildInner(tabs)}${EOL}${closeTabs}</${tag}>`);
}
function setTrackOutputToMaster(text) {
  if (!text.includes('AudioOut/GroupTrack')) return text;
  return rewriteRouting(text, 'AudioOutputRouting', t => [
    `${t}<Target Value="AudioOut/Master" />`,
    `${t}<UpperDisplayString Value="Master" />`,
    `${t}<LowerDisplayString Value="" />`,
  ].join(EOL));
}
function setTrackInput(text, target, lower) {
  return rewriteRouting(text, 'AudioInputRouting', t => [
    `${t}<Target Value="${target}" />`,
    `${t}<UpperDisplayString Value="Ext. In" />`,
    `${t}<LowerDisplayString Value="${lower}" />`,
  ].join(EOL));
}

// apply per-track transform over <MidiTrack>/<AudioTrack> segments
function mapTracks(x, fn) {
  const re = /<(Midi|Audio)Track Id="\d+">/g;
  const ranges = [];
  for (const m of x.matchAll(re)) {
    const close = `</${m[1]}Track>`;
    const end = x.indexOf(close, m.index);
    ranges.push([m.index, end + close.length]);
  }
  for (let i = ranges.length - 1; i >= 0; i--) {
    const [s, e] = ranges[i];
    const seg = x.slice(s, e);
    const out = fn(seg);
    if (out !== seg) x = x.slice(0, s) + out + x.slice(e);
  }
  return x;
}
const isMic = seg => /<EffectiveName Value="Mic (Lead|Guest)" \/>/.test(seg);

function variant(mode) {
  let x = xml;
  x = mapTracks(x, seg => {
    let t = seg;
    if (mode.includes('g')) t = t.replace(/<TrackGroupId Value="-?\d+" \/>/, '<TrackGroupId Value="-1" />');
    if (mode.includes('o')) t = setTrackOutputToMaster(t);
    if (mode.includes('i')) {
      if (/<EffectiveName Value="Mic Lead" \/>/.test(t)) t = setTrackInput(t, 'AudioIn/External/M0', '1');
      else if (/<EffectiveName Value="Mic Guest" \/>/.test(t)) t = setTrackInput(t, 'AudioIn/External/M1', '2');
    }
    if (mode.includes('m') && isMic(t)) t = t.replace(/<MonitoringEnum Value="\d+" \/>/g, '<MonitoringEnum Value="0" />');
    return t;
  });
  return x;
}

const variants = { 'g': 'r-g', 'go': 'r-gi' , 'goi': 'r-gio', 'gim': 'r-gim' };
// explicit list
const jobs = [
  ['g', 'r-g'],
  ['go', 'r-go'],
  ['gi', 'r-gi'],
  ['gm', 'r-gm'],
  ['goi', 'r-goi'],
  ['gim', 'r-gim'],
];
for (const [mode, name] of jobs) {
  const x = variant(mode);
  fs.writeFileSync(outDir + name + '.als', z.gzipSync(Buffer.from(x, 'utf8')));
  console.log('wrote', name, x.length);
}
// sanity: reproduce t7 with goim
const full = variant('goim');
fs.writeFileSync(outDir + 'r-all.als', z.gzipSync(Buffer.from(full, 'utf8')));
const t7 = z.gunzipSync(fs.readFileSync(outDir + 't7.als')).toString('utf8');
console.log('r-all == t7 ?', full === t7);
