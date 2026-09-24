// parseValue: mismo decoder que pipeline-viral/scripts/orca-runtime.js
export function parseValue(v) {
  if (v >= 'a' && v <= 'z') return v.charCodeAt(0) - 97;
  if (v >= 'A' && v <= 'Z') return v.charCodeAt(0) - 65 + 26;
  if (v >= '0' && v <= '9') return parseInt(v);
  return -1;
}

import { voicing } from './chords.js';

export function buildNotes(gridText, sceneChords, { totalBars, center = 60, part = 'keys' } = {}) {
  const warnings = [];
  const lines = gridText.split(/\r?\n/).filter(l => l.trim() !== '');
  const header = {};
  for (const l of lines) {
    if (!l.startsWith('#')) continue;
    for (const m of l.matchAll(/(\w+)=([^\s#]+)/g)) header[m[1]] = m[2];
  }
  const body = lines.filter(l => !l.startsWith('#'));
  const durSteps = parseInt(header.dur ?? '4', 10);
  const bars = sceneChords.bars;
  if (body.length < totalBars) warnings.push(`grid rows ${body.length} < totalBars ${totalBars}`);
  if (bars.length < totalBars) warnings.push(`chord bars ${bars.length} < totalBars ${totalBars} (looping)`);
  const durOk = durSteps > 0;
  if (!durOk) warnings.push(`dur=${header.dur} invalid (not > 0): no notes emitted`);
  const notes = [];
  if (durOk) {
    for (let b = 0; b < Math.min(body.length, totalBars); b++) {
      const chord = bars[b % bars.length];
      const voic = voicing(chord, center);
      const row = body[b].padEnd(16, '.').slice(0, 16);
      for (let s = 0; s < 16; s++) {
        const c = row[s];
        if (c === '.' || c === '#') continue;
        const pv = parseValue(c);
        if (pv < 0) continue;
        const isUpper = c >= 'A' && c <= 'Z';
        const toneIdx = pv % voic.length;
        notes.push({
          track: 0, note: voic[toneIdx],
          startBeat: b * 4 + s / 4,
          durBeats: durSteps / 4,
          velocity: isUpper ? 96 : (c >= '0' && c <= '9' ? 72 : 96),
          part,
        });
      }
    }
  }
  return { notes, warnings, header };
}
