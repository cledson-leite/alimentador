// yarn check:naming  →  falha se algum nome sob src/ violar as regras de nomenclatura
import { readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.argv[2] ?? "src";
const KEBAB = "[a-z0-9]+(?:-[a-z0-9]+)*";
const DIR = new RegExp(`^(?:${KEBAB}|\\[\\.{0,3}${KEBAB}\\]|\\(${KEBAB}\\)|@${KEBAB})$`); // kebab, [param], (grupo), @slot
const FILE = new RegExp(`^${KEBAB}(?:\\.${KEBAB})*\\.(?:ts|tsx|css)$`); // nome[.papel][.spec|.test].ext
const NEXT =
  /^(layout|page|loading|error|global-error|not-found|template|default|route|globals|robots|sitemap)\.(tsx?|css)$/;
const NEXT_ROOT = /^(middleware|proxy)\.ts$/;
const VENDOR = /\/presentation\/(components\/ui|lib|hooks)\//; // gerado pelo shadcn: só kebab-case

// pasta → papéis permitidos no sufixo (`nome.<papel>.ts`)
const ROLES = [
  [/\/domain\/entities\//, ["entity"]],
  [/\/domain\/aggregates\//, ["aggregate"]],
  [/\/domain\/builders\//, ["builder"]],
  [/\/domain\/value-objects\//, ["vo"]],
  [/\/domain\/services\//, ["service"]],
  [/\/domain\/events\//, ["event"]],
  [/\/(domain|shared)\/errors\//, ["error"]],
  [/\/application\/ports\/(in|out)\//, ["provider", "repository"]],
  [/\/application\/use-cases\//, ["use-case"]],
  [/\/(application|infra|shared)\/dtos\//, ["dto"]],
  [/\/(application|infra)\/mappers\//, ["mapper"]],
  [/\/infra\/repositories\//, ["repository"]],
  [/\/infra\/(gateways|realtime)\//, ["gateway"]],
  [/\/presentation\/webhooks\//, ["webhook"]],
  [
    /\/presentation\/view-models\//,
    [
      "actions",
      "server",
      "queries",
      "realtime",
      "store",
      "schema",
      "presenter",
      "hook",
      "container",
    ],
  ],
  [/\/presentation\/stores\//, ["store"]],
  [/\/presentation\/providers\//, ["provider", "providers"]],
  [/\/presentation\/components\/(atoms|molecules|organisms|templates)\//, ["component"]],
  [/\/presentation\/components\/pages\//, ["page"]],
  [/\/presentation\/auth\//, ["factory", "provider"]],
  [/\/main\//, ["factory"]],
];

const erros = [];

function percorrer(dir) {
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const caminho = join(dir, entrada.name).replaceAll("\\", "/");
    if (entrada.isDirectory()) {
      if (!DIR.test(entrada.name)) erros.push(`${caminho}: diretório fora de kebab-case`);
      percorrer(caminho);
    } else if (/\.(ts|tsx|css)$/.test(entrada.name)) {
      verificar(caminho, entrada.name);
    }
  }
}

function verificar(caminho, arquivo) {
  const rel = `/${caminho}`;
  if (rel.includes("/src/app/")) {
    if (!NEXT.test(arquivo))
      erros.push(`${caminho}: em app/ só são permitidos arquivos de convenção do Next.js`);
    return;
  }
  if (/^\/src\/[^/]+$/.test(rel) && NEXT_ROOT.test(arquivo)) return;
  if (!FILE.test(arquivo)) return void erros.push(`${caminho}: arquivo fora de kebab-case`);
  if (VENDOR.test(rel)) return;
  const regra = ROLES.find(([re]) => re.test(rel));
  if (!regra) return;
  const partes = arquivo.split(".").slice(0, -1); // sem extensão
  if (["spec", "test"].includes(partes.at(-1))) partes.pop(); // *.spec = unitário/componente; *.test = integração
  const papel = partes.length > 1 ? partes.at(-1) : undefined;
  if (!regra[1].includes(papel))
    erros.push(`${caminho}: sufixo deve ser um de .${regra[1].join(", .")}`);
}

percorrer(ROOT);
erros.forEach((e) => console.error(e));
if (erros.length) process.exit(1);
console.log("nomenclatura ok");
