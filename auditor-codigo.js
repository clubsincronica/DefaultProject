import { readFileSync, existsSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { execFileSync } from 'node:child_process';

export const ROOT = dirname(fileURLToPath(import.meta.url));

export function loadConfig(path) {
  const p = path || join(ROOT, 'auditor-codigo.config.json');
  if (!existsSync(p)) throw new Error('Falta auditor-codigo.config.json en ' + p);
  return JSON.parse(readFileSync(p, 'utf8'));
}

function walk(dir, exclude) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (exclude.includes(e.name)) continue;
    const fp = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(fp, exclude));
    else out.push(fp);
  }
  return out;
}

export function scanFiles(config, root = ROOT) {
  const files = [];
  for (const proj of config.projects) files.push(...walk(join(root, proj), config.exclude));
  return files;
}

export function scanFilesWithRoot(config, root) { return scanFiles(config, root); }

const SECRET_RE = /(api[_]?key|secret|token|password|passwd|nvapi-[A-Za-z0-9]+|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16})|https?:\/\/[^:\s]+:[^@\s]+@/i;

export function maskValue(s) {
  if (!s || s.length <= 4) return '****';
  return s.slice(0, 3) + '****' + s.slice(-2);
}

export function checkSecrets(files, root = ROOT) {
  const out = [];
  for (const f of files) {
    if (/[\\/]credentials[\\/]/i.test(f)) continue;
    if (f.endsWith('auditor-codigo.config.json')) continue;
    let content;
    try { content = readFileSync(f, 'utf8'); } catch { continue; }
    content.split(/\r?\n/).forEach((ln, i) => {
      const m = ln.match(SECRET_RE);
      if (m) {
        const raw = m[0];
        const isUrl = /:\/\//.test(raw);
        out.push({
          file: relative(root, f), line: i + 1, severity: 'alta', kind: 'secret',
          detail: (isUrl ? 'URL con credencial embebida' : 'patron ' + raw.slice(0, 10)) + ' → ' + maskValue(raw),
        });
      }
    });
  }
  return out;
}

function resolveModule(baseDir, spec) {
  const cands = [spec, spec + '.js', spec + '.mjs', spec + '.ts', spec + '.cjs', join(spec, 'index.js'), join(spec, 'index.ts')];
  for (const c of cands) {
    const t = resolve(baseDir, c);
    if (existsSync(t) && statSync(t).isFile()) return t;
  }
  return null;
}

const IMPORT_RE = /(?:import\s+(?:[^'"]*?\s+from\s+)?|require\(\s*)['"]([^'"]+)['"]/g;

export function checkImports(files, root = ROOT) {
  const out = [];
  for (const f of files) {
    let content;
    try { content = readFileSync(f, 'utf8'); } catch { continue; }
    let m; IMPORT_RE.lastIndex = 0;
    while ((m = IMPORT_RE.exec(content))) {
      const spec = m[1];
      if (!spec.startsWith('.')) continue;
      if (!resolveModule(dirname(f), spec)) {
        out.push({ file: relative(root, f), line: 0, severity: 'alta', kind: 'broken-import', detail: 'import relativo roto: ' + spec });
      }
    }
  }
  return out;
}

const ABS_RE = /(?:[A-Za-z]:[\\/]|\\\\[?]\\[^\\]+\\[^\\]+|[\\/](?:Users|home|root)[\\/][^'"\s`]+)/;

export function checkHardcodedPaths(files, root = ROOT) {
  const out = [];
  for (const f of files) {
    let content;
    try { content = readFileSync(f, 'utf8'); } catch { continue; }
    content.split(/\r?\n/).forEach((ln, i) => {
      if (ABS_RE.test(ln)) out.push({ file: relative(root, f), line: i + 1, severity: 'media', kind: 'absolute-path', detail: 'path absoluto hardcodeado' });
    });
  }
  return out;
}

export function checkJunkFiles(files, root = ROOT) {
  const out = [];
  for (const f of files) {
    let st;
    try { st = statSync(f); } catch { continue; }
    const name = f.split(sep).pop();
    if (st.size === 0) out.push({ file: relative(root, f), line: 0, severity: 'baja', kind: 'empty-file', detail: 'archivo 0-byte' });
    if (/[{}()<>]/.test(name) || /^\d+$/.test(name)) out.push({ file: relative(root, f), line: 0, severity: 'baja', kind: 'suspicious-name', detail: 'nombre de archivo sospechoso/roto: ' + name });
  }
  return out;
}

function extractFunctions(src) {
  const fns = [];
  const re = /\bfunction\s+([A-Za-z0-9_$]+)\s*\(/g;
  let m;
  while ((m = re.exec(src))) {
    const start = m.index;
    const i = src.indexOf('{', re.lastIndex);
    if (i === -1) continue;
    let depth = 0, j = i;
    for (; j < src.length; j++) {
      if (src[j] === '{') depth++;
      else if (src[j] === '}') { depth--; if (depth === 0) { j++; break; } }
    }
    fns.push({ name: m[1], body: src.slice(i, j) });
  }
  return fns;
}

function hash(s) {
  let h = 5381;
  const n = s.replace(/\s+/g, '');
  for (let i = 0; i < n.length; i++) h = ((h << 5) + h + n.charCodeAt(i)) >>> 0;
  return h;
}

export function checkDuplicates(files, root = ROOT) {
  const byHash = new Map();
  for (const f of files) {
    let content;
    try { content = readFileSync(f, 'utf8'); } catch { continue; }
    for (const fn of extractFunctions(content)) {
      const k = hash(fn.body);
      if (!byHash.has(k)) byHash.set(k, []);
      byHash.get(k).push({ file: relative(root, f), name: fn.name });
    }
  }
  const out = [];
  for (const [k, arr] of byHash) {
    const files2 = [...new Set(arr.map(a => a.file))];
    if (files2.length > 1) out.push({ severity: 'baja', kind: 'duplicate', detail: 'logica duplicada (hash ' + k + ') en: ' + arr.map(a => a.file + '#' + a.name).join(', ') });
  }
  return out;
}

const JCODE = 'C:/Users/tom_w/AppData/Local/jcode/bin/jcode.exe';
const PROVIDERS = [
  { profile: 'nim-api', keyEnv: 'JCODE_NIM_KEY' },
  { profile: 'omni', keyEnv: 'JCODE_OMNI_KEY' },
];

export function providerKey(keyEnv, cfgPath) {
  if (process.env[keyEnv]) return process.env[keyEnv];
  const cfg = cfgPath || join(ROOT, 'club-sincronica', 'scripts', 'jcode-auditor.config.json');
  if (existsSync(cfg)) { try { return JSON.parse(readFileSync(cfg, 'utf8'))[keyEnv]; } catch {} }
  return '';
}

export function runJcode(prompt) {
  let lastErr = '';
  for (const prov of PROVIDERS) {
    const key = providerKey(prov.keyEnv);
    if (!key) { console.warn('  [fallback] ' + prov.profile + ': sin clave'); continue; }
    const env = { ...process.env, [prov.keyEnv]: key };
    try {
      const out = execFileSync(JCODE, ['--provider-profile', prov.profile, 'run', prompt], { env, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
      const cleaned = out.replace(/\n?\[Tokens\] upload:.*$/s, '').trim();
      if (!cleaned || /\[provider guardrail\]/.test(cleaned)) { lastErr = prov.profile + ': vacio'; continue; }
      return cleaned;
    } catch (e) {
      lastErr = '[' + prov.profile + '] ' + ((e.stderr || e.message || '').toString().slice(0, 200));
      continue;
    }
  }
  return null;
}

export function buildLlmPrompt(findings, config, root = ROOT) {
  const count = (k) => findings.filter(f => f.kind === k).length;
  const codeFiles = config.projects.flatMap(p => {
    const d = join(root, p);
    return existsSync(d) ? walk(d, config.exclude).filter(f => /\.(js|mjs|ts|tsx)$/.test(f)) : [];
  });
  const top = codeFiles.map(f => ({ f, size: statSync(f).size })).sort((a, b) => b.size - a.size).slice(0, 8);
  const codeSamples = top.map(({ f }) => '=== ' + relative(root, f) + ' ===\n' + readFileSync(f, 'utf8').slice(0, 6000)).join('\n');
  const docs = (config.docs || []).filter(d => existsSync(join(root, d)))
    .map(d => '=== ' + d + ' ===\n' + readFileSync(join(root, d), 'utf8').slice(0, 4000)).join('\n');
  return [
    'Eres el auditor de codigo de Club Sincronica (scaffolding de 3 proyectos Node/React, presupuesto cero).',
    'No uses herramientas. Responde SOLO con markdown con secciones: ## Calidad y ## Drift docs.',
    'REGLA: cada mejora lleva tag [regla] y bloque Refs con ruta de archivo exacta. Max 5 mejoras.',
    '',
    '=== HALLAZGOS ESTATICOS ===',
    JSON.stringify({ secretos: count('secret'), brokenImports: count('broken-import'), absPaths: count('absolute-path'), junk: count('empty-file') + count('suspicious-name'), duplicados: count('duplicate') }, null, 2),
    '',
    '=== MUESTRA DE CODIGO (top 8 por tamaño) ===',
    codeSamples,
    '',
    '=== DOCS DEL PROYECTO ===',
    docs,
  ].join('\n');
}

function fmtFindings(arr) {
  if (!arr || !arr.length) return '_Sin hallazgos._\n';
  return arr.map(f => '- [' + f.severity + '] `' + f.file + '` — ' + f.detail + (f.ref ? ' (Refs: ' + f.ref + ')' : '')).join('\n') + '\n';
}

export function writeReport(dateStr, sections, root = ROOT) {
  const blocks = [
    '# Auditoría de Código — ' + dateStr + '\n',
    '## Secretos\n' + fmtFindings(sections.secret),
    '## Dependencias cruzadas\n' + fmtFindings(sections.brokenImport),
    '## Paths hardcodeados\n' + fmtFindings(sections.absPath),
    '## Archivos basura\n' + fmtFindings(sections.junk),
    '## Calidad (LLM)\n' + (sections.quality || 'no disponible') + '\n',
    '## Drift docs (LLM)\n' + (sections.drift || 'no disponible') + '\n',
  ];
  const p = join(root, 'audit-code-' + dateStr + '.md');
  writeFileSync(p, blocks.join('\n'), 'utf8');
  return p;
}

export function writeTasks(dateStr, sections, root = ROOT) {
  const flat = ['secret', 'brokenImport', 'absPath', 'junk', 'duplicate'].flatMap(k =>
    (sections[k] || []).map(f => ({
      project: f.file.split(/[\\/]/)[0],
      dimension: k, severity: f.severity, file: f.file, description: f.detail,
    }))
  );
  const pj = join(root, 'audit-code-tasks.json');
  writeFileSync(pj, JSON.stringify(flat, null, 2) + '\n', 'utf8');
  const md = '# Tareas de auditoría — ' + dateStr + '\n\n' +
    (flat.length ? flat.map((t, i) => (i + 1) + '. [' + t.severity + '] (' + t.project + ') ' + t.dimension + ': `' + t.file + '` — ' + t.description).join('\n') : '_Sin tareas._') + '\n';
  const pm = join(root, 'audit-code-tareas.md');
  writeFileSync(pm, md, 'utf8');
  return { json: pj, md: pm };
}

// main() added in Task 8
