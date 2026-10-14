# Dictado de voz → chat de OpenCode (push-to-talk local)

**Fecha:** 2026-10-14
**Estado:** Diseño aprobado por el usuario, pendiente de revisión del spec.

## Objetivo

Poder hablar al ordenador y que la transcripción aparezca automáticamente en el
cursor de **esta ventana de OpenCode**, sin salir del flujo de escritura.
100% local (sin APIs, sin costes, sin que el audio salga de la máquina).

## Requisitos acordados

| Requisito | Decisión |
|---|---|
| Destino del texto | Caja de input de este chat de OpenCode (pegado en el cursor) |
| Idioma | Español forzado (`language="es"`) — sin auto-detección |
| Procesamiento | 100% local en CPU (no hay GPU NVIDIA; solo Intel UHD) |
| Activación | Push-to-talk: mantener pulsado **Ctrl+Shift+Space**, hablar, soltar |
| Formato de audio | PCM 16 kHz mono en memoria (numpy). **Sin archivos**: ni WAV ni MP3 |
| Latencia objetivo | 1–3 s entre soltar el hotkey y ver el texto pegado |

### ¿Por qué no MP3?

Whisper lee MP3 (vía ffmpeg), pero no compensa: el buffer vive ~segundos en RAM
(<1 MB), codificar MP3 consume CPU (nuestro recurso escaso) y es lossy para
nada. El PCM en memoria evita disco, codecs y latencia de escritura.

## Stack

- Python 3.13 (ya instalado)
- `sounddevice` — captura de audio (callback → buffer numpy en RAM)
- `pynput` — hotkey global push-to-talk
- `faster-whisper` (CTranslate2) — modelo `small`, cuantización `int8`, CPU
- `pyperclip` (o equivalente) + envío de teclas — pegado del texto

## Arquitectura

```
dictado/
├── config.json      # hotkey, modelo, idioma, umbrales
├── main.py          # bucle de hotkey + orquestación + beeps de feedback
├── recorder.py      # grabación PCM 16kHz mono → numpy float32 en RAM
├── transcribir.py   # wrapper faster-whisper: modelo cargado 1 sola vez
└── pegar.py         # portapapeles + shortcut de pegado (fallback: typing)
```

### Flujo de datos

1. **Key down** de Ctrl+Shift+Space → `recorder.start()` + beep corto (inicio).
2. Mientras se mantiene → callback de `sounddevice` acumula chunks PCM en un
   buffer numpy (float32, 16 kHz, mono).
3. **Key up** → `recorder.stop()` devuelve el array.
   - Si duración < 0.3 s → se descarta (falso positivo) y beep grave.
4. `transcribir.transcribe(pcm)` → texto (modelo ya residente en memoria).
   - Texto vacío o solo espacios → no se pega, beep grave.
5. `pegar.paste(texto)` → texto al portapapeles + Ctrl+V (o el shortcut de
   pegado de la terminal) a la ventana con foco.
6. Beep corto de éxito.

### Modelo

- `faster-whisper` con `Systran/faster-whisper-small` (~460 MB), `compute_type="int8"`,
  `language="es"` fijo.
- Se descarga automáticamente en la primera ejecución (con aviso en consola).
- Se carga **una sola vez** al arrancar el proceso (arranque ~2 s); las
  subsiguientes transcripciones no pagan coste de carga.

### Pegado en la terminal

La terminal donde corre OpenCode recibe el texto así:

1. **Principal:** texto → portapapeles, luego `Ctrl+V` (Windows) simulado con
   `pynput` a la ventana con foco. Funciona en Windows Terminal / consolas
   con QuickEdit.
2. **Fallback** (si el shortcut no pega en esa terminal): escritura carácter a
   carácter con pausa mínima. Más lenta pero universal.
3. El hotkey debe estar inactivo (no interceptado) cuando OpenCode no tiene
   foco — decisión de implementación: el proceso solo reacciona si la ventana
   con foco es la terminal de OpenCode, o bien se permite global y se pega en
   lo que tenga foco (ver *Preguntas abiertas*).

## Casos de error

| Caso | Comportamiento |
|---|---|
| Micrófono no disponible / permiso denegado | Beep doble + mensaje en consola; no crashea |
| Grabación < 0.3 s | Se descarta, beep grave |
| Transcripción vacía | No pega, beep grave |
| Modelo sin descargar | Descarga en 1ª ejecución con aviso y barra de progreso |
| Terminal sin foco al soltar | Se pega en lo que tenga foco (comportamiento por defecto) |
| Excepción inesperada en el bucle | Se loguea en consola y el bucle sigue vivo |

## Verificación

1. **Modo `--prueba`:** `python dictado/main.py --prueba` graba N segundos
   (3 o 5) y imprime la transcripción **sin pegar**. Sirve para medir latencia
   real en la CPU del usuario y calibrar el modelo antes de activar el hotkey.
2. **Test de módulo:** test unitario de `transcribir.py` con un archivo WAV
   fijo del repo (fixture de test, no se genera durante la grabación) con una
   frase en español conocida, que assertee que la transcripción la contiene.
3. **Smoke test manual:** push-to-talk real en el chat de OpenCode y
   confirmar que el texto aparece en el cursor.

## Fuera de alcance (YAGNI)

- Auto-stop por silencio (VAD) — push-to-talk cubre la necesidad
- Dictado en cualquier aplicación con lógica de foco condicional
- Cloud fallback, diarización, puntuación automática post-whisper
- Múltiples idiomas / auto-detección
- Interfaz gráfica (solo beeps + consola)

## Preguntas abiertas

Ninguna bloqueante. Decisión de implementación a resolver en el plan:
el hotkey se registra globalmente (funciona con cualquier ventana enfocada) —
se asume que el uso típico es tener enfocada la terminal de OpenCode.

## Alternativas consideradas y descartadas

- **OpenWhispr instalado tal cual:** cero código pero Electron pesado, sin
  eventos integrables para Osi y sin control fino.
- **CLI `whisper` (torch) ya instalada:** sin dependencias nuevas pero 2-4×
  más lenta en CPU → peor UX.

## Nota post-review (2026-10-14, usuario)

- Hotkey por defecto ahora **`shift+space`**, parseada desde `config.json`
  (`parsear_hotkey` en main.py; order-independent: sirve cualquier orden de teclas).
- **Auto-send:** tras el pegado se envía `Enter` automáticamente
  (`pegar(..., enviar=True)` por defecto) — `fin()` espera a soltar la última
  tecla del combo, así Shift está suelto antes del Enter.
- `beep_fin` suena tras el envío ("mensaje enviado"), no antes de transcribir.
- `Transcriptor.transcribe` exige `sample_rate == 16000` (ValueError).
- Hotkey por defecto `mouse.middle` (botón central mantenido); combos de
  teclado siguen disponibles (`shift+space` u otros valores sin prefijo
  `mouse.`).
