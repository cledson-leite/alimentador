import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";

import { createClient } from "@supabase/supabase-js";

import { carregarEnv } from "../env";
import { executarImportacao } from "../modules/importacao/application/executar-importacao.use-case";
import { validarAmbiente } from "../modules/importacao/domain/ambiente";
import { cadastroSupabase, conferirSchema } from "../modules/importacao/infra/cadastro.adapter";
import { documentosDoDisco } from "../modules/importacao/infra/documentos.adapter";
import { leitorDeArquivos } from "../modules/importacao/infra/leitor.adapter";
import { leitorComModelo } from "../modules/importacao/infra/modelo.adapter";
import { leitorComOcr } from "../modules/importacao/infra/ocr.adapter";
import { planilhasXlsx } from "../modules/importacao/infra/planilhas.adapter";
import { pastaPorCnpjDoEstado } from "../modules/importacao/infra/estado-final.parser";
import { regimesManuaisDoCsv } from "../modules/importacao/infra/regimes-manuais.parser";
import { escreverSaidas } from "../modules/importacao/infra/saidas.csv";

import { lerOpcoes } from "./opcoes";

import type { CadastroPort } from "../modules/importacao/application/ports/portas";

const SEM_EFEITO: CadastroPort = {
  existe: async () => false,
  enviar: async () => {},
  remover: async () => {},
  criarCliente: async () => {},
};

/** Pasta aceita por empresa no download, se o estado final existir; sem ele, vale só a regra de casamento. */
function lerPastaPorCnpj(arquivo: string): Map<string, string> | undefined {
  return existsSync(arquivo) ? pastaPorCnpjDoEstado(readFileSync(arquivo, "utf-8")) : undefined;
}

async function principal() {
  const op = lerOpcoes(process.argv.slice(2));

  let cadastro = SEM_EFEITO;
  if (!op.dryRun) {
    const env = carregarEnv();
    const amb = validarAmbiente({ url: env.SUPABASE_URL, refProducao: env.SUPABASE_PROD_PROJECT_REF }, { producao: op.producao });
    if (amb.ambiente === "producao") {
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      const digitado = await rl.question(`PRODUÇÃO. Digite o ref do projeto (${amb.ref}) para confirmar: `);
      rl.close();
      if (digitado.trim() !== amb.ref) throw new Error("Confirmação não confere. Nada foi gravado.");
    }
    const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    await conferirSchema(client);
    cadastro = cadastroSupabase(client);
  }

  const manifestos = readdirSync(op.documentos)
    .filter((f) => /^_selecionados\d*\.json$/.test(f))
    .map((f) => `${op.documentos}/${f}`);

  // Regime informado à mão (só vale para quem não tem regime na SN nem no tributário). Valor inválido interrompe aqui.
  const regimesManuais = existsSync(op.regimes) ? regimesManuaisDoCsv(readFileSync(op.regimes, "utf-8")) : undefined;
  if (regimesManuais) console.log(`Regimes manuais lidos de ${op.regimes}: ${regimesManuais.size}`);

  // OCR é local (Tesseract na própria máquina) e só roda onde a leitura normal não basta.
  const comOcr = op.semOcr ? { ...leitorDeArquivos(), encerrar: async () => {} } : leitorComOcr(leitorDeArquivos(), { cache: op.ocrCache });
  // Segunda leitura pelo modelo: só com --permitir-api, só para o que o OCR não leu. No dry-run só conta, nada é enviado.
  const apiKey = op.permitirApi && !op.dryRun ? carregarEnv().ANTHROPIC_API_KEY : undefined;
  if (op.permitirApi && !op.dryRun && !apiKey) throw new Error("--permitir-api exige ANTHROPIC_API_KEY no .env.");
  const leitor = op.permitirApi ? leitorComModelo(comOcr, { maxChamadas: op.maxApi, simular: op.dryRun, apiKey }) : comOcr;
  const resultado = await executarImportacao(
    {
      planilhas: planilhasXlsx({ lista: op.lista, sn: op.sn, tributario: op.tributario }),
      documentos: documentosDoDisco(op.documentos, manifestos),
      leitor,
      cadastro,
      pastaPorCnpj: lerPastaPorCnpj(`${op.documentos}/_estado-final.csv`),
      regimesManuais,
    },
    { cnpjs: op.cnpjs },
  );
  await leitor.encerrar();
  if (op.permitirApi) console.log(`${op.dryRun ? "[dry-run] arquivos que iriam" : "Arquivos enviados"} ao modelo: ${(leitor as ReturnType<typeof leitorComModelo>).chamadas()}`);
  await escreverSaidas(op.saida, resultado);

  console.log(
    `${op.dryRun ? "[dry-run] " : ""}carregadas: ${resultado.carregadas.length} · falhas: ${resultado.falhas.length} · ` +
      `regime a confirmar: ${resultado.regimeAConfirmar.length} · pessoas físicas: ${resultado.pessoasFisicas.length} · ` +
      `puladas: ${resultado.puladas.length}. CSVs em ${op.saida}/`,
  );
}

principal().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
