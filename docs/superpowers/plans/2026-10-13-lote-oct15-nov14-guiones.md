# Plan — Lote guiones Oct 15→Nov 14 + H14-H20

> **For agentic workers:** ejecución inline aprobada por el usuario ("build ahead"). Pasos con checkbox para tracking.

**Goal:** 31 guiones diarios club-sincronica (Oct 15→Nov 14) + 7 meditaciones H14-H20 con infraestructura y gates en verde.

**Architecture:** contenido puro sobre los motores existentes (tzolkin/astro/kin-data); cero cambios de render/publicación.

## Global Constraints

- Datos solo del motor; `generate-day.js` ANTES de escribir; nunca después.
- Lema literal + frase GAP si `isGap`; `kinName`/`signature` con género del motor.
- Puente SEO con keyword en voz alta; sin CTA; sin mojibake; grep ASCII-safe en PowerShell.
- Meditaciones: cero astro, 6 actos, timestamps 0/44/170/296/422/548, ≥5 [PAUSA 2s], lemas verbatim.

## Tasks

### Task 1: Contextos club (31 días)
- Run: loop `node scripts/generate-day.js <fecha>` para 2026-10-15..2026-11-14 en `club-sincronica/`.
- Extraer digesto compacto (kin, kinName, signature, sello, onda+pos, lema, isGap, fase lunar, aspectos, evento) a `content/output/_digesto-oct15-nov14.md` vía node inline.
- [ ] 31 `contexto.json` existen; digesto leído.

### Task 2: 31 guiones diarios + gate
- Escribir `content/output/YYYY-MM-DD/guion.md` por fecha (plantilla Hook/Puente/Cuerpo/Outro/Notas; mapa sello→modo del spec).
- [ ] `verify-guion.js` 31/31 PASS (loop con salida por fecha).
- [ ] Commit en repo `club-sincronica`.

### Task 3: Datos virales kins 53-80
- Node inline en `pipeline-viral/`: dump por bloque H14-H20 (kin, kinName, signature, sello, palabra/poder, lema verbatim, chakra/drone vía `droneFreqForBlock`, fecha por kin).
- [ ] Digesto `content/scripts/_digesto-h14-h20.md` leído.

### Task 4: BLOCKS 14-20 + verify-guion.mjs ampliado
- Añadir BLOCKS 14-20 a `scripts/kin-data.js` (centralDate, actNames, modoDeContar).
- Ampliar default/rango de `scripts/verify-guion.mjs` a H20.
- [ ] `node -e` que resuelve block 14..20 sin error.

### Task 5: 7 guiones H14-H20 + meditar-hN + gates
- Escribir `content/scripts/HN-meditacion-kins-X-Y.md` ×7 (modos+poemas+mantras nuevos).
- Copiar `meditar-h13.mjs` → `meditar-h14..h20.mjs` (solo cambia el número de bloque).
- [ ] `verify-guion.mjs H14..H20` 7/7 PASS; `meditar-hN.mjs --dry-run` 7/7 (600s).
- [ ] Commit en repo `pipeline-viral`.

### Task 6: Estado + commits raíz
- Actualizar `PIPELINE-STATE.md` (hitos club + viral; sin DO-NOT-REPEAT nuevo salvo corrección).
- Commit raíz (spec+plan+estado).
- [ ] `git status` limpio en los 3 repos.
