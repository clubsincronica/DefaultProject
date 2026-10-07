@echo off
title opencode Installer & Configurator
color 0A

echo ==========================================
echo opencode Installer & Configurator
echo Low-cost / Free API Key Setup
echo ==========================================
echo.

:: Check if opencode is installed
echo Step 1: Checking opencode installation...
where opencode >nul 2>&1
if %errorlevel% equ 0 (
    echo opencode is already installed.
    for /f "tokens=3" %%v in ('opencode --version 2^>nul') do (
        echo Version: %%v
    )
) else (
    echo opencode not found. Installing...
    npm install -g opencode@latest
)
echo.
echo.

:: Create directory structure
echo Step 2: Creating directory structure...
mkdir "%USERPROFILE%\AppData\Roaming\npm\opencode" 2>nul
mkdir "%APPDATA%\opencode" 2>nul
mkdir "C:\Users\%USERNAME%\Documents\Default Project\opencode-setup\config" 2>nul
mkdir "C:\Users\%USERNAME%\Documents\Default Project\.opencode" 2>nul
echo Directories created.
echo.
echo.

:: Create global opencode.json
echo Step 3: Creating global opencode configuration...
copy NUL "%APPDATA%\opencode\opencode.json" >nul
powershell -Command "
$config = @{
    ''$schema'' = 'https://opencode.ai/config.json'
    model = 'opencode/deepseek-v4-flash-free'
    small_model = 'opencode/deepseek-v4-flash-free'
    plugin = @('@azumag/opencode-rate-limit-fallback')
    provider = @{
        omniroute = @{
            npm = '@ai-sdk/openai-compatible'
            name = 'OmniRoute'
            options = @{
                baseURL = 'http://localhost:20128/v1'
                apiKey = '{env:OMNIROUTE_API_KEY}'
            }
            models = @{
                'auto/best-free' = @{ name = 'Best Free (OmniRoute)' }
                'auto/coding:free' = @{ name = 'Coding Free' }
                'oc/deepseek-v4-flash-free' = @{ name = 'DeepSeek V4 Flash Free' }
                'oc/minimax-m3-free' = @{ name = 'MiniMax M3 Free' }
                'oc/nemotron-3-super-free' = @{ name = 'Nemotron 3 Super Free' }
            }
        }
        nvidia = @{
            npm = '@ai-sdk/openai-compatible'
            name = 'NVIDIA NIM'
            options = @{
                baseURL = 'https://integrate.api.nvidia.com/v1'
                apiKey = '{env:NVIDIA_API_KEY}'
            }
            models = @{
                'deepseek-ai/deepseek-v4-flash-0731' = @{ name = 'DeepSeek V4 Flash' }
                'meta/llama-3.3-70b-instruct' = @{ name = 'Llama 3.3 70B' }
                'nvidia/llama-3.3-nemotron-super-49b-v1' = @{ name = 'Nemotron Super 49B' }
                mistralai/mistral-large = @{ name = 'Mistral Large' }
                moonshotai/kimi-k2.6 = @{ name = 'Kimi K2.6' }
                'stepfun-ai/step-3.7-flash' = @{ name = 'Step 3.7 Flash' }
                'openai/gpt-oss-120b' = @{ name = 'GPT-OSS 120B' }
                nvidia/nemotron-3-nano-30b-a3b = @{ name = 'Nemotron 3 Nano 30B' }
            }
        }
    }
}
''$config'' | ConvertTo-Json -Depth 10 | Out-File -FilePath '%APPDATA%\opencode\opencode.json' -Encoding UTF8
Write-Host 'Created: %APPDATA%\opencode\opencode.json'
"
echo.
echo.

:: Create rate-limit-fallback.json
echo Step 4: Creating rate-limit fallback configuration...
powershell -Command "
$fallback = @{
    enabled = $true
    cooldownMs = 60000
    fallbackMode = 'cycle'
    enableSubagentFallback = $true
    fallbackModels = @(
        @{ providerID = 'opencode'; modelID = 'deepseek-v4-flash-free' }
        @{ providerID = 'nvidia'; modelID = 'deepseek-ai/deepseek-v4-flash-0731' }
        @{ providerID = 'openrouter'; modelID = '~deepseek/deepseek-v4-flash-latest' }
        @{ providerID = 'nvidia'; modelID = 'moonshotai/kimi-k2.6' }
        @{ providerID = 'nvidia'; modelID = 'nvidia/llama-3.3-nemotron-super-49b-v1' }
        @{ providerID = 'nvidia'; modelID = 'meta/llama-3.3-70b-instruct' }
    )
    retryPolicy = @{
        maxRetries = 3
        strategy = 'exponential'
        baseDelayMs = 1000
        maxDelayMs = 30000
        jitterEnabled = $true
        jitterFactor = 0.1
    }
    configReload = @{ enabled = $true }
}
''$fallback'' | ConvertTo-Json -Depth 10 | Out-File -FilePath '%APPDATA%\opencode\rate-limit-fallback.json' -Encoding UTF8
Write-Host 'Created: %APPDATA%\opencode\rate-limit-fallback.json'
"
echo.
echo.

:: Create project opencode.json
echo Step 5: Creating project opencode configuration...
powershell -Command "
$projConfig = @{
    ''$schema'' = 'https://opencode.ai/config.json'
    plugin = @(
        '.opencode/plugins/graphify.js'
        'superpowers@git+https://github.com/obra/superpowers.git'
    )
    mcp = @{
        filesystem = @{
            type = 'local'
            command = @('npx', '-y', '@modelcontextprotocol/server-filesystem', '<PROJECT_DIR>')
            enabled = $true
            allowed_dirs = @('content', 'scripts', 'assets', 'data', 'graphify-out', '.opencode', 'node_modules')
        }
        context7 = @{
            type = 'remote'
            url = 'https://api.context7.vercel.app/mcp'
            enabled = $true
        }
        memory = @{
            type = 'local'
            command = @('npx', '-y', '@modelcontextprotocol/server-memory', '<PROJECT_DIR>/data/memory.json')
            enabled = $true
        }
        headroom = @{
            type = 'local'
            command = @('<HOME>/.local/bin/headroom.exe', 'mcp', 'serve')
            enabled = $true
        }
        linkedin = @{
            type = 'local'
            command = @('uvx', 'mcp-server-linkedin@latest')
            environment = @{ UV_HTTP_TIMEOUT = '300' }
            enabled = $true
        }
    }
    provider = @{
        headroom = @{
            npm = '@ai-sdk/openai-compatible'
            name = 'Headroom Proxy'
            options = @{
                baseURL = 'http://127.0.0.1:8787/v1'
            }
            models = @{
                'ddgw/gpt-4o-mini' = @{
                    name = 'GPT-4o mini'
                    limit = @{ context = 128000; output = 16384 }
                }
                'auto/best-coding' = @{
                    name = 'Best Coding (auto)'
                    limit = @{ context = 1048576; output = 512000 }
                }
                'aug/claude-haiku-4.5' = @{
                    name = 'Claude Haiku 4.5'
                    limit = @{ context = 200000; output = 8192 }
                }
                'aug/claude-sonnet-4.6' = @{
                    name = 'Claude Sonnet 4.6'
                    limit = @{ context = 1000000; output = 16384 }
                }
            }
        }
        deepseek = @{
            npm = '@ai-sdk/deepseek'
            name = 'DeepSeek API'
            models = @{
                'deepseek/deepseek-v4-flash' = @{
                    name = 'DeepSeek V4 Flash'
                    limit = @{ context = 128000; output = 32768 }
                }
                'deepseek/deepseek-coder-v2' = @{
                    name = 'DeepSeek Coder V2'
                    limit = @{ context = 128000; output = 32768 }
                }
            }
        }
        glm = @{
            npm = '@ai-sdk/openai-compatible'
            name = 'GLM-5.2 (Z.AI)'
            options = @{
                baseURL = 'https://api.z.ai/api/paas/v4'
            }
            models = @{
                'zhipu/glm-5.2' = @{
                    name = 'GLM-5.2'
                    limit = @{ context = 1048576; output = 131072 }
                }
                'zhipu/glm-4.7-flash' = @{
                    name = 'GLM-4.7 Flash (free)'
                    limit = @{ context = 1048576; output = 131072 }
                }
            }
        }
        groq = @{
            npm = '@ai-sdk/openai-compatible'
            name = 'Groq API'
            options = @{
                baseURL = 'https://api.groq.com/v1'
            }
            models = @{
                'groq/llama-3.1-8b-instant' = @{
                    name = 'Llama 3.1 8B Instant'
                    limit = @{ context = 1000000; output = 1000000 }
                }
                'groq/groqwlc-7b-instruct' = @{
                    name = 'Groq Llama 3.1 7B Instruct'
                    limit = @{ context = 1000000; output = 1000000 }
                }
            }
        }
    }
}
''$projConfig'' | ConvertTo-Json -Depth 15 | Out-File -FilePath 'C:\Users\%USERNAME%\Documents\Default Project\opencode.json' -Encoding UTF8
Write-Host 'Created: C:\Users\%USERNAME%\Documents\Default Project\opencode.json'
"
echo.
echo.

:: Create lean config
echo Step 6: Creating lean project config...
echo '{"$schema":"https://opencode.ai/config.json","plugin":[".opencode/plugins/graphify.js","superpowers@git+https://github.com/obra/superpowers.git"]}' > "C:\Users\%USERNAME%\Documents\Default Project\.opencode\opencode.jsonc"
echo Created: C:\Users\%USERNAME%\Documents\Default Project\.opencode\opencode.jsonc
echo.
echo.

:: API Key Setup Guide
echo Step 7: API Key Setup Guide
echo ==========================
echo.
echo For free/low-cost usage, set up environment variables:
echo.
echo 1. OMNIROUTE_API_KEY - For the omniroute local proxy
echo    Get free key from: https://openrouter.ai/keys
echo    Or use default free tier (no key needed for basic models)
echo.
echo 2. NVIDIA_API_KEY - For NVIDIA NIM models
echo    Get free key from: https://build.nvidia.com/
echo    Register and get a free nvapi- key
echo.
echo 3. Optional: Headroom proxy runs locally without API key for some models
echo.
echo Setup instructions:
echo   Windows PowerShell: $env:OMNIROUTE_API_KEY = "your-key-here"
echo   $env:NVIDIA_API_KEY = "nvapi-your-key-here"
echo.
echo Test the setup:
echo   opencode --help
echo   opencode "Hello world"
echo.
echo ==========================================
echo opencode Installer Complete!
echo ==========================================

pause