// remix-en.mjs — Rebuild English mix with louder voice
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync } from 'node:fs';

const ROOT   = 'C:\\Users\\tom_w\\Documents\\Default Project';
const OUT    = `${ROOT}\\pipeline-viral\\content\\meditation-output\\2026-08-28`;
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const TMP    = `${OUT}\\_enfix`;
existsSync(TMP) || mkdirSync(TMP, { recursive: true });

const VOICE  = `${TMP}/voz-en-loud.wav`;
const BED    = `${TMP}/nature-bed-quiet.wav`;
const MIX    = `${OUT}/audio-mezcla-h1-en-v2.wav`;
const FINAL  = `${OUT}/H1-final-en.mp4`;

function run(args) {
  execFileSync(FFMPEG, args, { encoding: 'utf8', stdio: 'ignore' });
}

// Step 1: Boost English voice volume (from backup)
console.log('=== Step 1: boosting English voice ===');
run(['-y','-i', `${OUT}/audio-mezcla-en-backup.wav`,
     '-af', 'volume=2.5,alimiter=limit=0.95',
     '-c:a','pcm_s16le', VOICE]);
console.log('  Voice boosted 2.5x');

// Step 2: Extract quieter nature bed
console.log('\n=== Step 2: quieter nature bed ===');
run(['-y','-i', `${OUT}/audio-mezcla-es-backup.wav`,
     '-af', 'lowpass=f=3500,highpass=f=80,volume=0.2',
     '-t','600','-c:a','pcm_s16le', BED]);
console.log('  Bed at 0.2 volume');

// Step 3: Mix (voice dominant)
console.log('\n=== Step 3: voice-dominant mix ===');
run(['-y','-i', BED, '-i', VOICE,
     '-filter_complex',
     '[0:a]volume=0.3[bed];[1:a]volume=1.8[voz];[bed][voz]amix=inputs=2:duration=longest:dropout_transition=2,alimiter=limit=0.95[out]',
     '-map','[out]','-t','600','-c:a','pcm_s16le', MIX]);
console.log(`  ${MIX}`);

// Step 4: Replace audio-mezcla.wav
cpSync(`${OUT}/audio-mezcla.wav`, `${OUT}/audio-mezcla-es-backup2.wav`);
cpSync(MIX, `${OUT}/audio-mezcla.wav`);
console.log('\n✓ audio-mezcla.wav updated (English voice louder)');

// Step 5: Re-mux with video
console.log('\n=== Step 5: re-mux ===');
run(['-y',
     '-i', `${ROOT}/remotion-poc/out/H1-tiktok.mp4`,
     '-i', `${OUT}/audio-mezcla.wav`,
     '-map','0:v:0','-map','1:a:0',
     '-c:v','copy','-c:a','aac','-b:a','192k','-shortest',
     FINAL]);
console.log(`\n✓ ${FINAL} — English voice should now be clearly audible`);
console.log('  Voice 1.8x + bed 0.3x in final mix');