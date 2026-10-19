// export-guiones-jsonl.cjs — pilot Soup: contexto.json + guion.md → JSONL alpaca.
//
// Uso:
//   node scripts/export-guiones-jsonl.cjs --dry-run   (solo conteo, no escribe)
//   node scripts/export-guiones-jsonl.cjs [--out data/soup-pilot/train.jsonl]
//
// Filtros de calidad (criterio EXACTO de club-sincronica/scripts/verify-guion.js):
//   1) existen guion.md y contexto.json, no vacíos, sin placeholders de plantilla
//   2) norm(guion) contiene norm(lema [+ frase GAP])  3) kinName  4) header **Modo:**
// norm = quitar '> ' de citas + colapsar whitespace (los lemas van envueltos en líneas).
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'club-sincronica', 'content', 'output');
const DEFAULT_OUT = path.join(ROOT, 'data', 'soup-pilot', 'train.jsonl');
const GAP_PHRASE = ' Soy un Portal de Activación Galáctica, entra en mí.';

const INSTRUCTION =
  'Escribe el guion poético del short diario de Club Sincrónica a partir de los datos ' +
  'del día. Estructura: Hook (0–5s), Puente (5–11s), Cuerpo poético y Outro con el lema ' +
  'canónico LITERAL. No inventes aspectos astrales: usa solo los datos dados.';

function norm(s) {
  return String(s || '').replace(/^>\s?/gm, '').replace(/\s+/g, ' ').trim();
}

function buildInput(ctx, guionHead) {
  const tz = ctx.tzolkin || {};
  const lines = [
    `Fecha: ${ctx.fecha || ''} (${ctx.diaSemana || ''}) · Eje: ${ctx.eje || ''}`,
    `Kin ${tz.kin ?? ''} — ${tz.kinName || ''} · ${tz.signature || ''}`,
    `Sello: ${tz.seal || ''} (${tz.sealWord || ''}, ${tz.color || ''}, ${tz.direction || ''})`,
    `Tono: ${tz.tone || ''} — ${tz.toneAction || ''} / ${tz.tonePower || ''} (${tz.toneQuestion || ''})`,
    `Onda encantada: ${tz.wavespell || ''} · Castillo: ${tz.castle || ''}`,
    `Lema canónico (usar LITERAL en el outro): ${tz.lema || ''}${tz.isGap ? GAP_PHRASE : ''}`,
  ];
  const luna = guionHead.match(/fase lunar:\s*([^\n*]+)/i);
  const aspecto = guionHead.match(/aspecto del d[ií]a:\s*([^\n*]+)/i);
  const modo = guionHead.match(/modo:\s*([^\n*]+)/i);
  if (luna) lines.push(`Fase lunar: ${luna[1].trim()}`);
  if (aspecto) lines.push(`Aspecto del día: ${aspecto[1].trim()}`);
  if (modo) lines.push(`Modo de contar: ${modo[1].trim()}`);
  return lines.join('\n');
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const outIdx = args.indexOf('--out');
  const outFile = outIdx >= 0 && args[outIdx + 1] ? path.resolve(args[outIdx + 1]) : DEFAULT_OUT;

  const fechas = fs
    .readdirSync(OUT_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((n) => /^\d{4}-\d{2}-\d{2}$/.test(n))
    .sort();

  const records = [];
  const skipped = [];
  for (const fecha of fechas) {
    const dir = path.join(OUT_DIR, fecha);
    const gf = path.join(dir, 'guion.md');
    const cf = path.join(dir, 'contexto.json');
    if (!fs.existsSync(gf) || !fs.existsSync(cf)) {
      skipped.push(`${fecha}: falta guion.md o contexto.json`);
      continue;
    }
    const guion = fs.readFileSync(gf, 'utf8');
    let ctx;
    try {
      ctx = JSON.parse(fs.readFileSync(cf, 'utf8'));
    } catch (e) {
      skipped.push(`${fecha}: contexto.json inválido (${e.message})`);
      continue;
    }
    const tz = ctx.tzolkin || {};
    if (!guion.trim() || !tz.lema || !tz.kinName) {
      skipped.push(`${fecha}: guion/lema/kinName vacío`);
      continue;
    }
    if (/\{(pregunta|desarrollo|emocionalidad|estilo)[^}]*\}/.test(guion)) {
      skipped.push(`${fecha}: placeholder de plantilla`);
      continue;
    }
    if (!guion.includes('**Modo:**')) {
      skipped.push(`${fecha}: falta header **Modo:**`);
      continue;
    }
    const lemaFull = tz.lema + (tz.isGap ? GAP_PHRASE : '');
    if (!norm(guion).includes(norm(lemaFull))) {
      skipped.push(`${fecha}: lema no literal en guion`);
      continue;
    }
    if (!norm(guion).includes(norm(tz.kinName))) {
      skipped.push(`${fecha}: kinName ausente en guion`);
      continue;
    }
    records.push({
      instruction: INSTRUCTION,
      input: buildInput(ctx, guion.slice(0, 2000)),
      output: guion.replace(/\r\n/g, '\n'),
    });
  }

  for (const s of skipped) console.error(`skip: ${s}`);
  console.error(`fechas: ${fechas.length} · pares válidos: ${records.length} · filtrados: ${skipped.length}`);

  if (dryRun) return;

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const tmp = outFile + '.tmp';
  fs.writeFileSync(tmp, records.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');
  fs.renameSync(tmp, outFile);
  console.error(`escrito: ${outFile}`);
}

main();
