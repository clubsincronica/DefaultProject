import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve, sep } from 'node:path';

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

// main() added in Task 8
