# SECRETS-MAP.md - <PROJECT_NAME>

Secret inventory for <PROJECT_NAME>. This file lists WHERE each secret
lives and WHAT it is used for. It never contains the secrets themselves.

RULE: never commit secrets. This file, the repo, and chat logs must never
contain API keys, tokens, or passwords. Keys stay on provider sites and in
local OS-level stores only; nothing secret is written by the installer.

| Servicio | Archivo | Usado por | Notas |
|---|---|---|---|
| OpenRouter | OS environment on this machine (not in repo) | <PROJECT_NAME> opencode config | create at openrouter.ai/keys, paste nowhere in the installer |
| NVIDIA Build | OS environment on this machine (not in repo) | <PROJECT_NAME> rate-limit fallback | create at build.nvidia.com, paste nowhere in the installer |

To rotate a key: create a new key on the provider site, update the local
OS-level store, delete the old key on the provider site.
