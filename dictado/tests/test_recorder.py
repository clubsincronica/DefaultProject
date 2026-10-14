import numpy as np

from recorder import Recorder, concatenar, es_util


def test_es_util_descarta_corta():
    assert not es_util(0.1, 0.3)
    assert not es_util(0.29, 0.3)
    assert es_util(0.3, 0.3)
    assert es_util(2.5, 0.3)


def test_concatenar_unifica_chunks_float32():
    a = np.zeros(100, dtype=np.float32)
    b = np.ones(50, dtype=np.float32)
    out = concatenar([a, b])
    assert out.dtype == np.float32
    assert out.shape == (150,)
    assert float(out[-1]) == 1.0


def test_concatenar_lista_vacia_da_array_vacio():
    out = concatenar([])
    assert isinstance(out, np.ndarray)
    assert out.size == 0


def test_recorder_acumula_chunks_sin_archivo(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    rec = Recorder(rate=16000)
    rec.agregar_chunk(np.zeros(800, dtype=np.float32))
    rec.agregar_chunk(np.ones(800, dtype=np.float32))
    pcm = rec.finalizar_buffer()
    assert pcm.shape == (1600,)
    assert float(pcm[-1]) == 1.0
    assert list(tmp_path.iterdir()) == []
