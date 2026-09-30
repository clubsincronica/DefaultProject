# Publicación lote Oct 1-14 vía Cloudinary + Buffer — Design

**Fecha:** 2026-09-29 · **Proyecto:** club-sincronica · **Aprobado por:** Alquimista

## Objetivo

Agendar la publicación de los 14 videos diarios `2026-10-01..14` en **5 plataformas**
(LinkedIn, Instagram, TikTok, Facebook y **YouTube — novedad: desde Buffer**) con el
flujo existente Cloudinary → Buffer, 1 video por día en su fecha cinética, previa
revisión humana de los captions.

## Decisiones del usuario (brainstorming)

1. **Plataformas:** las 4 de Buffer (LI/IG/TT/FB) **+ YouTube desde Buffer** (hoy
   excluido del código a propósito; el canal ya está conectado en
   `buffer-profiles.json` → cuenta1.youtube id `6a73743c99afb443490953f2`).
2. **Calendario:** 1 video por día **en su fecha** (Oct 1 → 1 oct … Oct 14 → 14 oct),
   horas estándar UTC: **LI 11 · IG 12 · YT 13 · TT 14 · FB 15**.
3. **Backlog Sep 17-21:** dejarlo intacto (NO correr `process-pending.js` a lo bruto).
4. **Textos:** generar `publicacion.md` ×14 con `publish-pack.js` → **revisión del
   Alquimista (gate)** → recién entonces agendar.

## Arquitectura

### Cambio en código existente (mínimo)

`scripts/buffer-client.js` → `dayPlatforms(date, creds)` añade entrada youtube:

```js
const H = {
  linkedin: ..., instagram: ..., tiktok: ..., facebook: ...,
  youtube: Number(process.env.BUFFER_YT_H) || 13,
};
// 5ª entrada del array retornado:
{
  name: 'youtube',
  channelId: cuenta1.youtube.id,
  text: `${ytTitle}\n\n${ytDesc}`,   // de parsePublicacion()
  dueAt: z(H.youtube),               // `${date}T13:00:00Z`
  key: key1,
  metadata: null,
}
```

`parsePublicacion()` ya extrae `ytTitle`/`ytDesc` — no cambia. `schedule-posts.js`
no cambia (itera lo que `dayPlatforms` devuelva). Si `process.env.BUFFER_NO_YT`
está definido, `dayPlatforms()` omite la entrada youtube (fallback del canario).
Actualizar el comentario de
cabecera de `schedule-posts.js`/`buffer-client.js` (ya no "solo FB/IG/TikTok/LI").

### Script nuevo: `scripts/schedule-oct-batch.js`

CLI: `node scripts/schedule-oct-batch.js --start 2026-10-01 --end 2026-10-14 [--canary] [--dry-run]`

- `--canary`: procesa solo la primera fecha (`--start`) y detiene.
- `--dry-run`: imprime qué haría (fechas válidas, tamaños, horas) sin tocar Buffer/Cloudinary.

Por cada fecha, en orden:

1. **Pre-gates:** existe `content/output/<fecha>/video-preview.mp4` y
   `publicacion.md`; tamaño del mp4 **< 100MB** (límite Cloudinary free, DNR);
   `parsePublicacion()` devuelve tiktok/ytTitle/ytDesc/instagram no vacíos;
   NO existe `publicado.json` (si existe → skip, idempotente).
2. **Upload:** `execSync(node scripts/upload-cloudinary.js <mp4>)` → parsea JSON
   stdout `{public_url, public_id}`. `public_id` canónico
   `club-sincronica/<fecha>-video-preview.mp4` (subida repetida = overwrite, OK).
   **NO** borrar Cloudinary tras agendar (DNR: Buffer necesita la URL al publicar).
3. **Schedule:** `execSync(node scripts/schedule-posts.js <fecha> <public_url>)`
   → 5 posts con `dueAt` = fecha del kin a las horas estándar (fechas futuras →
   `z(h)` ya calcula bien; no hace falta `dueAtOverride`).
4. **Commit de estado:** escribe `content/output/<fecha>/publicado.json`
   (`{procesadoEn, plataformas:{<name>:{status, postId, scheduledAt}}}`) — mismo
   shape que `process-pending.js`, para que el cron n8n (9,18h) NO duplique.
5. **Atomicidad por fecha (DNR Buffer):** si alguna plataforma falla →
   `node scripts/delete-buffer-posts.mjs <postIds creados de ESTA fecha>` y NO
   escribir `publicado.json` (fecha retryable). Continúa con la siguiente fecha;
   informe final lista fechas fallidas.

### Fases de ejecución

1. **Baseline:** `node scripts/verify-queue.js` → confirmar que NO hay posts de
   oct ya agendados en Buffer (si hay, parar y reportar).
2. **Generar textos:** `node scripts/publish-pack.js <fecha>` ×14 → `publicacion.md`.
3. **GATE humano:** el Alquimista revisa los 14 packs (caption TikTok, título+desc
   YT, caption IG; LI/FB reusan el de IG; YT reusa título+desc).
4. **Canario:** `schedule-oct-batch.js --canary` (Oct 1, 5 plataformas) →
   `verify-queue.js` confirma los 5 posts con fecha/hora correctas.
   - **Si Buffer rechaza YouTube** → re-ejecutar el batch con `BUFFER_NO_YT=1`
     (variable que hace que `dayPlatforms()` omita la entrada youtube) y el
     canario de YouTube queda como pendiente reportado (no bloquea el resto).
5. **Batch:** 13 fechas restantes.
6. **Verificación final:** `verify-queue.js` → **70 posts** (14 × 5), fechas/horas
   correctas; `publicado.json` ×14; backlog Sep 17-21 sin tocar.

## Gates de éxito

- 70 posts remotos en Buffer: 14 días × (LI 11 · IG 12 · YT 13 · TT 14 · FB 15 UTC).
- `publicacion.md` + `publicado.json` presentes en los 14 directorios de fecha.
- Ningún `publicado.json` en `2026-09-17..21` (backlog intacto).
- Ninguna fecha a medio agendar (o tiene 5 posts + json, o 0 posts + sin json).
- PIPELINE-STATE.md actualizado y commiteado.

## Riesgos y DNRs aplicados

- **YouTube vía Buffer es la única pieza no probada** → canario obligatorio antes
  del batch (título/descripción podrían mapearse distinto; se verifica en el
  canario leyendo el post con los helpers existentes o el dashboard).
- DNR: si Buffer rechaza un asset tras crear posts → borrar los posts de esa
  fecha y re-agendar TODOS los de esa fecha (no mezclar URLs).
- DNR: no borrar Cloudinary hasta que los posts hayan publicado (limpieza aparte
  con `upload-cloudinary.js --cleanup`).
- Cloudinary free: mp4 >100MB → 413 (pre-gate de tamaño).
- Cron n8n `publish-pending` (9,18h UTC): solo corre si n8n está activo; la
  evidencia actual (backlog Sep sin procesar) indica que NO lo está. Escribir
  `publicado.json` por fecha tras cada éxito lo hace inmune aunque se active.
- Horas por env `BUFFER_*_H` (defaults documentados arriba).

## Fuera de alcance

- Backlog Sep 17-21 (queda como está).
- YouTube por ruta directa `upload-youtube.js` (sigue disponible para uso manual).
- Linktree (manual, sin API).
- Publicación real de YouTube con `publishAt`/programación nativa (no se toca).
- Cambios en los textos de los packs tras el gate humano.

## Criterios de éxito

El Alquimista ve en su dashboard de Buffer los 70 posts programados con el video
correcto en cada fecha de octubre, incluido YouTube, y el pipeline diario (n8n)
no duplicará nada.
