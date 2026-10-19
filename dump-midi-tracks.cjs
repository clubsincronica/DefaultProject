const { readFileSync } = require('fs');
const z = require('zlib');

const file = process.argv[2] || 'cancionero-rojo/songs/je-veux/output/je-veux.als';
const x = z.gunzipSync(readFileSync(file)).toString();

function sliceTag(xml, tag) {
  const re = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?</${tag}>`, 'g');
  return [...xml.matchAll(re)];
}

// top-level-ish device tags inside a DeviceChain: children of <MidiToAudioDeviceChain> / <AudioDeviceChain>
function devicesOf(trackXml) {
  const chain = trackXml.match(/<DeviceChain>[\s\S]*?<\/DeviceChain>/);
  if (!chain) return ['<no DeviceChain>'];
  const names = [];
  // direct children of the *DeviceChain container
  const cont = chain[0].match(/<(MidiToAudioDeviceChain|AudioDeviceChain)\b[^>]*>([\s\S]*?)<\/\1DeviceChain>|<(MidiToAudioDeviceChain|AudioDeviceChain)\b[^>]*>([\s\S]*)/);
  const body = cont ? (cont[2] || cont[4] || chain[0]) : chain[0];
  for (const m of body.matchAll(/^\t+<([A-Za-z][A-Za-z0-9]*)\b/gm)) {
    const t = m[1];
    if (!['MidiEffectGroupDevice', 'AudioEffectGroupDevice'].includes(t)) names.push(t);
  }
  return names.length ? [...new Set(names)] : ['<empty chain>'];
}

function first(trackXml, re, label) {
  const m = trackXml.match(re);
  return `${label}=${m ? m[1] : 'ABSENT'}`;
}

for (const tag of ['MidiTrack', 'AudioTrack']) {
  for (const t of sliceTag(x, tag)) {
    const block = t[0];
    const name = (block.match(/<EffectiveName Value="([^"]*)"/) || [])[1];
    if (!name) continue;
    const lines = [];
    lines.push(`\n=== ${tag} "${name}" ===`);
    lines.push('devices: ' + devicesOf(block).join(', '));
    lines.push(first(block, /<Volume>\s*<Manual Value="([^"]*)"/, 'MixerVolume'));
    lines.push(first(block, /<TrackActive Value="([^"]*)"/, 'TrackActive'));
    lines.push(first(block, /<Pan Value="([^"]*)"/, 'Pan'));
    lines.push(first(block, /<MonitorInState Value="([^"]*)"/, 'MonitorInState'));
    lines.push(first(block, /<SessionViewWaitForLaunchQuantization Value="([^"]*)"/, 'WaitLaunch'));
    const out = block.match(/<AudioOutputRouting>([\s\S]*?)<\/AudioOutputRouting>/);
    lines.push('AudioOutRouting: ' + (out ? out[1].replace(/\s+/g, ' ').slice(0, 200) : 'ABSENT'));
    // clips in slots
    const clipSlots = [...block.matchAll(/<ClipSlot Id="(\d+)"[^>]*>([\s\S]*?)<\/ClipSlot>/g)];
    let withClip = 0, notes = 0, sample = '';
    for (const cs of clipSlots) {
      const inner = cs[2];
      const clipName = inner.match(/<AudioClip\b/) ? 'AUDIO' : inner.match(/<MidiClip\b/) ? 'MIDI' : null;
      if (!clipName) continue;
      withClip++;
      if (clipName === 'MIDI') {
        const noteEls = [...inner.matchAll(/<Note\b[^>]*\/>|<MidiNote\b[^>]*\/>/g)];
        notes += noteEls.length;
        if (!sample && noteEls[0]) sample = noteEls[0][0];
        if (!sample && inner.includes('<Notes')) sample = inner.slice(inner.indexOf('<Notes'), inner.indexOf('<Notes') + 160);
      } else {
        if (!sample) sample = 'AUDIO clip (stem)';
      }
    }
    lines.push(`clips: ${withClip}/${clipSlots.length} slots, midi notes total: ${notes}`);
    if (sample) lines.push('sample: ' + sample);
    // device enabled?
    const dis = [...block.matchAll(/<Disabled Value="([^"]*)" \/>/g)].map((m) => m[1]);
    lines.push('Disabled flags: ' + (dis.length ? dis.join(',') : 'none'));
    console.log(lines.join('\n'));
  }
}
