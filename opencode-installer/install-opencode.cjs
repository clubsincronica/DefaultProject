#!/usr/bin/env node
/**
 * opencode Installer & Configuration Guide
 * Low-cost / Free API key setup for opencode
 * 
 * This script guides users through:
 * 1. Installing opencode
 * 2. Setting up API keys for free models
 * 3. Configuring local proxies (omniroute + headroom)
 * 4. Creating the project configuration
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const HOME = os.homedir();
const PROJECT_DIR = process.cwd();
const CONFIG_DIR = path.join(HOME, '.config', 'opencode');
const SETUP_DIR = path.join(PROJECT_DIR, 'opencode-installer');

console.log('==========================================');
console.log(' opencode Installer & Configurator ');
console.log(' Low-cost / Free API Key Setup ');
console.log('==========================================\n');

// Step 1: Check if opencode is installed
console.log('Step 1: Checking opencode installation...');
try {
  const { execSync } = require('child_process');
  const version = execSync('opencode --version', { encoding: 'utf-8' }).trim();
  console.log(`  ✓ opencode is installed (v${version})\n`);
} catch (e) {
  console.log('  ✗ opencode not found. Will install it.\n');
}

// Step 2: Create directory structure
console.log('Step 2: Creating directory structure...');

const dirsToCreate = [
  CONFIG_DIR,
  path.join(CONFIG_DIR, ''),
  path.join(PROJECT_DIR, 'opencode-setup', 'config'),
  path.join(PROJECT_DIR, '.opencode'),
];

dirsToCreate.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`  Created: ${dir}`);
  }
});

console.log('  ✓ Directory structure ready\n');

// Step 3: Create global opencode.json with free model strategy
console.log('Step 3: Creating global opencode configuration...');

const globalOpencodeConfig = {
  "$schema": "https://opencode.ai/config.json",
  "model": "opencode/deepseek-v4-flash-free",
  "small_model": "opencode/deepseek-v4-flash-free",
  "plugin": ["@azumag/opencode-rate-limit-fallback"],
  "provider": {
    "omniroute": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "OmniRoute",
      "options": {
        "baseURL": "http://localhost:20128/v1",
        "apiKey": "{env:OMNIROUTE_API_KEY}"
      },
      "models": {
        "auto/best-free": { "name": "Best Free (OmniRoute)" },
        "auto/coding:free": { "name": "Coding Free" },
        "oc/deepseek-v4-flash-free": { "name": "DeepSeek V4 Flash Free" },
        "oc/minimax-m3-free": { "name": "MiniMax M3 Free" },
        "oc/nemotron-3-super-free": { "name": "Nemotron 3 Super Free" }
      }
    },
    "nvidia": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "NVIDIA NIM",
      "options": {
        "baseURL": "https://integrate.api.nvidia.com/v1",
        "apiKey": "{env:NVIDIA_API_KEY}"
      },
      "models": {
        "deepseek-ai/deepseek-v4-flash-0731": { "name": "DeepSeek V4 Flash" },
        "meta/llama-3.3-70b-instruct": { "name": "Llama 3.3 70B" },
        "nvidia/llama-3.3-nemotron-super-49b-v1": { "name": "Nemotron Super 49B" },
        "mistralai/mistral-large": { "name": "Mistral Large" },
        "moonshotai/kimi-k2.6": { "name": "Kimi K2.6" },
        "stepfun-ai/step-3.7-flash": { "name": "Step 3.7 Flash" },
        "openai/gpt-oss-120b": { "name": "GPT-OSS 120B" },
        "nvidia/nemotron-3-nano-30b-a3b": { "name": "Nemotron 3 Nano 30B" }
      }
    }
  }
};

fs.writeFileSync(
  path.join(CONFIG_DIR, 'opencode.json'),
  JSON.stringify(globalOpencodeConfig, null, 2)
);
console.log(`  ✓ Created: ${path.join(CONFIG_DIR, 'opencode.json')}\n`);

// Step 4: Create rate-limit-fallback.json
console.log('Step 4: Creating rate-limit fallback configuration...');

const rateLimitConfig = {
  "enabled": true,
  "cooldownMs": 60000,
  "fallbackMode": "cycle",
  "enableSubagentFallback": true,
  "fallbackModels": [
    { "providerID": "opencode", "modelID": "deepseek-v4-flash-free" },
    { "providerID": "nvidia", "modelID": "deepseek-ai/deepseek-v4-flash-0731" },
    { "providerID": "openrouter", "modelID": "~deepseek/deepseek-v4-flash-latest" },
    { "providerID": "nvidia", "modelID": "moonshotai/kimi-k2.6" },
    { "providerID": "nvidia", "modelID": "nvidia/llama-3.3-nemotron-super-49b-v1" },
    { "providerID": "nvidia", "modelID": "meta/llama-3.3-70b-instruct" }
  ],
  "retryPolicy": {
    "maxRetries": 3,
    "strategy": "exponential",
    "baseDelayMs": 1000,
    "maxDelayMs": 30000,
    "jitterEnabled": true,
    "jitterFactor": 0.1
  },
  "configReload": { "enabled": true }
};

fs.writeFileSync(
  path.join(CONFIG_DIR, 'rate-limit-fallback.json'),
  JSON.stringify(rateLimitConfig, null, 2)
);
console.log(`  ✓ Created: ${path.join(CONFIG_DIR, 'rate-limit-fallback.json')}\n`);

// Step 5: Create project opencode.json
console.log('Step 5: Creating project opencode configuration...');

const projectOpencodeConfig = {
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    ".opencode/plugins/graphify.js",
    "superpowers@git+https://github.com/obra/superpowers.git"
  ],
  "mcp": {
    "filesystem": {
      "type": "local",
      "command": ["npx", "-y", "@modelcontextprotocol/server-filesystem", "<PROJECT_DIR>"],
      "enabled": true,
      "allowed_dirs": [
        "content",
        "scripts",
        "assets",
        "data",
        "graphify-out",
        ".opencode",
        "node_modules"
      ]
    },
    "context7": {
      "type": "remote",
      "url": "https://api.context7.vercel.app/mcp",
      "enabled": true
    },
    "memory": {
      "type": "local",
      "command": ["npx", "-y", "@modelcontextprotocol/server-memory", "<PROJECT_DIR>/data/memory.json"],
      "enabled": true
    },
    "headroom": {
      "type": "local",
      "command": ["<HOME>/.local/bin/headroom.exe", "mcp", "serve"],
      "enabled": true
    },
    "linkedin": {
      "type": "local",
      "command": ["uvx", "mcp-server-linkedin@latest"],
      "environment": { "UV_HTTP_TIMEOUT": "300" },
      "enabled": true
    }
  },
  "provider": {
    "headroom": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Headroom Proxy",
      "options": {
        "baseURL": "http://127.0.0.1:8787/v1"
      },
      "models": {
        "ddgw/gpt-4o-mini": {
          "name": "GPT-4o mini",
          "limit": { "context": 128000, "output": 16384 }
        },
        "auto/best-coding": {
          "name": "Best Coding (auto)",
          "limit": { "context": 1048576, "output": 512000 }
        },
        "aug/claude-haiku-4.5": {
          "name": "Claude Haiku 4.5",
          "limit": { "context": 200000, "output": 8192 }
        },
        "aug/claude-sonnet-4.6": {
          "name": "Claude Sonnet 4.6",
          "limit": { "context": 1000000, "output": 16384 }
        }
      }
    },
    "deepseek": {
      "npm": "@ai-sdk/deepseek",
      "name": "DeepSeek API",
      "models": {
        "deepseek/deepseek-v4-flash": {
          "name": "DeepSeek V4 Flash",
          "limit": { "context": 128000, "output": 32768 }
        },
        "deepseek/deepseek-coder-v2": {
          "name": "DeepSeek Coder V2",
          "limit": { "context": 128000, "output": 32768 }
        }
      }
    },
    "glm": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "GLM-5.2 (Z.AI)",
      "options": {
        "baseURL": "https://api.z.ai/api/paas/v4"
      },
      "models": {
        "zhipu/glm-5.2": {
          "name": "GLM-5.2",
          "limit": { "context": 1048576, "output": 131072 }
        },
        "zhipu/glm-4.7-flash": {
          "name": "GLM-4.7 Flash (free)",
          "limit": { "context": 1048576, "output": 131072 }
        }
      }
    },
    "groq": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Groq API",
      "options": {
        "baseURL": "https://api.groq.com/v1"
      },
      "models": {
        "groq/llama-3.1-8b-instant": {
          "name": "Llama 3.1 8B Instant",
          "limit": { "context": 1000000, "output": 1000000 }
        },
        "groq/groqwlc-7b-instruct": {
          "name": "Groq Llama 3.1 7B Instruct",
          "limit": { "context": 1000000, "output": 1000000 }
        }
      }
    }
  }
};

fs.writeFileSync(
  path.join(PROJECT_DIR, 'opencode.json'),
  JSON.stringify(projectOpencodeConfig, null, 2)
);
console.log(`  ✓ Created: ${path.join(PROJECT_DIR, 'opencode.json')}\n`);

// Step 6: Create .opencode/opencode.jsonc (lean version)
console.log('Step 6: Creating lean project config...');

const leanConfig = {
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    ".opencode/plugins/graphify.js",
    "superpowers@git+https://github.com/obra/superpowers.git"
  ]
};

fs.writeFileSync(
  path.join(PROJECT_DIR, '.opencode', 'opencode.jsonc'),
  JSON.stringify(leanConfig, null, 2)
);
console.log(`  ✓ Created: ${path.join(PROJECT_DIR, '.opencode', 'opencode.jsonc')}\n`);

// Step 7: Provide API key setup guidance
console.log('Step 7: API Key Setup Guide');
console.log('==========================');
console.log();
console.log('For free/low-cost usage, you need to set up environment variables:');
console.log();
console.log('1. OMNIROUTE_API_KEY - For the omniroute local proxy');
console.log('   - Get a free API key from: https://openrouter.ai/keys');
console.log('   - Or use the default free tier (no key needed for basic models)');
console.log();
console.log('2. NVIDIA_API_KEY - For NVIDIA NIM models');
console.log('   - Get free key from: https://build.nvidia.com/');
console.log('   - Register and get a free nvapi- key');
console.log();
console.log('3. Optional: Headroom proxy runs locally without API key for some models');
console.log();
console.log('Setup instructions:');
console.log('  Windows PowerShell:');
console.log('    $env:OMNIROUTE_API_KEY = "your-key-here"');
console.log('    $env:NVIDIA_API_KEY = "nvapi-your-key-here"');
console.log();
console.log('  Or add to your system environment variables permanently.');
console.log();
console.log('Test the setup:');
console.log('  opencode --help');
console.log('  opencode "Hello world"');
console.log();
console.log('==========================================');
console.log(' opencode Installer Complete! ');
console.log('==========================================\n');

// Final summary
console.log('Summary of files created:');
console.log(`  • ${path.join(CONFIG_DIR, 'opencode.json')} - Global config`);
console.log(`  • ${path.join(CONFIG_DIR, 'rate-limit-fallback.json')} - Fallback chain`);
console.log(`  • ${path.join(PROJECT_DIR, 'opencode.json')} - Project config`);
console.log(`  • ${path.join(PROJECT_DIR, '.opencode', 'opencode.jsonc')} - Lean plugin config`);
console.log();
console.log('Next steps:');
console.log('  1. Set OMNIROUTE_API_KEY and NVIDIA_API_KEY environment variables');
console.log('  2. Run: opencode --version to verify installation');
console.log('  3. Run: opencode "test" to verify configuration');
console.log('  4. Check https://opencode.ai/docs for more details');