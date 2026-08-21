import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

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

// main() added in Task 8
