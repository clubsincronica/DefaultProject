#!/usr/bin/env python3
"""Envía un correo vía SMTP de Gmail (cuenta en credentials/gmail.json).

Uso:
  python scripts/enviar-email.py --para "dest@x.com" --asunto "Hola" --cuerpo "Texto"
  python scripts/enviar-email.py --para "dest@x.com" --asunto "Hola" < cuerpo-largo.txt

Credenciales (gitignored): credentials/gmail.json -> {"user": "...", "app_password": "..."}
"""

import argparse
import json
import smtplib
import sys
from email.message import EmailMessage
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CREDS = ROOT / "credentials" / "gmail.json"
SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587


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


def enviar(para, asunto, cuerpo, user, password):
    msg = EmailMessage()
    msg["From"] = user
    msg["To"] = para
    msg["Subject"] = asunto
    msg.set_content(cuerpo)
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=30) as s:
            s.starttls()
            s.login(user, password)
            s.send_message(msg)
    except smtplib.SMTPAuthenticationError:
        sys.exit("Error de autenticación: revisá user/app_password en credentials/gmail.json")
    except (smtplib.SMTPException, OSError) as e:
        sys.exit(f"Error de envío SMTP: {e}")


def main():
    p = argparse.ArgumentParser(description="Envía un correo con Gmail (SMTP).")
    p.add_argument("--para", required=True, help="Destinatario (email)")
    p.add_argument("--asunto", required=True, help="Asunto del correo")
    p.add_argument("--cuerpo", default=None, help="Cuerpo (si se omite, se lee de stdin)")
    args = p.parse_args()

    cuerpo = args.cuerpo if args.cuerpo is not None else sys.stdin.read()
    if not cuerpo.strip():
        sys.exit("El cuerpo está vacío (usá --cuerpo o pasá texto por stdin).")

    user, password = cargar_credenciales()
    enviar(args.para, args.asunto, cuerpo, user, password)
    print(f"OK: correo enviado a {args.para} (asunto: {args.asunto})")


if __name__ == "__main__":
    main()
