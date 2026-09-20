# Mapa de Credenciales y Tokens (AUDITORÍA — no contiene secretos)

Este documento inventaría dónde viven las credenciales de acceso de los proyectos
de Club Sincrónica. NO se incluye ningún valor secreto. Sirve para saber qué token
existe, para qué sirve, qué script lo usa, y si está protegido por `.gitignore`.

Fecha de auditoría: 2026-08-21

---

## 1. Estado de seguridad (git)

| Proyecto            | Carpeta de credenciales        | ¿Gitignored? | ¿Hay secretos trackeados en git? |
|---------------------|-------------------------------|--------------|----------------------------------|
| club-sincronica     | `assets/credentials/`         | ✅ sí        | No (solo scripts con "buffer"/"cloudinary" en el nombre) |
| pipeline-viral      | `credentials/`                | ✅ sí        | No                               |
| remotion-poc        | (ninguna — solo lectura)      | n/a          | No                               |

Conclusión: ningún secreto real está versionado en git. ✅

---

## 2. club-sincronica/assets/credentials/  (Shorts diarios)

| Archivo | Qué contiene (tipo) | Usado por | Plataforma / Propósito |
|---------|---------------------|-----------|------------------------|
| `buffer-keys.json` | 2 API keys de Buffer (cuenta1 / cuenta2) | `scripts/buffer-client.js` → `schedule-posts.js`, `process-pending.js`, `publish-pending.js`, `fix-buffer-posts.js`, `verify-buffer.js` | Buffer (publicación FB/IG/TikTok/LinkedIn) |
| `buffer-profiles.json` | IDs de canales Buffer (cuenta1: IG+TikTok+YT; cuenta2: FB+LinkedIn) | `scripts/buffer-client.js` | Mapeo plataforma → canal Buffer |
| `client_secret.json` (+ `client_secret_<id>.apps.googleusercontent.com.json`) | Cliente OAuth "Desktop" de Google Cloud | `scripts/google-oauth.js` | Google/YouTube OAuth |
| `youtube-token.json` | Access + refresh token OAuth de Google | `scripts/google-oauth.js` → `scripts/upload-youtube.js` | YouTube Data API v3 (subida directa de Shorts) |
| `cloudinary.json` | `cloud_name`, `api_key`, `api_secret` | `scripts/cloudinary-client.js` → `scripts/upload-cloudinary.js` | Cloudinary (host de videos para Buffer) |

Rutas de publicación en club-sincronica:
- **YouTube** → directo vía API (OAuth). NO usa Buffer.
- **Facebook / Instagram / TikTok / LinkedIn** → vía **Buffer**, usando URLs de video hosteadas en **Cloudinary**.

⚠️ Riesgo conocido (según `docs/` y n8n): el refresh token de YouTube fue revocado una vez
("YouTube estaba 2 días atrasado por refresh token revocado"). Revisar vigencia periódicamente.

---

## 3. pipeline-viral/credentials/  (Videos largos "Kin Harmonic")

| Archivo | Qué contiene (tipo) | Usado por | Plataforma / Propósito |
|---------|---------------------|-----------|------------------------|
| `canal.env` | `EMAIL` + `PASSWORD` (app password SMTP Gmail) | `scripts/load-env.js` → `scripts/notify-email.js`, `scripts/deliver.js` | Gmail SMTP (notificación + entrega de MP3 a Google Drive vía rclone) |

⚠️ **YouTube para pipeline-viral:** `scripts/upload-youtube.js` existe y funciona (subida resumible, thumbnails, `--dry-run`). Actualmente reutiliza el OAuth de club-sincronica (`../club-sincronica/scripts/google-oauth.js`). Para Fase 2: crear `client_secret.json` propio en `pipeline-viral/credentials/` y dotar al script de OAuth independiente.

---

## 4. remotion-poc

No contiene credenciales propias. Es un laboratorio de render (lee de pipeline-viral y
club-sincronica en modo solo-lectura). No publica.

---

## 5. Variables de entorno / externas

| Servicio | Dónde se configura | Notas |
|----------|-------------------|-------|
| n8n (automatización diaria) | localhost:5678 (self-hosted) | workflows en `club-sincronica/n8n-workflows/` |
| rclone (Google Drive) | config local del sistema | usado por `deliver.js` |
| OpenCode MCP memory | `opencode.json` → `data/memory.json` | store de memoria (no secreto) |
| jcode auditor (DeepSeek NIM) | `scripts/jcode-auditor.config.json` (en club-sincronica) | key de API gratuita NIM |

---

## 6. Recomendaciones

1. Mantener ambos `credentials/` bajo `.gitignore` estricto (ya lo están).
2. Añadir un `.gitignore` raíz que cubra `_legado/` (archivado, sin secretos pero por limpieza).
3. Rotar/verificar el refresh token de YouTube de club-sincronica cada cierto tiempo.
4. Cuando se cree el OAuth de pipeline-viral, colocarlo en `pipeline-viral/credentials/`
   y añadir su token a `.gitignore` (ya cubierto por la regla `credentials/`).
5. No commitear `canal.env` (ya ignorado vía `credentials/`).
