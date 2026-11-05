// Gera .agents/ como cópia isolada de .claude/ (para outro LLM executar os mesmos fluxos sem depender do Claude Code).
// Uso: node .claude/scripts/sincronizar-agents.mjs [--verificar]
// Espelha skills, agents, scripts, fluxos e hooks, mais comandos.md. Nos arquivos de texto, os caminhos .claude/<pasta> viram .agents/<pasta>,
// menos nas linhas de "graphify install" (instalação do Graphify no Claude Code). Não copia settings*.json, worktrees nem state.
// --verificar só lista o que mudaria e termina com código 1 se o .agents estiver defasado.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const ORIGEM = ".claude";
const DESTINO = ".agents";
const PASTAS = ["skills", "agents", "scripts", "fluxos", "hooks"];
const ARQUIVOS = ["comandos.md"]; // arquivos soltos na raiz de .claude
const TEXTO = new Set([".md", ".mjs", ".js", ".cjs", ".py", ".toml", ".yml", ".yaml", ".json", ".css", ".ts", ".tsx", ".sql", ".txt", ".html", ".sh", ""]);
const CAMINHO = /\.claude\/(skills|agents|scripts|fluxos|hooks|state)\b/g;
const verificar = process.argv.includes("--verificar");

const extensao = (f) => (f.includes(".") ? f.slice(f.lastIndexOf(".")) : "");
const arquivos = (dir, acc = []) => {
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome);
    if (statSync(p).isDirectory()) arquivos(p, acc);
    else acc.push(p);
  }
  return acc;
};
const reescrever = (texto) =>
  texto
    .split("\n")
    .map((l) => (/graphify (hook )?install/.test(l) ? l : l.replace(CAMINHO, ".agents/$1")))
    .join("\n");

const esperados = new Map(); // caminho no destino -> conteúdo (Buffer)
for (const pasta of PASTAS) {
  const raiz = join(ORIGEM, pasta);
  if (!existsSync(raiz)) continue;
  for (const f of arquivos(raiz)) {
    const bruto = readFileSync(f);
    const destino = join(DESTINO, relative(ORIGEM, f));
    esperados.set(destino, TEXTO.has(extensao(f)) ? Buffer.from(reescrever(bruto.toString("utf8")), "utf8") : bruto);
  }
}

for (const nome of ARQUIVOS) {
  const f = join(ORIGEM, nome);
  if (existsSync(f)) esperados.set(join(DESTINO, nome), Buffer.from(reescrever(readFileSync(f, "utf8")), "utf8"));
}

const sobras = [];
for (const pasta of PASTAS) {
  const raiz = join(DESTINO, pasta);
  if (existsSync(raiz)) for (const f of arquivos(raiz)) if (!esperados.has(f)) sobras.push(f);
}
const mudam = [...esperados].filter(([d, c]) => !existsSync(d) || !readFileSync(d).equals(c)).map(([d]) => d);

if (verificar) {
  console.log(`${mudam.length} arquivo(s) a atualizar, ${sobras.length} a remover`);
  mudam.slice(0, 15).forEach((f) => console.log(`  atualiza ${f}`));
  sobras.slice(0, 15).forEach((f) => console.log(`  remove   ${f}`));
  process.exit(mudam.length || sobras.length ? 1 : 0);
}
for (const [d, c] of esperados) {
  mkdirSync(join(d, ".."), { recursive: true });
  if (!existsSync(d) || !readFileSync(d).equals(c)) writeFileSync(d, c);
}
for (const f of sobras) rmSync(f);
console.log(`${esperados.size} arquivos em ${DESTINO}/ (${mudam.length} atualizados, ${sobras.length} removidos)`);
