#!/usr/bin/env node
/**
 * health-check-fallbacks.mjs — verifica que los modelos de la cadena de
 * fallback de @azumag/opencode-rate-limit-fallback respondan DE VERDAD.
 *
 * Por que existe: las cuotas de los tiers gratuitos cambian sin aviso. Un
 * modelo listado en `opencode-cli models` puede devolver 402/404/429 igual.
 * Un fallback muerto no rompe la sesion, pero quema un intento y retrasa el
 * modelo que si funciona. Este script hace un completion de 1 token contra
 * cada modelo de la cadena y clasifica el resultado.
 *
 * Estados:
 *   ok        -> responde 2xx
 *   quota     -> 429 "FreeUsageLimitError": cuota del tier gratuito agotada
 *                (condicion de cuenta, se resetea sola; NO es modelo muerto)
 *   degraded  -> 429 / 5xx / timeout / error de red (transitorio, puede volver)
 *   dead      -> 401/403/402/404 o "model not found" (no va a volver solo:
 *                hay que sacar el modelo de la cadena o arreglar la key)
 *
 * Solo avisa (toast de Windows) cuando cambia el conjunto de modelos MUERTOS.
 * Los flaps de `degraded` no generan alerta: son ruido de rate limit.
 *
 * Uso:
 *   node scripts/health-check-fallbacks.mjs
 *   node scripts/health-check-fallbacks.mjs --json          # salida JSON
 *   node scripts/health-check-fallbacks.mjs --quiet         # sin stdout
 *   node scripts/health-check-fallbacks.mjs --no-toast      # sin alerta
 *   node scripts/health-check-fallbacks.mjs --timeout 20000
 *   node scripts/health-check-fallbacks.mjs --config <ruta>
 *
 * Exit codes: 0 = ningun muerto · 1 = hay al menos un muerto · 3 = no se pudo
 * leer la config o las credenciales.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";
import { spawn } from "node:child_process";

const HOME = homedir();
const XDG_CONFIG_HOME = process.env.XDG_CONFIG_HOME || join(HOME, ".config");
const DATA_DIR = process.env.OPENCODE_DATA_DIR || join(HOME, ".local", "share", "opencode");

// ---------------------------------------------------------------------------
// Proveedores: de donde sacar la URL y la key de cada providerID.
// ---------------------------------------------------------------------------
const PROVIDERS = {
  opencode: {
    url: process.env.OPENCODE_INFERENCE_URL || "https://opencode.ai/inference/openai/v1/chat/completions",
    authKey: "opencode",
  },
  openrouter: {
    url: process.env.OPENROUTER_CHAT_URL || "https://openrouter.ai/api/v1/chat/completions",
    authKey: "openrouter",
  },
};

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const OPT = {
  json: flag("--json"),
  quiet: flag("--quiet"),
  noToast: flag("--no-toast"),
  timeoutMs: Number(value("--timeout")) || 45_000,
  configPath: value("--config"),
};

// ---------------------------------------------------------------------------
// Busqueda de la config: mismo orden que loadConfig() del plugin.
// ---------------------------------------------------------------------------
function candidateConfigPaths() {
  const cwd = process.cwd();
  const dirs = [
    { dir: cwd, subdir: ".opencode" },
    { dir: cwd, subdir: "" },
    { dir: HOME, subdir: ".opencode" },
    { dir: HOME, subdir: "" },
    { dir: XDG_CONFIG_HOME, subdir: "opencode" },
    { dir: XDG_CONFIG_HOME, subdir: "" },
  ];
  const out = [];
  for (const { dir, subdir } of dirs) {
    out.push(subdir ? join(dir, subdir, "rate-limit-fallback.json") : join(dir, "rate-limit-fallback.json"));
  }
  return [...new Set(out)];
}

function resolveConfig() {
  if (OPT.configPath) {
    const p = resolve(OPT.configPath);
    if (!existsSync(p)) throw new Error(`No existe el archivo indicado: ${p}`);
    return { path: p, config: JSON.parse(readFileSync(p, "utf8")) };
  }
  const tried = candidateConfigPaths();
  for (const p of tried) {
    if (existsSync(p)) return { path: p, config: JSON.parse(readFileSync(p, "utf8")) };
  }
  throw new Error(`No encontre rate-limit-fallback.json. Probe:\n  ${tried.join("\n  ")}`);
}

function resolveAuth() {
  const candidates = [
    join(DATA_DIR, "auth.json"),
    join(XDG_CONFIG_HOME, "opencode", "auth.json"),
    join(HOME, ".opencode", "auth.json"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return JSON.parse(readFileSync(p, "utf8"));
  }
  throw new Error(`No encontre auth.json. Probe:\n  ${candidates.join("\n  ")}`);
}

// ---------------------------------------------------------------------------
// Clasificacion
// ---------------------------------------------------------------------------
function classify(status, body) {
  if (status >= 200 && status < 300) return "ok";
  // 429 con "FreeUsageLimitError": la cuota del tier gratuito del provider
  // esta agotada. No es un modelo muerto ni una falla del modelo: es una
  // condicion de cuenta que se resetea sola. Se reporta aparte para no
  // generar falsas alarmas.
  if (status === 429 && /free[\s_-]*usage[\s_-]*limit/i.test(body)) return "quota";
  if (status === 429) return "degraded";
  if (status >= 500) return "degraded";
  if (status === 402) return "dead"; // sin credito
  if (status === 404) return "dead"; // modelo inexistente
  if (status === 401 || status === 403) return "dead"; // key invalida / sin permiso
  if (status === 400 && /model[^.]{0,40}(not found|not exist|unknown|invalid|unsupported)/i.test(body)) {
    return "dead";
  }
  return "degraded";
}

function snippet(text, max = 180) {
  if (!text) return null;
  const clean = String(text).replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

async function probe(model, auth) {
  const provider = PROVIDERS[model.providerID];
  const base = {
    providerID: model.providerID,
    modelID: model.modelID,
    state: "dead",
    httpStatus: null,
    latencyMs: null,
    detail: null,
  };

  if (!provider) {
    return { ...base, detail: `provider sin endpoint conocido (agregalo a PROVIDERS)` };
  }
  const entry = auth[provider.authKey];
  const key = entry && (entry.key || entry.access);
  if (!key) {
    return { ...base, detail: `sin credencial para "${provider.authKey}" en auth.json` };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPT.timeoutMs);
  const started = Date.now();

  try {
    const res = await fetch(provider.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "User-Agent": "opencode-fallback-health/1.0",
      },
      body: JSON.stringify({
        model: model.modelID,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1,
      }),
      signal: controller.signal,
    });
    const latencyMs = Date.now() - started;
    const body = await res.text();
    return {
      ...base,
      state: classify(res.status, body),
      httpStatus: res.status,
      latencyMs,
      detail: res.ok ? null : snippet(body) || `HTTP ${res.status}`,
    };
  } catch (err) {
    const latencyMs = Date.now() - started;
    const aborted = err && err.name === "AbortError";
    return {
      ...base,
      state: "degraded",
      latencyMs,
      detail: aborted ? `timeout tras ${OPT.timeoutMs}ms` : snippet(err && err.message) || String(err),
    };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Reporte
// ---------------------------------------------------------------------------
function loadPrevious(reportPath) {
  try {
    return JSON.parse(readFileSync(reportPath, "utf8"));
  } catch {
    return null;
  }
}

function computeTransitions(previous, models, chainKey) {
  if (!previous || previous.chainKey !== chainKey) return [];
  const before = new Map((previous.models || []).map((m) => [`${m.providerID}/${m.modelID}`, m.state]));
  const out = [];
  for (const m of models) {
    const id = `${m.providerID}/${m.modelID}`;
    const prev = before.get(id);
    if (prev && prev !== m.state) out.push({ providerID: m.providerID, modelID: m.modelID, from: prev, to: m.state });
  }
  return out;
}

function toast(title, message) {
  if (OPT.noToast) return;
  const esc = (s) => String(s).replace(/'/g, "''");
  const ps = [
    "Add-Type -AssemblyName System.Windows.Forms",
    "$n = New-Object System.Windows.Forms.NotifyIcon",
    "$n.Icon = [System.Drawing.SystemIcons]::Warning",
    "$n.Visible = $true",
    `$n.ShowBalloonTip(10000, '${esc(title)}', '${esc(message)}', 'Warning')`,
    "Start-Sleep -Seconds 7",
    "$n.Dispose()",
  ].join("; ");
  const encoded = Buffer.from(ps, "utf16le").toString("base64");
  try {
    const child = spawn(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-EncodedCommand", encoded],
      { detached: true, stdio: "ignore" },
    );
    child.unref();
  } catch {
    // El toast es best-effort: si falla, el log ya tiene el dato.
  }
}

async function main() {
  if (flag("--test-toast")) {
    toast(
      "Cadena de fallback OpenCode",
      "Prueba de notificacion: asi se va a ver el aviso cuando un modelo muera.",
    );
    console.log("[fallback-health] toast de prueba enviado (revisa la bandeja de notificaciones)");
    return;
  }

  let config;
  let configPath;
  let auth;
  try {
    ({ config, path: configPath } = resolveConfig());
    auth = resolveAuth();
  } catch (err) {
    console.error(`[fallback-health] ${err.message}`);
    process.exit(3);
  }

  const models = (config.fallbackModels || []).filter(
    (m) => typeof m?.providerID === "string" && typeof m?.modelID === "string",
  );
  if (models.length === 0) {
    console.error("[fallback-health] la cadena esta vacia: nada que verificar");
    process.exit(3);
  }

  const chainKey = models.map((m) => `${m.providerID}/${m.modelID}`).join("|");
  const results = await Promise.all(models.map((m) => probe(m, auth)));

  const summary = { ok: 0, degraded: 0, quota: 0, dead: 0 };
  for (const r of results) summary[r.state] += 1;

  const logsDir = join(process.cwd(), "logs");
  mkdirSync(logsDir, { recursive: true });
  const reportPath = join(logsDir, "fallback-health.json");
  const logPath = join(logsDir, "fallback-health.log");

  const previous = loadPrevious(reportPath);
  // Racha de "degraded" por modelo: un 429 aislado es ruido, pero 3 seguidos
  // ya es un modelo que en la practica no sirve.
  const prevModels = previous && previous.chainKey === chainKey ? previous.models || [] : [];
  const prevStreaks = new Map(prevModels.map((m) => [`${m.providerID}/${m.modelID}`, m.degradedStreak || 0]));
  for (const r of results) {
    const key = `${r.providerID}/${r.modelID}`;
    r.degradedStreak = r.state === "degraded" ? (prevStreaks.get(key) || 0) + 1 : 0;
  }
  const transitions = computeTransitions(previous, results, chainKey);
  const checkedAt = new Date().toISOString();

  const report = { checkedAt, chainKey, configSource: configPath, summary, models: results, transitions };
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  const dead = results.filter((r) => r.state === "dead");
  const degraded = results.filter((r) => r.state === "degraded");
  const quota = results.filter((r) => r.state === "quota");
  const fmt = (r) => `${r.providerID}/${r.modelID}${r.httpStatus ? `(${r.httpStatus})` : ""}`;
  const line = [
    checkedAt,
    `ok=${summary.ok}`,
    `degraded=${summary.degraded}`,
    `quota=${summary.quota}`,
    `dead=${summary.dead}`,
    `| muertos: ${dead.length ? dead.map(fmt).join(", ") : "ninguno"}`,
    `| degradados: ${degraded.length ? degraded.map(fmt).join(", ") : "ninguno"}`,
    `| cuota agotada: ${quota.length ? quota.map(fmt).join(", ") : "ninguna"}`,
  ].join(" ");
  appendFileSync(logPath, `${line}\n`, "utf8");

  if (!OPT.quiet && !OPT.json) {
    console.log(`[fallback-health] ${configPath}`);
    for (const r of results) {
      const mark = r.state === "ok" ? "OK   " : r.state === "quota" ? "QUOTA" : r.state === "degraded" ? "WARN " : "DEAD ";
      const latency = r.latencyMs === null ? "-" : `${r.latencyMs}ms`;
      console.log(`  ${mark} ${fmt(r).padEnd(58)} ${latency.padStart(8)}  ${r.detail ?? ""}`);
    }
    console.log(
      `  resumen: ok=${summary.ok} degraded=${summary.degraded} quota=${summary.quota} dead=${summary.dead}`,
    );
    if (summary.quota > 0) {
      console.log(
        '  nota: "quota" = la API directa devuelve FreeUsageLimitError. La app puede seguir usando\n' +
          "        el tier free con otra cuota, asi que NO cuenta como falla ni dispara alerta.",
      );
    }
  }
  if (OPT.json) console.log(JSON.stringify(report, null, 2));

  // Alerta solo si cambio el conjunto de muertos (aparicion o recuperacion),
  // o si un modelo lleva 3 checks seguidos degradado (429 cronico = inservible).
  const deadTransitions = transitions.filter((t) => t.to === "dead" || t.from === "dead");
  const stuckDegraded = results.filter((r) => r.degradedStreak === 3);
  if (deadTransitions.length > 0 || stuckDegraded.length > 0) {
    const newlyDead = deadTransitions.filter((t) => t.to === "dead");
    const recovered = deadTransitions.filter((t) => t.from === "dead" && t.to !== "dead");
    const parts = [];
    if (newlyDead.length) parts.push(`CAIDOS: ${newlyDead.map((t) => `${t.providerID}/${t.modelID}`).join(", ")}`);
    if (recovered.length) parts.push(`RECUPERADOS: ${recovered.map((t) => `${t.providerID}/${t.modelID}`).join(", ")}`);
    if (stuckDegraded.length) {
      parts.push(`DEGRADADOS x3: ${stuckDegraded.map((r) => `${r.providerID}/${r.modelID}`).join(", ")}`);
    }
    toast("Cadena de fallback OpenCode", parts.join(" | "));
  }

  process.exit(dead.length > 0 ? 1 : 0);
}

main();
