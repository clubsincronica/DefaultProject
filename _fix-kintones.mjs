// _fix-kintones.mjs — Shift kin-tones +12s (from 55s to 67s)
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';

const ROOT   = 'C:\\Users\\tom_w\\Documents\\Default Project';
const OUT    = `${ROOT}\\pipeline-viral\\content\\meditation-output\\2026-08-28`;
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const TMP    = `${OUT}\\_kintones2`;
existsSync(TMP) || mkdirSync(TMP, { recursive: true });

function run(args) {
  execFileSync(FFMPEG, args, { encoding: 'utf8', stdio: 'ignore' });
}

// Current kin-tone positions (user hears at 55s)
// Need to shift +12s to start at 67s (01:07)
const KIN_TONES = [
  // Act 2 (Nutrir) — currently at 55s, want at 67s
  { start: 67, dur: 92, amp: 0.04, freq: 282.54 },
  { start: 67, dur: 92, amp: 0.025, freq: 423.81 },
  // Act 3 (Comunicar) — currently at 187s, want at 199s
  { start: 199, dur: 92, amp: 0.04, freq: 272.2 },
  { start: 199, dur: 92, amp: 0.025, freq: 408.3 },
  // Act 4 (Soñar) — currently at 319s, want at 331s
  { start: 331, dur: 92, amp: 0.04, freq: 252.44 },
  { start: 331, dur: 92, amp: 0.025, freq: 378.66 },
  // Act 5 (Atinar) — currently at 451s, want at 463s
  { start: 463, dur: 92, amp: 0.04, freq: 388.36 },
  { start: 463, dur: 92, amp: 0.025, freq: 582.54 },
];

console.log('=== Generating kin-tone layer (shifted +12s) ===');

const inputs = [];
const filters = [];
let inputIdx = 0;

for (let i = 0; i < KIN_TONES.length; i++) {
  const kt = KIN_TONES[i];
  inputs.push('-f', 'lavfi', '-i', `sine=frequency=${kt.freq}:duration=${kt.dur}:sample_rate=44100`);
  const delayMs = Math.round(kt.start * 1000);
  filters.push(`[${inputIdx}:a]volume=${kt.amp},adelay=${delayMs}|${delayMs}[t${i}]`);
  inputIdx++;
}

const mixInputs = KIN_TONES.map((_, i) => `[t${i}]`).join('');
filters.push(`${mixInputs}amix=inputs=${KIN_TONES.length}:duration=longest:dropout_transition=2,volume=1.0[out]`);

const kinTonesPath = `${TMP}/kin-tones-600s.wav`;
run(['-y', ...inputs, '-filter_complex', filters.join(';'), '-map', '[out]', '-t', '600', '-c:a', 'pcm_s16le', kinTonesPath]);
console.log('  Kin-tones ready (starting at 01:07) ✓');

// Extract nature bed
console.log('\n=== Nature bed ===');
const ORIG = `${OUT}\\audio-mezcla-es-backup.wav`;
const natureOnly = `${TMP}/nature-only.wav`;
run(['-y','-i', ORIG,
     '-af', 'atrim=start=29.5:duration=600,asetpts=PTS-STARTPTS,highpass=f=100,lowpass=f=8000,volume=1.2',
     '-c:a','pcm_s16le', natureOnly]);

// Mix nature + kin-tones
console.log('\n=== Mix nature + kin-tones ===');
const bedWithKintones = `${TMP}/bed-with-kintones.wav`;
run(['-y','-i', natureOnly, '-i', kinTonesPath,
     '-filter_complex',
     '[0:a]volume=0.7[nature];[1:a]volume=0.8[tones];[nature][tones]amix=inputs=2:duration=longest:dropout_transition=2,alimiter=limit=0.95[out]',
     '-map','[out]','-t','600','-c:a','pcm_s16le', bedWithKintones]);

// Spanish voice
console.log('\n=== Spanish voice ===');
const SPAN = `${ROOT}\\club-sincronica\\assets\\audio\\recordings\\h1 es.wav`;
const esVoice = `${TMP}/es-voice.wav`;
run(['-y','-i', SPAN,
     '-af', 'asetrate=44100*0.985,aresample=44100,aecho=0.5:0.6:30|50:0.45|0.25,extrastereo=1.15,volume=2.0',
     '-c:a','pcm_s16le', esVoice]);

// Final mix
console.log('\n=== Final mix ===');
const finalMix = `${OUT}/audio-mezcla-h1-es-v7.wav`;
run(['-y','-i', bedWithKintones, '-i', esVoice,
     '-filter_complex',
     '[0:a]volume=1.0[bed];[1:a]volume=1.0[voz];[bed][voz]amix=inputs=2:duration=longest:dropout_transition=2,alimiter=limit=0.95[out]',
     '-map','[out]','-t','600','-c:a','pcm_s16le', finalMix]);

// Mux
console.log('\n=== Mux ===');
run(['-y',
     '-i', `${ROOT}\\remotion-poc\\out\\H1-tiktok.mp4`,
     '-i', finalMix,
     '-map','0:v:0','-map','1:a:0',
     '-c:v','copy','-c:a','aac','-b:a','192k','-shortest',
     `${OUT}\\H1-final-es.mp4`]);
console.log('  H1-final-es.mp4 ✓');

console.log('\n  Kin-tones now start at 01:07 (67s)');