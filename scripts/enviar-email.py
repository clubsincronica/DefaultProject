#!/usr/bin/env python3
"""Envía un correo vía SMTP de Gmail (cuenta en credentials/gmail.json).

Uso:
  python scripts/enviar-email.py --para "dest@x.com" --asunto "Hola" --cuerpo "Texto"
  python scripts/enviar-email.py --para "dest@x.com" --asunto "Hola" < cuerpo-largo.txt
  python scripts/enviar-email.py ... --adjunto ruta/archivo.zip   (se puede repetir)

Credenciales (gitignored): credentials/gmail.json -> {"user": "...", "app_password": "..."}
"""

import argparse
import json
import mimetypes
import smtplib
import sys
from email.message import EmailMessage
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CREDS = ROOT / "credentials" / "gmail.json"
SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_TIMEOUT = 60
FIRMA = "Ozzy"  # regla global: TODO correo se firma como Ozzy (AGENTS.md)


def cargar_credenciales():
    if not CREDS.exists():
        sys.exit(
            f"Falta {CREDS} ({{\"user\": \"...\", \"app_password\": \"...\"}}). "
            "Generá la contraseña de aplicación en https://myaccount.google.com/apppasswords"
        )
    try:
        creds = json.loads(CREDS.read_text(encoding="utf-8"))
        user = creds["user"]
        password = creds["app_password"].replace(" ", "")
    except (json.JSONDecodeError, KeyError) as e:
        sys.exit(f"{CREDS} inválido: {e}")
    if not user or not password:
        sys.exit(f"{CREDS} vacío (user/app_password requeridos).")
    return user, password


def enviar(para, asunto, cuerpo, user, password, adjuntos=None):
    msg = EmailMessage()
    msg["From"] = user
    msg["To"] = para
    msg["Subject"] = asunto
    msg.set_content(cuerpo)
    for ruta in adjuntos or []:
        p = Path(ruta)
        if not p.is_file():
            sys.exit(f"Adjunto no encontrado: {p}")
        tipo, _ = mimetypes.guess_type(p.name)
        if tipo and "/" in tipo:
            maintype, subtype = tipo.split("/", 1)
        else:
            maintype, subtype = "application", "octet-stream"
        msg.add_attachment(p.read_bytes(), maintype=maintype, subtype=subtype, filename=p.name)
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=SMTP_TIMEOUT) as s:
            s.starttls()
            s.login(user, password)
            s.send_message(msg)
    except smtplib.SMTPAuthenticationError:
        sys.exit("Error de autenticación: revisá user/app_password en credentials/gmail.json")
    except (smtplib.SMTPException, OSError) as e:
        sys.exit(f"Error de envío SMTP: {e}")


def firmar(cuerpo):
    if FIRMA in cuerpo:
        return cuerpo
    return cuerpo.rstrip() + f"\n\n{FIRMA}\n"


def main():
    p = argparse.ArgumentParser(description="Envía un correo con Gmail (SMTP).")
    p.add_argument("--para", required=True, help="Destinatario (email)")
    p.add_argument("--asunto", required=True, help="Asunto del correo")
    p.add_argument("--cuerpo", default=None, help="Cuerpo (si se omite, se lee de stdin)")
    p.add_argument("--adjunto", action="append", default=None,
                   help="Archivo a adjuntar (se puede repetir)")
    args = p.parse_args()

    cuerpo = firmar(args.cuerpo if args.cuerpo is not None else sys.stdin.read())
    if not cuerpo.strip():
        sys.exit("El cuerpo está vacío (usá --cuerpo o pasá texto por stdin).")

    user, password = cargar_credenciales()
    enviar(args.para, args.asunto, cuerpo, user, password, adjuntos=args.adjunto)
    adj = f" + {len(args.adjunto)} adjunto(s)" if args.adjunto else ""
    print(f"OK: correo enviado a {args.para} (asunto: {args.asunto}){adj}")


if __name__ == "__main__":
    main()
