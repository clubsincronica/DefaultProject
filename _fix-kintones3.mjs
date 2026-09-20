// _fix-kintones3.mjs — Simple approach: delay nature bed 12s to shift kin-tones
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';

const ROOT   = 'C:\\Users\\tom_w\\Documents\\Default Project';
const OUT    = `${ROOT}\\pipeline-viral\\content\\meditation-output\\2026-08-28`;
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const TMP    = `${OUT}\\_kintones4`;
existsSync(TMP) || mkdirSync(TMP, { recursive: true });

function run(args) {
  execFileSync(FFMPEG, args, { encoding: 'utf8', stdio: 'ignore' });
}

// Step 1: Delay nature bed by 12s (shifts kin-tones from 55s to 67s)
console.log('=== Step 1: Delay nature bed 12s ===');
const ORIG = `${OUT}\\audio-mezcla-es-backup.wav`;
const bedDelayed = `${TMP}/bed-delayed.wav`;
run(['-y','-i', ORIG,
     '-af', `adelay=12000|12000,atrim=start=0:duration=600,asetpts=PTS-STARTPTS,volume=1.0`,
     '-c:a','pcm_s16le', bedDelayed]);
console.log('  Bed delayed 12s ✓');

// Step 2: Spanish voice
console.log('\n=== Step 2: Spanish voice ===');
const SPAN = `${ROOT}\\club-sincronica\\assets\\audio\\recordings\\h1 es.wav`;
const esVoice = `${TMP}/es-voice.wav`;
run(['-y','-i', SPAN,
     '-af', 'asetrate=44100*0.985,aresample=44100,aecho=0.5:0.6:30|50:0.45|0.25,extrastereo=1.15,volume=2.0',
     '-c:a','pcm_s16le', esVoice]);

// Step 3: Final mix
console.log('\n=== Step 3: Final mix ===');
const finalMix = `${OUT}/audio-mezcla-h1-es-v9.wav`;
run(['-y','-i', bedDelayed, '-i', esVoice,
     '-filter_complex',
     '[0:a]volume=0.7[bed];[1:a]volume=1.0[voz];[bed][voz]amix=inputs=2:duration=longest:dropout_transition=2,alimiter=limit=0.95[out]',
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

console.log('\n  Nature bed delayed 12s');
console.log('  Kin-tones should now start at 01:07 (67s)');