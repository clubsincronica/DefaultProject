# Dictado — fix de micrófono + auto-arranque atado a OpenCode

Fecha: 2026-10-18 · Estado: implementado y verificado (41/41 tests + e2e)

## Contexto / problema

1. **Bug de captura de silencio.** El usuario conecta una interfaz **Focusrite**
   para grabar en Ableton (con su mic apagado). Windows cambia el **dispositivo
   de entrada por defecto** a la Focusrite → dictado capturaba silencio →
   Whisper devolvía `''` → "descartado" → beep de error. El mic real del usuario
   es el **Realtek "Microphone Array"** (medido: rms 0.030 / peak 0.52 vs
   0.00002/0.00006 en el default).
2. **Pedido nuevo.** Que `/dictado` arranque al abrir la app de OpenCode y se
   cierre con ella.

## Decisiones (brainstorming)

- **Alcance:** global (toda la máquina), plugin en `~/.config/opencode/plugin/`.
- **Ciclo de vida:** se cierra con OpenCode.
- **Enfoque A (elegido):** watchdog de PID dentro de dictado (robusto ante
  crashes/cierres forzados; no depende de un evento de shutdown de OpenCode).
- **Instancia única:** si ya hay un dictado corriendo, no se lanza otro.

## Componentes

- **`dictado/recorder.py`** — `resolver_dispositivo(nombre, dispositivos)` busca
  por nombre (case-insensitive) el primer dispositivo de entrada. `Recorder`
  acepta `dispositivo` (int | str | None); si es str, lo resuelve **en cada
  `start()`** (así enchufar/desenchufar la Focusrite no desconfigura nada).
- **`dictado/config.json`** — nueva clave `"dispositivo_entrada": "Microphone Array"`.
- **`dictado/vida.py`** — `proceso_vivo(pid)` (ctypes `OpenProcess` +
  `GetExitCodeProcess`), lockfile (`leer_lock`/`escribir_lock`/`borrar_lock`/
  `instancia_activa`) y `esperar_muerte(pid, ...)`.
- **`dictado/main.py`** — `parsear_pid_vigilancia(argv)`; guard de instancia
  única (`.dictado.lock`); hilo daemon `_vigilar_y_salir` que cierra dictado
  (borra el lock + `os._exit(0)`) cuando muere el proceso vigilado;
  `finally` limpia el lock en la salida normal.
- **`~/.config/opencode/plugin/dictado-autostart.js`** — plugin global: al
  cargar, si ya hay instancia (lockfile + `process.kill(pid, 0)`) no hace nada;
  si no, `spawn(pythonw, ["main.py","--vigilar-pid", String(process.pid)])`
  detached. Todo en try/catch: jamás rompe el arranque de OpenCode.

## Datos / estados

- `.dictado.lock` = `{"pid": N, "inicio": "<iso>"}` en `dictado/`.

## Errores

- Plugin: try/catch total; si falta `pythonw`/`main.py`, no hace nada.
- `proceso_vivo`: si la consulta falla → asume **vivo** (nunca mata por error).

## Verificación

- pytest: **41/41** (nuevos: `test_vida.py`, `parsear_pid_vigilancia`).
- e2e real: dummy padre + `python main.py --vigilar-pid <dummy>` →
  `alive_before=True`, al matar el dummy `alive_after=False` y lock eliminado.
- `node --check` del plugin OK.

## Pendiente (verificación humana)

- Reiniciar la app de OpenCode y confirmar que (a) el plugin dispara dictado al
  abrir, y (b) al cerrar la app su proceso muere → dictado se cierra solo.

---

# Port a OpenCode V2 (2026-10-29)

La app instalada es **OpenCode Desktop 2.2.1** (`opencode-cli` 2.2.1-x64). El
CLI `opencode` del PATH (npm, 1.18.18) es V1 y no interviene.

## Diagnóstico

V2 descubre el plugin V1 (`~/.config/opencode/plugin/` se sigue escaneando),
pero **no ejecuta implementaciones V1**:

```text
failed to load plugin target="...\plugin\dictado-autostart.js"
cause=PluginModule.LoadError: Plugin must export a default definition with an
id and an effect or setup function. (Missing key at ["default"])
```

Es decir: el dictado no arrancaba en V2 (verificado: sin proceso `pythonw`).

## Decisión: parte GUI, no parte server

En V2 los plugins de servidor corren en el **servicio de fondo**
(`opencode-cli serve --service`, PID compartido que sobrevive al cierre de la
app). Un `setup()` de servidor con `--vigilar-pid process.pid` ataría dictado
al servicio, no a la app: al cerrar OpenCode el dictado seguiría vivo.

La parte **GUI** (`./gui-experimental`) corre su `main()` una vez en el
**proceso principal de Electron**, que sí muere con la app. Ahí
`process.pid` es el PID correcto.

## Implementación

```text
~/.config/opencode/plugins/dictado/
├── index.js              server part: Plugin.define({ id: "dictado", setup() {} })
└── gui-experimental.cjs  GUI part: main() lanza pythonw main.py --vigilar-pid <pid Electron>
```

- `gui-experimental.cjs` es CJS plano: `require("@opencode/plugin/gui")` +
  `node:child_process`/`node:fs`/`node:path`. **No necesita build de Vite**
  (no usa Solid/JSX); el loader de la app resuelve el módulo compartido.
- El guard de `.dictado.lock` sigue evitando instancias duplicadas (el `main`
  se re-ejecuta en cada reload del plugin).
- El plugin V1 quedó como `~/.config/opencode/plugin/dictado-autostart.js.v1.bak`
  (extensión no `.js`: V2 lo ignora; sirve de referencia).

## Verificación (2026-10-29)

- Plugin cargado sin errores: `loading plugin id="...\plugins\dictado"`.
- `pythonw.exe main.py --vigilar-pid 6244` corriendo, padre = `OpenCode.exe`
  principal (PID 6244). `.dictado.lock` = `{"pid": 10004, ...}`.
- Prueba previa aislada: un `gui-experimental.cjs` de prueba ejecutó su
  `main()` en PID 6244 y escribió con `node:fs` (Node disponible en main).

## DO-NOT-REPEAT (V2)

1. No portar este plugin como server part: `process.pid` sería el del servicio
   de fondo y dictado no se cerraría con la app.
2. El `gui-experimental.cjs` no debe importar Solid/JSX ni usar `import` ESM:
   el loader espera CJS. Si algún día se agrega UI, recién ahí usar el preset
   Vite de `@opencode/plugin/gui/vite`.
3. No volver a poner el plugin en `~/.config/opencode/plugin/` con la forma V1
   (`export const X = async () => ({})`): V2 lo rechaza.
