import json
import sys
import time
import winsound
from pathlib import Path

import numpy as np

from pegar import pegar
from recorder import Recorder, es_util
from transcribir import Transcriptor

CONFIG = json.loads((Path(__file__).parent / "config.json").read_text(encoding="utf-8"))


def planificar(duracion_s: float, texto: str, duracion_minima_s: float) -> str:
    if not es_util(duracion_s, duracion_minima_s):
        return "descartar"
    if not texto.strip():
        return "descartar"
    return "pegar"


def beep(frec: int) -> None:
    try:
        winsound.Beep(frec, CONFIG["beep_ms"])
    except RuntimeError:
        pass


def modo_prueba(segundos: int) -> None:
    transcriptor = Transcriptor(modelo_id=CONFIG["modelo"], idioma=CONFIG["idioma"])
    rec = Recorder(rate=CONFIG["rate"])
    print(f"[dictado] Grabando {segundos}s... habla ahora.")
    rec.start()
    time.sleep(segundos)
    pcm = rec.stop()
    t0 = time.perf_counter()
    texto = transcriptor.transcribe(pcm, sample_rate=CONFIG["rate"])
    dt = time.perf_counter() - t0
    print(f"[dictado] Transcrito en {dt:.2f}s: {texto!r}")


def main() -> None:
    if len(sys.argv) >= 2 and sys.argv[1] == "--prueba":
        seg = int(sys.argv[2]) if len(sys.argv) > 2 else 5
        modo_prueba(seg)
        return

    from pynput import keyboard

    transcriptor = Transcriptor(modelo_id=CONFIG["modelo"], idioma=CONFIG["idioma"])
    rec = Recorder(rate=CONFIG["rate"])
    estado = {"grabando": False, "ctrl": False, "shift": False}
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
            pcm = rec.stop()
            duracion = pcm.size / rate
            beep(CONFIG["beep_fin"])
            try:
                texto = transcriptor.transcribe(pcm, sample_rate=rate)
            except Exception as exc:  # el bucle nunca debe morir
                print(f"[dictado] Error transcribiendo: {exc}")
                beep(CONFIG["beep_error"])
                return
            if planificar(duracion, texto, minimo) == "pegar":
                pegar(texto, modo=CONFIG["atajo_pegado"])
                print(f"[dictado] Pegado ({duracion:.1f}s de audio): {texto}")
            else:
                print(f"[dictado] Descartado (dur={duracion:.1f}s, texto={texto!r})")
                beep(CONFIG["beep_error"])
        except Exception as exc:
            print(f"[dictado] Error en fin(): {exc}")
            beep(CONFIG["beep_error"])

    def on_press(key) -> None:
        if key in (keyboard.Key.ctrl_l, keyboard.Key.ctrl_r):
            estado["ctrl"] = True
        elif key in (keyboard.Key.shift_l, keyboard.Key.shift_r):
            estado["shift"] = True
        elif key == keyboard.Key.space:
            if estado["ctrl"] and estado["shift"] and not estado["grabando"]:
                inicio()

    def on_release(key) -> None:
        if key in (keyboard.Key.ctrl_l, keyboard.Key.ctrl_r):
            estado["ctrl"] = False
        elif key in (keyboard.Key.shift_l, keyboard.Key.shift_r):
            estado["shift"] = False
        elif key == keyboard.Key.space and estado["grabando"]:
            fin()

    print("[dictado] Listo. Ctrl+Shift+Space (mantén) para dictar.")
    with keyboard.Listener(on_press=on_press, on_release=on_release) as listener:
        listener.join()


if __name__ == "__main__":
    main()
