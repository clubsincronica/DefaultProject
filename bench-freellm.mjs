#!/usr/bin/env node
// Benchmark A/B: OmniRoute (:20128) vs freellmapi (:3001)
// Uso: node bench-freellm.mjs [--failover] [--only <target>]

export function parseSSE(buffer) {
  const events = [];
  let done = false;
  const lines = buffer.split('\n');
  for (const raw of lines) {
    const line = raw.trim();
    if (!line.startsWith('data:')) continue;
    const payload = line.slice(5).trim();
    if (payload === '[DONE]') { done = true; continue; }
    try { events.push(JSON.parse(payload)); } catch { /* línea parcial o no-JSON */ }
  }
  return { events, done };
}

export function median(nums) {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function summarize(samples) {
  return {
    ttft: median(samples.map(s => s.ttft)),
    totalMs: median(samples.map(s => s.totalMs)),
    chars: median(samples.map(s => s.chars)),
    cut: !samples.every(s => s.finished),
  };
}

export function formatTable(rows) {
  const header = '| prompt | target | ttft_ms | total_ms | chars | cut |';
  const sep = '|---|---|---|---|---|---|';
  const body = rows.map(r =>
    `| ${r.prompt} | ${r.target} | ${r.ttft} | ${r.totalMs} | ${r.chars} | ${r.cut ? 'SÍ' : 'no'} |`
  );
  return [header, sep, ...body].join('\n');
}
