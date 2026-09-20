// transcribe-acts.mjs — Transcribe live recordings to find exact act start times
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = 'C:\\Users\\tom_w\\Documents\\Default Project';
const OUT  = `${ROOT}\\pipeline-viral\\content\\meditation-output\\2026-08-28`;
const FF   = process.env.FFmpeg_PATH || 'ffmpeg.exe';
const CHUNK = 300; // 5 min per chunk (Groq ~25MB limit)

// Read Groq API key from agent-reach config
function readConfiguredKey() {
  try {
    const cfg = path.join(process.env.USERPROFILE, '.agent-reach');
    const files = fs.readdirSync(cfg).filter(f => /config|\.env|cred|key/i.test(f));
    for (const f of files) {
      const raw = fs.readFileSync(path.join(cfg, f), 'utf8');
      const m = raw.match(/gsk_[A-Za-z0-9_\-]+/);
      if (m) return m[0];
    }
  } catch { /* ignore */ }
  return null;
}

const apiKey = process.env.GROQ_API_KEY || readConfiguredKey();
if (!apiKey) { console.error('No GROQ_API_KEY found'); process.exit(1); }

async function transcribe(audioPath, lang, label) {
  console.log(`\n=== Transcribing ${label} ===`);
  
  // Get duration
  const probe = execFileSync('ffprobe', ['-v','error','-show_entries','format=duration','-of','csv=p=0', audioPath], { encoding:'utf8' });
  const total = Math.ceil(parseFloat(probe.trim()));
  console.log(`  Duration: ${total}s`);
  
  const all = [];
  for (let start = 0; start < total; start += CHUNK) {
    const dur = Math.min(CHUNK, total - start);
    const tmp = path.join(process.env.TEMP, `transcribe-chunk-${start}.wav`);
    execFileSync(FF, ['-y','-i', audioPath, '-ss', String(start), '-t', String(dur), '-ac','1','-ar','16000','-c:a','pcm_s16le', tmp], { stdio:'ignore' });
    
    const buf = fs.readFileSync(tmp);
    const form = new FormData();
    form.append('model', 'whisper-large-v3');
    form.append('response_format', 'verbose_json');
    form.append('language', lang);
    form.append('timestamp_granularities[]', 'segment');
    form.append('file', new Blob([buf], { type: 'audio/wav' }), `chunk-${start}.wav`);
    
    console.log(`  Chunk ${start}-${start+dur}s...`);
    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    if (!res.ok) { console.error('  Groq error', res.status, await res.text()); process.exit(1); }
    const json = await res.json();
    for (const s of json.segments || []) {
      all.push({ start: +(s.start + start).toFixed(2), end: +(s.end + start).toFixed(2), text: s.text.trim() });
    }
  }
  all.sort((a, b) => a.start - b.start);
  return all;
}

const fmt = t => { const m = Math.floor(t/60), s = Math.floor(t%60), ms = Math.round((t-Math.floor(t))*1000); return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(ms).padStart(3,'0')}`; };

// Transcribe Spanish
const esSegments = await transcribe(
  `${ROOT}\\club-sincronica\\assets\\audio\\recordings\\h1 es.wav`,
  'es', 'Spanish (h1 es.wav)'
);

// Transcribe English
const enSegments = await transcribe(
  `${ROOT}\\club-sincronica\\assets\\audio\\recordings\\h1.wav`,
  'en', 'English (h1.wav)'
);

// Find act starts by keywords
const esActs = [
  { name: 'Act 2 - Nutrir', keywords: ['nutrir', 'dragón', 'dragon'] },
  { name: 'Act 3 - Comunicar', keywords: ['comunicar', 'viento'] },
  { name: 'Act 4 - Soñar', keywords: ['soñar', 'sonar', 'noche'] },
  { name: 'Act 5 - Atinar', keywords: ['atinar', 'semilla'] },
];

const enActs = [
  { name: 'Act 2 - Nurture', keywords: ['nurture', 'dragon'] },
  { name: 'Act 3 - Communicate', keywords: ['communicate', 'wind'] },
  { name: 'Act 4 - Dream', keywords: ['dream', 'night'] },
  { name: 'Act 5 - Plant', keywords: ['plant', 'seed'] },
];

function findActStart(segments, actKeywords) {
  for (const seg of segments) {
    const lower = seg.text.toLowerCase();
    for (const kw of actKeywords) {
      if (lower.includes(kw)) return seg.start;
    }
  }
  return null;
}

console.log('\n========================================');
console.log('  ACT TIMING RESULTS');
console.log('========================================');

console.log('\n--- SPANISH ---');
console.log('Expected: Act2=44s, Act3=170s, Act4=296s, Act5=422s');
for (const act of esActs) {
  const actual = findActStart(esSegments, act.keywords);
  const expected = act.name.includes('2') ? 44 : act.name.includes('3') ? 170 : act.name.includes('4') ? 296 : 422;
  const diff = actual !== null ? (actual - expected).toFixed(1) : 'NOT FOUND';
  console.log(`  ${act.name}: expected=${expected}s, actual=${actual !== null ? actual+'s' : 'NOT FOUND'}, diff=${diff}s`);
}

console.log('\n--- ENGLISH ---');
console.log('Expected: Act2=44s, Act3=170s, Act4=296s, Act5=422s');
for (const act of enActs) {
  const actual = findActStart(enSegments, act.keywords);
  const expected = act.name.includes('2') ? 44 : act.name.includes('3') ? 170 : act.name.includes('4') ? 296 : 422;
  const diff = actual !== null ? (actual - expected).toFixed(1) : 'NOT FOUND';
  console.log(`  ${act.name}: expected=${expected}s, actual=${actual !== null ? actual+'s' : 'NOT FOUND'}, diff=${diff}s`);
}

// Write full transcripts
let md = `# Transcription — H1 Live Recordings\n\n`;
md += `## Spanish (h1 es.wav)\n\n`;
esSegments.forEach((s, i) => { md += `${String(i+1).padStart(3,'0')}  [${fmt(s.start)} → ${fmt(s.end)}]  ${s.text}\n`; });
md += `\n## English (h1.wav)\n\n`;
enSegments.forEach((s, i) => { md += `${String(i+1).padStart(3,'0')}  [${fmt(s.start)} → ${fmt(s.end)}]  ${s.text}\n`; });

fs.writeFileSync(`${OUT}/transcription-h1.md`, md, 'utf8');
console.log(`\n✓ Full transcription saved to transcription-h1.md`);