# Diagnóstico Estructural — Default Project
**Fecha:** 2026-09-20  
**Estado:** Plan (read-only)

---

## Resumen Ejecutivo

El proyecto está **sano en producción** pero tiene deuda técnica acumulada: 56 scripts sin tests en club-sincronica, 42 commits sin push en pipeline-viral, 3 archivos basura con nombres rotos, y 1 archivo de changelog referenciado que no existe. Las 3 mejoras propuestas abordan esto sin tocar la producción activa.

---

## 1. Salud del Código

| Métrica | Valor | Estado |
|---------|-------|--------|
| Scripts JS/MJS (pipeline-viral) | 56 | — |
| Tests (pipeline-viral) | 14 archivos, 56 casos | **GREEN** (0 failures) |
| Tests (club-sincronica) | **0** | **ROJO** |
| Tests (remotion-poc) | **0** | **ROJO** |
| Secrets en git | 0 | CLEAN |
| .env commiteados | 0 | CLEAN |
| TODO/FIXME/HACK | 0 | CLEAN |
| Auditor nocturno | 1 workflow n8n | Activo |

### Archivos basura en `pipeline-viral/scripts/`
Tres archivos vacíos con nombres rotos (artefactos de generación fallida):
- `{try{const` — 0 bytes
- `console.error(e))` — 0 bytes
- `200` — 0 bytes

**Acción:** Eliminar los 3 archivos. Son inertes pero ensucian el directorio y confunden al auditor.

---

## 2. Estado Git

### Root repo (Default Project)
- Branch: `master`
- 1 archivo eliminado sin staging: `.superpowers/sdd/.../.gitignore`
- Estado: **casi limpio**

### pipeline-viral
- Branch: `master`
- **42 commits sin push** a origin
- 1 archivo eliminado sin staging: `PLAN-VIRAL.md`
- 9 archivos modificados sin commit
- **27 archivos untracked** (scripts H1-H10, whisper, trim, cloudinary, etc.)

**Riesgo:** Si el disco falla, 42 commits de trabajo se pierden. Esto es la deuda técnica más urgente del proyecto.

---

## 3. Archivos Faltantes

| Archivo Referenciado | Referenciado por | Existe |
|---------------------|------------------|--------|
| `docs/Changelog.md` | PIPELINE-STATE.md línea 6 | **NO** |
| `docs/Plans/Frame-Improvement.md` | PIPELINE-STATE.md línea 13 | **NO** |
| `pipeline-viral/PLAN-VIRAL.md` | auditor config, root AGENTS.md | **NO** (borrado, unstaged) |
| `README-ESTRUCTURA.md` | auditor config | Existe |

---

## 4. Dependencias Cross-Proyecto

La dependencia es **unidireccional**: pipeline-viral → club-sincronica.

| Qué comparte pipeline-viral | De dónde lo lee |
|-----------------------------|-----------------|
| Kin data (BLOCKS) | `club-sincronica/` (referencia indirecta vía kin-data.js) |
| OAuth YouTube | `club-sincronica/assets/credentials/` |
| Buffer creds | `club-sincronica/assets/credentials/` |
| WAVs de voz real | `club-sincronica/assets/audio/recordings/` |
| Cloudinary creds | `club-sincronica/assets/credentials/cloudinary.json` |
| Brand palette | Copiado a `pipeline-viral/content/brand/` |
| tzolkin.js | Copiado de club-sincronica |

**Riesgo:** Si club-sincronica reorganiza sus assets, pipeline-viral se rompe silenciosamente. No hay validación de rutas compartidos.

---

## 5. Cobertura del Auditor

El `auditor-codigo.config.json` escanea:
- `club-sincronica/scripts` ✓
- `pipeline-viral/scripts` ✓
- `remotion-poc/src` ✓
- `remotion-poc/scripts` ✓

**NO escanea:**
- `club-sincronica/content/` (storyboards, brand)
- `club-sincronica/assets/` (credentials, audio)
- `docs/` (estructura canónica, plugins)
- Archivos raíz sueltos (`_*.mjs`, 14 scripts legacy)

---

## 6. Graphify

Existe un grafo de agosto 21, 2026 (`graphify-out/`, 955KB).莫过期 (~30 días). Las conexiones entre scripts pueden haber cambiado con la integración Orca/Obsidian.

---

## 7. Test Coverage por Proyecto

| Proyecto | Scripts | Tests | Coverage |
|----------|---------|-------|----------|
| pipeline-viral | 56 | 14 archivos / 56 casos | ~25% de scripts testeados |
| club-sincronica | ~28 scripts | **0** | **0%** |
| remotion-poc | ~10 scripts | **0** | **0%** |
| Root (auditor) | 1 | 1 | 100% |

---

## Diagnóstico General

```
SALUD DE PRODUCCIÓN:  ████████████████████ 8/10  (todo funciona, tests green)
DEUDA TÉCNICA:        ████████████░░░░░░░░ 6/10  (git sucio, tests faltantes)
DOCUMENTACIÓN:        ████████░░░░░░░░░░░░ 4/10  (changelog/plans faltantes)
SEGURIDAD:            ████████████████████ 10/10 (sin secrets, sin .env)
MANTENIBILIDAD:       ██████████░░░░░░░░░░ 5/10  (archivos basura, dependencias implícitas)
```

---

# Plan de Mejora 1: Limpieza de Archivos Basura y Git Hygiene
**Prioridad:** ALTA — ejecutar antes de cualquier otro trabajo  
**Riesgo:** BAJO — solo elimina archivos vacíos y crea commits  
**Tiempo estimado:** 15 minutos

## Problema
- 3 archivos vacíos con nombres rotos en `pipeline-viral/scripts/`
- 42 commits sin push en pipeline-viral
- 1 archivo eliminado sin staging en pipeline-viral (`PLAN-VIRAL.md`)
- 1 archivo eliminado sin staging en root (`.superpowers/.gitignore`)

## Plan

### Paso 1: Eliminar archivos basura
```bash
# En pipeline-viral/scripts/
Remove-Item "{try{const"
Remove-Item "console.error(e))"
Remove-Item "200"
```

### Paso 2: Staging limpio en pipeline-viral
```bash
cd pipeline-viral
git add -A
git status  # verificar que solo se eliminan los 3 archivos basura
git commit -m "chore: remove 3 empty junk files from scripts/"
```

### Paso 3: Staging limpio en root
```bash
cd ..
git add -A
git status
git commit -m "chore: clean up .superpowers stale .gitignore"
```

### Paso 4: Push pipeline-viral
```bash
cd pipeline-viral
git push origin master
```

### Paso 5: Push root (opcional)
```bash
cd ..
git push origin master
```

## Criterio de éxito
- `ls pipeline-viral/scripts/` no muestra archivos basura
- `git status` limpio en ambos repos
- pipeline-viral tiene 0 commits pendientes

---

# Plan de Mejora 2: Changelog y Documentation Fixes
**Prioridad:** MEDIA — mejora la mantenibilidad sin tocar código  
**Riesgo:** BAJO — solo archivos markdown  
**Tiempo estimado:** 20 minutos

## Problema
- `PIPELINE-STATE.md` línea 6 referencia `docs/Changelog.md` que no existe
- `PIPELINE-STATE.md` línea 13 referencia `docs/Plans/Frame-Improvement.md` que no existe
- `auditor-codigo.config.json` referencia `pipeline-viral/PLAN-VIRAL.md` que fue borrado
- El auditor escanea docs que no existen

## Plan

### Paso 1: Crear `docs/Changelog.md`
Crear un changelog estructurado que documente los hits principales:
- 2026-08-17 a 2026-08-24: Batch canónico Club Sincrónica
- 2026-09-08: Lote completo 7 videos Sep 10-16
- 2026-09-16: Fix King Maya Whisper
- 2026-09-17: H7-H8 voz real grabada
- 2026-09-20: Integración Orca + Obsidian

### Paso 2: Crear `docs/Plans/Frame-Improvement.md`
Crear un plan placeholder con las reglas DO-NOT-REPEAT relevantes y un enlace a PIPELINE-STATE.md.

### Paso 3: Actualizar auditor config
Eliminar `pipeline-viral/PLAN-VIRAL.md` de la lista de docs del auditor, ya que fue borrado.

### Paso 4: Commit
```bash
git add docs/Changelog.md docs/Plans/Frame-Improvement.md auditor-codigo.config.json
git commit -m "docs: add missing Changelog and Frame-Improvement plan, fix auditor config"
```

## Criterio de éxito
- `Test-Path docs/Changelog.md` = True
- `Test-Path docs/Plans/Frame-Improvement.md` = True
- Auditor config no referencia archivos inexistentes

---

# Plan de Mejora 3: Regenerar Grafo Graphify
**Prioridad:** BAJA — mejora la navegación pero no bloquea nada  
**Riesgo:** BAJO — solo regenera datos de análisis  
**Tiempo estimado:** 5 minutos

## Problema
- El grafo existente es de agosto 21, 2026 (~30 días de antigüedad)
- Desde entonces se agregaron: Orca (3 scripts), Obsidian (docs/vault), multiples scripts H7-H10
- Las conexiones entre scripts pueden haber cambiado

## Plan

### Paso 1: Regenerar grafo
```bash
graphify extract .
graphify cluster-only .
```

### Paso 2: Verificar
- Abrir `graphify-out/graph.html` en navegador
- Confirmar que los nodos Orca y Obsidian aparecen
- Confirmar que las conexiones pipeline-viral → club-sincronica se ven

### Paso 3: Commit
```bash
git add graphify-out/
git commit -m "chore: regenerate graphify graph (Orca + Obsidian nodes added)"
```

## Criterio de éxito
- `graphify-out/graph.json` tiene timestamp de hoy
- Nodos Orca (`orca-runtime`, `orca-kin-tones`, `orca-to-strudel`) visibles
- Nodos Obsidian (`docs/`, `Plugins-Setup.md`) visibles

---

# Resumen de Prioridades

| # | Plan | Prioridad | Riesgo | Tiempo | Bloquea producción |
|---|------|-----------|--------|--------|-------------------|
| 1 | Limpieza basura + git push | ALTA | Bajo | 15 min | No (pero previene pérdida) |
| 2 | Changelog + docs fixes | Media | Bajo | 20 min | No |
| 3 | Regenerar grafo | Baja | Bajo | 5 min | No |

**Ningún plan toca código de producción.** Son todos safe, incrementales, y reversibles.
