import { randomUUID } from "node:crypto";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createClient } from "@supabase/supabase-js";
import { PDFDocument } from "pdf-lib";

import { cnpjValido } from "../../../../test-support/cenario";
import { carregarEnv } from "../../../env";

import { cadastroSupabase, conferirSchema } from "./cadastro.adapter";

const env = (() => {
  try {
    return carregarEnv();
  } catch {
    return null;
  }
})();

async function supabaseLocalNoAr(): Promise<boolean> {
  if (!env || !/127\.0\.0\.1|localhost/.test(env.SUPABASE_URL)) return false;
  try {
    return (await fetch(`${env.SUPABASE_URL}/rest/v1/`, { signal: AbortSignal.timeout(2000) })).status < 500;
  } catch {
    return false;
  }
}

describe("cadastroSupabase (Supabase local)", () => {
  const CNPJ = cnpjValido("900000200001");
  let noAr = false;
  const client = env ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }) : null!;
  const id = randomUUID();
  const caminho = `${id}/contrato-social/teste.pdf`;

  beforeAll(async () => {
    noAr = await supabaseLocalNoAr();
    if (!noAr) console.warn("Supabase local fora do ar: testes de integração do cadastro foram pulados.");
  });

  afterAll(async () => {
    if (!noAr) return;
    await client.from("clientes").delete().eq("cnpj", CNPJ);
    await client.storage.from("documentos-clientes").remove([caminho]);
  });

  it("confere na partida que a RPC criar_cliente e o bucket existem", async () => {
    if (!noAr) return;
    await expect(conferirSchema(client)).resolves.toBeUndefined();
  });

  it("envia o arquivo, grava o cliente pela RPC e passa a reconhecê-lo pelo CNPJ", async () => {
    if (!noAr) return;
    const cadastro = cadastroSupabase(client);
    const dir = await mkdtemp(join(tmpdir(), "cad-"));
    const arq = join(dir, "teste.pdf");
    await writeFile(arq, await (await PDFDocument.create()).save());

    expect(await cadastro.existe(CNPJ)).toBe(false);
    await cadastro.enviar(caminho, { id: "x", nome: "teste.pdf", formato: "pdf", caminho: arq });
    await cadastro.enviar(caminho, { id: "x", nome: "teste.pdf", formato: "pdf", caminho: arq }); // reenvio não falha
    await cadastro.criarCliente({
      id,
      empresa: "Teste Importador LTDA",
      cnpj: CNPJ,
      regime: "simples_nacional",
      contratoSocialCaminho: caminho,
      alteracoes: [],
    });

    expect(await cadastro.existe(CNPJ)).toBe(true);
    await cadastro.remover([caminho]);
    const { data } = await client.storage.from("documentos-clientes").list(`${id}/contrato-social`);
    expect(data).toEqual([]);
  });
});
