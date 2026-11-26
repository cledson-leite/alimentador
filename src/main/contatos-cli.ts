import { readdirSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";

import { createClient } from "@supabase/supabase-js";

import { carregarEnv } from "../env";
import { importarContatos } from "../modules/contatos/application/importar-contatos.use-case";
import { lerArquivoDeResponsavel, lerPlanilhaDeContatos } from "../modules/contatos/infra/planilhas.adapter";
import { repositorioSupabase } from "../modules/contatos/infra/repositorio.adapter";
import { escreverSaidas } from "../modules/contatos/infra/saidas.csv";
import { validarAmbiente } from "../modules/importacao/domain/ambiente";

const DOWNLOADS = "C:/Users/csbet/Downloads";

async function principal() {
  const { values } = parseArgs({
    options: {
      "dry-run": { type: "boolean", default: false },
      producao: { type: "boolean", default: false },
      contatos: { type: "string", default: `${DOWNLOADS}/PLANILHA INFORMAÇÃO CONTATOS NOVA.xlsx` },
      responsavel: { type: "string", multiple: true },
      "sem-responsaveis": { type: "boolean", default: false },
      "so-responsaveis": { type: "boolean", default: false },
      cnpj: { type: "string" },
      saida: { type: "string", default: "saida" },
    },
    strict: true,
  });
  if (values["so-responsaveis"] && values["sem-responsaveis"]) throw new Error("--so-responsaveis e --sem-responsaveis não combinam.");
  const cnpjs = values.cnpj?.split(",").map((c) => c.replace(/\D/g, ""));
  if (cnpjs?.some((c) => c.length !== 14)) throw new Error("--cnpj aceita só CNPJs de 14 dígitos, separados por vírgula.");
  // Sem --responsavel: todo arquivo `<e-mail>.xlsx` da pasta Downloads é a carteira do perfil com esse e-mail.
  const arquivosResponsavel = values["sem-responsaveis"]
    ? []
    : (values.responsavel ?? readdirSync(DOWNLOADS).filter((f) => /^[^\s@]+@[^\s@]+\.[^\s@]+\.xlsx$/i.test(f)).map((f) => `${DOWNLOADS}/${f}`));

  const env = carregarEnv();
  // O dry-run também lê o banco (para achar clientes e o que já existe), então vale a mesma trava de ambiente; só a confirmação digitada é da gravação.
  const amb = validarAmbiente({ url: env.SUPABASE_URL, refProducao: env.SUPABASE_PROD_PROJECT_REF }, { producao: values.producao });
  if (amb.ambiente === "producao" && !values["dry-run"]) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const digitado = await rl.question(`PRODUÇÃO. Digite o ref do projeto (${amb.ref}) para confirmar: `);
    rl.close();
    if (digitado.trim() !== amb.ref) throw new Error("Confirmação não confere. Nada foi gravado.");
  }

  const contatos = values["so-responsaveis"] ? [] : await lerPlanilhaDeContatos(values.contatos);
  const responsaveis = await Promise.all(arquivosResponsavel.map(lerArquivoDeResponsavel));
  const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const resultado = await importarContatos(repositorioSupabase(client), { contatos, responsaveis }, { dryRun: values["dry-run"], cnpjs });

  const prefixo = `${values["so-responsaveis"] ? "responsaveis" : "contatos"}-${values["dry-run"] ? "simulacao" : "carga"}`;
  await escreverSaidas(values.saida, prefixo, resultado);
  const conta = (l: { resultado: string }[]) =>
    Object.entries(l.reduce<Record<string, number>>((a, x) => ({ ...a, [x.resultado]: (a[x.resultado] ?? 0) + 1 }), {})).map(([k, v]) => `${k} ${v}`).join(", ") || "nenhum";
  console.log(`${values["dry-run"] ? "[dry-run] " : ""}Ambiente: ${amb.ambiente}. Responsáveis lidos de: ${arquivosResponsavel.length} arquivo(s).`);
  console.log(`contatos: ${conta(resultado.contatos)}`);
  console.log(`destinos de envio: ${conta(resultado.destinos)}`);
  console.log(`forma de envio: ${conta(resultado.formas)}`);
  console.log(`responsáveis: ${conta(resultado.responsaveis)}`);
  console.log(`pendências: ${conta(resultado.pendencias)}. CSVs em ${values.saida}/${prefixo}-*.csv`);
}

principal().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
