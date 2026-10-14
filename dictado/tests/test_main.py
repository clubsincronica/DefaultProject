from main import planificar


def test_planificar_descarta_corta():
    assert planificar(0.1, "hola", 0.3) == "descartar"


def test_planificar_descarta_texto_vacio():
    assert planificar(5.0, "   ", 0.3) == "descartar"


def test_planificar_pega_cuando_corresponde():
    assert planificar(2.0, "hola osi", 0.3) == "pegar"
