const fs = require('fs'), z = require('zlib');
const x = z.gunzipSync(fs.readFileSync('C:/Users/tom_w/Music/_Serato_/Program/Live/Resources/Core Library/Lessons/Sets/Live 10 Suite Empty.als')).toString('utf8');
for (const t of ['AutoFilter', 'Echo']) {
  let i = -1;
  for (let n = 0; n < 3; n++) {
    i = x.indexOf('<' + t + ' ', i + 1);
    const ls = x.lastIndexOf('\n', i) + 1;
    const ind = (x.slice(ls, i).match(/\t/g) || []).length;
    const id = x.slice(i, x.indexOf('>', i)).match(/Id="(\d+)"/)[1];
    console.log(t + ' #' + n + ' Id=' + id + ' indent=' + ind);
  }
}
