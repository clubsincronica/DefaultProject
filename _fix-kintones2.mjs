// _fix-kintones2.mjs — Remove old kin-tones from bed, add new at 01:07
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';

const ROOT   = 'C:\\Users\\tom_w\\Documents\\Default Project';
const OUT    = `${ROOT}\\pipeline-viral\\content\\meditation-output\\2026-08-28`;
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const TMP    = `${OUT}\\_kintones3`;
existsSync(TMP) || mkdirSync(TMP, { recursive: true });

function run(args) {
  execFileSync(FFMPEG, args, { encoding: 'utf8', stdio: 'ignore' });
}

// Kin-tone frequencies to REMOVE from nature bed (bandreject filters)
const KT_FREQS = [282.54, 423.81, 272.2, 408.3, 252.44, 378.66, 388.36, 582.54];
const notchFilters = KT_FREQS.map(f => `bandreject=f=${f}:w=20:g=30`).join(',');

console.log('=== Step 1: Remove old kin-tones from nature bed ===');
const ORIG = `${OUT}\\audio-mezcla-es-backup.wav`;
const natureClean = `${TMP}/nature-clean.wav`;
run(['-y','-i', ORIG,
     '-af', `atrim=start=29.5:duration=600,asetpts=PTS-STARTPTS,` +
            `highpass=f=100,lowpass=f=8000,` +
            `${notchFilters},` +
            `volume=1.2`,
     '-c:a','pcm_s16le', natureClean]);
console.log('  Old kin-tones removed via notch filters ✓');

// Step 2: Generate NEW kin-tones starting at 01:07 (67s)
console.log('\n=== Step 2: Generate new kin-tones at 01:07 ===');
const KIN_TONES = [
  { start: 67, dur: 92, amp: 0.04, freq: 282.54 },
  { start: 67, dur: 92, amp: 0.025, freq: 423.81 },
  { start: 199, dur: 92, amp: 0.04, freq: 272.2 },
  { start: 199, dur: 92, amp: 0.025, freq: 408.3 },
  { start: 331, dur: 92, amp: 0.04, freq: 252.44 },
  { start: 331, dur: 92, amp: 0.025, freq: 378.66 },
  { start: 463, dur: 92, amp: 0.04, freq: 388.36 },
  { start: 463, dur: 92, amp: 0.025, freq: 582.54 },
];

const inputs = [];
const filters = [];
let idx = 0;
for (const kt of KIN_TONES) {
  inputs.push('-f', 'lavfi', '-i', `sine=frequency=${kt.freq}:duration=${kt.dur}:sample_rate=44100`);
  filters.push(`[${idx}:a]volume=${kt.amp},adelay=${kt.start*1000}|${kt.start*1000}[t${idx}]`);
  idx++;
}
const mixIn = KIN_TONES.map((_, i) => `[t${i}]`).join('');
filters.push(`${mixIn}amix=inputs=${KIN_TONES.length}:duration=longest,volume=1.0[out]`);

const kinTonesPath = `${TMP}/kin-tones-new.wav`;
run(['-y', ...inputs, '-filter_complex', filters.join(';'), '-map', '[out]', '-t', '600', '-c:a', 'pcm_s16le', kinTonesPath]);
console.log('  New kin-tones ready (starting at 01:07) ✓');

// Step 3: Mix clean nature + new kin-tones
console.log('\n=== Step 3: Mix clean bed ===');
const bedFinal = `${TMP}/bed-final.wav`;
run(['-y','-i', natureClean, '-i', kinTonesPath,
     '-filter_complex',
     '[0:a]volume=0.7[nature];[1:a]volume=0.8[tones];[nature][tones]amix=inputs=2:duration=longest:dropout_transition=2,alimiter=limit=0.95[out]',
     '-map','[out]','-t','600','-c:a','pcm_s16le', bedFinal]);

// Step 4: Spanish voice
console.log('\n=== Step 4: Spanish voice ===');
const SPAN = `${ROOT}\\club-sincronica\\assets\\audio\\recordings\\h1 es.wav`;
const esVoice = `${TMP}/es-voice.wav`;
run(['-y','-i', SPAN,
     '-af', 'asetrate=44100*0.985,aresample=44100,aecho=0.5:0.6:30|50:0.45|0.25,extrastereo=1.15,volume=2.0',
     '-c:a','pcm_s16le', esVoice]);

// Step 5: Final mix
console.log('\n=== Step 5: Final mix ===');
const finalMix = `${OUT}/audio-mezcla-h1-es-v8.wav`;
run(['-y','-i', bedFinal, '-i', esVoice,
     '-filter_complex',
     '[0:a]volume=1.0[bed];[1:a]volume=1.0[voz];[bed][voz]amix=inputs=2:duration=longest:dropout_transition=2,alimiter=limit=0.95[out]',
     '-map','[out]','-t','600','-c:a','pcm_s16le', finalMix]);

// Step 6: Mux
console.log('\n=== Step 6: Mux ===');
run(['-y',
     '-i', `${ROOT}\\remotion-poc\\out\\H1-tiktok.mp4`,
     '-i', finalMix,
     '-map','0:v:0','-map','1:a:0',
     '-c:v','copy','-c:a','aac','-b:a','192k','-shortest',
     `${OUT}\\H1-final-es.mp4`]);
console.log('  H1-final-es.mp4 ✓');

console.log('\n  Old kin-tones REMOVED from bed');
console.log('  New kin-tones start at 01:07 (67s)');
console.log('  Volume: 0.04/0.025 (quiet)');