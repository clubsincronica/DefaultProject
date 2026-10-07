# opencode Free/Low-Cost Setup Guide

This guide walks you through setting up opencode with free/low-cost API keys, based on the existing low-cost scaffolding architecture.

## Overview

The setup uses a **multi-proxy architecture** with free model tiers:

```
opencode ──▶ omniroute proxy (localhost:20128) ──▶ OpenRouter / free models
          ├─▶ headroom proxy (127.0.0.1:8787) ──▶ paid models (as fallback)
          └─▶ NVIDIA NIM (integrate.api.nvidia.com) ──▶ NIM free/baratos
```

## Prerequisites

- Node.js installed (v18+ recommended)
- Windows PowerShell or Git Bash
- Internet access for downloading dependencies

## Installation Steps

### 1. Install opencode

```powershell
# Using PowerShell
npm install -g opencode@latest

# Or using the installer script
.\opencode-installer\install-opencode.bat
```

### 2. Run the Installer

The installer sets up the configuration files automatically:

```powershell
.\opencode-installer\install-opencode.bat
```

This creates:
- `~/.config/opencode/opencode.json` - Global configuration
- `~/.config/opencode/rate-limit-fallback.json` - Fallback model chain
- `./opencode.json` - Project configuration
- `./.opencode/opencode.jsonc` - Lean plugin config

### 3. Set Up API Keys

Two environment variables are needed for the proxies:

#### OMNIROUTE_API_KEY (Required for omniroute proxy)

- **Get a free key**: [https://openrouter.ai/keys](https://openrouter.ai/keys)
- **Free tier**: Includes access to DeepSeek, Meta Llama, Mistral, and other free models
- **Alternative**: Some basic models work without a key (rate-limited)

Set in PowerShell:
```powershell
$env:OMNIROUTE_API_KEY = "sk-or-your-key-here"
```

Or add permanently via System Properties → Environment Variables.

#### NVIDIA_API_KEY (Optional, for NVIDIA NIM models)

- **Get free key**: [https://build.nvidia.com/](https://build.nvidia.com/)
- Register for a free account and get an `nvapi-` key
- Used as fallback when free models are rate-limited

Set in PowerShell:
```powershell
$env:NVIDIA_API_KEY = "nvapi-your-key-here"
```

### 4. Verify Configuration

Test that opencode works with the free models:

```powershell
opencode --version
opencode "Hello, this is a test"
```

### 5. Understanding the Fallback Chain

The system uses a **rate-limit fallback chain** (priority order):

1. `opencode/deepseek-v4-flash-free` - Free DeepSeek model (primary)
2. `nvidia/deepseek-ai/deepseek-v4-flash-0731` - NVIDIA NIM DeepSeek
3. `openrouter/deepseek-v4-flash-latest` - OpenRouter DeepSeek
4. `nvidia/moonshotai/kimi-k2.6` - Kimi K2.6 (NVIDIA)
5. `nvidia/nvidia/llama-3.3-nemotron-super-49b-v1` - Nemotron Super 49B
6. `nvidia/meta/llama-3.3-70b-instruct` - Llama 3.3 70B (NVIDIA)

If model 1 hits rate limits, it automatically cycles to model 2, etc. **5% of the time** may hit a paid model, but the default free models cover most use cases.

### 6. Project-Specific Configuration

The project already has opencode configured at `./opencode.json` with:

- **MCP servers**: filesystem, context7, memory, headroom, linkedin
- **Provider models**: headroom (GPT-4o mini, Claude), DeepSeek, GLM, Groq
- **Plugin**: graphify.js + superpowers

The `./.opencode/opencode.jsonc` is a lean version with just plugins.

### 7. Usage Tips for Low Cost

- **Primary model**: `opencode/deepseek-v4-flash-free` - completely free
- **Context limits**: Adjusted manually (128K tokens context for most models)
- **Rate limit handling**: Automatic via `@azumag/opencode-rate-limit-fallback` plugin
- **Avoid paid models**: The system stays on free tier 95% of the time

### 8. Troubleshooting

#### "API key not configured"
- Ensure `OMNIROUTE_API_KEY` is set
- Check that the value doesn't have quotes issues in PowerShell

#### Rate limits exceeded
- The fallback chain will automatically switch models
- Wait 60s (cooldown) before retrying
- Check usage at [OpenRouter dashboard](https://openrouter.ai/keys)

#### Headroom proxy not starting
- Ensure `C:\Users\<user>\.local\bin\headroom.exe` exists
- Or install: `npm install -g @modelcontextprotocol/headroom`

### 9. Uninstall / Cleanup

To remove the opencode installation:
```powershell
npm uninstall -g opencode
Remove-Item "$env:APPDATA\opencode" -Recurse
Remove-Item "C:\Users\%USERNAME%\Documents\Default Project\opencode*" -Recurse
```

## License

This setup is free to use with free API tiers. No paid credits required for normal operation.

---

**Need help?** Check the [opencode documentation](https://opencode.ai/docs) or join the community.