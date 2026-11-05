// Apaga os backups de branch (refs/backup/pre-merge<n>/<branch>) cuja branch já tem PR mergeada.
// Uso: node .agents/scripts/limpar-backups.mjs [--dry]
// Backup de branch sem PR ou com PR aberta é mantido: ainda protege um rebase em andamento.
import { execFileSync } from "node:child_process";

const dry = process.argv.includes("--dry");
const git = (...a) => execFileSync("git", a, { encoding: "utf8" }).trim();

const refs = git("for-each-ref", "--format=%(refname)", "refs/backup").split("\n").filter(Boolean);
if (!refs.length) {
  console.log("nenhum backup");
  process.exit(0);
}

const prs = JSON.parse(
  execFileSync("gh", ["pr", "list", "--state", "all", "--limit", "500", "--json", "headRefName,state"], { encoding: "utf8" }),
);
const estados = {};
for (const p of prs) (estados[p.headRefName] ??= new Set()).add(p.state);

const apagar = [];
for (const ref of refs) {
  const m = ref.match(/^refs\/backup\/[^/]+\/(.+)$/);
  const e = m && estados[m[1]];
  const mergeada = e && e.has("MERGED") && !e.has("OPEN");
  console.log(`${mergeada ? "apaga " : "mantém"} ${ref}`);
  if (mergeada) apagar.push(ref);
}

if (!dry && apagar.length) {
  execFileSync("git", ["update-ref", "--stdin"], { input: apagar.map((r) => `delete ${r}\n`).join("") });
}
console.log(`${dry ? "(simulação) " : ""}${apagar.length} apagado(s), ${refs.length - apagar.length} mantido(s)`);
