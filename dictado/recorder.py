import numpy as np


def es_util(duracion_s: float, minimo_s: float) -> bool:
    return duracion_s >= minimo_s


def concatenar(chunks: list[np.ndarray]) -> np.ndarray:
    if not chunks:
        return np.zeros(0, dtype=np.float32)
    return np.concatenate(chunks, axis=0).flatten().astype(np.float32)


class Recorder:
    """Captura PCM 16 kHz mono en memoria. Sin archivos en disco."""

    def __init__(self, rate: int = 16000):
        self.rate = rate
        self.chunks: list[np.ndarray] = []
        self._stream = None

    def start(self) -> None:
        import sounddevice as sd

        self.chunks = []
        self._stream = sd.InputStream(
            samplerate=self.rate,
            channels=1,
            dtype="float32",
            callback=self._callback,
        )
        self._stream.start()

    def _callback(self, indata, frames, time_info, status) -> None:
        self.agregar_chunk(indata)

    def agregar_chunk(self, chunk: np.ndarray) -> None:
        self.chunks.append(np.asarray(chunk, dtype=np.float32).copy())

    def finalizar_buffer(self) -> np.ndarray:
        return concatenar(self.chunks)

    def stop(self) -> np.ndarray:
        if self._stream is not None:
            self._stream.stop()
            self._stream.close()
            self._stream = None
        return self.finalizar_buffer()
