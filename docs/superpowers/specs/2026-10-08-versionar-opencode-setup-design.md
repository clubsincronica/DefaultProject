# Spec: versionar `opencode-setup/` y `.opencode/` en el repo raíz

Fecha: 2026-10-08 · Enfoque: A1 (versionar en sitio con ignores granulares) — aprobado por el usuario.

## Problema

El andamiaje de OpenCode (harness, skills, plantillas del installer) no está en el repo de
GitHub: `.gitignore` ignora `.opencode/` completo (línea 23) y `opencode-setup/` completo
(línea 6). El installer empaqueta al build desde esos directorios locales
(`Build-Exe.ps1` → `dist/payload/`), así que un clon limpio del repo no puede reconstruir
el `OpenCode-Setup.exe` ni replicar el entorno.

## Objetivo

Que el repo contenga todo el andamiaje reproducible (harness + skills + plantillas),
sin ningún secreto, y que `Build-Exe.ps1` siga funcionando sin cambios de ruta.

## Alcance

**Versionado:**
- `opencode-setup/` como **submódulo** del repo raíz (`git submodule add` → su repo
  propio `github.com/clubsincronica/opencode-setup`, gitlink en `c07d685`). Se descubrió
  en la ejecución que era un repo git embebido (regla vieja del `.gitignore` lo tenía en
  el bloque *Project repos*), así que versionarlo inline habría creado un gitlink
  apuntando a un commit no publicado. Decisión de usuario: submódulo (conserva el repo
  hermano que comparte Lahun22 y evita duplicar).
- `.opencode/` parcial: `plugins/graphify.js`, `opencode.json`, `opencode.jsonc`,
  `.gitignore` propio.
- Sin cambios: `opencode-installer/templates/*`, `opencode-installer/*.ps1`, `dist/`
  ya sigue ignorado.

**Fuera del repo (gate de seguridad obligatorio antes del commit):**
- `.opencode/node_modules/`, `.opencode/graphify-out/`
- `opencode-setup/skills/**/node_modules/`
- `opencode-setup/**/memory*.json`, `opencode-setup/**/server-env.txt`
- `opencode-installer/dist/`, `opencode-installer/OpenCode-Setup.zip`
- `*.env`, `credentials/` (buffer/cloudinary/oauth/gmail — ya regla existente)
- Cualquier clave real. Solo se admite placeholder `{env:NOMBRE_VAR}`.

## Cambios en `.gitignore`

Reemplazar las reglas completas por granulares:

```
# antes: opencode-setup/   y   .opencode/
.opencode/node_modules/
.opencode/graphify-out/
opencode-setup/skills/**/node_modules/
opencode-setup/**/memory*.json
opencode-setup/**/server-env.txt
opencode-installer/OpenCode-Setup.zip
```

Se eliminan las líneas `opencode-setup/` y `.opencode/` tal cual. El resto del
`.gitignore` (proyectos hermanos, `dist/`, `*.env`, `credentials/`, etc.) queda igual.

## Verificación (gate de seguridad)

Antes de `git add`:

1. `git status` → revisar que ningún `*.env`, `memory*.json`, `node_modules`, ni
   `dist/` figure como staged.
2. Grep sobre los archivos a commitear: `sk-`, `nvapi-`, `Bearer `, `password`,
   `api_secret`, `client_secret` con valor real (no placeholder).
3. Si aparece un secreto real → agregar patrón a `.gitignore`, remover del índice,
   re-verificar.

## Post-commit

- `SECRETS-MAP.md`: confirmar que la tabla sigue reflejando la realidad (los 5 skills
  y harness ahora son públicos en el repo raíz; las claves siguen en env de usuario y
  `credentials/`).
- `PIPELINE-STATE.md`: registrar el hito + nota de que `Build-Exe.ps1` consume estas
  rutas versionadas.
- Re-build: `powershell -ExecutionPolicy Bypass -File opencode-installer\Build-Exe.ps1`
  + suite Pester (`opencode-installer/tests/`) para confirmar que el payload se sigue
  empaquetando desde las rutas ahora versionadas.
- **Push del submódulo antes que el del raíz:** `opencode-setup` estaba 1 ahead
  (`c07d685`, skills). Sin push de ese commit, el gitlink del raíz no resuelve en un
  clone fresco (`fatal: 'opencode-setup' does not contain a commit`).

## No objetivo

- No se mueve `opencode-setup/` a otro path (sigue en raíz, igual que lo espera
  `Build-Exe.ps1`).
- No se versiona `.opencode/node_modules/` (regenerable con npm install).
- No se cambia el comportamiento del wizard ni de `Install-OpenCode.Core.ps1`.
