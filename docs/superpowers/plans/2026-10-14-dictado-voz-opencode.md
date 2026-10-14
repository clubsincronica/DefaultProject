# Dictado de voz → chat de OpenCode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Push-to-talk en español que transcribe localmente (faster-whisper, CPU) y pega el texto en el cursor de la terminal de OpenCode.

**Architecture:** Proceso Python residente que escucha el hotkey global Ctrl+Shift+Space con `pynput`, acumula PCM 16 kHz mono en memoria con `sounddevice` (sin archivos), transcribe con un modelo `small` int8 cargado una sola vez, y pega vía portapapeles + atajo de la terminal.

**Tech Stack:** Python 3.13 (ya instalado), `sounddevice`, `pynput`, `faster-whisper`, `pyperclip`, `numpy`, `pytest`. Fixture de audio generado con SAPI de Windows (PowerShell).

**Spec:** `docs/superpowers/specs/2026-10-14-dictado-voz-opencode-design.md`

## Global Constraints

- Idioma forzado `es` en toda transcripción (sin auto-detección).
- 100% local: prohibido usar APIs cloud de cualquier tipo.
- Cero archivos de audio en disco durante la grabación (solo numpy en RAM).
- Modelo `small` de faster-whisper, `compute_type="int8"`, device CPU.
- Descartar grabaciones < 0.3 s; no pegar transcripciones vacías.
- Hotkey por defecto: Ctrl+Shift+Space (push-to-talk: press→grabar, release→transcribir+pegar).
- Todo el código y tests en `dictado/` (raíz del repo). Tests Python en `dictado/tests/`.
- Los tests se ejecutan con: `pytest dictado/tests -v` desde la raíz del repo.
- Commits tras cada tarea, mensaje en inglés estilo conventional (`feat:`, `test:`, `chore:`).

---

### Task 1: Scaffolding + Recorder (grabación en memoria)

**Files:**
- Create: `dictado/config.json`
- Create: `dictado/recorder.py`
- Create: `dictado/tests/conftest.py`
- Create: `dictado/tests/test_recorder.py`

**Interfaces:**
- Consumes: ninguna (primera tarea).
- Produces (para tareas posteriores):
  - `Recorder(rate: int = 16000)` con `.start() -> None`, `.stop() -> np.ndarray` (float32 plano), `.agregar_chunk(chunk: np.ndarray) -> None`
  - `concatenar(chunks: list[np.ndarray]) -> np.ndarray`
  - `es_util(duracion_s: float, minimo_s: float) -> bool`

- [ ] **Step 1: Instalar dependencias**

Run: `pip install sounddevice pynput faster-whisper pyperclip pytest numpy`
Expected: instalación OK (faster-whisper trae ctranslate2).

- [ ] **Step 2: Crear `dictado/config.json`**

```json
{
  "hotkey": "ctrl+shift+space",
  "modelo": "small",
  "idioma": "es",
  "rate": 16000,
  "duracion_minima_s": 0.3,
  "atajo_pegado": "ctrl+v",
  "beep_inicio": 880,
  "beep_fin": 1320,
  "beep_error": 300,
  "beep_ms": 80
}
```

- [ ] **Step 3: Crear `dictado/tests/conftest.py` (path de imports)**

```python
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
```

- [ ] **Step 4: Escribir el test fallido `dictado/tests/test_recorder.py`**

```python
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
```

- [ ] **Step 5: Ejecutar test y verificar que falla**

Run: `pytest dictado/tests/test_recorder.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'recorder'`

- [ ] **Step 6: Implementar `dictado/recorder.py`**

```python
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
```

- [ ] **Step 7: Ejecutar tests y verificar que pasan**

Run: `pytest dictado/tests/test_recorder.py -v`
Expected: 4 passed

- [ ] **Step 8: Commit**

```bash
git add dictado/ docs/superpowers/specs/2026-10-14-dictado-voz-opencode-design.md
git commit -m "feat(dictado): scaffolding + in-memory PCM recorder"
```

---

### Task 2: Transcriptor (faster-whisper con modelo inyectable)

**Files:**
- Create: `dictado/transcribir.py`
- Create: `dictado/tests/test_transcribir.py`

**Interfaces:**
- Consumes: `dictado/config.json` (claves `modelo`, `idioma`).
- Produces:
  - `Transcriptor(modelo=None, modelo_id: str = "small", idioma: str = "es", compute_type: str = "int8")`
  - `Transcriptor.transcribe(pcm: np.ndarray, sample_rate: int = 16000) -> str` — devuelve texto ya limpio (`strip()`); cadena vacía si no hay contenido.
  - Si `modelo` no es `None`, se usa ese objeto (fake en tests) en lugar de crear un `WhisperModel`.

- [ ] **Step 1: Escribir el test fallido `dictado/tests/test_transcribir.py`**

```python
import types

import numpy as np

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
```

- [ ] **Step 2: Ejecutar test y verificar que falla**

Run: `pytest dictado/tests/test_transcribir.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'transcribir'`

- [ ] **Step 3: Implementar `dictado/transcribir.py`**

```python
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
```

- [ ] **Step 4: Ejecutar tests y verificar que pasan (sin descargar modelo)**

Run: `pytest dictado/tests/test_transcribir.py -v`
Expected: 3 passed. Ninguna ejecución instancia `WhisperModel` real (la verificación con modelo real está en Task 5).

- [ ] **Step 5: Commit**

```bash
git add dictado/transcribir.py dictado/tests/test_transcribir.py
git commit -m "feat(dictado): faster-whisper wrapper with injectable model"
```

---

### Task 3: Pegado (portapapeles + atajo)

**Files:**
- Create: `dictado/pegar.py`
- Create: `dictado/tests/test_pegar.py`

**Interfaces:**
- Consumes: portapapeles del sistema y foco de la ventana.
- Produces: `pegar(texto: str, modo: str = "ctrl+v") -> None`
  - `modo` ∈ `"ctrl+v"` | `"ctrl+shift+v"` | `"typing"` — los dos primeros copian al portapapeles y envían el atajo; `typing` usa `Controller.type()` sin portapapeles.

- [ ] **Step 1: Escribir el test fallido `dictado/tests/test_pegar.py`**

```python
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
```

- [ ] **Step 2: Ejecutar test y verificar que falla**

Run: `pytest dictado/tests/test_pegar.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'pegar'`

- [ ] **Step 3: Implementar `dictado/pegar.py`**

```python
import time

import pyperclip
from pynput.keyboard import Key, Controller


def _teclado() -> Controller:
    return Controller()


def pegar(texto: str, modo: str = "ctrl+v") -> None:
    if modo == "typing":
        _teclado().type(texto)
        return

    pyperclip.copy(texto)
    time.sleep(0.05)
    kb = _teclado()
    teclas = { "ctrl+v": [Key.ctrl], "ctrl+shift+v": [Key.ctrl, Key.shift] }[modo]
    for k in teclas:
        kb.press(k)
    kb.press("v")
    kb.release("v")
    for k in reversed(teclas):
        kb.release(k)
```

- [ ] **Step 4: Ejecutar tests y verificar que pasan**

Run: `pytest dictado/tests/test_pegar.py -v`
Expected: 3 passed

- [ ] **Step 5: Commit**

```bash
git add dictado/pegar.py dictado/tests/test_pegar.py
git commit -m "feat(dictado): clipboard paste with terminal shortcut modes"
```

---

### Task 4: main.py (hotkey, orquestación, modo --prueba)

**Files:**
- Create: `dictado/main.py`
- Create: `dictado/tests/test_main.py`

**Interfaces:**
- Consumes: `Recorder`, `Transcriptor`, `pegar`, `es_util` de tareas 1–3; `config.json`.
- Produces: ejecutable `python dictado/main.py [--prueba [SEGUNDOS]]` y función pura
  `planificar(duracion_s: float, texto: str, duracion_minima_s: float) -> str` → `"descartar" | "pegar"`.

- [ ] **Step 1: Escribir el test fallido `dictado/tests/test_main.py`**

```python
from main import planificar


def test_planificar_descarta_corta():
    assert planificar(0.1, "hola", 0.3) == "descartar"


def test_planificar_descarta_texto_vacio():
    assert planificar(5.0, "   ", 0.3) == "descartar"


def test_planificar_pega_cuando_corresponde():
    assert planificar(2.0, "hola osi", 0.3) == "pegar"
```

- [ ] **Step 2: Ejecutar test y verificar que falla**

Run: `pytest dictado/tests/test_main.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'main'`

- [ ] **Step 3: Implementar `dictado/main.py`**

```python
import json
import sys
import time
import winsound
from pathlib import Path

import numpy as np

from pegar import pegar
from recorder import Recorder, es_util
from transcribir import Transcriptor

CONFIG = json.loads((Path(__file__).parent / "config.json").read_text(encoding="utf-8"))


def planificar(duracion_s: float, texto: str, duracion_minima_s: float) -> str:
    if not es_util(duracion_s, duracion_minima_s):
        return "descartar"
    if not texto.strip():
        return "descartar"
    return "pegar"


def beep(frec: int) -> None:
    try:
        winsound.Beep(frec, CONFIG["beep_ms"])
    except RuntimeError:
        pass


def modo_prueba(segundos: int) -> None:
    transcriptor = Transcriptor(modelo_id=CONFIG["modelo"], idioma=CONFIG["idioma"])
    rec = Recorder(rate=CONFIG["rate"])
    print(f"[dictado] Grabando {segundos}s... habla ahora.")
    rec.start()
    time.sleep(segundos)
    pcm = rec.stop()
    t0 = time.perf_counter()
    texto = transcriptor.transcribe(pcm, sample_rate=CONFIG["rate"])
    dt = time.perf_counter() - t0
    print(f"[dictado] Transcrito en {dt:.2f}s: {texto!r}")


def main() -> None:
    if len(sys.argv) >= 2 and sys.argv[1] == "--prueba":
        seg = int(sys.argv[2]) if len(sys.argv) > 2 else 5
        modo_prueba(seg)
        return

    from pynput import keyboard

    transcriptor = Transcriptor(modelo_id=CONFIG["modelo"], idioma=CONFIG["idioma"])
    rec = Recorder(rate=CONFIG["rate"])
    estado = {"grabando": False, "ctrl": False, "shift": False}
    rate = CONFIG["rate"]
    minimo = CONFIG["duracion_minima_s"]

    def inicio() -> None:
        try:
            rec.start()
        except Exception as exc:  # micrófono ausente o sin permiso
            print(f"[dictado] No se pudo abrir el micrófono: {exc}")
            beep(CONFIG["beep_error"])
            beep(CONFIG["beep_error"])
            return
        estado["grabando"] = True
        beep(CONFIG["beep_inicio"])

    def fin() -> None:
        estado["grabando"] = False
        try:
            pcm = rec.stop()
            duracion = pcm.size / rate
            beep(CONFIG["beep_fin"])
            try:
                texto = transcriptor.transcribe(pcm, sample_rate=rate)
            except Exception as exc:  # el bucle nunca debe morir
                print(f"[dictado] Error transcribiendo: {exc}")
                beep(CONFIG["beep_error"])
                return
            if planificar(duracion, texto, minimo) == "pegar":
                pegar(texto, modo=CONFIG["atajo_pegado"])
                print(f"[dictado] Pegado ({duracion:.1f}s de audio): {texto}")
            else:
                print(f"[dictado] Descartado (dur={duracion:.1f}s, texto={texto!r})")
                beep(CONFIG["beep_error"])
        except Exception as exc:
            print(f"[dictado] Error en fin(): {exc}")
            beep(CONFIG["beep_error"])

    def on_press(key) -> None:
        if key in (keyboard.Key.ctrl_l, keyboard.Key.ctrl_r):
            estado["ctrl"] = True
        elif key in (keyboard.Key.shift_l, keyboard.Key.shift_r):
            estado["shift"] = True
        elif key == keyboard.Key.space:
            if estado["ctrl"] and estado["shift"] and not estado["grabando"]:
                inicio()

    def on_release(key) -> None:
        if key in (keyboard.Key.ctrl_l, keyboard.Key.ctrl_r):
            estado["ctrl"] = False
        elif key in (keyboard.Key.shift_l, keyboard.Key.shift_r):
            estado["shift"] = False
        elif key == keyboard.Key.space and estado["grabando"]:
            fin()

    print("[dictado] Listo. Ctrl+Shift+Space (mantén) para dictar.")
    with keyboard.Listener(on_press=on_press, on_release=on_release) as listener:
        listener.join()


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Ejecutar tests y verificar que pasan**

Run: `pytest dictado/tests -v`
Expected: todos los tests pasan (recorder 4 + transcribir 3 + pegar 3 + main 3)

- [ ] **Step 5: Commit**

```bash
git add dictado/main.py dictado/tests/test_main.py
git commit -m "feat(dictado): push-to-talk orchestration with --prueba mode"
```

---

### Task 5: Fixture de audio + test de integración real

**Files:**
- Create: `dictado/tests/fixtures/` (dir)
- Create: `dictado/tests/fixtures/dictado_fixture.wav` (generado)
- Create: `dictado/tests/test_integracion.py`
- Modify: `dictado/config.json` (nada — solo lectura)

**Interfaces:**
- Consumes: `Transcriptor` con modelo real (descarga `small` ~460 MB la primera vez).
- Produces: test de integración marcado `integration`, ejecutable con `pytest -m integration`.

- [ ] **Step 1: Generar el WAV fixture con SAPI de Windows**

Run (PowerShell):
```powershell
New-Item -ItemType Directory -Force "dictado\tests\fixtures" | Out-Null
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$s.SetOutputToWaveFile("$PWD\dictado\tests\fixtures\sapi_raw.wav")
$s.Speak("Hola Osi, esto es una prueba de dictado en español.")
$s.Dispose()
ffmpeg -y -i "dictado\tests\fixtures\sapi_raw.wav" -ar 16000 -ac 1 -sample_fmt s16 "dictado\tests\fixtures\dictado_fixture.wav"
Remove-Item "dictado\tests\fixtures\sapi_raw.wav"
```
Expected: `dictado/tests/fixtures/dictado_fixture.wav` existe y es 16 kHz mono 16-bit (SAPI emite a la frecuencia nativa de la voz; ffmpeg lo normaliza a 16 kHz — sin esto, `cargar_wav` rechaza el fixture).

- [ ] **Step 2: Registrar el marker `integration`**

Create `dictado/pytest.ini`:
```ini
[pytest]
markers =
    integration: requiere modelo whisper descargado y fixture de audio
```

- [ ] **Step 3: Escribir `dictado/tests/test_integracion.py`**

```python
from pathlib import Path

import numpy as np
import pytest

from transcriber_loader import cargar_wav  # ver paso 4
from transcribir import Transcriptor

WAV = Path(__file__).parent / "fixtures" / "dictado_fixture.wav"


@pytest.mark.integration
def test_transcripcion_real_contiene_palabras_clave():
    if not WAV.exists():
        pytest.skip("fixture no generado")
    pcm = cargar_wav(WAV)
    t = Transcriptor(modelo_id="small", idioma="es")
    texto = t.transcribe(pcm, sample_rate=16000).lower()
    assert ("prueba" in texto) or ("dictado" in texto), texto
```

- [ ] **Step 4: Implementar `dictado/transcriber_loader.py` (leer WAV → numpy 16 kHz mono)**

```python
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
```

Y añade test unitario al final de `dictado/tests/test_integracion.py` **antes** del marcado (sin marker, corre siempre):

```python
def test_cargar_wav_fixture_es_16k_mono():
    if not WAV.exists():
        pytest.skip("fixture no generado")
    pcm = cargar_wav(WAV)
    assert pcm.dtype == np.float32
    assert pcm.ndim == 1
    assert pcm.size > 16000
```

Ajusta el import del paso 3 a `from transcriber_loader import cargar_wav` (nombre exacto del archivo: `transcriber_loader.py`).

- [ ] **Step 5: Ejecutar tests unitarios (sin integración)**

Run: `pytest dictado/tests -v -m "not integration"`
Expected: todos PASS (incluido el del WAV que ya existe).

- [ ] **Step 6: Ejecutar integración real (descarga modelo la 1ª vez)**

Run: `pytest dictado/tests -m integration -v`
Expected: PASS — la transcripción contiene "prueba" o "dictado". Si la voz SAPI suena en inglés y Whisper escribe algo divergente, relaja la aserción a `len(texto) > 5` y anótalo en el mensaje del assert.

- [ ] **Step 7: Commit**

```bash
git add dictado/tests/ dictado/transcriber_loader.py dictado/pytest.ini
git commit -m "test(dictado): SAPI wav fixture + real-model integration test"
```

---

### Task 6: Calibración manual + docs + commit final

**Files:**
- Modify: `dictado/config.json` (ajuste de `atajo_pegado` según prueba)
- Modify: `PIPELINE-STATE.md` (raíz — regla de continuidad del repo)

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: sistema calibrado y documentado.

- [ ] **Step 1: Probar modo prueba con latencia real**

Run: `python dictado/main.py --prueba 5`
Expected: imprime transcripción + tiempo. Objetivo: transcripción < 3 s en CPU (si es > 5 s, cambiar `modelo` a `base` en config.json y repetir).

- [ ] **Step 2: Probar el pipeline completo en esta ventana**

Run: `python dictado/main.py` (dejarlo corriendo en una pestaña; volver a la terminal de OpenCode)

Acción manual: enfocar la terminal de OpenCode, mantener Ctrl+Shift+Space, decir una frase, soltar.
Expected: beep inicio → beep fin → texto pegado en el cursor de este chat.
- Si **no pega** pero sí transcribe (lo ves en la consola del script): cambiar `atajo_pegado` a `"ctrl+shift+v"` y repetir; si aún falla → `"typing"`.
- Si aparece un espacio/caracter raro tras el pegado, anotarlo en PIPELINE-STATE (hotkey alternativo: F8).

- [ ] **Step 3: Actualizar `PIPELINE-STATE.md`**

Añadir una entrada nueva al final (sección de hitos) con formato del archivo:

```markdown
## HITO: Dictado de voz → OpenCode (2026-10-14)
- Spec: docs/superpowers/specs/2026-10-14-dictado-voz-opencode-design.md
- Plan: docs/superpowers/plans/2026-10-14-dictado-voz-opencode.md
- Uso: `python dictado/main.py` + Ctrl+Shift+Space mantenido. Prueba: `--prueba 5`.
- Calibración: atajo_pegado=<valor probado>, latencia=<X>s, modelo=<small|base>.
- DO-NOT-REPEAT: grabar audio a archivos (WAV/MP3) — va en RAM y se descarta.
```

- [ ] **Step 4: Commit final**

```bash
git add PIPELINE-STATE.md dictado/config.json docs/superpowers/
git commit -m "docs(dictado): calibration notes + pipeline state milestone"
```
