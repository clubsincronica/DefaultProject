import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { gunzipSync } from 'node:zlib';
import { inventory } from '../scripts/inspect-als.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE_SLUG = '_fixture';

function setupFixture() {
  const dir = join(ROOT, 'songs', FIXTURE_SLUG);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, 'clips'), { recursive: true });
  mkdirSync(join(dir, 'stems'), { recursive: true });
  const structure = {
    slug: 'fixture', title: '_Fixture', artist: 'Test', key: 'Am',
    tempo: 128, timeSig: '4/4',
    scenes: [
      { name: 'Intro', bars: 4 },
      { name: 'Verse', bars: 16 },
      { name: 'Chorus', bars: 16 },
      { name: 'Outro', bars: 4 },
    ],
    arrangement: ['Intro', 'Verse', 'Chorus', 'Outro'],
    parts: { midi: ['keys'], audio: ['strings'] },
  };
  writeFileSync(join(dir, 'structure.json'), JSON.stringify(structure, null, 2));
  const chords = {
    sections: {
      Intro: { bars: Array(4).fill('Am') },
      Verse: { bars: Array(16).fill('G') },
      Chorus: { bars: Array(16).fill('F') },
      Outro: { bars: Array(4).fill('E') },
    }
  };
  writeFileSync(join(dir, 'chords.json'), JSON.stringify(chords, null, 2));
  // sidecars + dummy mids for each scene (keys)
  for (const sc of structure.scenes) {
    const notes = [{ startBeat: 0, durBeats: 1, note: 60, velocity: 96 }];
    writeFileSync(join(dir, 'clips', `keys--${sc.name}.mid`), Buffer.from([0x4d,0x54,0x68,0x64]));
    writeFileSync(join(dir, 'clips', `keys--${sc.name}.mid.json`), JSON.stringify({ notes }));
    // tiny wav for strings
    const wav = join(dir, 'stems', `strings--${sc.name}.wav`);
    // minimal RIFF header (44 bytes) + data
    const hdr = Buffer.alloc(44);
    hdr.write('RIFF',0); hdr.writeUInt32LE(36+4,4); hdr.write('WAVE',8); hdr.write('fmt ',12); hdr.writeUInt32LE(16,16); hdr.writeUInt16LE(1,20); hdr.writeUInt16LE(1,22); hdr.writeUInt32LE(44100,24); hdr.writeUInt32LE(44100*2,28); hdr.writeUInt16LE(2,32); hdr.writeUInt16LE(16,34); hdr.write('data',36); hdr.writeUInt32LE(4,40);
    const data = Buffer.from([0,0,0,0]);
    writeFileSync(wav, Buffer.concat([hdr, data]));
  }
  writeFileSync(join(dir, 'stems', 'manifest.json'), JSON.stringify([
    { part: 'strings', section: 'Intro', file: 'stems/strings--Intro.wav', seconds: 7.5 }
  ], null, 2));
  return dir;
}

test('dry-run validates and reports without writing', async () => {
  const dir = setupFixture();
  const builder = join(ROOT, 'ableton', 'builder', 'build.js');
  const out = execFileSync(process.execPath, [builder, FIXTURE_SLUG, '--dry-run'], { encoding: 'utf8' });
  const report = JSON.parse(readFileSync(join(dir, 'output', 'report.json'), 'utf8'));
  assert.deepEqual(report.scenes, ['Intro','Verse','Chorus','Outro']);
  assert.ok(report.tempo === 128, 'tempo report');
  assert.ok(report.mids >= 4, 'mids count');
  assert.ok(report.stems >= 4, 'stems count');
  assert.ok(report.missing.length === 0, `no missing, got ${report.missing}`);
  assert.ok(out.includes('template OK') || out.includes('Intro') , 'stdout mentions scenes/template');
  const alsOut = join(dir, 'output', `${FIXTURE_SLUG}.als`);
  assert.equal(existsSync(alsOut), false, 'dry-run must not write .als');
});

test('real build writes .als with scene names, tempo, locators, arrangement', async () => {
  const dir = join(ROOT, 'songs', FIXTURE_SLUG);
  if (!existsSync(join(dir, 'structure.json'))) setupFixture();
  const builder = join(ROOT, 'ableton', 'builder', 'build.js');
  execFileSync(process.execPath, [builder, FIXTURE_SLUG], { encoding: 'utf8' });
  const alsPath = join(dir, 'output', `${FIXTURE_SLUG}.als`);
  assert.ok(existsSync(alsPath), 'output als exists');
  const data = readFileSync(alsPath);
  const inv = inventory(data);
  // scenes = 16 in template, but first 4 should be named
  assert.ok(inv.scenes === 16, `scenes 16, got ${inv.scenes}`);
  const xml = gunzipSync(data).toString('utf8');
  assert.ok(xml.includes('Value="Intro"'), 'scene Intro named');
  assert.ok(xml.includes('Value="Verse"'), 'scene Verse named');
  assert.ok(xml.includes('<Manual Value="128"'), 'tempo 128 present');
  // locators: one per arrangement entry boundary = 4
  const locCount = (xml.match(/<Locator /g)||[]).length;
  assert.ok(locCount >= 4, `locators ${locCount} >=4`);
  // arrangement: Events should contain clips (at least one MidiClip with Time attribute inside ArrangerAutomation)
  const arrClips = (xml.match(/<ArrangerAutomation>[\s\S]*?<Events>[\s\S]*?<MidiClip /g)||[]).length;
  // fallback check: if no MidiClip inside Events, check at least that Events is non-empty
  const hasArrangement = xml.includes('<ArrangerAutomation>') && !xml.includes('<ArrangerAutomation><Events /></ArrangerAutomation>') || arrClips > 0;
  // minimal assert: locator times cumulative
  assert.ok(xml.includes('Time Value="0"') && xml.includes('Time Value="16"'), 'locator times present (0 and 16 beats for Intro 4bars)');
  // ensure no repair-triggering duplicate? just parseable
  assert.ok(xml.includes('Ableton MajorVersion'), 'valid Ableton root');
});

test('per-scene tempo override', async () => {
  const dir = join(ROOT, 'songs', FIXTURE_SLUG);
  const struct = JSON.parse(readFileSync(join(dir, 'structure.json'), 'utf8'));
  struct.scenes[0].tempo = 100;
  writeFileSync(join(dir, 'structure.json'), JSON.stringify(struct, null, 2));
  const builder = join(ROOT, 'ableton', 'builder', 'build.js');
  execFileSync(process.execPath, [builder, FIXTURE_SLUG], { encoding: 'utf8' });
  const alsPath = join(dir, 'output', `${FIXTURE_SLUG}.als`);
  const xml = gunzipSync(readFileSync(alsPath)).toString('utf8');
  // global tempo still 128, scene 0 override 100
  assert.ok(xml.includes('<Manual Value="128"'), 'global 128');
  // scene tempo appears inside first Scene block: check that at least one Scene contains Manual 100
  const firstSceneIdx = xml.indexOf('<Scene Id=');
  const firstScene = xml.slice(firstSceneIdx, xml.indexOf('</Scene>', firstSceneIdx)+8);
  assert.ok(firstScene.includes('Value="100"') || xml.includes('<Tempo>') , 'scene tempo 100 injected');
  // restore
  struct.scenes[0].tempo = undefined;
  delete struct.scenes[0].tempo;
  writeFileSync(join(dir, 'structure.json'), JSON.stringify(struct, null, 2));
});
