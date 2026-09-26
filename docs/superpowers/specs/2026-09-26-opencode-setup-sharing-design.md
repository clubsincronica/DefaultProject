# Spec — Repos de compartir: `opencode-setup` + `cancionero-rojo`

Fecha: 2026-09-26
Estado: **aprobado e implementado (2026-09-26)** — solo queda invitar al colaborador.

## 1. Contexto

Se quiere compartir con un amigo la arquitectura del set-up: tuning de opencode,
estrategia de uso de tokens, flujo de API keys y el puente con Ableton Live
trabajado en `cancionero-rojo`.

Estado actual verificado:

| Repo | Estado |
|---|---|
| `clubsincronica/club-sincronica` | GitHub privado (push 2026-08-16) |
| `clubsincronica/pipeline-viral` | GitHub privado (push 2026-09-21) |
| `Default Project` (raíz) | git local, **sin remoto** |
| `remotion-poc` | git local, sin remoto |
| `cancionero-rojo` | **sin repo propio**: 77 archivos trackeados dentro del repo raíz, 9 sin trackear |

Secretos detectados que deben quedar fuera de cualquier push:

- `~/.config/opencode/opencode.json` → `apiKey` NVIDIA (`nvapi-…`) y de omniroute en claro.
- `~/.config/opencode/server-env.txt` → `OPENCODE_SERVER_PASSWORD`.
- `~/.local/share/opencode/auth.json` → tokens de 7 proveedores.
- `SECRETS-MAP.md` solo inventaría credenciales de proyectos; **no cubre la config de opencode** (brecha conocida, fuera de alcance de este spec salvo mención en el README).

Ninguno de estos secretos está versionado ni se ha filtrado hoy.

## 2. Objetivos

1. Repo privado `clubsincronica/opencode-setup`: configs de opencode saneadas + un README que explique tuning, uso de tokens y flujo de API keys.
2. Repo privado `clubsincronica/cancionero-rojo`: el trabajo de Ableton con su propio historial, enlazado desde el README anterior.
3. Invitar al amigo como colaborador de ambos repos.

## 3. Fuera de alcance

- Subir el repo raíz (`Default Project`) o `remotion-poc` a GitHub.
- Incluir `AGENTS.md`, skills, plugins, `PIPELINE-STATE.md` ni `SECRETS-MAP.md` en `opencode-setup` (decisión explícita del usuario: configs + un solo README).
- Rotación de la key NVIDIA (sigue viva en la config local; no se ha filtrado).

## 4. Diseño

### 4.1 Repo `opencode-setup`

Carpeta nueva fuera de los proyectos existentes, `git init`, luego `gh repo create clubsincronica/opencode-setup --private`.

```
opencode-setup/
├── README.md                      # tuning, estrategia de tokens, flujo de API keys, enlace a cancionero-rojo
├── .gitignore                     # *.env, auth.json, server-env.txt, node_modules, *.key
└── config/
    ├── global.opencode.json       # copia saneada de ~/.config/opencode/opencode.json
    ├── rate-limit-fallback.json   # copia tal cual (sin secretos)
    ├── project.opencode.json      # copia saneada de ./opencode.json
    └── project.opencode.jsonc     # copia de .opencode/opencode.json
```

Reglas de saneamiento:

| Origen | Transformación |
|---|---|
| `apiKey` de omniroute / NVIDIA | reemplazar por `{env:OMNIROUTE_API_KEY}` / `{env:NVIDIA_API_KEY}` (ver §5) |
| Rutas `C:\Users\tom_w\…` | placeholder `<PROJECT_DIR>` o ruta relativa |
| `server-env.txt`, `auth.json` | no se copian jamás |

Contenido del README (secciones fijas):

1. Qué es este repo y qué contiene.
2. Estructura de la config de opencode (global vs proyecto vs `.opencode/`).
3. Estrategia de tokens: modelo principal gratuito, cadena de fallback de `rate-limit-fallback.json`, por qué existe el plugin de rate-limit.
4. Flujo de API keys: openrouter (free) → omniroute `localhost:20128` → headroom proxy `127.0.0.1:8787` → NVIDIA NIM; con `.env.example` implícito en forma de tabla (nombre de variable, proveedor, dónde se coloca, nunca el valor).
5. Qué nunca se comparte (`auth.json`, `server-env.txt`, `credentials/` de los proyectos) y por qué.
6. Enlace al repo `cancionero-rojo` + descripción corta del puente Ableton.

### 4.2 Repo `cancionero-rojo`

- `git init` dentro de `cancionero-rojo/`, rama `main`.
- `.gitignore` propio con las reglas ya usadas por el padre: `**/*.wav`, `**/*.mp3`, `**/*.asd`, `.tmp/`, `__pycache__/`, `*.pyc`, `.env*`, `credentials/`.
- Excluir los probes de debug sin trackear en el padre: `dbg.mjs`, `dump3.mjs`, `dump4.mjs`, `gen-probes2.mjs`, `songs/_fixture/`. El resto de archivos sin trackear se incluyen salvo que contengan audio (cubierto por `.gitignore`).
- Primer commit con todo el contenido elegible.

Separación del repo raíz (el padre ya tiene 77 archivos de `cancionero-rojo` indexados):

1. `git rm --cached -r cancionero-rojo` (no toca el disco).
2. Añadir `cancionero-rojo/` a `.gitignore` del repo raíz.
3. Commit en el repo raíz. El historial previo queda intacto; solo se des-indexa.

### 4.3 Colaborador

`gh api repos/clubsincronica/<repo>/collaborators/<usuario> -X PUT` para ambos repos.
**Pendiente:** usuario de GitHub del amigo (bloqueante para este paso, no para el resto).

## 5. Riesgos y verificaciones

| Riesgo | Mitigación |
|---|---|
| Que `{env:…}` no interpolate en `apiKey` | Verificar contra `https://opencode.ai/config.json` / docs en la fase de implementación. Fallback: dejar `apiKey` fuera del config compartido y documentar en el README el override local vía `OPENCODE_CONFIG` (gitignored). |
| Secreto colado en el push | Escaneo previo obligatorio en ambos repos: `nvapi-`, `sk-`, `OPENCODE_SERVER_PASSWORD`, `apiKey` con valor literal, `C:\Users\tom_w`. Ningún push antes de que el escaneo devuelva 0 coincidencias. |
| Repo no privado por error | `gh repo view --json visibility` → `PRIVATE` en ambos, antes de invitar. |
| Repositorios anidados (repo dentro de repo) | El `git rm --cached` + `.gitignore` del padre eliminan el conflicto; verificar con `git status` del padre tras el commit. |
| Audio binario colándose en `cancionero-rojo` | `.gitignore` propio + comprobación de `git ls-files | Select-String '\.(wav|mp3|asd)$'` = 0 antes del push. |

## 6. Criterios de aceptación

- [x] `clubsincronica/opencode-setup` existe, es privado y contiene las 4 configs saneadas + README con las 6 secciones.
- [x] Escaneo de secretos = 0 coincidencias en ambos repos.
- [x] `clubsincronica/cancionero-rojo` existe, es privado, sin audio ni probes de debug.
- [x] El repo raíz ya no trackea `cancionero-rojo/` y su `git status` está limpio en ese tema.
- [x] Ambos repos enlazados desde el README.
- [ ] Colaborador invitado — **pendiente: usuario de GitHub del amigo**.
