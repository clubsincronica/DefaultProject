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
