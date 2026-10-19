const fs = require('fs'), z = require('zlib');
const files = [
  'C:/Users/tom_w/Music/NEW WAM Project/NEW WAM.als',
  'C:/Users/tom_w/Music/GRABETA YO SOY TU/GRABETA YO SOY TU.als',
  'C:/Users/tom_w/Music/Linea Directa - Maia/Sin título Project/Sin título.als',
];
function decodeData(hex) {
  try {
    const b = Buffer.from(hex.trim(), 'hex');
    const s = b.toString('utf16le').replace(/\0+$/, '');
    return s;
  } catch (e) { return '(decode fail)'; }
}
for (const f of files) {
  let raw;
  try { raw = z.gunzipSync(fs.readFileSync(f)).toString('utf8'); }
  catch (e) { console.log(f, 'gunzip fail:', e.message); continue; }
  const sigs = new Map();
  let n = 0, sample = null;
  const re = /<FileRef>([\s\S]*?)<\/FileRef>/g;
  let m;
  while ((m = re.exec(raw)) && n < 4000) {
    const b = m[1];
    const hasRel = (b.match(/<HasRelativePath Value="(\d)" \/>/) ?? [])[1];
    const type = (b.match(/<RelativePathType Value="(\d+)" \/>/) ?? [])[1];
    const rpChild = /<RelativePath>([\s\S]*?)<\/RelativePath>/.exec(b);
    const dirs = rpChild ? [...rpChild[1].matchAll(/Dir="([^"]*)"/g)].map(x => x[1]) : null;
    const rpAttr = (b.match(/<RelativePath Value="([^"]*)" \/>/) ?? [])[1];
    const pathEl = (b.match(/<Path Value="([^"]*)" \/>/) ?? [])[1];
    const name = (b.match(/<Name Value="([^"]*)" \/>/) ?? [])[1];
    const dataHex = (b.match(/<Data>([\s\S]*?)<\/Data>/) ?? [])[1];
    const bcp = (b.match(/<BrowserContentPath Value="([^"]*)" \/>/) ?? [])[1];
    const sig = `rel=${hasRel} type=${type} childDirs=${dirs ? 'y' : 'n'} attrRP=${rpAttr ? 'y' : 'n'} path=${pathEl ? 'y' : 'n'} bcp=${bcp ? 'y' : 'n'} data=${dataHex ? dataHex.trim().length + 'ch' : 'n'}`;
    sigs.set(sig, (sigs.get(sig) ?? 0) + 1);
    if (!sample || (dirs && dirs.some(d => /^[A-Za-z]:$/.test(d) || /^$/.test(d) && dirs.length > 1)) && !sample.hasAbs) {
      sample = {
        hasAbs: dirs && (dirs.some(d => /^[A-Za-z]:/.test(d)) || dirs[0] === ''),
        hasRel, type, dirs, rpAttr, pathEl, name, bcp,
        dataHex: dataHex ? dataHex.trim().slice(0, 120) : null,
        dataDecoded: dataHex ? decodeData(dataHex) : null,
      };
    }
    n++;
  }
  console.log('\n===', f.split('/').pop(), `(${n} FileRefs)`);
  for (const [s, c] of [...sigs].sort((a, b) => b[1] - a[1])) console.log(`  ${c}x ${s}`);
  if (sample) console.log('  sample:', JSON.stringify(sample, null, 2).replace(/\n/g, '\n  '));
}
