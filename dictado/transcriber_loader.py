import wave
from pathlib import Path

import numpy as np


def cargar_wav(ruta: Path) -> np.ndarray:
    with wave.open(str(ruta), "rb") as w:
        assert w.getsampwidth() == 2, "fixture debe ser 16-bit PCM"
        bruto = w.readframes(w.getnframes())
        pcm = np.frombuffer(bruto, dtype=np.int16).astype(np.float32) / 32768.0
        if w.getnchannels() > 1:
            pcm = pcm.reshape(-1, w.getnchannels()).mean(axis=1)
        tasa = w.getframerate()
    if tasa != 16000:
        raise ValueError(f"El fixture debe ser 16 kHz, es {tasa}")
    return pcm
