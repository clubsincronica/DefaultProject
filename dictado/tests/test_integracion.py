from pathlib import Path

import numpy as np
import pytest

from transcriber_loader import cargar_wav  # ver paso 4
from transcribir import Transcriptor

WAV = Path(__file__).parent / "fixtures" / "dictado_fixture.wav"


def test_cargar_wav_fixture_es_16k_mono():
    if not WAV.exists():
        pytest.skip("fixture no generado")
    pcm = cargar_wav(WAV)
    assert pcm.dtype == np.float32
    assert pcm.ndim == 1
    assert pcm.size > 16000


@pytest.mark.integration
def test_transcripcion_real_contiene_palabras_clave():
    if not WAV.exists():
        pytest.skip("fixture no generado")
    pcm = cargar_wav(WAV)
    t = Transcriptor(modelo_id="small", idioma="es")
    texto = t.transcribe(pcm, sample_rate=16000).lower()
    assert ("prueba" in texto) or ("dictado" in texto), texto
