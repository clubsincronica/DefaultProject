import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO = resolve(ROOT, '..');
const ENGINE_ROOT = join(REPO, 'pipeline-viral');
const RENDERER = join(ENGINE_ROOT, 'scripts', 'strudel-render.js');

export const sectionSeconds = (bars, tempo) => (bars * 4 * 60) / tempo;

export function materializePattern(spec, section) {
  const chosen = spec.sections?.[section] ?? spec;
  const { code, cps = 0.5, loopSec = 0, lfo } = { ...spec, ...chosen };
  let src = `export const code = ${JSON.stringify(code)};\nexport const cps = ${cps};\nexport const loopSec = ${loopSec};\n`;
  if (lfo) src += `export const lfo = ${JSON.stringify(lfo)};\n`;
  return src;
}

export function stemJobs(songDir, structure, engineRoot = ENGINE_ROOT) {
  const jobs = [];
  for (const part of structure.parts.audio) {
    const patPath = join(songDir, 'patterns', `${part}.js`);
    if (!existsSync(patPath)) throw new Error(`missing pattern: ${patPath}`);
    for (const sc of structure.scenes) {
      const secs = sectionSeconds(sc.bars, structure.tempo);
      const tmp = join(songDir, '.tmp', `${part}--${sc.name}.js`);
      jobs.push({
        part, section: sc.name, pattern: patPath, tmp, secs,
        seconds: Math.ceil(secs),
        relPattern: relative(engineRoot, tmp),
        out: join(songDir, 'stems', `${part}--${sc.name}.wav`),
        file: `stems/${part}--${sc.name}.wav`,
      });
    }
  }
  return jobs;
}

export function rendererArgs(job, renderer = RENDERER) {
  return [renderer, job.relPattern, String(job.seconds), job.out];
}

export async function renderSong(slug, { root = ROOT, exec = execFileSync } = {}) {
  const songDir = join(root, 'songs', slug);
  const structure = JSON.parse(readFileSync(join(songDir, 'structure.json'), 'utf8'));
  const stemsDir = join(songDir, 'stems');
  mkdirSync(stemsDir, { recursive: true });
  mkdirSync(join(songDir, '.tmp'), { recursive: true });
  const jobs = stemJobs(songDir, structure);
  const manifest = [];
  for (const job of jobs) {
    const spec = await import(pathToFileURL(job.pattern).href); // exercises syntax
    writeFileSync(job.tmp, materializePattern(spec, job.section));
    exec(process.execPath, rendererArgs(job), { stdio: 'inherit' });
    manifest.push({ part: job.part, section: job.section, file: job.file, seconds: job.secs });
  }
  writeFileSync(join(stemsDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`manifest: ${manifest.length} stems`);
  return manifest;
}

if (process.argv[1] && process.argv[1].endsWith('render-stems.js')) {
  const slug = process.argv[2];
  if (!slug) { console.error('Uso: node scripts/render-stems.js <slug>'); process.exit(1); }
  renderSong(slug).catch(e => { console.error(e.message); process.exit(1); });
}
