// _add-whispers.mjs — Add English whispered kin names to Spanish version
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';

const ROOT   = 'C:\\Users\\tom_w\\Documents\\Default Project';
const OUT    = `${ROOT}\\pipeline-viral\\content\\meditation-output\\2026-08-28`;
const SLICES = `${ROOT}\\club-sincronica\\assets\\audio\\recordings\\h1-slices`;
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const TMP    = `${OUT}\\_whispers`;
existsSync(TMP) || mkdirSync(TMP, { recursive: true });

function run(args) {
  execFileSync(FFMPEG, args, { encoding: 'utf8', stdio: 'ignore' });
}

// Spanish actual act timings (from transcription)
const ES_ACTS = [
  { name: 'act2-nutrir',    start: 14.5,  whisperBefore: 5 },    // Whisper at 5s (before 14.5s)
  { name: 'act3-comunicar', start: 189.7, whisperBefore: 180 },  // Whisper at 180s (before 189.7s)
  { name: 'act4-sonhar',    start: 291.2, whisperBefore: 282 },  // Whisper at 282s (before 291.2s)
  { name: 'act5-atinar',    start: 404.4, whisperBefore: 395 },  // Whisper at 395s (before 404.4s)
];

// English slices to use as whispers
const EN_SLICES = [
  { act: 'act2', file: 'act2-nutrir.wav' },      // "Nutrir" whisper
  { act: 'act3', file: 'act3-comunicar.wav' },   // "Comunicar" whisper
  { act: 'act4', file: 'act4-sonhar.wav' },      // "Soñar" whisper
  { act: 'act5', file: 'act5-atinar.wav' },      // "Atinar" whisper
];

console.log('=== Preparing whispers ===');

// Step 1: Extract first 3-5 seconds of each English slice (the kin name whisper)
for (const slice of EN_SLICES) {
  const inPath = `${SLICES}\\${slice.file}`;
  const outPath = `${TMP}\\${slice.act}-whisper.wav`;
  
  // Get duration
  const probe = execFileSync('ffprobe', ['-v','error','-show_entries','format=duration','-of','csv=p=0', inPath], { encoding:'utf8' });
  const dur = Math.min(5, Math.ceil(parseFloat(probe.trim()))); // First 5 seconds max
  
  // Extract and apply effects: lower volume, add reverb
  run(['-y','-i', inPath,
       '-af', `atrim=start=0:duration=${dur},asetpts=PTS-STARTPTS,` +
              `volume=0.3,` +  // Much quieter (0.3x)
              `aecho=0.5:0.5:40|60:0.35|0.2,` +  // More echo for whisper effect
              `extrastereo=0.8,` +  // Slightly wider
              `afade=t=in:st=0:d=0.5,afade=t=out:st=${dur-0.5}:d=0.5`,
       '-c:a','pcm_s16le', outPath]);
  console.log(`  ${slice.act}: extracted ${dur}s whisper ✓`);
  slice.whisperPath = outPath;
  slice.whisperDur = dur;
}

// Step 2: Create 600s track with whispers at correct positions
console.log('\n=== Building whisper track ===');
const silencePath = `${TMP}\\silence-600s.wav`;
run(['-y','-f','lavfi','-i','anullsrc=r=44100:cl=stereo','-t','600','-c:a','pcm_s16le', silencePath]);

// Build filter complex for all whispers
const inputs = ['-i', silencePath];
const filterParts = [];
const mixInputs = ['[0:a]']; // Start with silence

for (let i = 0; i < EN_SLICES.length; i++) {
  const slice = EN_SLICES[i];
  const esAct = ES_ACTS.find(a => a.act === slice.act);
  if (!esAct) continue;
  
  inputs.push('-i', slice.whisperPath);
  const startMs = Math.round(esAct.whisperBefore * 1000);
  filterParts.push(`[${i+1}:a]adelay=${startMs}|${startMs},apad=pad_dur=0.5[w${i}]`);
  mixInputs.push(`[w${i}]`);
}

const filter = filterParts.join(';') + ';' +
  `${mixInputs.join('')}amix=inputs=${mixInputs.length}:duration=first:dropout_transition=2,volume=1.0[out]`;

const whisperTrack = `${TMP}\\whispers-600s.wav`;
run(['-y', ...inputs, '-filter_complex', filter, '-map', '[out]', '-t', '600', '-c:a', 'pcm_s16le', whisperTrack]);
console.log('  Whisper track ready ✓');

// Step 3: Mix with Spanish version
console.log('\n=== Mixing whispers into Spanish version ===');
const esMix = `${TMP}\\es-with-whispers.wav`;
run(['-y',
     '-i', `${OUT}\\audio-mezcla-es-backup.wav`,  // Original Spanish mix
     '-i', whisperTrack,
     '-filter_complex',
     '[0:a]volume=1.0[es];[1:a]volume=0.4[whispers];[es][whispers]amix=inputs=2:duration=first:dropout_transition=2,alimiter=limit=0.95[out]',
     '-map','[out]','-t','600','-c:a','pcm_s16le', esMix]);
console.log('  Mix ready ✓');

// Step 4: Mux with video
console.log('\n=== Muxing with video ===');
run(['-y',
     '-i', `${ROOT}\\remotion-poc\\out\\H1-tiktok.mp4`,
     '-i', esMix,
     '-map','0:v:0','-map','1:a:0',
     '-c:v','copy','-c:a','aac','-b:a','192k','-shortest',
     `${OUT}\\H1-final-es.mp4`]);
console.log('  H1-final-es.mp4 ✓');

console.log('\n========================================');
console.log('  DONE');
console.log('========================================');
console.log('  Whispers added at:');
ES_ACTS.forEach(a => {
  const slice = EN_SLICES.find(s => s.act === a.name.split('-')[0]);
  if (slice) console.log(`    ${a.name}: ${a.whisperBefore}s (${slice.file})`);
});
console.log('  Whisper volume: 0.3x (quiet)');
console.log('  Echo: 40+60ms (reverby)');
console.log('  Final mix: whispers at 0.4x under Spanish voice');