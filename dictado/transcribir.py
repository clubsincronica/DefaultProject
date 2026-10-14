import numpy as np


class Transcriptor:
    def __init__(self, modelo=None, modelo_id: str = "small",
                 idioma: str = "es", compute_type: str = "int8"):
        self.idioma = idioma
        if modelo is not None:
            self._modelo = modelo
        else:
            from faster_whisper import WhisperModel

            print(f"[dictado] Cargando modelo {modelo_id} (int8, CPU)...")
            self._modelo = WhisperModel(modelo_id, device="cpu",
                                        compute_type=compute_type)
            print("[dictado] Modelo listo.")

    def transcribe(self, pcm: np.ndarray, sample_rate: int = 16000) -> str:
        if pcm.size == 0:
            return ""
        segmentos, _info = self._modelo.transcribe(
            pcm, language=self.idioma, vad_filter=True
        )
        texto = " ".join(seg.text.strip() for seg in segmentos)
        return texto.strip()
