import time

import pyperclip
from pynput.keyboard import Key, Controller


def _teclado() -> Controller:
    return Controller()


def pegar(texto: str, modo: str = "ctrl+v", enviar: bool = True) -> None:
    kb = _teclado()
    if modo == "typing":
        kb.type(texto)
    else:
        pyperclip.copy(texto)
        time.sleep(0.05)
        teclas = { "ctrl+v": [Key.ctrl], "ctrl+shift+v": [Key.ctrl, Key.shift] }[modo]
        for k in teclas:
            kb.press(k)
        kb.press("v")
        kb.release("v")
        for k in reversed(teclas):
            kb.release(k)
    if enviar:
        kb.press(Key.enter)
        kb.release(Key.enter)
