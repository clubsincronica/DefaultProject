// _shift-kintones.mjs — Shift kin-tones to 01:09 and make quieter
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';

const ROOT   = 'C:\\Users\\tom_w\\Documents\\Default Project';
const OUT    = `${ROOT}\\pipeline-viral\\content\\meditation-output\\2026-08-28`;
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const TMP    = `${OUT}\\_kintones`;
existsSync(TMP) || mkdirSync(TMP, { recursive: true });

function run(args) {
  execFileSync(FFMPEG, args, { encoding: 'utf8', stdio: 'ignore' });
}

// Original kin-tone events from meditacion-2026-08-28.json
// Original starts: 64s, 196s, 328s, 460s
// User wants them at 69s (01:09) — that's +5s from original
// After -29.5s bed shift: 69 - 29.5 = 39.5s in shifted bed
const KIN_TONES = [
  // Act 2 (Nutrir) — Dragón
  { start: 69, dur: 92, amp: 0.04, freq: 282.54 },  // Was 0.08, now 0.04 (quieter)
  { start: 69, dur: 92, amp: 0.025, freq: 423.81 }, // Was 0.05, now 0.025
  // Act 3 (Comunicar) — Viento
  { start: 201, dur: 92, amp: 0.04, freq: 272.2 },   // Was 64+132=196, now +5=201
  { start: 201, dur: 92, amp: 0.025, freq: 408.3 },
  // Act 4 (Soñar) — Noche
  { start: 333, dur: 92, amp: 0.04, freq: 252.44 },  // Was 328, now +5=333
  { start: 333, dur: 92, amp: 0.025, freq: 378.66 },
  // Act 5 (Atinar) — Semilla
  { start: 465, dur: 92, amp: 0.04, freq: 388.36 },  // Was 460, now +5=465
  { start: 465, dur: 92, amp: 0.025, freq: 582.54 },
];

console.log('=== Generating kin-tone layer ===');

// Build ffmpeg filter for kin-tones
const inputs = [];
const filters = [];
let inputIdx = 0;

for (let i = 0; i < KIN_TONES.length; i++) {
  const kt = KIN_TONES[i];
  // Generate sine wave for this kin-tone
  const dur = kt.dur;
  const freq = kt.freq;
  const amp = kt.amp;
  
  // Create sine wave input
  inputs.push('-f', 'lavfi', '-i', `sine=frequency=${freq}:duration=${dur}:sample_rate=44100`);
  
  // Apply amplitude envelope and delay
  const delayMs = Math.round(kt.start * 1000);
  filters.push(`[${inputIdx}:a]volume=${amp},adelay=${delayMs}|${delayMs}[t${i}]`);
  inputIdx++;
}

// Mix all kin-tones together
const mixInputs = KIN_TONES.map((_, i) => `[t${i}]`).join('');
filters.push(`${mixInputs}amix=inputs=${KIN_TONES.length}:duration=longest:dropout_transition=2,volume=1.0[out]`);

const filterStr = filters.join(';');
const kinTonesPath = `${TMP}/kin-tones-600s.wav`;

run(['-y', ...inputs, '-filter_complex', filterStr, '-map', '[out]', '-t', '600', '-c:a', 'pcm_s16le', kinTonesPath]);
console.log('  Kin-tones ready (quieter, starting at 01:09) ✓');

// Step 2: Extract nature bed WITHOUT kin-tones (just nature + sparse + pad + cuenco)
console.log('\n=== Extracting nature bed (without kin-tones) ===');
const ORIG = `${OUT}\\audio-mezcla-es-backup.wav`;
const natureOnly = `${TMP}/nature-only.wav`;

// Use lowpass to remove the tonal kin-tone frequencies, keep nature
run(['-y','-i', ORIG,
     '-af', 'atrim=start=29.5:duration=600,asetpts=PTS-STARTPTS,' +
            'highpass=f=100,lowpass=f=8000,' +
            'volume=1.2',
     '-c:a','pcm_s16le', natureOnly]);
console.log('  Nature bed extracted ✓');

// Step 3: Mix nature + kin-tones
console.log('\n=== Mixing nature + kin-tones ===');
const bedWithKintones = `${TMP}/bed-with-kintones.wav`;
run(['-y','-i', natureOnly, '-i', kinTonesPath,
     '-filter_complex',
     '[0:a]volume=0.7[nature];[1:a]volume=0.8[tones];[nature][tones]amix=inputs=2:duration=longest:dropout_transition=2,alimiter=limit=0.95[out]',
     '-map','[out]','-t','600','-c:a','pcm_s16le', bedWithKintones]);
console.log('  Bed ready ✓');

// Step 4: Mix with Spanish voice
console.log('\n=== Mixing with Spanish voice ===');
const SPAN = `${ROOT}\\club-sincronica\\assets\\audio\\recordings\\h1 es.wav`;
const esVoice = `${TMP}/es-voice.wav`;
run(['-y','-i', SPAN,
     '-af', 'asetrate=44100*0.985,aresample=44100,' +
            'aecho=0.5:0.6:30|50:0.45|0.25,' +
            'extrastereo=1.15,' +
            'volume=2.0',
     '-c:a','pcm_s16le', esVoice]);
console.log('  Voice processed ✓');

const finalMix = `${OUT}/audio-mezcla-h1-es-v6.wav`;
run(['-y','-i', bedWithKintones, '-i', esVoice,
     '-filter_complex',
     '[0:a]volume=1.0[bed];[1:a]volume=1.0[voz];[bed][voz]amix=inputs=2:duration=longest:dropout_transition=2,alimiter=limit=0.95[out]',
     '-map','[out]','-t','600','-c:a','pcm_s16le', finalMix]);
console.log('  Final mix ready ✓');

// Step 5: Mux with video
console.log('\n=== Muxing with video ===');
run(['-y',
     '-i', `${ROOT}\\remotion-poc\\out\\H1-tiktok.mp4`,
     '-i', finalMix,
     '-map','0:v:0','-map','1:a:0',
     '-c:v','copy','-c:a','aac','-b:a','192k','-shortest',
     `${OUT}\\H1-final-es.mp4`]);
console.log('  H1-final-es.mp4 ✓');

console.log('\n========================================');
console.log('  DONE');
console.log('========================================');
console.log('  Kin-tones now start at 01:09 (69s)');
console.log('  Kin-tone volume: 0.04/0.025 (half of original)');
console.log('  Positioned before each act start:');
console.log('    Act 2 (Nutrir): 69s (before 14.5s + body)');
console.log('    Act 3 (Comunicar): 201s');
console.log('    Act 4 (Soñar): 333s');
console.log('    Act 5 (Atinar): 465s');