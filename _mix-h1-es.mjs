// mix-h1-es.mjs — Spanish voice: effects + nature bed mix + final mux
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync } from 'node:fs';

const ROOT   = 'C:\\Users\\tom_w\\Documents\\Default Project';
const SPAN   = `${ROOT}\\club-sincronica\\assets\\audio\\recordings\\h1 es.wav`;
const OUT    = `${ROOT}\\pipeline-viral\\content\\meditation-output\\2026-08-28`;
const VIDEO  = `${ROOT}\\remotion-poc\\out\\H1-tiktok.mp4`;
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const TMP    = `${OUT}\\_esfx`;
existsSync(TMP) || mkdirSync(TMP, { recursive: true });

const VOICE  = `${TMP}/voz-es-fx.wav`;
const BED    = `${TMP}/nature-bed.wav`;
const MIX    = `${OUT}/audio-mezcla-h1-es.wav`;
const FINAL  = `${OUT}/H1-final-es.mp4`;

const TOTAL  = 597; // h1 es.wav = 00:09:57.03 (confirmed)

function run(args) {
  execFileSync(FFMPEG, args, { encoding: 'utf8', stdio: 'ignore' });
}

// Step 1: Spanish voice effects (pitch + echo + wide stereo)
console.log('=== Step 1: Spanish voice effects ===');
run(['-y','-i', SPAN,
     '-af','asetrate=44100*0.985,aresample=44100,aecho=0.5:0.55:20|35:0.42|0.22,extrastereo=1.12',
     '-c:a','pcm_s16le', VOICE]);
console.log(`  Voice ready (${TOTAL}s)`);

// Step 2: extract nature bed (low-pass kills old voice, keeps ambient)
console.log('\n=== Step 2: nature bed ===');
run(['-y','-i', `${OUT}/audio-mezcla.wav`,
     '-af','lowpass=f=3500,highpass=f=80,volume=0.38',
     '-t','600','-c:a','pcm_s16le', BED]);
console.log('  Bed ready');

// Step 3: mix nature + Spanish voice, fade out near end of voice
console.log('\n=== Step 3: final mix ===');
const fadeOut = Math.max(0, TOTAL - 4);
run(['-y','-i', BED, '-i', VOICE,
     '-filter_complex',
     `[0:a][1:a]amix=inputs=2:duration=longest:dropout_transition=2,volume=1.15,` +
     `afade=t=in:st=0:d=2,afade=t=out:st=${fadeOut}:d=4,alimiter=limit=0.95[out]`,
     '-map','[out]','-t','600','-c:a','pcm_s16le', MIX]);
console.log(`  ${MIX}`);

// Step 4: backup EN version + replace
cpSync(`${OUT}/audio-mezcla.wav`, `${OUT}/audio-mezcla-en-backup.wav`);
cpSync(MIX, `${OUT}/audio-mezcla.wav`);
console.log('\n✓ audio-mezcla.wav = Spanish voice + pitch(-1.5%) + echo + wide stereo');
console.log('  EN backup: audio-mezcla-en-backup.wav');

// Step 5: mux with video (-shortest = video ends at min(video,audio) ≈ 597s)
console.log('\n=== Step 5: final mux ===');
run(['-y',
     '-i', VIDEO,
     '-i', `${OUT}/audio-mezcla.wav`,
     '-map','0:v:0','-map','1:a:0',
     '-c:v','copy','-c:a','aac','-b:a','192k','-shortest',
     FINAL]);
console.log(`\n✓ FINAL: ${FINAL}`);
console.log(`  Duration: ~9:57 (under 10 min, TikTok-ready)`);
console.log('  Spanish voice with deeper pitch, reverb, wide stereo ✓');