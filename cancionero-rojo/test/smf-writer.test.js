// test/smf-writer.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { writeSmf, encodeVlq } from '../scripts/lib/smf-writer.js';

test('vlq encodings', () => {
  assert.deepEqual(encodeVlq(0), [0x00]);
  assert.deepEqual(encodeVlq(127), [0x7f]);
  assert.deepEqual(encodeVlq(128), [0x81, 0x00]);
  assert.deepEqual(encodeVlq(480), [0x83, 0x60]);
});

test('header + tempo meta correct', () => {
  const buf = writeSmf({ tempo: 130, timeSig: [4, 4], notes: [] });
  const hex = buf.toString('hex');
  assert.ok(hex.startsWith('4d546864000000060001000201e0')); // MThd, fmt1, 2 tracks, 480 ppq
  // tempo 130bpm = 461538 µs/q = 0x070AE2
  assert.ok(hex.includes('ff5103070ae2'));
  assert.ok(hex.includes('ff580404021808')); // 4/4 time sig
  assert.ok(hex.endsWith('ff2f00'));
});

test('one note produces on/off pair in order', () => {
  const buf = writeSmf({
    tempo: 120, timeSig: [4, 4],
    notes: [{ track: 0, note: 60, startBeat: 0, durBeats: 1, velocity: 96 }],
  });
  const hex = buf.toString('hex');
  const on = Buffer.from(hex, 'hex').indexOf(Buffer.from([0x90, 60, 96]));
  const off = Buffer.from(hex, 'hex').indexOf(Buffer.from([0x80, 60, 0]));
  assert.ok(on > 0 && off > on, 'note-on before note-off');
});
