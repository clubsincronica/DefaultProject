const { readFileSync } = require('fs');
const z = require('zlib');
const x = z.gunzipSync(readFileSync('cancionero-rojo/songs/je-veux/output/je-veux.als')).toString();
const idx = x.indexOf('strings--Intro.wav');
if (idx < 0) { console.log('stem FileRef not found'); process.exit(1); }
// walk back to enclosing <FileRef
const start = x.lastIndexOf('<FileRef', idx);
const end = x.indexOf('</FileRef>', idx);
const fr = x.slice(start, end + 10);
console.log(fr.split('\n').slice(0, 12).join('\n'));
console.log('---');
const rp = fr.match(/<RelativePath>([\s\S]*?)<\/RelativePath>/);
console.log('chain:', rp ? [...rp[1].matchAll(/Dir="([^"]*)"/g)].map((a) => a[1]).join('|') : 'NONE');
const d = fr.match(/<Data>\s*([\s\S]*?)\s*<\/Data>/);
console.log('Data decodes to:', d ? Buffer.from(d[1].replace(/\s+/g, ''), 'hex').toString('utf16le') : 'NONE');
const hint = fr.match(/<PathHint>([\s\S]*?)<\/PathHint>/);
console.log('PathHint:', hint ? [...hint[1].matchAll(/Dir="([^"]*)"/g)].map((a) => a[1]).join('/') : 'NONE');
console.log('type:', (fr.match(/<RelativePathType Value="(\d+)"/) || [])[1]);
console.log('HasRelativePath:', (fr.match(/<HasRelativePath Value="(\w+)"/) || [])[1]);
