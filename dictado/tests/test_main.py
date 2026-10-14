import pytest
from pynput.keyboard import Key
from pynput.mouse import Button

from main import parsear_hotkey, parsear_hotkey_mouse, planificar


def test_planificar_descarta_corta():
    assert planificar(0.1, "hola", 0.3) == "descartar"


def test_planificar_descarta_texto_vacio():
    assert planificar(5.0, "   ", 0.3) == "descartar"


def test_planificar_pega_cuando_corresponde():
    assert planificar(2.0, "hola osi", 0.3) == "pegar"


def test_parsear_hotkey_shift_space():
    assert parsear_hotkey("shift+space") == {Key.shift, Key.space}


def test_parsear_hotkey_ctrl_shift_space_tres_teclas():
    assert parsear_hotkey("ctrl+shift+space") == {Key.ctrl, Key.shift, Key.space}


def test_parsear_hotkey_token_invalido_lanza_value_error():
    with pytest.raises(ValueError):
        parsear_hotkey("ctrl+banana")


def test_parsear_hotkey_mouse_middle():
    assert parsear_hotkey_mouse("mouse.middle") == Button.middle


def test_parsear_hotkey_mouse_x1():
    assert parsear_hotkey_mouse("mouse.x1") == Button.x1


def test_parsear_hotkey_mouse_invalido_lanza_value_error():
    with pytest.raises(ValueError):
        parsear_hotkey_mouse("mouse.foobar")
