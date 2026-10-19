import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSSE, median, summarize, formatTable } from '../bench-freellm.mjs';

test('parseSSE extrae eventos data y detecta [DONE]', () => {
  const chunk = 'data: {"choices":[{"delta":{"content":"Hola"}}]}\n\ndata: {"choices":[{"delta":{"content":" mundo"}}]}\n\ndata: [DONE]\n\n';
  const { events, done } = parseSSE(chunk);
  assert.equal(events.length, 2);
  assert.equal(events[0].choices[0].delta.content, 'Hola');
  assert.equal(done, true);
});

test('parseSSE con línea parcial no pierde datos', () => {
  const { events, done } = parseSSE('data: {"choices":[{"delta":{"content":"par"}}]}\n\ndata: [DO');
  assert.equal(events.length, 1);
  assert.equal(done, false);
});

test('median de impar, par y un elemento', () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 3, 2]), 2.5);
  assert.equal(median([7]), 7);
});

test('summarize calcula medianas y marca cut si algo no terminó', () => {
  const s = summarize([
    { ttft: 100, totalMs: 1000, chars: 50, finished: true },
    { ttft: 300, totalMs: 2000, chars: 60, finished: true },
    { ttft: 200, totalMs: 9999, chars: 5, finished: false },
  ]);
  assert.equal(s.ttft, 200);
  assert.equal(s.totalMs, 2000);
  assert.equal(s.cut, true);
});

test('formatTable produce markdown con encabezado y filas', () => {
  const md = formatTable([
    { prompt: 'corto', target: 'omniroute', ttft: 120, totalMs: 800, chars: 10, cut: false },
  ]);
  assert.match(md, /^\| prompt \| target \|/m);
  assert.match(md, /\| corto \| omniroute \|/);
});
