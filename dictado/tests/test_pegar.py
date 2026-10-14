import pegar as pegar_mod


class FakeKb:
    def __init__(self, log):
        self.log = log

    def press(self, key):
        self.log.append(("press", str(key)))

    def release(self, key):
        self.log.append(("release", str(key)))

    def type(self, texto):
        self.log.append(("type", texto))


def test_pegar_ctrl_v_copia_y_envia_atajo(monkeypatch):
    log = []
    monkeypatch.setattr(pegar_mod.pyperclip, "copy", lambda t: log.append(("copy", t)))
    monkeypatch.setattr(pegar_mod, "_teclado", lambda: FakeKb(log))
    pegar_mod.pegar("hola osi", modo="ctrl+v")
    assert ("copy", "hola osi") in log
    assert any(x[0] == "press" and x[1].endswith("ctrl") for x in log)
    assert any(x[0] == "press" and x[1] in ("'v'", "v") for x in log)


def test_pegar_typing_no_usa_portapapeles(monkeypatch):
    log = []
    monkeypatch.setattr(pegar_mod.pyperclip, "copy",
                        lambda t: (_ for _ in ()).throw(AssertionError("no copiar")))
    monkeypatch.setattr(pegar_mod, "_teclado", lambda: FakeKb(log))
    pegar_mod.pegar("texto directo", modo="typing")
    assert ("type", "texto directo") in log


def test_pegar_ctrl_shift_v_incluye_shift(monkeypatch):
    log = []
    monkeypatch.setattr(pegar_mod.pyperclip, "copy", lambda t: None)
    monkeypatch.setattr(pegar_mod, "_teclado", lambda: FakeKb(log))
    pegar_mod.pegar("x", modo="ctrl+shift+v")
    assert any(x == ("press", "Key.shift") for x in log)


def test_pegar_envia_enter_al_final_por_defecto(monkeypatch):
    log = []
    monkeypatch.setattr(pegar_mod.pyperclip, "copy", lambda t: None)
    monkeypatch.setattr(pegar_mod, "_teclado", lambda: FakeKb(log))
    pegar_mod.pegar("hola", modo="ctrl+v")
    assert log[-2:] == [("press", "Key.enter"), ("release", "Key.enter")]


def test_pegar_no_envia_enter_si_enviar_false(monkeypatch):
    log = []
    monkeypatch.setattr(pegar_mod.pyperclip, "copy", lambda t: None)
    monkeypatch.setattr(pegar_mod, "_teclado", lambda: FakeKb(log))
    pegar_mod.pegar("hola", modo="ctrl+v", enviar=False)
    assert not any(x[1] == "Key.enter" for x in log if x[0] in ("press", "release"))
