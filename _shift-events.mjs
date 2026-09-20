const fs = require('fs');
const f = 'remotion-poc/src/data/meditacion-2026-08-28.json';
let c = fs.readFileSync(f, 'utf8');
const shifts = [276, 293, 311, 327, 340, 358, 375, 388, 402, 420, 436, 452, 468, 485, 500, 518, 534];
const deltas = [236, 253, 271, 287, 300, 318, 335, 348, 362, 380, 396, 412, 428, 445, 460, 478, 494];
shifts.forEach((s, i) => {
  const needle = '"start": ' + s + ',';
  const val = '"start": ' + deltas[i] + ',';
  const count = (c.match(new RegExp(needle.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&'), 'g')) || []).length;
  c = c.split(needle).join(val);
  console.log(s, '->', deltas[i], 'replacements:', count);
});
fs.writeFileSync(f, c);
console.log('done');