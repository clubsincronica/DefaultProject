const fs = require('fs');
const log = fs.readFileSync('C:/Users/tom_w/AppData/Roaming/Ableton/Live 10.0.1/Preferences/Log.txt', 'utf8').split(/\r?\n/);

const out = [];
let cur = null;
const finish = outcome => { if (cur) { cur.outcome = outcome; out.push(cur); cur = null; } };
for (const line of log) {
  const t = line.slice(11, 19);
  const cmd = line.match(/AApplication: CommandLine : (.+)$/);
  if (cmd) { finish('NO_TERMINAL'); cur = { t, file: cmd[1].split(/[\\/]/).pop(), flags: '', outcome: null }; continue; }
  if (!cur) continue;
  if (line.includes('Detected a prior crash')) cur.flags += ' PRIOR_CRASH';
  if (line.includes('will restore')) cur.flags += ' RESTORE';
  if (line.includes('Default App: Loading command-line document: done.')) finish('OPEN_OK');
  else if (line.includes('Fatal Error: Unhandled exception')) finish('CRASH');
  else if (line.includes('est\u00e1 da\u00f1ado')) finish('DAMAGED');
  else if (line.includes('Message Box: El documento')) finish('DAMAGED_MB');
  else if (line.includes('recuperar su trabajo')) cur.flags += ' RECOVERY_PROMPT';
}
finish('NO_TERMINAL');

const filt = process.argv[2];
for (const r of out) {
  if (filt && r.file !== filt) continue;
  console.log(`${r.t} ${r.file.padEnd(28)} ${(r.outcome || '?').padEnd(14)}${r.flags}`);
}
