const { readFileSync } = require('fs');
const z = require('zlib');
const file = process.argv[2] || 'cancionero-rojo/songs/je-veux/output/je-veux.als';
const x = z.gunzipSync(readFileSync(file)).toString();

function track(name) {
  for (const tag of ['MidiTrack', 'AudioTrack']) {
    const re = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?</${tag}>`, 'g');
    for (const m of x.matchAll(re)) {
      if (m[0].includes(`<EffectiveName Value="${name}"`)) return m[0];
    }
  }
  return null;
}

// --- KEYS rack: branches + their devices + on/off ---
const keys = track('Keys');
console.log('===== KEYS rack =====');
const igd = keys.match(/<InstrumentGroupDevice\b[\s\S]*?<\/InstrumentGroupDevice>/);
if (igd) {
  const branches = [...igd[0].matchAll(/<InstrumentBranch\b[^>]*>([\s\S]*?)<\/InstrumentBranch>/g)];
  branches.forEach((br, i) => {
    const head = br[0].slice(0, 400).replace(/\s+/g, ' ');
    const on = head.match(/<On>\s*<Manual Value="([^"]*)"/) || head.match(/<On Value="([^"]*)"/);
    // device tags: scan for known device class openings inside branch
    const devs = [...br[1].matchAll(/^\s+<(Operator|Wavetable|Simpler|OriginalSimpler|MidiArpeggiator|MidiChord|MidiEffectGroupDevice|AudioEffectGroupDevice|UltraAnalog|InstrumentVector|Collision|Electric|Analog|Tension|Sampler|DrumRackDevice|Corpus|Hybrid|Reverb|Eq8|Compressor2|GlueCompressor|Echo|AutoFilter|Redux|Saturator|Utility|FrequencyShifter|PingPongDelay|Redux)\b/gm)].map((d) => d[1]);
    const vol = br[1].match(/<Volume>\s*<Manual Value="([^"]*)"/);
    const speaker = br[1].match(/<Speaker>\s*<Manual Value="([^"]*)"/);
    console.log(`  branch ${i}: On=${on ? on[1] : '?'} Speaker=${speaker ? speaker[1] : 'absent'} Volume=${vol ? vol[1] : 'absent'} devices=[${[...new Set(devs)].join(',') || 'NONE'}]`);
  });
}

// --- PERC Simpler sample ref ---
const perc = track('Perc');
console.log('\n===== PERC Simpler =====');
const smp = perc.match(/<SampleRef>[\s\S]*?<\/SampleRef>/);
if (smp) {
  const fr = smp[0].match(/<FileRef>[\s\S]*?<\/FileRef>/);
  if (fr) {
    const name = (fr[0].match(/<Name Value="([^"]*)"/) || [])[1];
    const type = (fr[0].match(/<Type Value="([^"]*)"/) || [])[1];
    const hasRel = (fr[0].match(/<HasRelativePath Value="([^"]*)"/) || [])[1];
    const relType = (fr[0].match(/<RelativePathType Value="([^"]*)"/) || [])[1];
    const chain = [...fr[0].matchAll(/<RelativePathElement[^>]*Dir="([^"]*)"/g)].map((m) => m[1]);
    const pack = (fr[0].match(/<LivePackName Value="([^"]*)"/) || [])[1];
    const hint = [...(fr[0].match(/<PathHint>([\s\S]*?)<\/PathHint>/) || ['', ''])[1].matchAll(/Dir="([^"]*)"/g)].map((m) => m[1]);
    const dataRaw = (fr[0].match(/<Data>\s*([\s\S]*?)\s*<\/Data>/) || [])[1] || '';
    let dataDec = '';
    try { dataDec = Buffer.from(dataRaw.replace(/\s+/g, ''), 'hex').toString('utf16le').replace(/\0+$/, ''); } catch {}
    console.log(`  Name=${name} Type=${type} HasRel=${hasRel} RelType=${relType} Pack=${pack}`);
    console.log(`  chain=[${chain.join('|')}] PathHint=[${hint.join('/')}]`);
    console.log(`  Data="${dataDec}"`);
  }
  const parts = smp[0].match(/<SampleParts>([\s\S]*?)<\/SampleParts>/);
  console.log('  SampleParts:', parts ? [...parts[1].matchAll(/<MultiSamplePart\b/g)].length : 0);
  const sel = smp[0].match(/<Selection>[\s\S]*?<\/Selection>/);
  console.log('  Selection:', sel ? sel[0].replace(/\s+/g, ' ').slice(0, 150) : 'absent');
}
const percVol = perc.match(/<OriginalSimpler[\s\S]{0,3000}?<Volume>\s*<Manual Value="([^"]*)"/);
console.log('  Simpler Volume:', percVol ? percVol[1] : 'not found');
const percIsOn = perc.match(/<OriginalSimpler\b[^>]*>[\s\S]{0,600}?<IsOn>\s*<Manual Value="([^"]*)"/);
console.log('  Simpler IsOn:', percIsOn ? percIsOn[1] : 'not found');

// --- Operator internals on Keys/Bass ---
for (const tn of ['Keys', 'Bass']) {
  const t = track(tn);
  const op = t.match(/<Operator\b[^>]*>[\s\S]{0,4000}?/);
  if (op) {
    const vol = op[0].match(/<Volume>\s*<Manual Value="([^"]*)"/);
    const isOn = op[0].match(/<IsOn>\s*<Manual Value="([^"]*)"/);
    console.log(`\n${tn} Operator: Volume=${vol ? vol[1] : '?'} IsOn=${isOn ? isOn[1] : '?'}`);
  } else console.log(`\n${tn}: no <Operator> tag`);
}
