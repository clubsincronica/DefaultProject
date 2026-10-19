const { readFileSync } = require('fs');
const z = require('zlib');
const file = process.argv[2] || 'cancionero-rojo/songs/je-veux/output/je-veux.als';
const x = z.gunzipSync(readFileSync(file)).toString();

function tracks(tag) {
  return [...x.matchAll(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?</${tag}>`, 'g'))];
}

function compact(xml) {
  return xml.replace(/>\s+</g, '><').replace(/></g, '>\n<');
}

for (const tag of ['MidiTrack', 'AudioTrack']) {
  for (const t of tracks(tag)) {
    const b = t[0];
    const name = (b.match(/<EffectiveName Value="([^"]*)"/) || [])[1];
    console.log(`\n########## ${tag} "${name}" ##########`);
    const mixer = b.match(/<Mixer>[\s\S]*?<\/Mixer>/);
    if (mixer) {
      // key mixer leaves only
      const leaves = [...mixer[0].matchAll(/<(Volume|Pan|Active|Speaker|SoloSink|PanMode)>([\s\S]*?)<\/\1>/g)];
      for (const l of leaves) {
        const val = l[2].match(/<Manual Value="([^"]*)"|<Value="([^"]*)"/);
        const inner = l[2].replace(/\s+/g, ' ').slice(0, 120);
        console.log(`  Mixer.${l[1]}: ${inner}`);
      }
    } else console.log('  Mixer: ABSENT');
    const mon = b.match(/<MonitoringEnum[^>]*\/?>/);
    console.log('  MonitoringEnum:', mon ? mon[0] : 'ABSENT');
    const miv = [...b.matchAll(/<MonitorIn[A-Za-z]*\b[^>]*>/g)].map((m) => m[0]);
    if (miv.length) console.log('  Monitor tags:', miv.join(' '));
    // session/arrangement clip counts (MidiNoteEvent based)
    const clips = [...b.matchAll(/<(Midi|Audio)Clip\b/g)].length;
    const events = [...b.matchAll(/<MidiNoteEvent\b/g)].length;
    console.log(`  clips=${clips} midiNoteEvents=${events}`);
    // rack / device On flags (first 6)
    const ons = [...b.matchAll(/<IsOn Value="([^"]*)" \/>|<On Value="([^"]*)" \/>/g)].slice(0, 8)
      .map((m) => (m[1] !== undefined ? `IsOn=${m[1]}` : `On=${m[2]}`));
    if (ons.length) console.log('  device On flags:', ons.join(' '));
    // InstrumentGroupDevice branch state
    const igd = b.match(/<InstrumentGroupDevice[\s\S]{0,600}/);
    if (igd) console.log('  IGD head:', igd[0].replace(/\s+/g, ' ').slice(0, 300));
    const branches = [...b.matchAll(/<InstrumentBranch\b[^>]*>/g)];
    if (branches.length) console.log('  InstrumentBranches:', branches.length, branches[0][0].slice(0, 150));
  }
}
