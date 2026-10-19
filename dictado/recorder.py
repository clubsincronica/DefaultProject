import numpy as np


def es_util(duracion_s: float, minimo_s: float) -> bool:
    return duracion_s >= minimo_s


def concatenar(chunks: list[np.ndarray]) -> np.ndarray:
    if not chunks:
        return np.zeros(0, dtype=np.float32)
    return np.concatenate(chunks, axis=0).flatten().astype(np.float32)


def resolver_dispositivo(nombre: str | None, dispositivos) -> int | None:
    """Devuelve el índice del primer dispositivo de entrada cuyo nombre
    contenga `nombre` (case-insensitive), o None para usar el default."""
    if not nombre:
        return None
    objetivo = nombre.strip().lower()
    for idx, dev in enumerate(dispositivos):
        if dev.get("max_input_channels", 0) <= 0:
            continue
        if objetivo in str(dev.get("name", "")).lower():
            return idx
    return None


class Recorder:
    """Captura PCM 16 kHz mono en memoria. Sin archivos en disco."""

    def __init__(self, rate: int = 16000, dispositivo: int | str | None = None):
        self.rate = rate
        self.dispositivo = dispositivo
        self.chunks: list[np.ndarray] = []
        self._stream = None

    def start(self) -> None:
        import sounddevice as sd

        device = self.dispositivo
        if isinstance(device, str):
            device = resolver_dispositivo(device, sd.query_devices())
        self.chunks = []
        self._stream = sd.InputStream(
            samplerate=self.rate,
            channels=1,
            dtype="float32",
            device=device,
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
