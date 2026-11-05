// Mapeia a pilha de branches que dependem de uma branch de PR (só leitura).
// Uso: node .claude/scripts/mapear-pilha.mjs <branch-da-pr>
// Saída: uma linha por branch, em ordem topológica (pai antes de filho):
//   branch | pai | tip (local) | remoto (origin/<branch> ou -) | PR aberta (nº ou -)
import { execFileSync } from "node:child_process";

const git = (...a) => execFileSync("git", a, { encoding: "utf8" }).trim();
const tenta = (...a) => {
  try {
    return git(...a);
  } catch {
    return "";
  }
};
const ancestral = (a, b) => {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", a, b], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};

const alvo = process.argv[2];
if (!alvo) {
  console.error("uso: node .claude/scripts/mapear-pilha.mjs <branch-da-pr>");
  process.exit(1);
}
const tipAlvo = git("rev-parse", alvo);

const locais = git("for-each-ref", "--format=%(refname:short)", "refs/heads")
  .split("\n")
  .filter((b) => b && b !== alvo && !b.startsWith("backup/"));
const tips = Object.fromEntries([alvo, ...locais].map((b) => [b, git("rev-parse", b)]));
const dependentes = locais.filter((b) => tips[b] !== tipAlvo && ancestral(tipAlvo, tips[b]));

// Pai direto: entre {alvo} + as outras dependentes, a de mais commits que ainda é ancestral da branch.
const pai = {};
for (const b of dependentes) {
  const candidatos = [alvo, ...dependentes.filter((c) => c !== b)].filter(
    (c) => tips[c] !== tips[b] && ancestral(tips[c], tips[b]),
  );
  candidatos.sort((x, y) => Number(git("rev-list", "--count", tips[y])) - Number(git("rev-list", "--count", tips[x])));
  pai[b] = candidatos[0];
}

const prs = (() => {
  try {
    const j = execFileSync("gh", ["pr", "list", "--state", "open", "--json", "number,headRefName"], { encoding: "utf8" });
    return Object.fromEntries(JSON.parse(j).map((p) => [p.headRefName, p.number]));
  } catch {
    return {};
  }
})();

const ordem = [];
const visita = (b) => {
  ordem.push(b);
  dependentes.filter((d) => pai[d] === b).forEach(visita);
};
visita(alvo);

console.log("branch | pai | tip | remoto | PR aberta");
for (const b of ordem) {
  const remoto = tenta("rev-parse", "--verify", "--quiet", `origin/${b}`) || "-";
  console.log([b, pai[b] ?? "(a PR)", tips[b].slice(0, 8), remoto === "-" ? "-" : remoto.slice(0, 8), prs[b] ?? "-"].join(" | "));
}
const orfas = dependentes.filter((b) => !ordem.includes(b));
if (orfas.length) console.log(`AVISO sem pai resolvido: ${orfas.join(", ")}`);

// Branches com o mesmo tip de outra não entram na árvore (não dá para ordenar pai e filho): avise, não descarte em silêncio.
const porTip = {};
for (const b of [alvo, ...locais]) (porTip[tips[b]] ??= []).push(b);
for (const grupo of Object.values(porTip)) {
  const dependem = grupo.some((b) => b === alvo || dependentes.includes(b));
  if (grupo.length > 1 && (grupo.includes(alvo) || dependem || ancestral(tipAlvo, tips[grupo[0]]))) {
    console.log(`AVISO mesmo tip (${tips[grupo[0]].slice(0, 8)}): ${grupo.join(", ")}`);
  }
}
