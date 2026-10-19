import json
import os
import sys
import threading
import time
import winsound
from pathlib import Path

import numpy as np
from pynput.keyboard import Key, KeyCode
from pynput.mouse import Button

import vida
from pegar import pegar
from recorder import Recorder, es_util, resolver_dispositivo
from transcribir import Transcriptor

CONFIG = json.loads((Path(__file__).parent / "config.json").read_text(encoding="utf-8"))
LOCK = Path(__file__).parent / ".dictado.lock"


def parsear_pid_vigilancia(argv: list[str]) -> int | None:
    """Extrae el PID de `--vigilar-pid <pid>`; None si no se pasó."""
    if "--vigilar-pid" not in argv:
        return None
    i = argv.index("--vigilar-pid")
    if i + 1 >= len(argv):
        raise ValueError("--vigilar-pid requiere un PID")
    return int(argv[i + 1])

_ALIAS_TECLAS = {
    "ctrl": Key.ctrl,
    "shift": Key.shift,
    "alt": Key.alt,
    "space": Key.space,
    "enter": Key.enter,
}


def parsear_hotkey(texto: str) -> set:
    teclas = set()
    for token in texto.lower().split("+"):
        token = token.strip()
        if token in _ALIAS_TECLAS:
            teclas.add(_ALIAS_TECLAS[token])
        elif len(token) == 1 and "a" <= token <= "z":
            teclas.add(KeyCode.from_char(token))
        elif token.startswith("f") and token[1:].isdigit() and 1 <= int(token[1:]) <= 12:
            teclas.add(getattr(Key, token))
        else:
            raise ValueError(f"tecla desconocida en hotkey: {token!r}")
    return teclas


_BOTONES_MOUSE = {
    "middle": Button.middle,
    "left": Button.left,
    "right": Button.right,
    "x1": Button.x1,
    "x2": Button.x2,
}


def parsear_hotkey_mouse(texto: str) -> Button:
    nombre = texto.removeprefix("mouse.").strip().lower()
    if nombre not in _BOTONES_MOUSE:
        raise ValueError(f"botón de mouse desconocido en hotkey: {nombre!r}")
    return _BOTONES_MOUSE[nombre]


def planificar(duracion_s: float, texto: str, duracion_minima_s: float) -> str:
    if not es_util(duracion_s, duracion_minima_s):
        return "descartar"
    if not texto.strip():
        return "descartar"
    return "pegar"


def beep(frec: int, ms: int | None = None) -> None:
    try:
        winsound.Beep(frec, CONFIG["beep_ms"] if ms is None else ms)
    except RuntimeError:
        pass


def avisar_dispositivo_entrada(cfg: dict) -> None:
    nombre = cfg.get("dispositivo_entrada")
    if not nombre:
        print("[dictado] Entrada: dispositivo por defecto del sistema.")
        return
    import sounddevice as sd

    idx = resolver_dispositivo(nombre, sd.query_devices())
    if idx is None:
        print(f"[dictado] Aviso: no se encontró {nombre!r}, uso el dispositivo por defecto.")
    else:
        print(f"[dictado] Entrada: {nombre!r} (dispositivo {idx}).")


def modo_prueba(segundos: int) -> None:
    transcriptor = Transcriptor(modelo_id=CONFIG["modelo"], idioma=CONFIG["idioma"])
    rec = Recorder(rate=CONFIG["rate"], dispositivo=CONFIG.get("dispositivo_entrada"))
    print(f"[dictado] Grabando {segundos}s... habla ahora.")
    rec.start()
    time.sleep(segundos)
    pcm = rec.stop()
    t0 = time.perf_counter()
    texto = transcriptor.transcribe(pcm, sample_rate=CONFIG["rate"])
    dt = time.perf_counter() - t0
    print(f"[dictado] Transcrito en {dt:.2f}s: {texto!r}")


def _vigilar_y_salir(pid: int, lock: Path) -> None:
    """Hilo daemon: cierra dictado (y limpia el lock) cuando muere `pid`."""
    vida.esperar_muerte(pid)
    vida.borrar_lock(lock)
    print(f"[dictado] El proceso vigilado (PID {pid}) terminó. Cerrando.")
    os._exit(0)


def main() -> None:
    if len(sys.argv) >= 2 and sys.argv[1] == "--prueba":
        seg = int(sys.argv[2]) if len(sys.argv) > 2 else 5
        modo_prueba(seg)
        return

    if vida.instancia_activa(LOCK):
        print("[dictado] Ya hay una instancia corriendo. Saliendo.")
        return
    vida.escribir_lock(LOCK)
    try:
        pid_vigilado = parsear_pid_vigilancia(sys.argv)
        if pid_vigilado is not None:
            threading.Thread(
                target=_vigilar_y_salir, args=(pid_vigilado, LOCK), daemon=True
            ).start()
        _correr()
    finally:
        vida.borrar_lock(LOCK)


def _correr() -> None:
    avisar_dispositivo_entrada(CONFIG)
    transcriptor = Transcriptor(modelo_id=CONFIG["modelo"], idioma=CONFIG["idioma"])
    rec = Recorder(rate=CONFIG["rate"], dispositivo=CONFIG.get("dispositivo_entrada"))
    estado = {"grabando": False}
    rate = CONFIG["rate"]
    minimo = CONFIG["duracion_minima_s"]

    def inicio() -> None:
        try:
            rec.start()
        except Exception as exc:  # micrófono ausente o sin permiso
            print(f"[dictado] No se pudo abrir el micrófono: {exc}")
            beep(CONFIG["beep_error"])
            beep(CONFIG["beep_error"])
            return
        estado["grabando"] = True
        beep(CONFIG["beep_inicio"])

    def fin() -> None:
        estado["grabando"] = False
        try:
            beep(CONFIG["beep_transicion"], CONFIG["beep_ms_suave"])
            pcm = rec.stop()
            duracion = pcm.size / rate
            try:
                texto = transcriptor.transcribe(pcm, sample_rate=rate)
            except Exception as exc:  # el bucle nunca debe morir
                print(f"[dictado] Error transcribiendo: {exc}")
                beep(CONFIG["beep_error"])
                return
            if planificar(duracion, texto, minimo) == "pegar":
                pegar(texto, modo=CONFIG["atajo_pegado"])
                for nota in CONFIG["beep_fin"]:
                    beep(nota, CONFIG["beep_ms_suave"])
                print(f"[dictado] Pegado ({duracion:.1f}s de audio): {texto}")
            else:
                print(f"[dictado] Descartado (dur={duracion:.1f}s, texto={texto!r})")
                beep(CONFIG["beep_error"])
        except Exception as exc:
            print(f"[dictado] Error en fin(): {exc}")
            beep(CONFIG["beep_error"])

    if CONFIG["hotkey"].startswith("mouse."):
        from pynput import mouse

        boton = parsear_hotkey_mouse(CONFIG["hotkey"])

        def on_click(x, y, button, pressed) -> None:
            if button != boton:
                return
            if pressed:
                if not estado["grabando"]:
                    inicio()
            elif estado["grabando"]:
                fin()

        print(f"[dictado] Listo. {CONFIG['hotkey']} (mantén) para dictar.")
        with mouse.Listener(on_click=on_click) as listener:
            listener.join()
        return

    from pynput import keyboard

    hotkey = parsear_hotkey(CONFIG["hotkey"])
    keys_pulsadas: set = set()

    # pynput entrega las variantes L/R (ctrl_l, shift_r...); el parser devuelve
    # la forma canónica (ctrl, shift, alt) — normalizar antes de comparar.
    _CANON = {
        Key.ctrl_l: Key.ctrl,
        Key.ctrl_r: Key.ctrl,
        Key.shift_l: Key.shift,
        Key.shift_r: Key.shift,
        Key.alt_l: Key.alt,
        Key.alt_r: Key.alt,
        Key.alt_gr: Key.alt,
    }

    def _canon(key):
        return _CANON.get(key, key)

    def on_press(key) -> None:
        key = _canon(key)
        if key not in hotkey:
            return
        keys_pulsadas.add(key)
        if hotkey <= keys_pulsadas and not estado["grabando"]:
            inicio()

    def on_release(key) -> None:
        key = _canon(key)
        keys_pulsadas.discard(key)
        if not (hotkey & keys_pulsadas) and estado["grabando"]:
            fin()

    print(f"[dictado] Listo. {CONFIG['hotkey']} (mantén) para dictar.")
    with keyboard.Listener(on_press=on_press, on_release=on_release) as listener:
        listener.join()


if __name__ == "__main__":
    main()
