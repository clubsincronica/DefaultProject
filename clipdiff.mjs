import fs from 'node:fs';
import zlib from 'node:zlib';

const tpl = zlib.gunzipSync(fs.readFileSync('cancionero-rojo/ableton/template.als')).toString('utf8');
const midi = zlib.gunzipSync(fs.readFileSync('cancionero-rojo/songs/je-veux-midi-only/output/je-veux-midi-only.als')).toString('utf8');

function extractBlock(xml, startTag) {
  const i = xml.indexOf(startTag);
  if (i < 0) return null;
  let depth = 0, j = i;
  const re = /<\s*(\/?)([A-Za-z_][\w]*)((?:"[^"]*"|[^>"'])*)>/g;
  re.lastIndex = i;
  let m;
  while ((m = re.exec(xml))) {
    const closing = m[1] === '/';
    const selfClose = m[3].endsWith('/') || m[3].endsWith('/ ');
    if (closing) { depth--; if (depth === 0) return xml.slice(i, re.lastIndex); }
    else if (!selfClose) depth++;
  }
  return null;
}

function paths(block) {
  // returns list of tag path names in order of open (simplified): array of "path" strings
  const re = /<\s*(\/?)([A-Za-z_][\w]*)((?:"[^"]*"|[^>"'])*)>/g;
  const stack = [];
  const out = [];
  let m;
  while ((m = re.exec(block))) {
    const closing = m[1] === '/';
    const tag = m[2];
    const selfClose = m[3].endsWith('/') || m[3].endsWith('/ ');
    if (closing) stack.pop();
    else {
      out.push(stack.join('/') + '/' + tag);
      if (!selfClose) stack.push(tag);
    }
  }
  return out;
}

const orig = extractBlock(tpl, '<MidiClip Id="0"');
const inj = extractBlock(midi, '<MidiClip Id="165361"');
console.log('orig len', orig?.length, 'inj len', inj?.length);
const po = paths(orig), pi = paths(inj);
const so = new Set(po), si = new Set(pi);
const missing = po.filter(p => !si.has(p));
const extra = pi.filter(p => !so.has(p));
console.log('--- in ORIG but MISSING in INJECTED (count ' + new Set(missing).size + ') ---');
console.log([...new Set(missing)].join('\n'));
console.log('--- in INJECTED but not in ORIG (count ' + new Set(extra).size + ') ---');
console.log([...new Set(extra)].join('\n'));
