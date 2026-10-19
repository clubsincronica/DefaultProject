"""Ciclo de vida del proceso: liveness de PID, lockfile de instancia única
y watchdog que cierra dictado cuando muere el proceso que lo lanzó."""

import ctypes
import json
import os
import time
from pathlib import Path

_PROCESO_VIVO = 259
_QUERY_LIMITED = 0x1000


def proceso_vivo(pid: int) -> bool:
    """True si el proceso `pid` sigue corriendo (Windows)."""
    try:
        pid = int(pid)
    except (TypeError, ValueError):
        return False
    if pid <= 0:
        return False
    kernel32 = ctypes.windll.kernel32
    handle = kernel32.OpenProcess(_QUERY_LIMITED, False, pid)
    if not handle:
        return False
    try:
        codigo = ctypes.c_ulong()
        if not kernel32.GetExitCodeProcess(handle, ctypes.byref(codigo)):
            return True  # no pudimos consultar -> asumir vivo (no matar por error)
        return codigo.value == _PROCESO_VIVO
    finally:
        kernel32.CloseHandle(handle)


def leer_lock(ruta: Path) -> int | None:
    try:
        datos = json.loads(Path(ruta).read_text(encoding="utf-8"))
        return int(datos["pid"])
    except (OSError, ValueError, KeyError, TypeError):
        return None


def instancia_activa(ruta: Path, vivo=proceso_vivo) -> bool:
    pid = leer_lock(ruta)
    return bool(pid) and vivo(pid)


def escribir_lock(ruta: Path, pid: int | None = None) -> None:
    contenido = {
        "pid": os.getpid() if pid is None else pid,
        "inicio": time.strftime("%Y-%m-%dT%H:%M:%S"),
    }
    Path(ruta).write_text(json.dumps(contenido), encoding="utf-8")


def borrar_lock(ruta: Path) -> None:
    try:
        Path(ruta).unlink(missing_ok=True)
    except OSError:
        pass


def esperar_muerte(pid: int, vivo=proceso_vivo, intervalo: float = 2.0,
                   dormir=time.sleep) -> None:
    """Bloquea hasta que el proceso `pid` deje de estar vivo."""
    while vivo(pid):
        dormir(intervalo)
