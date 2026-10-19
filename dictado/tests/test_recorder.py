import numpy as np

from recorder import Recorder, concatenar, es_util, resolver_dispositivo

DISPOSITIVOS = [
    {"name": "Asignador de sonido Microsoft - Input", "max_input_channels": 2},
    {"name": "Analogue 1 + 2 (Focusrite Usb A)", "max_input_channels": 2},
    {"name": "Microphone Array (2- Realtek(R) Audio)", "max_input_channels": 2},
    {"name": "Speaker / Headphone (2- Realtek(R) Audio)", "max_input_channels": 0},
]


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


def test_resolver_dispositivo_por_nombre():
    assert resolver_dispositivo("Microphone Array", DISPOSITIVOS) == 2


def test_resolver_dispositivo_case_insensitive():
    assert resolver_dispositivo("realtek", DISPOSITIVOS) == 2


def test_resolver_dispositivo_ignora_dispositivos_sin_entrada():
    assert resolver_dispositivo("Speaker", DISPOSITIVOS) is None


def test_resolver_dispositivo_sin_nombre_devuelve_none():
    assert resolver_dispositivo("", DISPOSITIVOS) is None
    assert resolver_dispositivo(None, DISPOSITIVOS) is None


def test_resolver_dispositivo_no_encontrado_devuelve_none():
    assert resolver_dispositivo("inexistente", DISPOSITIVOS) is None
