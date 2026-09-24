import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sectionSeconds, materializePattern, renderSong } from '../scripts/render-stems.js';

test('section seconds math', () => {
  assert.equal(sectionSeconds(4, 130), (4 * 4 * 60) / 130);
  assert.equal(sectionSeconds(16, 130).toFixed(2), '29.54');
});

test('materializePattern applies section override and injects exports', () => {
  const spec = { code: 'note("a3")', cps: 0.5, loopSec: 8,
                 sections: { Chorus: { code: 'note("e4")' } } };
  const src = materializePattern(spec, 'Chorus');
  assert.ok(src.includes(JSON.stringify('note("e4")')));
  assert.ok(src.includes('export const loopSec = 8'));
  const verse = materializePattern(spec, 'Verse');
  assert.ok(verse.includes(JSON.stringify('note("a3")')));
});

const REPO = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const ENGINE_ROOT = join(REPO, 'pipeline-viral');

function makeFixtureSong() {
  const root = mkdtempSync(join(tmpdir(), 'render-stems-'));
  const songDir = join(root, 'songs', '_x');
  mkdirSync(join(songDir, 'patterns'), { recursive: true });
  writeFileSync(join(songDir, 'structure.json'), JSON.stringify({
    slug: '_x', title: 'Fixture', tempo: 130, timeSig: '4/4',
    scenes: [{ name: 'Intro', bars: 2 }],
    arrangement: ['Intro'],
    parts: { midi: [], audio: ['strings'] },
  }));
  copyFileSync(fileURLToPath(new URL('./fixtures/pattern-strings.js', import.meta.url)),
               join(songDir, 'patterns', 'strings.js'));
  return root;
}

test('renderSong: renderer args relative to engine root + manifest (mocked exec)', async () => {
  const root = makeFixtureSong();
  try {
    const calls = [];
    const exec = (bin, args) => { calls.push({ bin, args }); writeFileSync(args[3], Buffer.alloc(44)); };
    const manifest = await renderSong('_x', { root, exec });
    assert.equal(calls.length, 1);
    const { bin, args } = calls[0];
    assert.equal(bin, process.execPath);
    assert.ok(args[0].endsWith('strudel-render.js'));
    assert.equal(isAbsolute(args[1]), false, 'pattern arg must be relative to pipeline-viral root');
    assert.equal(resolve(ENGINE_ROOT, args[1]),
                 join(root, 'songs', '_x', '.tmp', 'strings--Intro.js'));
    assert.equal(args[2], '4');
    assert.equal(args[3], join(root, 'songs', '_x', 'stems', 'strings--Intro.wav'));
    const tmpSrc = readFileSync(join(root, 'songs', '_x', '.tmp', 'strings--Intro.js'), 'utf8');
    assert.ok(tmpSrc.includes('export const loopSec = 2'));
    const m = JSON.parse(readFileSync(join(root, 'songs', '_x', 'stems', 'manifest.json'), 'utf8'));
    assert.deepEqual(m, [{ part: 'strings', section: 'Intro',
                           file: 'stems/strings--Intro.wav', seconds: (2 * 4 * 60) / 130 }]);
    assert.deepEqual(manifest, m);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('renderSong propagates missing-pattern error', async () => {
  const root = makeFixtureSong();
  try {
    writeFileSync(join(root, 'songs', '_x', 'structure.json'), JSON.stringify({
      tempo: 130, scenes: [{ name: 'Intro', bars: 2 }],
      parts: { midi: [], audio: ['texture'] },
    }));
    await assert.rejects(renderSong('_x', { root, exec: () => {} }), /missing pattern.*texture\.js/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('renderSong propagates renderer failure', async () => {
  const root = makeFixtureSong();
  try {
    await assert.rejects(
      renderSong('_x', { root, exec: () => { throw new Error('renderer exploded'); } }),
      /renderer exploded/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
