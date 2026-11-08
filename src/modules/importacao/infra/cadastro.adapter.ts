import { readFile } from "node:fs/promises";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ArquivoDocumento, CadastroPort } from "../application/ports/portas";

const BUCKET = "documentos-clientes";
const LIMITE = 20 * 1024 * 1024; // limite do bucket (migration 20261030120000)

const TIPOS: Partial<Record<ArquivoDocumento["formato"], string>> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

const falhou = (etapa: string, error: { message: string } | null) => {
  if (error) throw new Error(`${etapa}: ${error.message}`);
};

/** Para a execução com mensagem clara se a RPC ou o bucket que o importador usa não existirem. */
export async function conferirSchema(client: SupabaseClient): Promise<void> {
  const bucket = await client.storage.getBucket(BUCKET);
  if (bucket.error) throw new Error(`Bucket "${BUCKET}" não encontrado: ${bucket.error.message}`);
  // UUID nulo + CNPJ vazio: a função existe se o erro vier da validação, não de "function not found".
  const rpc = await client.rpc("criar_cliente", {
    p_id: "00000000-0000-0000-0000-000000000000",
    p_empresa: "",
    p_cnpj: "",
    p_regime: "simples_nacional",
    p_contrato_social_caminho: "",
    p_alteracoes: [],
  });
  if (rpc.error && /could not find the function|does not exist/i.test(rpc.error.message)) {
    throw new Error(`RPC criar_cliente não encontrada: ${rpc.error.message}`);
  }
}

export function cadastroSupabase(client: SupabaseClient): CadastroPort {
  return {
    existe: async (cnpj) => {
      const { data, error } = await client.from("clientes").select("id").eq("cnpj", cnpj).maybeSingle();
      falhou("busca do cliente", error);
      return data !== null;
    },
    enviar: async (caminho, origem) => {
      const tipo = TIPOS[origem.formato];
      if (!tipo || !origem.caminho) throw new Error(`formato sem suporte no Storage: ${origem.formato}`);
      const bytes = await readFile(origem.caminho);
      if (bytes.length > LIMITE) throw new Error("arquivo acima de 20 MB");
      // remove + upload (sem `upsert`): o ON CONFLICT do upsert falha no Storage local.
      await client.storage.from(BUCKET).remove([caminho]);
      const { error } = await client.storage.from(BUCKET).upload(caminho, bytes, { contentType: tipo });
      falhou(`upload de ${caminho}`, error);
    },
    remover: async (caminhos) => {
      if (caminhos.length === 0) return;
      const { error } = await client.storage.from(BUCKET).remove(caminhos);
      falhou("remoção de arquivos", error);
    },
    criarCliente: async (d) => {
      const { error } = await client.rpc("criar_cliente", {
        p_id: d.id,
        p_empresa: d.empresa,
        p_cnpj: d.cnpj,
        p_regime: d.regime,
        p_contrato_social_caminho: d.contratoSocialCaminho,
        p_email: null,
        p_alteracoes: d.alteracoes.map((a) => ({ id: a.id, numero: a.numero, data: a.data, arquivoCaminho: a.arquivoCaminho })),
      });
      falhou("criar_cliente", error);
    },
  };
}
