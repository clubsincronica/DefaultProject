import fs from 'node:fs';
const A = fs.readFileSync('C:/Users/tom_w/AppData/Local/Temp/opencode/tpl.xml').toString('utf8').split('\n');
const B = fs.readFileSync('C:/Users/tom_w/AppData/Local/Temp/opencode/empty.xml').toString('utf8').split('\n');
console.log('lines', A.length, B.length);
const shown = [];
let diffCount = 0;
let j = 0;
for (let i = 0; i < A.length; i++) {
  if (B[j] === A[i]) { j++; continue; }
  diffCount++;
  if (shown.length < 12) shown.push([i, A[i].slice(0, 200), j, (B[j] || '').slice(0, 200)]);
}
console.log('diff lines in A:', diffCount);
for (const [i, a, j2, b] of shown) {
  console.log('--- A' + i + ' vs B' + j2);
  console.log('  A:', JSON.stringify(a));
  console.log('  B:', JSON.stringify(b));
}
