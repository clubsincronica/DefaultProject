// graphify OpenCode plugin (V2)
// Injects a knowledge graph reminder before the first shell command of the
// session, when the graph exists.
//
// IMPORTANT: keep the reminder string free of backticks and $(...) constructs.
// The hook prepends `echo "<reminder>" ; <cmd>` to the user's command;
// backticks inside the double-quoted echo trigger command substitution,
// which both corrupts tool output and silently executes the very graphify
// command we are only suggesting. Plain words render fine in opencode's TUI.
//
// V2 port (2026-10-29): V1 returned a "tool.execute.before" hook from a plugin
// function. V2 uses Plugin.define + ctx.shell.hook("create.before"), which
// exposes the mutable shell command. See the V2 plugin migration guide.
import { Plugin } from "@opencode/plugin"
import { existsSync } from "node:fs"
import { join } from "node:path"

export default Plugin.define({
  id: "graphify",
  async setup(ctx) {
    let reminded = false

    await ctx.shell.hook("create.before", (event) => {
      if (reminded) return
      if (!existsSync(join(ctx.location.directory, "graphify-out", "graph.json"))) return

      // ';' not '&&' — Windows PowerShell 5.1 rejects '&&' as a statement
      // separator, breaking the first shell command of the session (#1646).
      event.command =
        'echo "[graphify] graph at graphify-out/graph.json (344KB - DO NOT read raw). Use graphify query (scoped subgraph) or GRAPH_REPORT.md (7KB) for broad context." ; ' +
        event.command
      reminded = true
    })
  },
})
