#!/usr/bin/env node
// build.js — orchestrator for cancionero-rojo (Task 13)
// CLI: node ableton/builder/build.js <slug> [--dry-run]
// Produces: songs/<slug>/output/<slug>.als + report.json
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { validateStructure } from '../../scripts/validate-structure.js';
import { parseAls, buildAls, saveAls, setSceneNames } from './als.js';
import { makeClipXml, injectMidiIntoTrack } from './inject-session.js';
import { makeAudioClipXml, injectAudioIntoTrack } from './inject-audio.js';
import { injectLocators, injectSceneTempos, injectArrangement } from './inject-arrangement.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');

const TRACK_MAP = { keys: 'Keys', guitar: 'Guitar', bass: 'Bass', perc: 'Perc', strings: 'Strings', texture: 'Texture' };

function fail(msg) { console.error(msg); process.exit(1); }

function normalizePart(part) {
  const low = part.toLowerCase();
  return TRACK_MAP[low] ?? part;
}

export async function buildSong(slug, opts = {}) {
  const dryRun = !!opts.dryRun;
  const songDir = join(ROOT, 'songs', slug);
  const structurePath = join(songDir, 'structure.json');
  if (!existsSync(structurePath)) fail(`structure.json not found: ${structurePath}`);
  const structure = JSON.parse(readFileSync(structurePath, 'utf8'));

  // 1. validateStructure
  const errs = validateStructure(structure);
  if (errs.length) {
    console.error('structure validation failed:');
    for (const e of errs) console.error(' - ' + e);
    process.exit(1);
  }

  // 2. chords.json per scene bars check
  const chordsPath = join(songDir, 'chords.json');
  if (existsSync(chordsPath)) {
    try {
      const chords = JSON.parse(readFileSync(chordsPath, 'utf8'));
      const sections = chords.sections ?? chords;
      for (const sc of structure.scenes) {
        const entry = sections[sc.name] ?? sections[sc.name.toLowerCase()];
        if (entry && Array.isArray(entry.bars) && entry.bars.length !== sc.bars) {
          fail(`chords bars mismatch for ${sc.name}: chords has ${entry.bars.length}, structure expects ${sc.bars}`);
        }
      }
    } catch (e) {
      if (e.message.includes('chords bars mismatch')) throw e;
      console.warn(`chords check skipped: ${e.message}`);
    }
  }

  // 3. template.als
  const templatePath = join(ROOT, 'ableton', 'template.als');
  if (!existsSync(templatePath)) fail(`template.als not found: ${templatePath}`);
  const buf = readFileSync(templatePath);
  let state = parseAls(buf);
  let xml = state.xml; // working xml string for string-level injection

  // 4. scene names
  setSceneNames(state, structure.scenes.map(s => s.name));
  // sync xml from tree (preserveOrder build)
  xml = state.xml ?? buildAls(state);
  // also need to refresh tree after string ops; we will keep xml as source and rebuild tree at end via parseAls? Simpler: continue on xml string.

  // For report
  const report = {
    slug,
    scenes: structure.scenes.map(s => s.name),
    tempo: structure.tempo,
    tracksCovered: {},
    stems: 0,
    mids: 0,
    missing: [],
    template: 'OK',
  };

  // 5. MIDI parts x scenes
  const midiParts = structure.parts?.midi ?? [];
  const audioParts = structure.parts?.audio ?? [];
  const sceneIndex = new Map(structure.scenes.map((s, i) => [s.name, i]));
  const clipMap = {}; // trackName -> { sceneName: clipXml }

  for (const part of midiParts) {
    const trackName = normalizePart(part);
    if (!clipMap[trackName]) clipMap[trackName] = {};
    for (const sc of structure.scenes) {
      const idx = sceneIndex.get(sc.name);
      // locate clips/<part>--<scene>.mid + sidecar .json
      const base = join(songDir, 'clips', `${part}--${sc.name}`);
      const candidates = [
        base + '.mid',
        base + '.MID',
        join(songDir, 'clips', `${part.toLowerCase()}--${sc.name}.mid`),
      ];
      let midPath = candidates.find(p => existsSync(p));
      if (!midPath) {
        // try case-insensitive scan
        const alt = join(songDir, 'clips', `${part.toLowerCase()}--${sc.name.toLowerCase()}.mid`);
        if (existsSync(alt)) midPath = alt;
        else {
          report.missing.push(`clips/${part}--${sc.name}.mid`);
          continue;
        }
      }
      // sidecar
      const sidecar = midPath + '.json';
      if (!existsSync(sidecar)) {
        report.missing.push(`${part}--${sc.name}.mid.json sidecar missing`);
        continue;
      }
      let notes;
      try {
        const j = JSON.parse(readFileSync(sidecar, 'utf8'));
        notes = j.notes ?? j ?? [];
        if (!Array.isArray(notes)) notes = j.notes ?? [];
      } catch (e) {
        fail(`cannot load sidecar ${sidecar}: ${e.message}`);
      }
      const clipXml = makeClipXml({ name: sc.name, notes });
      try {
        xml = injectMidiIntoTrack(xml, trackName, idx, clipXml);
        clipMap[trackName][sc.name] = clipXml;
        report.mids++;
        report.tracksCovered[trackName] = (report.tracksCovered[trackName] ?? 0) + 1;
      } catch (e) {
        fail(`MIDI inject failed for ${trackName} scene ${sc.name} (idx ${idx}): ${e.message}`);
      }
    }
  }

  // 6. Audio parts x scenes
  for (const part of audioParts) {
    const trackName = normalizePart(part);
    if (!clipMap[trackName]) clipMap[trackName] = {};
    for (const sc of structure.scenes) {
      const idx = sceneIndex.get(sc.name);
      const wavPath = join(songDir, 'stems', `${part}--${sc.name}.wav`);
      const wavAlt = join(songDir, 'stems', `${part.toLowerCase()}--${sc.name}.wav`);
      const chosen = existsSync(wavPath) ? wavPath : existsSync(wavAlt) ? wavAlt : null;
      if (!chosen) {
        report.missing.push(`stems/${part}--${sc.name}.wav`);
        continue;
      }
      const clipXml = makeAudioClipXml({ name: sc.name, wavPath: chosen });
      try {
        xml = injectAudioIntoTrack(xml, trackName, idx, clipXml);
        clipMap[trackName][sc.name] = clipXml;
        report.stems++;
        report.tracksCovered[trackName] = (report.tracksCovered[trackName] ?? 0) + 1;
      } catch (e) {
        fail(`Audio inject failed for ${trackName} scene ${sc.name}: ${e.message}`);
      }
    }
  }

  // 7. tempo base
  // Replace global <Tempo><Manual Value="...">
  xml = xml.replace(/(<Tempo>[\s\S]*?<Manual Value=")[^"]*(")/, `$1${structure.tempo}$2`);

  // 7b. per-scene tempo overrides
  xml = injectSceneTempos(xml, structure.scenes);

  // 8. locators
  if (Array.isArray(structure.arrangement) && structure.arrangement.length) {
    try { xml = injectLocators(xml, structure.arrangement, structure.scenes); } catch (e) {
      console.warn(`locator inject skipped: ${e.message}`);
    }
    // 9. arrangement
    try { xml = injectArrangement(xml, structure.arrangement, structure.scenes, clipMap); } catch (e) {
      console.warn(`arrangement inject skipped: ${e.message}`);
    }
  }

  // Rebuild state.tree from xml for saveAls consistency
  // cheapest: re-parse
  try {
    const reparsed = parseAls(Buffer.from(xml, 'utf8'));
    state.tree = reparsed.tree;
    state.xml = xml;
  } catch { state.xml = xml; }

  const outDir = join(songDir, 'output');
  mkdirSync(outDir, { recursive: true });
  const reportPath = join(outDir, 'report.json');

  report.scenes = structure.scenes.map(s => s.name);
  report.tempo = structure.tempo;
  report.arrangement = structure.arrangement;
  report.missing = report.missing ?? [];

  // 10. dry-run: write report only, no .als
  if (dryRun) {
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ ...report, dryRun: true }, null, 2));
    if (report.missing.length) console.warn(`missing assets: ${report.missing.join(', ')}`);
    return { report, written: false };
  }

  // 11. save
  const outAls = join(outDir, `${slug}.als`);
  // Use gzipSync directly from xml string
  writeFileSync(outAls, gzipSync(Buffer.from(xml, 'utf8')));
  writeFileSync(reportPath, JSON.stringify({ ...report, output: outAls }, null, 2));
  console.log(`built ${outAls} (${(xml.length/1024).toFixed(1)}KB xml)`);
  console.log(JSON.stringify(report, null, 2));
  return { report, written: true, outAls };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const slug = process.argv[2];
  const dryRun = process.argv.includes('--dry-run');
  if (!slug) fail('usage: node ableton/builder/build.js <slug> [--dry-run]');
  buildSong(slug, { dryRun }).catch(e => { console.error(e.stack ?? e.message); process.exit(1); });
}
