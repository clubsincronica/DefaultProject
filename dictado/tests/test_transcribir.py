import types

import numpy as np
import pytest

from transcribir import Transcriptor


class ModeloFalso:
    def __init__(self, texto=" Hola Osi, prueba de dictado. "):
        self.texto = texto
        self.llamadas = []

    def transcribe(self, audio, **kwargs):
        self.llamadas.append(kwargs)
        segmentos = iter([types.SimpleNamespace(text=self.texto)])
        info = types.SimpleNamespace(language=kwargs.get("language"))
        return segmentos, info


def test_transcribe_une_segmentos_y_respeta_idioma():
    fake = ModeloFalso(" Hola Osi. ")
    t = Transcriptor(modelo=fake, idioma="es")
    texto = t.transcribe(np.zeros(16000, dtype=np.float32), sample_rate=16000)
    assert texto == "Hola Osi."
    assert fake.llamadas[0]["language"] == "es"


def test_transcribe_devuelve_vacio_si_whitespace():
    fake = ModeloFalso("   \n  ")
    t = Transcriptor(modelo=fake)
    assert t.transcribe(np.zeros(100, dtype=np.float32)) == ""


def test_transcribe_pcm_vacio_devuelve_vacio():
    fake = ModeloFalso()
    t = Transcriptor(modelo=fake)
    assert t.transcribe(np.zeros(0, dtype=np.float32)) == ""


def test_transcribe_rechaza_sample_rate_distinto_de_16000():
    fake = ModeloFalso()
    t = Transcriptor(modelo=fake)
    with pytest.raises(ValueError, match="16000"):
        t.transcribe(np.zeros(100, dtype=np.float32), sample_rate=8000)
