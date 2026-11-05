// Hook PreToolUse: repassa a chamada ao `graphify hook-guard`. Se o Graphify não estiver instalado, não faz nada (fail-open).
// Uso: node .agents/hooks/graphify-guard.mjs <argumentos do hook-guard>   ex.: search | read --strict
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

let entrada = "";
try {
  entrada = readFileSync(0, "utf8");
} catch {}

const r = spawnSync("graphify", ["hook-guard", ...process.argv.slice(2)], { input: entrada, encoding: "utf8" });
if (r.error) process.exit(0); // graphify ausente ou fora do PATH
if (r.stdout) process.stdout.write(r.stdout);
if (r.stderr) process.stderr.write(r.stderr);
process.exit(r.status ?? 0);
