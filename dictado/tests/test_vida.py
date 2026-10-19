import os
import subprocess
import sys

from vida import (
    borrar_lock,
    escribir_lock,
    esperar_muerte,
    instancia_activa,
    leer_lock,
    proceso_vivo,
)


def test_proceso_vivo_pid_actual():
    assert proceso_vivo(os.getpid())


def test_proceso_vivo_pid_invalido():
    assert not proceso_vivo(0)
    assert not proceso_vivo(-1)
    assert not proceso_vivo(None)


def test_proceso_vivo_pid_muerto():
    p = subprocess.Popen([sys.executable, "-c", "pass"])
    p.wait()
    assert not proceso_vivo(p.pid)


def test_leer_lock_inexistente(tmp_path):
    assert leer_lock(tmp_path / "nope.lock") is None


def test_leer_lock_json_invalido(tmp_path):
    r = tmp_path / "x.lock"
    r.write_text("no soy json", encoding="utf-8")
    assert leer_lock(r) is None


def test_escribir_y_leer_lock(tmp_path):
    r = tmp_path / "d.lock"
    escribir_lock(r, pid=4321)
    assert leer_lock(r) == 4321
    borrar_lock(r)
    assert not r.exists()


def test_instancia_activa_segun_liveness(tmp_path):
    r = tmp_path / "d.lock"
    escribir_lock(r, pid=999)
    assert not instancia_activa(r, vivo=lambda pid: False)
    assert instancia_activa(r, vivo=lambda pid: True)


def test_instancia_activa_sin_lock(tmp_path):
    assert not instancia_activa(tmp_path / "nada.lock", vivo=lambda pid: True)


def test_esperar_muerte_termina_cuando_muere():
    respuestas = iter([True, True, False])
    dormidas = []
    esperar_muerte(123, vivo=lambda pid: next(respuestas),
                   intervalo=0.01, dormir=dormidas.append)
    assert len(dormidas) == 2
