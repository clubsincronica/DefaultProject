import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { buildNotes } from './lib/step-grid.js';
import { writeSmf } from './lib/smf-writer.js';

const argv = process.argv.slice(2);
const args = {};
for (let i = 0; i < argv.length; i += 2) args[argv[i].replace(/^--/, '')] = argv[i + 1];
// usage: node scripts/orca-to-mid.js --grid --chords --scene --totalBars --tempo --out [--program]
const gridText = readFileSync(args.grid, 'utf8');
const chords = JSON.parse(readFileSync(args.chords, 'utf8'));
const scene = chords.sections[args.scene];
if (!scene) { console.error(`scene not in chords.json: ${args.scene}`); process.exit(1); }
const { notes, warnings, header } = buildNotes(gridText, scene, { totalBars: parseInt(args.totalBars, 10) });
for (const w of warnings) console.warn('WARN', w);
const buf = writeSmf({ tempo: parseFloat(args.tempo), timeSig: [4, 4], notes, program: parseInt(args.program ?? header.program ?? '0', 10) });
mkdirSync(dirname(args.out), { recursive: true });
writeFileSync(args.out, buf);
writeFileSync(args.out + '.json', JSON.stringify({ notes }, null, 2));
console.log(`Wrote ${args.out} (${notes.length} notes) + ${args.out}.json`);
