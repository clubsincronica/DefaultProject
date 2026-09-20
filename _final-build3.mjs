// final-build3.mjs — Final build with ACTUAL act timings from transcription
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync } from 'node:fs';

const ROOT   = 'C:\\Users\\tom_w\\Documents\\Default Project';
const OUT    = `${ROOT}\\pipeline-viral\\content\\meditation-output\\2026-08-28`;
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const TMP    = `${OUT}\\_final3`;
existsSync(TMP) || mkdirSync(TMP, { recursive: true });

const ORIG   = `${OUT}\\audio-mezcla-es-backup.wav`;
const SPAN   = `${ROOT}\\club-sincronica\\assets\\audio\\recordings\\h1 es.wav`;
const H1_RAW = `${ROOT}\\club-sincronica\\assets\\audio\\recordings\\h1.wav`;

function run(args) {
  execFileSync(FFMPEG, args, { encoding: 'utf8', stdio: 'ignore' });
}

// ============================================
// ACTUAL ACT TIMINGS (from transcription)
// ============================================
// Spanish recording: acts are earlier/later than expected
const ES_ACTS = [
  { name: 'act1-breathing', start: 0,   end: 11.9 },
  { name: 'act2-nutrir',    start: 14.5, end: 169.5 },  // 2:49.5
  { name: 'act3-comunicar', start: 189.7, end: 283.2 }, // 4:43.2
  { name: 'act4-sonhar',    start: 291.2, end: 390.6 }, // 6:30.6
  { name: 'act5-atinar',    start: 404.4, end: 502.1 }, // 8:22.1
  { name: 'act6-cierre',    start: 510.0, end: 593.4 }, // 9:53.4
];

// English recording: different timings
const EN_ACTS = [
  { name: 'act1-breathing', start: 0,   end: 53.9 },
  { name: 'act2-nurture',   start: 56.5, end: 182.9 },  // 3:02.9
  { name: 'act3-communicate', start: 199.8, end: 283.2 }, // 4:43.2
  { name: 'act4-dream',     start: 294.4, end: 396.0 }, // 6:36.0
  { name: 'act5-plant',     start: 400.0, end: 510.3 }, // 8:30.3
  { name: 'act6-cierre',    start: 517.5, end: 605.8 }, // 10:05.8
];

// ============================================
// NATURE BED (shifted to match Spanish timing)
// ============================================
// Spanish Act 2 starts at 14.5s (not 44s)
// So we need to shift the bed -29.5s (remove first 29.5s)
console.log('=== Extracting nature bed (shifted -29.5s for Spanish) ===');
const esBed = `${TMP}/nature-bed-es.wav`;
run(['-y','-i', ORIG,
     '-af', 'atrim=start=29.5:duration=600,asetpts=PTS-STARTPTS,highpass=f=100,lowpass=f=8000,volume=1.2',
     '-c:a','pcm_s16le', esBed]);
console.log('  Bed: first 29.5s removed, 600s total');

// ============================================
// SPANISH VERSION
// ============================================
console.log('\n========================================');
console.log('  SPANISH VERSION');
console.log('========================================');

// Spanish voice: effects with delay (30-50ms)
console.log('\n=== ES: live voice + effects ===');
const esVoice = `${TMP}/es-voice.wav`;
run(['-y','-i', SPAN,
     '-af', 'asetrate=44100*0.985,aresample=44100,' +
            'aecho=0.5:0.6:30|50:0.45|0.25,' +
            'extrastereo=1.15,' +
            'volume=2.0',
     '-c:a','pcm_s16le', esVoice]);
console.log('  Voice: pitch -1.5%, delay 30+50ms, wide stereo, 2.0x');

// Mix ES
console.log('\n=== ES: mix ===');
const esMix = `${OUT}/audio-mezcla-h1-es-v5.wav`;
run(['-y','-i', esBed, '-i', esVoice,
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

// Step 1: re-cut English slices directly from h1.wav using ACTUAL timings
console.log('\n=== EN: cutting raw slices (actual timings) ===');
const enActs = [
  { name:'act2-nurture',    start:56.5,  dur:126.4 },  // 56.5 to 182.9
  { name:'act3-communicate', start:199.8, dur:83.4 },   // 199.8 to 283.2
  { name:'act4-dream',      start:294.4, dur:101.6 },  // 294.4 to 396.0
  { name:'act5-plant',      start:400.0, dur:110.3 },  // 400.0 to 510.3
];
for (const a of enActs) {
  const raw = `${TMP}/${a.name}-raw.wav`;
  run(['-y','-i', H1_RAW,
       '-af', `atrim=start=${a.start}:duration=${a.dur},asetpts=PTS-STARTPTS`,
       '-c:a','pcm_s16le', raw]);
  a.raw = raw;
  console.log(`  ${a.name}: ${a.start}s-${a.start+a.dur}s ✓`);
}

// Step 2: apply effects per slice (no asetrate — it kills volume)
console.log('\n=== EN: effects per slice ===');
for (const a of enActs) {
  const out = `${TMP}/${a.name}-voice.wav`;
  const fadeOut = Math.max(0.3, a.dur - 0.5).toFixed(2);
  const filt = `aecho=0.5:0.6:30|50:0.45|0.25,` +
               `extrastereo=1.15,` +
               `volume=4.0,` +
               `afade=t=in:st=0:d=0.4,afade=t=out:st=${fadeOut}:d=0.4`;
  run(['-y','-i', a.raw, '-af', filt, '-t', String(a.dur), '-c:a','pcm_s16le', out]);
  a.voice = out;
  console.log(`  ${a.name}: ✓ (echo + wide + 4x)`);
}

// Step 3: assemble 600s delayed voice track
console.log('\n=== EN: assembling delayed track ===');
const voiceFull = `${TMP}/en-voice-600s.wav`;
const silIn  = ['-f','lavfi','-i','anullsrc=r=44100:cl=stereo','-t','600'];
const vIns   = enActs.flatMap(a => ['-i', a.voice]);
const dl     = enActs.map((a,i) => {
  const startMs = a.start * 1000;
  return `[${i+1}:a]adelay=${startMs}|${startMs},apad=pad_dur=0.5[v${i}]`;
}).join(';');
const mx     = `[0:a]${enActs.map((_,i)=>`[v${i}]`).join('')}amix=inputs=${enActs.length+1}:duration=longest:dropout_transition=2,volume=1.0[out]`;
run([...silIn,...vIns,'-filter_complex',`${dl};${mx}`,'-map','[out]','-t','600','-c:a','pcm_s16le',voiceFull]);
console.log('  Voice track ready (volume=1.0)');

// Step 4: nature bed for English (different shift: +12.5s since Act 2 starts at 56.5s)
console.log('\n=== EN: nature bed (shifted +12.5s) ===');
const enBed = `${TMP}/nature-bed-en.wav`;
// English Act 2 starts at 56.5s, expected 44s → shift +12.5s
// So we need to add 12.5s of silence at the start
run(['-y','-i', ORIG,
     '-af', `adelay=12500|12500,atrim=start=0:duration=600,asetpts=PTS-STARTPTS,highpass=f=100,lowpass=f=8000,volume=1.2`,
     '-c:a','pcm_s16le', enBed]);
console.log('  Bed: 12.5s delay added');

// Step 5: mix EN
console.log('\n=== EN: mix ===');
const enMix = `${OUT}/audio-mezcla-h1-en-v6.wav`;
run(['-y','-i', enBed, '-i', voiceFull,
     '-filter_complex',
     '[0:a]volume=0.4[bed];[1:a]volume=1.0[voz];[bed][voz]amix=inputs=2:duration=longest:dropout_transition=2,alimiter=limit=0.95[out]',
     '-map','[out]','-t','600','-c:a','pcm_s16le', enMix]);

// Step 6: mux EN
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
console.log('  ES: H1-final-es.mp4 — bed shifted -29.5s to match actual Act 2 at 14.5s');
console.log('  EN: H1-final-en.mp4 — bed shifted +12.5s to match actual Act 2 at 56.5s');
console.log('  Both: voice effects (echo 30+50ms, wide stereo, volume boost)');