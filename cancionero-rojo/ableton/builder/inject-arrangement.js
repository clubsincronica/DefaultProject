import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const LOCATOR_DONOR = readFileSync(join(ROOT, 'ableton', 'donors', 'locator.xml'), 'utf8');

function locatorXml(name, timeBeats, id) {
  return LOCATOR_DONOR.replace('{{LOC_NAME}}', name).replace('{{TIME}}', String(timeBeats)).replace(/Id="[^"]*"/, `Id="${id}"`);
}

// Inject locators: one per arrangement boundary (first entry starts at 0 already exists, we add/rename rest)
// arrangement = ["Intro","Verse", ...] ; scenes = [{name,bars,tempo?}]
// Time = cumulative beats (bars*4) . Returns mutated xml string.
export function injectLocators(xml, arrangement, scenes) {
  const sceneBars = new Map(scenes.map(s => [s.name, s.bars]));
  let locatorId = 3000;
  // find existing max Id to avoid collision
  for (const m of xml.matchAll(/<Locator Id="(\d+)"/g)) {
    const v = parseInt(m[1], 10);
    if (v >= locatorId) locatorId = v + 1;
  }
  // Build replacement for <Locators><Locators>...</Locators></Locators>
  const locatorsOpen = '<Locators>';
  const innerOpen = '<Locators>';
  const firstInner = xml.indexOf(innerOpen, xml.indexOf(locatorsOpen) + locatorsOpen.length);
  if (firstInner < 0) throw new Error('locator container not found');
  const innerClose = xml.indexOf('</Locators>', firstInner);
  const outerClose = xml.indexOf('</Locators>', innerClose + 12);
  if (innerClose < 0 || outerClose < 0) throw new Error('locator container close not found');
  const existingInner = xml.slice(firstInner + innerOpen.length, innerClose);
  // Preserve the song-start locator at Time 0, rename it to first arrangement entry if desired
  // We'll rebuild full list: one locator per arrangement boundary, plus keep original if needed.
  // Time 0 corresponds to arrangement[0]
  const existingTimeZero = existingInner.match(/<Locator[^>]*>[\s\S]*?<\/Locator>/g);
  let cumul = 0;
  const newLocators = [];
  for (let i = 0; i < arrangement.length; i++) {
    const name = arrangement[i];
    const time = cumul;
    if (i === 0 && existingTimeZero && existingTimeZero.length > 0) {
      // Reuse first locator, update its Name/Time
      let first = existingTimeZero[0];
      first = first.replace(/<Name Value="[^"]*"/, `<Name Value="${name}"`);
      first = first.replace(/<Time Value="[^"]*"/, `<Time Value="${time}"`);
      newLocators.push(first);
    } else {
      newLocators.push(locatorXml(name, time, locatorId++));
    }
    const bars = sceneBars.get(name);
    if (bars == null) throw new Error(`arrangement scene not found: ${name}`);
    cumul += bars * 4;
  }
  const newInner = '\n' + newLocators.join('\n') + '\n';
  const out = xml.slice(0, firstInner + innerOpen.length) + newInner + xml.slice(innerClose);
  return out;
}

// Inject per-scene tempo overrides inside <Scene> blocks.
// For each scene where sc.tempo is defined, ensure <Scene> contains <Tempo><Manual Value="X"/>.
// We do string-level insertion after <LomId> or <ClipSlotsListWrapper> whichever exists.
export function injectSceneTempos(xml, scenes) {
  let out = xml;
  for (let i = 0; i < scenes.length; i++) {
    const sc = scenes[i];
    if (sc.tempo == null) continue;
    // Find i-th Scene block
    const sceneRe = /<Scene Id="\d+" Value="[^"]*">[\s\S]*?<\/Scene>/g;
    let idx = -1, count = -1, m;
    while ((m = sceneRe.exec(out)) !== null) {
      count++;
      if (count === i) { idx = m.index; break; }
    }
    if (idx < 0) throw new Error(`scene index ${i} not found for tempo override`);
    const block = m[0];
    if (block.includes('<Tempo>')) {
      const replaced = block.replace(/<Tempo>[\s\S]*?<Manual Value="[^"]*"/, `<Tempo><Manual Value="${sc.tempo}"`);
      // Actually need to replace Manual Value correctly
      const patched = block.replace(/(<Tempo>[\s\S]*?<Manual Value=")[^"]*(")/, `$1${sc.tempo}$2`);
      out = out.slice(0, idx) + patched + out.slice(idx + block.length);
    } else {
      // Insert <Tempo><LomId Value="0"/><Manual Value="X"/><AutomationTarget Id="0"><LockEnvelope Value="0"/></AutomationTarget></Tempo>
      // Minimal valid Tempo subtree. Insert before closing </Scene> or after <LomId> for readability.
      const tempoSnippet = `<Tempo><LomId Value="0"/><Manual Value="${sc.tempo}"/><AutomationTarget Id="0"><LockEnvelope Value="0"/></AutomationTarget></Tempo>`;
      const insertAt = block.lastIndexOf('</Scene>');
      const withTempo = block.slice(0, insertAt) + tempoSnippet + block.slice(insertAt);
      out = out.slice(0, idx) + withTempo + out.slice(idx + block.length);
    }
  }
  return out;
}

// Inject arrangement clips into each track's ArrangerAutomation/Events
// For simplicity, inject one Events entry per arrangement slot per track that has a session clip.
// We reuse session clip xml but set Time attribute to cumulative beats.
// To keep XML valid, we wrap each clip in a minimal <ClipSlotEvent>-like? Actually Live arrangement uses <Events> containing clips directly.
// We will insert <MidiClip Time="X"> / <AudioClip Time="X"> clones.
// clipMap: { trackName: { sceneName: clipXml } } built from session injection.
export function injectArrangement(xml, arrangement, scenes, clipMap) {
  const sceneBars = new Map(scenes.map(s => [s.name, s.bars]));
  // Build cumulative time per arrangement position
  const times = [];
  let cumul = 0;
  for (const name of arrangement) {
    times.push(cumul);
    cumul += (sceneBars.get(name) ?? 4) * 4;
  }
  // For each track, collect clips to place in arrangement order
  // Replace <ArrangerAutomation><Events /></ArrangerAutomation> or <Events>...</Events> inside each track
  let out = xml;
  const trackRe = /<(Midi|Audio)Track\b[^>]*>[\s\S]*?<\/\1Track>/g;
  const tracks = [];
  let mm;
  while ((mm = trackRe.exec(xml)) !== null) tracks.push({ m: mm[0], idx: mm.index, type: mm[1] });
  // Process backwards to avoid index shift
  for (let t = tracks.length - 1; t >= 0; t--) {
    const { m: body, idx: start, type } = tracks[t];
    const name = body.match(/<EffectiveName Value="([^"]*)"/)?.[1];
    if (!name) continue;
    const map = clipMap[name];
    if (!map || Object.keys(map).length === 0) continue;
    // Determine arrangement clips for this track: for each arrangement slot, if this track has that scene, place it
    const clips = [];
    for (let i = 0; i < arrangement.length; i++) {
      const sceneName = arrangement[i];
      const clipXml = map[sceneName];
      if (!clipXml) continue;
      const time = times[i];
      // Patch Time="0" -> Time="time"
      const patched = clipXml.replace(/<((Midi|Audio)Clip) Id="[^"]*" Time="[^"]*"/, `<$1 Id="${9000 + i}" Time="${time}"`);
      // Also ensure <CurrentEnd> etc reflect duration; keep as is
      clips.push(patched);
    }
    if (clips.length === 0) continue;
    // Build new body with Events filled
    let newBody;
    if (body.includes('<ArrangerAutomation>')) {
      // Replace <ArrangerAutomation><Events /></ArrangerAutomation> or with content
      newBody = body.replace(/<ArrangerAutomation>[\s\S]*?<Events\s*\/>[\s\S]*?<\/ArrangerAutomation>/, `<ArrangerAutomation><Events>${clips.join('')}</Events></ArrangerAutomation>`);
      if (newBody === body) {
        newBody = body.replace(/<ArrangerAutomation>[\s\S]*?<Events>[\s\S]*?<\/Events>[\s\S]*?<\/ArrangerAutomation>/, `<ArrangerAutomation><Events>${clips.join('')}</Events></ArrangerAutomation>`);
      }
      if (newBody === body) {
        // fallback: inject after <Events>
        newBody = body.replace(/<Events\s*\/>/, `<Events>${clips.join('')}</Events>`);
      }
    } else {
      newBody = body;
    }
    if (newBody === body) continue;
    out = out.slice(0, start) + newBody + out.slice(start + body.length);
  }
  return out;
}
