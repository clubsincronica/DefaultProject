// _compress-bed.mjs — Compress 720s bed to 600s (1.2x speed) to match video timing
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';

const ROOT   = 'C:\\Users\\tom_w\\Documents\\Default Project';
const OUT    = `${ROOT}\\pipeline-viral\\content\\meditation-output\\2026-08-28`;
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const TMP    = `${OUT}\\_compressed`;
existsSync(TMP) || mkdirSync(TMP, { recursive: true });

function run(args) {
  execFileSync(FFMPEG, args, { encoding: 'utf8', stdio: 'ignore' });
}

// Step 1: Compress original 720s bed to 600s (speed up 1.2x)
console.log('=== Step 1: Compress bed 720s → 600s (1.2x) ===');
const ORIG = `${OUT}\\audio-mezcla-es-backup.wav`;
const bedCompressed = `${TMP}/bed-compressed.wav`;
// atempo=1.2 speeds up audio by 1.2x (720s / 1.2 = 600s)
run(['-y','-i', ORIG,
     '-af', 'atempo=1.2,highpass=f=100,lowpass=f=8000,volume=1.2',
     '-t','600','-c:a','pcm_s16le', bedCompressed]);
console.log('  Bed compressed to 600s ✓');

// Step 2: Spanish voice
console.log('\n=== Step 2: Spanish voice ===');
const SPAN = `${ROOT}\\club-sincronica\\assets\\audio\\recordings\\h1 es.wav`;
const esVoice = `${TMP}/es-voice.wav`;
run(['-y','-i', SPAN,
     '-af', 'asetrate=44100*0.985,aresample=44100,aecho=0.5:0.6:30|50:0.45|0.25,extrastereo=1.15,volume=2.0',
     '-c:a','pcm_s16le', esVoice]);

// Step 3: Final mix
console.log('\n=== Step 3: Final mix ===');
const finalMix = `${OUT}/audio-mezcla-h1-es-v10.wav`;
run(['-y','-i', bedCompressed, '-i', esVoice,
     '-filter_complex',
     '[0:a]volume=0.65[bed];[1:a]volume=1.0[voz];[bed][voz]amix=inputs=2:duration=longest:dropout_transition=2,alimiter=limit=0.95[out]',
     '-map','[out]','-t','600','-c:a','pcm_s16le', finalMix]);

// Step 4: Mux
console.log('\n=== Step 4: Mux ===');
run(['-y',
     '-i', `${ROOT}\\remotion-poc\\out\\H1-tiktok.mp4`,
     '-i', finalMix,
     '-map','0:v:0','-map','1:a:0',
     '-c:v','copy','-c:a','aac','-b:a','192k','-shortest',
     `${OUT}\\H1-final-es.mp4`]);
console.log('  H1-final-es.mp4 ✓');

console.log('\n========================================');
console.log('  Bed compressed from 720s to 600s (1.2x)');
console.log('  All internal events now proportional:');
console.log('    Old Act2 kin-tones: 64s → New: 53s');
console.log('    Old Act3 kin-tones: 196s → New: 163s');
console.log('    Old Act4 kin-tones: 328s → New: 273s');
console.log('    Old Act5 kin-tones: 460s → New: 383s');
console.log('  Real voice + video remain at actual timings');