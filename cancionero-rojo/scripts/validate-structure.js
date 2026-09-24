const MIDI_ROSTER = ['keys', 'guitar', 'bass', 'perc'];
const AUDIO_ROSTER = ['strings', 'texture'];

export function validateStructure(s) {
  const errs = [];
  if (!s.slug || !/^[a-z0-9-]+$/.test(s.slug)) errs.push('slug must be kebab-case');
  if (!s.title) errs.push('title missing');
  if (!s.key) errs.push('key missing');
  if (typeof s.tempo !== 'number' || s.tempo < 40 || s.tempo > 260) errs.push('tempo must be 40-260');
  if (s.timeSig !== '4/4') errs.push('timeSig must be 4/4 (v1)');
  if (!Array.isArray(s.scenes) || s.scenes.length === 0 || s.scenes.length > 16)
    errs.push('scenes must be 1..16 entries');
  const names = new Set();
  for (const sc of s.scenes ?? []) {
    if (names.has(sc.name)) errs.push(`scene name duplicat: ${sc.name}`);
    names.add(sc.name);
    if (typeof sc.bars !== 'number' || sc.bars < 1) errs.push(`scene ${sc.name}: bars must be >= 1`);
    if (sc.tempo !== undefined && (typeof sc.tempo !== 'number' || sc.tempo < 40 || sc.tempo > 260))
      errs.push(`scene ${sc.name}: tempo must be 40-260`);
  }
  for (const ref of s.arrangement ?? []) if (!names.has(ref)) errs.push(`arrangement references unknown scene: ${ref}`);
  if ((s.arrangement ?? []).length === 0) errs.push('arrangement empty');
  const midi = s.parts?.midi ?? [], audio = s.parts?.audio ?? [];
  for (const p of midi) if (!MIDI_ROSTER.includes(p)) errs.push(`midi part outside roster: ${p}`);
  for (const p of audio) if (!AUDIO_ROSTER.includes(p)) errs.push(`audio part outside roster: ${p}`);
  return errs;
}
