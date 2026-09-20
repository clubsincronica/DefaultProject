// rebuild-both.mjs — Rebuild ES + EN from ORIGINAL clean backup
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync } from 'node:fs';

const ROOT   = 'C:\\Users\\tom_w\\Documents\\Default Project';
const OUT    = `${ROOT}\\pipeline-viral\\content\\meditation-output\\2026-08-28`;
const FFMPEG = process.env.FFMPEG || 'ffmpeg';

// ORIGINAL clean Spanish mix (16:25 — before any English processing)
const ORIG = `${OUT}\\audio-mezcla-es-backup.wav`;
// Live Spanish recording
const SPAN = `${ROOT}\\club-sincronica\\assets\\audio\\recordings\\h1 es.wav`;
// English voice-only track (acts delayed into 600s)
const EN_VOICE = `${OUT}\\_ve5\\voz-en-600s.wav`;

function run(args) {
  execFileSync(FFMPEG, args, { encoding: 'utf8', stdio: 'ignore' });
}

// ============================================
// SPANISH VERSION
// ============================================
console.log('========================================');
console.log('  SPANISH VERSION');
console.log('========================================');

// Step 1: extract nature bed from ORIGINAL (gentle filter, keeps tones)
console.log('\n=== ES Step 1: nature bed from ORIGINAL ===');
const esBed = `${OUT}/_es-bed.wav`;
run(['-y','-i', ORIG,
     '-af', 'highpass=f=120,lowpass=f=8000,volume=1.0',
     '-t','600','-c:a','pcm_s16le', esBed]);
console.log('  Nature bed extracted (120-8000Hz, keeps tones)');

// Step 2: boost live Spanish voice with effects
console.log('\n=== ES Step 2: live voice + effects ===');
const esVoice = `${OUT}/_es-voice-fx.wav`;
run(['-y','-i', SPAN,
     '-af', 'asetrate=44100*0.985,aresample=44100,aecho=0.5:0.55:20|35:0.42|0.22,extrastereo=1.12,volume=1.5',
     '-c:a','pcm_s16le', esVoice]);
console.log('  Voice: pitch -1.5%, echo, wide stereo, 1.5x boost');

// Step 3: mix nature bed + live voice
console.log('\n=== ES Step 3: mix ===');
const esMix = `${OUT}/audio-mezcla-h1-es-v2.wav`;
run(['-y','-i', esBed, '-i', esVoice,
     '-filter_complex',
     '[0:a]volume=0.7[bed];[1:a]volume=1.0[voz];[bed][voz]amix=inputs=2:duration=longest:dropout_transition=2,alimiter=limit=0.95[out]',
     '-map','[out]','-t','600','-c:a','pcm_s16le', esMix]);
console.log(`  ${esMix}`);

// Step 4: replace + mux
cpSync(`${OUT}/audio-mezcla.wav`, `${OUT}/audio-mezcla-final-backup.wav`);
cpSync(esMix, `${OUT}/audio-mezcla.wav`);
run(['-y',
     '-i', `${ROOT}/remotion-poc/out/H1-tiktok.mp4`,
     '-i', `${OUT}/audio-mezcla.wav`,
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

// Step 1: boost English voice track + effects
console.log('\n=== EN Step 1: voice + effects + boost ===');
const enVoice = `${OUT}/_en-voice-fx.wav`;
run(['-y','-i', EN_VOICE,
     '-af', 'asetrate=44100*0.985,aresample=44100,aecho=0.5:0.55:20|35:0.42|0.22,extrastereo=1.12,volume=3.0',
     '-c:a','pcm_s16le', enVoice]);
console.log('  Voice: pitch -1.5%, echo, wide stereo, 3.0x boost');

// Step 2: same nature bed from ORIGINAL
console.log('\n=== EN Step 2: nature bed (same as ES) ===');
console.log('  Reusing _es-bed.wav');

// Step 3: mix
console.log('\n=== EN Step 3: mix ===');
const enMix = `${OUT}/audio-mezcla-h1-en-v3.wav`;
run(['-y','-i', esBed, '-i', enVoice,
     '-filter_complex',
     '[0:a]volume=0.4[bed];[1:a]volume=1.0[voz];[bed][voz]amix=inputs=2:duration=longest:dropout_transition=2,alimiter=limit=0.95[out]',
     '-map','[out]','-t','600','-c:a','pcm_s16le', enMix]);
console.log(`  ${enMix}`);

// Step 4: mux
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
console.log('  ES: H1-final-es.mp4 (voice 1.5x, bed 0.7x)');
console.log('  EN: H1-final-en.mp4 (voice 3.0x, bed 0.4x)');
console.log('  Both from ORIGINAL clean backup — no bleed ✓');