# Design: Osi envía correos (Gmail SMTP)

Fecha: 2026-10-15
Estado: aprobado por el usuario

## Objetivo

Que Osi (esta instalación de OpenCode) pueda enviar correos por pedido del
usuario, principalmente para escribirle a contactos puntuales (ej. LAHUN).
Presupuesto cero, sin servicios nuevos.

## Decisión

**Script Python con SMTP de Gmail** (stdlib, sin dependencias). Enfoque A
aprobado; se descartaron MCP server (overkill) y n8n (malo para uso
interactivo).

## Componentes

### 1. `scripts/enviar-email.py`

- Python 3 stdlib: `smtplib`, `email.message`, `argparse`.
- Uso:
  `python scripts/enviar-email.py --para "dest@x.com" --asunto "Hola" --cuerpo "Texto"`
  - Si se omite `--cuerpo`, el cuerpo se lee de stdin (para textos largos).
- Lee credenciales de `credentials/gmail.json` (relativo a la raíz del repo).
- SMTP: `smtp.gmail.com:587`, STARTTLS, login con user + app password.
- Errores: mensaje claro en stderr y exit code ≠ 0 (archivo faltante,
  JSON inválido, auth fallida, red).
- Sin secretos hardcodeados.

### 2. `credentials/gmail.json` (gitignored, creado a mano por el usuario)

```json
{ "user": "tu.correo@gmail.com", "app_password": "xxxx xxxx xxxx xxxx" }
```

La contraseña de aplicación se genera en https://myaccount.google.com/apppasswords
(requiere 2FA). El usuario lo crea antes del primer uso.

### 3. `docs/contacts.md` (trackeado, sin secretos)

Agenda nombre → email en Markdown. Ejemplo:

```
| Nombre | Email              |
|--------|--------------------|
| LAHUN  | (pendiente)        |
```

El usuario aporta la dirección de LAHUN.

### 4. `SECRETS-MAP.md`

Agregar fila documentando `credentials/gmail.json` (qué contiene, quién lo
usa, gitignored: sí). No se documentan valores.

## Flujo de uso

1. Usuario: "escribile a LAHUN con X".
2. Osi busca el email en `docs/contacts.md`.
3. Osi corre `scripts/enviar-email.py` vía bash.
4. Confirma éxito o reporta el error exacto.

## Seguridad

- `credentials/` agregado a `.gitignore` (verificar que ya lo esté; si no,
  agregarlo).
- El spec y el código no contienen secretos.
- Envíos solo bajo pedido explícito del usuario (sin envíos automáticos).

## Testing

- `test/enviar_email_test.py` (o tests manuales documentados): parsing de
  args, lectura de credenciales, construcción del mensaje MIME — sin enviar
  correos reales en test. Envío real: prueba manual con el usuario.
