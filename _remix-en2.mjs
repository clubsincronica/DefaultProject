// remix-en2.mjs — Rebuild English: voice-only track boosted + quiet nature bed
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync } from 'node:fs';

const ROOT   = 'C:\\Users\\tom_w\\Documents\\Default Project';
const OUT    = `${ROOT}\\pipeline-viral\\content\\meditation-output\\2026-08-28`;
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const TMP    = `${OUT}\\_enfix2`;
existsSync(TMP) || mkdirSync(TMP, { recursive: true });

const VOICE_RAW = `${OUT}\\_ve5\\voz-en-600s.wav`;
const VOICE_BOOSTED = `${TMP}\\voz-en-boosted.wav`;
const BED = `${TMP}\\nature-bed.wav`;
const MIX = `${OUT}\\audio-mezcla-h1-en-v3.wav`;
const FINAL = `${OUT}\\H1-final-en.mp4`;

function run(args) {
  execFileSync(FFMPEG, args, { encoding: 'utf8', stdio: 'ignore' });
}

// Step 1: boost voice track (the 600s voice-only with act delays)
console.log('=== Step 1: boost English voice track ===');
run(['-y','-i', VOICE_RAW,
     '-af', 'volume=3.5,alimiter=limit=0.95',
     '-c:a','pcm_s16le', VOICE_BOOSTED]);
console.log('  Voice boosted 3.5x');

// Step 2: quiet nature bed (from Spanish backup, low-pass to kill voice)
console.log('\n=== Step 2: quiet nature bed ===');
run(['-y','-i', `${OUT}/audio-mezcla-es-backup.wav`,
     '-af', 'lowpass=f=3500,highpass=f=80,volume=0.15',
     '-t','600','-c:a','pcm_s16le', BED]);
console.log('  Bed at 0.15 volume');

// Step 3: mix (voice dominant, bed supportive)
console.log('\n=== Step 3: voice-dominant mix ===');
run(['-y','-i', BED, '-i', VOICE_BOOSTED,
     '-filter_complex',
     '[0:a]volume=0.25[bed];[1:a]volume=1.0[voz];[bed][voz]amix=inputs=2:duration=longest:dropout_transition=2,alimiter=limit=0.95[out]',
     '-map','[out]','-t','600','-c:a','pcm_s16le', MIX]);
console.log(`  ${MIX}`);

// Step 4: replace
cpSync(`${OUT}/audio-mezcla.wav`, `${OUT}/audio-mezcla-es-backup3.wav`);
cpSync(MIX, `${OUT}/audio-mezcla.wav`);
console.log('\n✓ audio-mezcla.wav updated');

// Step 5: re-mux
console.log('\n=== Step 5: re-mux ===');
run(['-y',
     '-i', `${ROOT}/remotion-poc/out/H1-tiktok.mp4`,
     '-i', `${OUT}/audio-mezcla.wav`,
     '-map','0:v:0','-map','1:a:0',
     '-c:v','copy','-c:a','aac','-b:a','192k','-shortest',
     FINAL]);
console.log(`\n✓ ${FINAL}`);
console.log('  Voice 3.5x boosted, bed at 0.25x — voice should be VERY clear now');
console.log('  If still too quiet, let me know and I will boost to 5x+');