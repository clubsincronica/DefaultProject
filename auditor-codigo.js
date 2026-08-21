import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

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

// main() added in Task 8
