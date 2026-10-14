import time

import pyperclip
from pynput.keyboard import Key, Controller


def _teclado() -> Controller:
    return Controller()


def pegar(texto: str, modo: str = "ctrl+v") -> None:
    if modo == "typing":
        _teclado().type(texto)
        return

    pyperclip.copy(texto)
    time.sleep(0.05)
    kb = _teclado()
    teclas = { "ctrl+v": [Key.ctrl], "ctrl+shift+v": [Key.ctrl, Key.shift] }[modo]
    for k in teclas:
        kb.press(k)
    kb.press("v")
    kb.release("v")
    for k in reversed(teclas):
        kb.release(k)
