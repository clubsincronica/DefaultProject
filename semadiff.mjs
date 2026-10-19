import fs from 'node:fs';
const norm = s => s
  .replace(/\s*\/>/g, ' />')
  .replace(/><\/([A-Za-z0-9_]+)>/g, ' />')
  .replace(/\r/g, '')
  .replace(/>\s+</g, '><')
  .replace(/\?>\s*</g, '?><');
const A = norm(fs.readFileSync('C:/Users/tom_w/AppData/Local/Temp/opencode/tpl.xml', 'utf8'));
const B = norm(fs.readFileSync('C:/Users/tom_w/AppData/Local/Temp/opencode/empty.xml', 'utf8'));
console.log('normalized equal:', A === B, 'lenA', A.length, 'lenB', B.length);
if (A !== B) {
  let i = 0;
  while (i < Math.min(A.length, B.length) && A[i] === B[i]) i++;
  console.log('first diff at', i);
  console.log('A:', JSON.stringify(A.slice(i - 200, i + 300)));
  console.log('B:', JSON.stringify(B.slice(i - 200, i + 300)));
  let last = 0; let count = 0;
  const spans = [];
  for (let k = 0; k < Math.min(A.length, B.length); k++) {
    if (A[k] !== B[k]) {
      if (count === 0) spans.push([k]);
      count++;
    } else if (count) { spans[spans.length - 1].push(k); spans[spans.length - 1].push(count); count = 0; }
  }
  console.log('diff spans:', spans.length);
  for (const sp of spans.slice(0, 10)) console.log('  @' + sp[0], 'count', sp[2], 'A:', JSON.stringify(A.slice(sp[0], sp[0] + 120)), 'B:', JSON.stringify(B.slice(sp[0], sp[0] + 120)));
}
