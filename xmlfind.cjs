const fs = require('fs');
const z = require('zlib');

const path = process.argv[2];
const b = fs.readFileSync(path);
const xml = (b[0] === 0x1f && b[1] === 0x8b ? z.gunzipSync(b) : b).toString('utf8');

const tagRe = /<(\/?)([A-Za-z][\w.]*)\b[^>]*?(\/?)>/g;
const stack = [];
let m;
let line = 1;
let lastIdx = 0;
while ((m = tagRe.exec(xml)) !== null) {
  line += (xml.slice(lastIdx, m.index).match(/\n/g) || []).length;
  lastIdx = m.index;
  const [full, slash, name, selfClose] = m;
  if (slash === '/') {
    const top = stack.pop();
    if (!top) { console.log('EXTRA close </' + name + '> at line ' + line); break; }
    if (top.name !== name) {
      console.log('MISMATCH at line ' + line + ': </' + name + '> but open stack top is <' + top.name + '> (opened line ' + top.line + ')');
      console.log('stack (innermost last):');
      for (const s of stack.slice(-8)) console.log('  <' + s.name + '> line ' + s.line);
      process.exit(0);
    }
  } else if (!selfClose) {
    stack.push({ name, line });
  }
}
if (stack.length) console.log('UNCLOSED at EOF: ' + stack.map(s => '<' + s.name + '> line ' + s.line).join(', '));
else console.log('XML stack scan clean');
