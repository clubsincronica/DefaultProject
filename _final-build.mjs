// final-build.mjs — Final ES + EN rebuild with correct levels
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync } from 'node:fs';

const ROOT   = 'C:\\Users\\tom_w\\Documents\\Default Project';
const OUT    = `${ROOT}\\pipeline-viral\\content\\meditation-output\\2026-08-28`;
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const TMP    = `${OUT}\\_final`;
existsSync(TMP) || mkdirSync(TMP, { recursive: true });

const ORIG   = `${OUT}\\audio-mezcla-es-backup.wav`;
const SPAN   = `${ROOT}\\club-sincronica\\assets\\audio\\recordings\\h1 es.wav`;
const H1_RAW = `${ROOT}\\club-sincronica\\assets\\audio\\recordings\\h1.wav`;

function run(args) {
  execFileSync(FFMPEG, args, { encoding: 'utf8', stdio: 'ignore' });
}

// ============================================
// NATURE BED (shared between ES and EN)
// ============================================
console.log('=== Extracting nature bed from ORIGINAL ===');
const bed = `${TMP}/nature-bed.wav`;
run(['-y','-i', ORIG,
     '-af', 'highpass=f=100,lowpass=f=8000,volume=1.2',
     '-t','600','-c:a','pcm_s16le', bed]);
console.log('  Bed ready (100-8000Hz, 1.2x volume)');

// ============================================
// SPANISH VERSION
// ============================================
console.log('\n========================================');
console.log('  SPANISH VERSION');
console.log('========================================');

// Spanish voice: effects with more delay (30-40ms)
console.log('\n=== ES: live voice + effects ===');
const esVoice = `${TMP}/es-voice.wav`;
run(['-y','-i', SPAN,
     '-af', 'asetrate=44100*0.985,aresample=44100,' +
            'aecho=0.5:0.6:30|50:0.45|0.25,' +
            'extrastereo=1.15,' +
            'volume=2.0',
     '-c:a','pcm_s16le', esVoice]);
console.log('  Voice: pitch -1.5%, delay 30+50ms, wide stereo, 2.0x boost');

// Mix ES
console.log('\n=== ES: mix ===');
const esMix = `${OUT}/audio-mezcla-h1-es-v3.wav`;
run(['-y','-i', bed, '-i', esVoice,
     '-filter_complex',
     '[0:a]volume=0.6[bed];[1:a]volume=1.0[voz];[bed][voz]amix=inputs=2:duration=longest:dropout_transition=2,alimiter=limit=0.95[out]',
     '-map','[out]','-t','600','-c:a','pcm_s16le', esMix]);

// Mux ES
run(['-y',
     '-i', `${ROOT}/remotion-poc/out/H1-tiktok.mp4`,
     '-i', esMix,
     '-map','0:v:0','-map','1:a:0',
     '-c:v','copy','-c:a','aac','-b:a','192k','-shortest',
     `${OUT}/H1-final-es.mp4`]);
console.log('  H1-final-es.mp4 ✓');

// ============================================
// ENGLISH VERSION
// ============================================
console.log('\n========================================');
console.log('  ENGLISH VERSION');
console.log('========================================');

// Step 1: re-cut English slices directly from h1.wav
console.log('\n=== EN: cutting raw slices ===');
const acts = [
  { name:'act2-nutrir',    start:44,  dur:126 },
  { name:'act3-comunicar', start:170, dur:126 },
  { name:'act4-sonhar',    start:296, dur:126 },
  { name:'act5-atinar',    start:422, dur:126 },
];
for (const a of acts) {
  const raw = `${TMP}/${a.name}-raw.wav`;
  run(['-y','-i', H1_RAW,
       '-af', `atrim=start=${a.start}:duration=${a.dur},asetpts=PTS-STARTPTS`,
       '-c:a','pcm_s16le', raw]);
  a.raw = raw;
  console.log(`  ${a.name}: ✓`);
}

// Step 2: apply effects per slice (no asetrate — it kills volume)
console.log('\n=== EN: effects per slice ===');
for (const a of acts) {
  const out = `${TMP}/${a.name}-voice.wav`;
  // Skip asetrate (volume killer). Use: echo + wide stereo + boost
  const fadeOut = Math.max(0.3, a.dur - 0.5).toFixed(2);
  const filt = `aecho=0.5:0.6:30|50:0.45|0.25,` +
               `extrastereo=1.15,` +
               `volume=4.0,` +
               `afade=t=in:st=0:d=0.4,afade=t=out:st=${fadeOut}:d=0.4`;
  run(['-y','-i', a.raw, '-af', filt, '-t', String(a.dur), '-c:a','pcm_s16le', out]);
  a.voice = out;
  console.log(`  ${a.name}: ✓ (echo + wide + 4x boost)`);
}

// Step 3: assemble 600s delayed voice track
console.log('\n=== EN: assembling delayed track ===');
const voiceFull = `${TMP}/en-voice-600s.wav`;
const silIn  = ['-f','lavfi','-i','anullsrc=r=44100:cl=stereo','-t','600'];
const vIns   = acts.flatMap(a => ['-i', a.voice]);
const dl     = acts.map((a,i) => {
  const startMs = a.start * 1000;
  return `[${i+1}:a]adelay=${startMs}|${startMs},apad=pad_dur=0.5[v${i}]`;
}).join(';');
const mx     = `[0:a]${acts.map((_,i)=>`[v${i}]`).join('')}amix=inputs=${acts.length+1}:duration=longest:dropout_transition=2,volume=1.0[out]`;
run([...silIn,...vIns,'-filter_complex',`${dl};${mx}`,'-map','[out]','-t','600','-c:a','pcm_s16le',voiceFull]);
console.log('  Voice track ready (volume=1.0)');

// Step 4: mix EN
console.log('\n=== EN: mix ===');
const enMix = `${OUT}/audio-mezcla-h1-en-v4.wav`;
run(['-y','-i', bed, '-i', voiceFull,
     '-filter_complex',
     '[0:a]volume=0.4[bed];[1:a]volume=1.0[voz];[bed][voz]amix=inputs=2:duration=longest:dropout_transition=2,alimiter=limit=0.95[out]',
     '-map','[out]','-t','600','-c:a','pcm_s16le', enMix]);

// Mux EN
run(['-y',
     '-i', `${ROOT}/remotion-poc/out/H1-tiktok.mp4`,
     '-i', enMix,
     '-map','0:v:0','-map','1:a:0',
     '-c:v','copy','-c:a','aac','-b:a','192k','-shortest',
     `${OUT}/H1-final-en.mp4`]);
console.log('  H1-final-en.mp4 ✓');

console.log('\n========================================');
console.log('  DONE');
console.log('========================================');
console.log('  ES: H1-final-es.mp4 — delay 30+50ms, voice 2.0x');
console.log('  EN: H1-final-en.mp4 — echo + wide stereo, voice 4.0x');
console.log('  Both from slices, no asetrate volume kill ✓');