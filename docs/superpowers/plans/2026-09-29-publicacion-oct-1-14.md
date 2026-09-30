# Publicación Oct 1-14 (Cloudinary + Buffer, 5 plataformas) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agendar los 14 videos `2026-10-01..14` en 5 plataformas (LI/IG/YT/TT/FB) vía Cloudinary→Buffer, 1 por día en su fecha, con canario de YouTube y `publicado.json` idempotente.

**Architecture:** `publish-pack.js` genera los 14 `publicacion.md` → `buffer-client.js` gana la 5ª plataforma youtube → script nuevo `schedule-oct-batch.js` orquesta por fecha (pre-gates → upload-cloudinary → schedule-posts → publicado.json, atómico por fecha) → verificación remota con `verify-queue.js` (extendedido con canal youtube).

**Tech Stack:** Node 22 ESM (`"type": "module"`), Buffer GraphQL api.buffer.com, Cloudinary API, PowerShell 5.1.

**Spec:** `docs/superpowers/specs/2026-09-29-publicacion-oct-1-14-design.md`

## Global Constraints

- Directorio de trabajo: `C:\Users\tom_w\Documents\Default Project\club-sincronica`. PowerShell 5.1: sin `&&`.
- Horas UTC estándar: **LI 11 · IG 12 · YT 13 · TT 14 · FB 15** (env `BUFFER_*_H`, `BUFFER_YT_H`, fallback `BUFFER_NO_YT=1`).
- `dueAt` = `${fecha}T${hora}:00:00Z` con la **fecha del kin** (Oct 1→1 oct … Oct 14→14 oct).
- mp4 <100MB (Cloudinary free). **NO** borrar Cloudinary tras agendar (DNR).
- Si una fecha falla a mitad → `delete-buffer-posts.mjs` con los postIds creados de ESA fecha, sin `publicado.json`, seguir con la siguiente (DNR: re-agendar todo el día, nunca mezclar URLs).
- `publicado.json` shape: `{ procesadoEn, plataformas: { <name>: { status:'ok', postId, scheduledAt } } }`.
- Backlog `2026-09-17..21` NO se toca. NO ejecutar `process-pending.js`.
- Staging de git: SOLO mis archivos (hay cambios pre-existentes de otras sesiones: no `git add -A`).
- Spec de aprobación de textos: el Alquimista pidió ejecución directa de TODAS las publicaciones → no hay gate interactivo de textos (los packs se generan y se resumen en el informe final).

---

### Task 1: Generar los 14 `publicacion.md`

**Files:**
- Create: `content/output/2026-10-01..14/publicacion.md` (14)

**Interfaces:**
- Consumes: `contexto.json` por fecha (ya existe, 14/14).
- Produces: captions que `parsePublicacion()` (buffer-client.js) leerá en Task 2+: secciones `## 1. TikTok` (bloque ```), `## 2. YouTube` (**Título:** / **Descripción:** en bloques ```` ``` ````), `## 3. Instagram` (bloque ```).

- [ ] **Step 1: Generar por fecha**

Run: `1..14 | ForEach-Object { $d = "2026-10-" + $_.ToString("00"); node scripts/publish-pack.js $d 2>&1 | Select-Object -Last 1; if ($LASTEXITCODE -ne 0) { Write-Output "FAIL $d" } }`
Expected: 14 salidas OK, 0 FAIL (si un día falla: leer error del script y resolver antes de continuar).

- [ ] **Step 2: Verificar secciones no vacías**

Run:
```powershell
1..14 | ForEach-Object {
  $d = "2026-10-" + $_.ToString("00")
  $md = Get-Content "content\output\$d\publicacion.md" -Raw
  $ok = ($md -match '## 1\. TikTok') -and ($md -match '## 2\. YouTube') -and ($md -match '## 3\. Instagram')
  Write-Output "$d sections=$ok len=$($md.Length)"
}
```
Expected: `sections=True` en los 14.

---

### Task 2: `buffer-client.js` — 5ª plataforma YouTube + `verify-queue.js` con canal YT

**Files:**
- Modify: `scripts/buffer-client.js` (`dayPlatforms`, ~L40-110; comentarios L39-41)
- Modify: `scripts/schedule-posts.js` (solo comentario de cabecera L4)
- Modify: `scripts/verify-queue.js` (array `channels`, L10-16)

**Interfaces:**
- Consumes: `publicacion.md` del Task 1; `buffer-profiles.json` (cuenta1.youtube ya existe).
- Produces: `dayPlatforms(date, creds) → [{name, channelId, text, dueAt, key, metadata}]` con hasta 5 entradas; usado por `schedule-posts.js` y `schedule-oct-batch.js`.

- [ ] **Step 1: Editar `dayPlatforms()` en buffer-client.js**

A. Añadir hora al objeto `H`:

```js
    facebook: Number(process.env.BUFFER_FB_H) || 15,
    youtube: Number(process.env.BUFFER_YT_H) || 13,
  };
```

B. Reemplazar el `return [...]` literal por (mismas 4 entradas + youtube condicional):

```js
  const platforms = [
    { name: 'linkedin', channelId: cuenta2.linkedin.id, text: instagram, dueAt: z(H.linkedin), key: key2, metadata: null },
    { name: 'instagram', channelId: cuenta1.instagram.id, text: instagram, dueAt: z(H.instagram), key: key1, metadata: { instagram: { type: 'reel', shouldShareToFeed: true } } },
    { name: 'tiktok', channelId: cuenta1.tiktok.id, text: tiktok, dueAt: z(H.tiktok), key: key1, metadata: null },
    { name: 'facebook', channelId: cuenta2.facebook.id, text: instagram, dueAt: z(H.facebook), key: key2, metadata: { facebook: { type: 'post' } } },
  ];
  if (!process.env.BUFFER_NO_YT) {
    platforms.push({
      name: 'youtube',
      channelId: cuenta1.youtube.id,
      text: `${ytTitle}\n\n${ytDesc}`,
      dueAt: z(H.youtube),
      key: key1,
      metadata: null,
    });
  }
  return platforms;
```

C. Comentarios: L39-41 (`// YouTube se publica por la ruta DIRECTA...`) →
```js
// YouTube: por defecto agenda VÍA BUFFER (canal cuenta1.youtube). La ruta
// directa (upload-youtube.js) sigue disponible como alternativa manual.
// Fallback: BUFFER_NO_YT=1 omite la plataforma (canario fallido).
```
Y el header `// --- Definición de las plataformas gestionadas por Buffer (FB/IG/TikTok) ---` → `(FB/IG/TikTok/LinkedIn/YouTube)`.

- [ ] **Step 2: Comentario cabecera schedule-posts.js (L4)**

```js
// Schedules: LinkedIn 11AM, Instagram 12PM, YouTube 1PM, TikTok 2PM, Facebook 3PM UTC (dayPlatforms decide; BUFFER_NO_YT=1 omite YouTube)
```
(Eliminar la línea `// YouTube se publica por la ruta directa (upload-youtube.js)`.)

- [ ] **Step 3: Añadir canal youtube a verify-queue.js**

En el array `channels`, tras la entrada instagram:
```js
  { name: 'youtube', id: creds.cuenta1.youtube.id, key: creds.key1 },
```

- [ ] **Step 4: Test de import — 5 plataformas con horas correctas**

Run:
```powershell
node -e "import('./scripts/buffer-client.js').then(m => { const c = m.loadBufferCredentials(); const p = m.dayPlatforms('2026-10-01', c); console.log(p.map(x => x.name + ':' + x.dueAt).join(' | ')); })"
```
Expected (exacto): `linkedin:2026-10-01T11:00:00Z | instagram:2026-10-01T12:00:00Z | tiktok:2026-10-01T14:00:00Z | facebook:2026-10-01T15:00:00Z | youtube:2026-10-01T13:00:00Z`

- [ ] **Step 5: Test de fallback `BUFFER_NO_YT`**

Run: mismo comando con `$env:BUFFER_NO_YT="1";` delante.
Expected: 4 entradas, sin `youtube:`.

---

### Task 3: Script nuevo `scripts/schedule-oct-batch.js`

**Files:**
- Create: `scripts/schedule-oct-batch.js`

**Interfaces:**
- Consumes: `parsePublicacion()` (buffer-client.js), `upload-cloudinary.js` (stdout JSON `{public_url, public_id}`), `schedule-posts.js` (stdout última línea `{"scheduled":[{name,status,postId,scheduledAt,error}]}`), `delete-buffer-posts.mjs <id...>`.
- Produces: `content/output/<fecha>/publicado.json` por fecha exitosa.

- [ ] **Step 1: Escribir el script completo**

```js
// Orquestador de publicación por rango de fechas (Cloudinary → Buffer, 5 plataformas).
// Uso: node scripts/schedule-oct-batch.js --start YYYY-MM-DD --end YYYY-MM-DD [--canary] [--dry-run]
// --canary: procesa solo la primera fecha y para. --dry-run: solo pre-gates.
// Atomicidad por fecha (DNR Buffer): si algo falla, borra los posts CREADOS de esa
// fecha y NO escribe publicado.json (fecha reintentable). Nunca mezclar URLs.

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parsePublicacion } from './buffer-client.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const val = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const start = val('--start');
const end = val('--end');
const canary = args.includes('--canary');
const dryRun = args.includes('--dry-run');
if (!start || !end) {
  console.error('Usage: node scripts/schedule-oct-batch.js --start YYYY-MM-DD --end YYYY-MM-DD [--canary] [--dry-run]');
  process.exit(1);
}

const dates = [];
for (let d = new Date(start + 'T00:00:00Z'), e = new Date(end + 'T00:00:00Z'); d <= e; d = new Date(d.getTime() + 86400000)) {
  dates.push(d.toISOString().slice(0, 10));
}
if (canary) dates.splice(1);

const MAX_MB = 100;
const results = [];

for (const date of dates) {
  const dir = join(ROOT, 'content', 'output', date);
  const mp4 = join(dir, 'video-preview.mp4');
  const mdPath = join(dir, 'publicacion.md');
  const pubPath = join(dir, 'publicado.json');
  const r = { date };

  const fail = (msg) => { r.error = msg; results.push(r); console.log(`${date} ERROR: ${msg}`); };

  if (existsSync(pubPath)) { r.skip = 'publicado.json ya existe'; results.push(r); console.log(`${date} SKIP (ya publicado)`); continue; }
  if (!existsSync(mp4)) { fail('falta video-preview.mp4'); continue; }
  if (!existsSync(mdPath)) { fail('falta publicacion.md'); continue; }
  const mb = statSync(mp4).size / (1024 * 1024);
  if (mb >= MAX_MB) { fail(`mp4 ${mb.toFixed(1)}MB >= ${MAX_MB}MB (Cloudinary free)`); continue; }

  let caps;
  try { caps = parsePublicacion(date); } catch (e) { fail(`publicacion.md ilegible: ${e.message}`); continue; }
  if (!caps.tiktok || !caps.ytTitle || !caps.ytDesc || !caps.instagram) { fail('publicacion.md con secciones vacías'); continue; }

  if (dryRun) { r.dry = `DRY-RUN ok (${mb.toFixed(1)}MB, caps tiktok/yt/ig OK)`; results.push(r); console.log(`${date} ${r.dry}`); continue; }

  // 1) Cloudinary
  let cloudinaryUrl;
  try {
    const out = execSync(`node "${join(ROOT, 'scripts', 'upload-cloudinary.js')}" "${mp4}"`, { encoding: 'utf8', timeout: 300000 });
    cloudinaryUrl = JSON.parse(out.trim().split('\n').pop()).public_url;
    console.log(`${date} cloudinary: ${cloudinaryUrl}`);
  } catch (e) { fail(`upload-cloudinary falló: ${String(e.message).slice(0, 200)}`); continue; }

  // 2) Buffer (5 plataformas; dayPlatforms calcula dueAt = fecha a horas estándar)
  let sched;
  try {
    const out = execSync(`node "${join(ROOT, 'scripts', 'schedule-posts.js')}" "${date}" "${cloudinaryUrl}"`, { encoding: 'utf8', timeout: 120000 });
    sched = JSON.parse(out.trim().split('\n').pop()).scheduled;
  } catch (e) {
    fail(`schedule-posts falló (revisar verify-queue por posts huérfanos de ${date}): ${String(e.message).slice(0, 200)}`);
    continue;
  }

  const ok = sched.filter(p => p.status === 'scheduled' || p.status === 'sending');
  const bad = sched.filter(p => p.error);
  if (bad.length) {
    const ids = ok.map(p => p.postId).filter(Boolean);
    if (ids.length) {
      try { execSync(`node "${join(ROOT, 'scripts', 'delete-buffer-posts.mjs')}" ${ids.join(' ')}`, { encoding: 'utf8', timeout: 60000 }); } catch {}
    }
    fail(`plataformas fallidas: ${bad.map(p => `${p.name}(${p.error})`).join(', ')} → borrados ${ids.length} posts creados, sin publicado.json`);
    continue;
  }

  const publicado = { procesadoEn: new Date().toISOString(), plataformas: {} };
  for (const p of ok) publicado.plataformas[p.name] = { status: 'ok', postId: p.postId, scheduledAt: p.scheduledAt };
  writeFileSync(pubPath, JSON.stringify(publicado, null, 2));
  r.ok = ok.map(p => `${p.name}@${p.scheduledAt}`).join(' ');
  results.push(r);
  console.log(`${date} OK → ${ok.length} posts, publicado.json escrito`);
}

console.log('\n=== RESUMEN ===');
for (const r of results) console.log(r.error ? `FAIL ${r.date}: ${r.error}` : r.skip ? `SKIP ${r.date}: ${r.skip}` : `OK   ${r.date}: ${r.ok || r.dry}`);
const fails = results.filter(r => r.error);
console.log(`${results.length} fechas, ${fails.length} con error`);
process.exit(fails.length ? 1 : 0);
```

- [ ] **Step 2: Syntax check**

Run: `node --check scripts/schedule-oct-batch.js` (si `--check` rechaza ESM, usar el dry-run del Step 3 como validación).
Expected: exit 0.

- [ ] **Step 3: Dry-run del rango completo**

Run: `node scripts/schedule-oct-batch.js --start 2026-10-01 --end 2026-10-14 --dry-run`
Expected: 14 líneas `DRY-RUN ok`, resumen `0 con error`, exit 0. (Si marca fechas SKIP = ya publicadas, parar y reportar.)

---

### Task 4: Baseline remoto + commit de código

- [ ] **Step 1: verify-queue baseline (solo lectura)**

Run: `node scripts/verify-queue.js`
Expected: imprime 5 canales (ahora incluye youtube). **Registrar salida**: posts futuros existentes (p.ej. pipeline-viral H10 due 2026-10-03, Sep 30). Gate: NO debe haber posts con fechas 2026-10-01..14 de club (no existen aún — si aparecen, PARAR y reportar).

- [ ] **Step 2: Commit del código**

Run: `git add scripts/buffer-client.js scripts/schedule-posts.js scripts/verify-queue.js scripts/schedule-oct-batch.js; git commit -m "feat(publish): youtube via buffer (5a plataforma) + schedule-oct-batch (atomico por fecha, BUFFER_NO_YT)"`
Expected: 4 archivos, 0 archivos ajenos en el stage (`git status --short` revisado antes).

---

### Task 5: Canario Oct 1 (5 plataformas) + verificación

**Files:**
- Create: `content/output/2026-10-01/publicado.json`

- [ ] **Step 1: Agendar solo Oct 1**

Run: `node scripts/schedule-oct-batch.js --start 2026-10-01 --end 2026-10-01 --canary`
Expected: `2026-10-01 OK → 5 posts, publicado.json escrito`, exit 0.

- [ ] **Step 2: Verificar remoto**

Run: `node scripts/verify-queue.js`
Expected en la salida:
- `2026-10-01T11:00:00Z` en linkedin
- `2026-10-01T12:00:00Z` en instagram
- `2026-10-01T13:00:00Z` en **youtube**
- `2026-10-01T14:00:00Z` en tiktok
- `2026-10-01T15:00:00Z` en facebook
- Sin errores GraphQL (`ERRORS:` ausente).

- [ ] **Step 3: Si YouTube fue rechazado — dos casos**

**Caso A — el rechazo vino en el JSON de `schedule-posts`** (la fecha salió FAIL y el script ya borró los posts creados de Oct 1, sin `publicado.json`): solo re-ejecutar sin YouTube:
```powershell
$env:BUFFER_NO_YT="1"
node scripts/schedule-oct-batch.js --start 2026-10-01 --end 2026-10-01 --canary
```
Expected: `OK → 4 posts, publicado.json escrito` → batch del Task 6 CON `$env:BUFFER_NO_YT="1"`.

**Caso B — el post de YouTube existe pero quedó rechazado/roto** (JSON dio ok, Buffer lo invalidó después):
```powershell
# 1) leer postId de youtube en content\output\2026-10-01\publicado.json
node scripts/delete-buffer-posts.mjs <postIdYT>
# 2) quitar la clave "youtube" del publicado.json (editar el JSON, dejar las otras 4)
# 3) batch con: $env:BUFFER_NO_YT="1" (Task 6)
```
Expected: Oct 1 queda con 4 plataformas registradas; informe anota "YouTube pendiente".

En CUALQUIER otro fallo distinto de YouTube → STOP y preguntar al Alquimista.

---

### Task 6: Batch de los 13 restantes + verificación final

- [ ] **Step 1: Batch**

Run: `node scripts/schedule-oct-batch.js --start 2026-10-01 --end 2026-10-14`
Expected: `SKIP 2026-10-01` (ya tiene publicado.json) + 13 × `OK → 5 posts`, resumen `14 fechas, 0 con error`, exit 0. Si alguna fecha FAIL → resolver según mensaje (reintentar solo esa fecha tras el informe parcial) — NO dejar la fecha a medio hacer.

- [ ] **Step 2: verify-queue final — gate 70 posts**

Run: `node scripts/verify-queue.js`
Expected: por cada uno de los 5 canales, exactamente **14 posts nuevos** con scheduledAt en `2026-10-01..2026-10-14` (hora correspondiente), más los del baseline (viral/Sep) sin cambios.

- [ ] **Step 3: Gates locales**

Run:
```powershell
$n = (1..14 | Where-Object { Test-Path ("content\output\2026-10-" + $_.ToString("00") + "\publicado.json") }).Count
Write-Output "publicado.json=$n"
$b = (17..21 | Where-Object { Test-Path ("content\output\2026-09-" + $_.ToString("00") + "\publicado.json") }).Count
Write-Output "backlogSep-touch=$b"
```
Expected: `publicado.json=14`, `backlogSep-touch=0`.

---

### Task 7: PIPELINE-STATE + commit + informe

- [ ] **Step 1: Editar PIPELINE-STATE.md (raíz)**

- Hito nuevo después del hito de producción oct:
`- **PUBLICACION OCT 1-14 AGENDADA (2026-09-29): 70 posts Buffer** (14 días × LI/IG/YT/TT/FB a horas 11/12/13/14/15 UTC, 1 video/día en su fecha cinética) — YouTube ahora VÍA BUFFER (5ª plataforma en dayPlatforms, fallback BUFFER_NO_YT), orquestador `schedule-oct-batch.js` (atómico por fecha, publicado.json ×14, canario Oct 1 OK). Backlog Sep 17-21 intacto. Packs: publicacion.md ×14 (publish-pack).`
- Issues: ninguno nuevo si el canario YT pasó; si no: issue "YouTube pendiente vía ruta directa".

- [ ] **Step 2: Commits**

Run (raíz): `git add PIPELINE-STATE.md; git commit -m "docs(pipeline-state): publicacion oct 1-14 agendada (70 posts buffer, yt via buffer)"`

- [ ] **Step 3: Informe final**

Resumen: 70 postIds/fuentes por plataforma, horas, fallback YT si aplicó, y nota de que los captions quedaron listos para revisión (archivos `content/output/2026-10-XX/publicacion.md`).
