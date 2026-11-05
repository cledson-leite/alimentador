// Checklist de infraestrutura e segredos de um release candidate (só leitura).
// Uso: node .claude/scripts/checar-ambiente.mjs [base-do-diff, padrão origin/homolog]
// Saída: linhas "OK|FALHA|AVISO <item>"; código de saída 1 se houver FALHA.
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const base = process.argv[2] ?? "origin/homolog";
const sh = (cmd, args) => execFileSync(cmd, args, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
const linhas = [];
const marca = (nivel, texto) => linhas.push(`${nivel} ${texto}`);

const arquivos = (dir, re, acc = []) => {
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome);
    if (nome === "node_modules" || nome === ".next") continue;
    if (statSync(p).isDirectory()) arquivos(p, re, acc);
    else if (re.test(p)) acc.push(p);
  }
  return acc;
};
const achados = (re, textos) => [...new Set(textos.flatMap((t) => [...t.matchAll(re)].map((m) => m[1])))];

// 1. Variáveis de ambiente: usadas no código x documentadas no .env.example
const usadas = achados(
  /process\.env\.([A-Z0-9_]+)/g,
  arquivos("src", /\.(ts|tsx)$/)
    .filter((f) => !/\.(spec|test)\.tsx?$/.test(f)) // testes leem variáveis próprias
    .map((f) => readFileSync(f, "utf8")),
).filter((n) => !["NODE_ENV", "NEXT_RUNTIME", "CI"].includes(n) && !/^VERCEL_/.test(n)); // VERCEL_* a plataforma injeta
const exemplo = achados(/^([A-Z0-9_]+)=/gm, [readFileSync(".env.example", "utf8")]);
for (const n of usadas) if (!exemplo.includes(n)) marca("FALHA", `variável ${n} usada em src/ e ausente do .env.example`);
for (const n of exemplo) if (!usadas.includes(n)) marca("AVISO", `variável ${n} no .env.example sem uso em src/ (PORT e as lidas por scripts são esperadas)`);

// 2. Secrets e variáveis dos workflows x os cadastrados no GitHub (só nomes)
const wf = arquivos(".github/workflows", /\.ya?ml$/).map((f) => readFileSync(f, "utf8"));
const usaSecrets = achados(/secrets\.([A-Z0-9_]+)/g, wf).filter((n) => n !== "GITHUB_TOKEN");
const usaVars = achados(/vars\.([A-Z0-9_]+)/g, wf);
const lista = (tipo) => {
  try {
    return JSON.parse(sh("gh", [tipo, "list", "--json", "name"])).map((x) => x.name);
  } catch {
    return null;
  }
};
for (const [tipo, usados] of [["secret", usaSecrets], ["variable", usaVars]]) {
  const cadastrados = lista(tipo);
  if (!cadastrados) marca("AVISO", `não consegui listar ${tipo}s do GitHub (gh sem acesso): nomes não verificados`);
  else for (const n of usados) marca(cadastrados.includes(n) ? "OK" : "FALHA", `${tipo} ${n} usado nos workflows${cadastrados.includes(n) ? "" : " e não cadastrado no GitHub"}`);
}
marca("AVISO", "variáveis dos ambientes da Vercel não verificadas (Vercel CLI ausente): conferir à mão");

// 3. Segredos no diff (linhas adicionadas desde a base)
const diff = sh("git", ["diff", "-U0", `${base}..HEAD`, "--", ".", ":!*.lock", ":!*.pdf", ":!supabase/arquivos-seed"]);
const adicionadas = diff.split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++"));
const demo = (jwt) => {
  try {
    return JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString()).iss === "supabase-demo";
  } catch {
    return false;
  }
};
const suspeitas = [];
for (const l of adicionadas) {
  for (const jwt of l.match(/eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}/g) ?? []) if (!demo(jwt)) suspeitas.push(["JWT que não é a chave demo do Supabase", l]);
  if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(l)) suspeitas.push(["chave privada", l]);
  if (/\b(sk_live_|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{30,})/.test(l)) suspeitas.push(["token de provedor", l]);
  if (/NEXT_PUBLIC_[A-Z0-9_]*(SECRET|SERVICE_ROLE|PRIVATE|TOKEN)/.test(l)) suspeitas.push(["variável pública com nome de segredo", l]);
}
if (suspeitas.length) for (const [tipo, l] of suspeitas.slice(0, 20)) marca("FALHA", `${tipo} no diff: ${l.slice(0, 90)}`);
else marca("OK", `nenhum segredo nas ${adicionadas.length} linhas adicionadas desde ${base}`);

console.log(linhas.join("\n"));
process.exit(linhas.some((l) => l.startsWith("FALHA")) ? 1 : 0);
