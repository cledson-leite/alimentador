import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Canal } from "../domain/contato";
import type { ClienteDb, ContatoDb, DestinoDb, EstadoDb, PerfilDb, RepositorioPort } from "../application/ports";

const LOTE = 100;
const PAGINA = 1000;

const falhou = (etapa: string, error: { message: string } | null) => {
  if (error) throw new Error(`${etapa}: ${error.message}`);
};

const lotes = <T>(itens: T[]): T[][] => Array.from({ length: Math.ceil(itens.length / LOTE) }, (_, i) => itens.slice(i * LOTE, (i + 1) * LOTE));

/** Lê todas as linhas de uma consulta em lotes de chaves, paginando (o PostgREST corta em 1000 linhas). */
async function lerTudo<T>(chaves: string[], consulta: (lote: string[], de: number, ate: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const saida: T[] = [];
  for (const lote of lotes(chaves)) {
    for (let de = 0; ; de += PAGINA) {
      const { data, error } = await consulta(lote, de, de + PAGINA - 1);
      falhou("leitura", error);
      saida.push(...(data ?? []));
      if ((data?.length ?? 0) < PAGINA) break;
    }
  }
  return saida;
}

/**
 * Escreve direto nas tabelas com a service_role (as RPCs de contato dependem do usuário logado e do setor dele).
 * Os gatilhos do banco continuam valendo: telefone com DDD, contato único por WhatsApp/e-mail no cliente,
 * responsável = funcionário ativo do setor. Contato novo nasce com `dono_setor = simples_nacional`.
 */
export function repositorioSupabase(client: SupabaseClient): RepositorioPort {
  return {
    clientesPorCnpj: async (cnpjs) => {
      const linhas = await lerTudo<{ id: string; empresa: string; cnpj: string }>(cnpjs, (l, de, ate) => client.from("clientes").select("id, empresa, cnpj").in("cnpj", l).range(de, ate));
      return new Map(linhas.map((c): [string, ClienteDb] => [c.cnpj, { id: c.id, empresa: c.empresa }]));
    },

    estado: async (clienteIds): Promise<EstadoDb> => {
      const contatos = await lerTudo<{ id: string; cliente_id: string; telefone: string | null; email: string | null }>(clienteIds, (l, de, ate) =>
        client.from("cliente_contatos").select("id, cliente_id, telefone, email").in("cliente_id", l).range(de, ate),
      );
      const setores = await lerTudo<{ contato_id: string; setor: string }>(
        contatos.map((c) => c.id),
        (l, de, ate) => client.from("cliente_contato_setores").select("contato_id, setor").in("contato_id", l).range(de, ate),
      );
      const destinos = await lerTudo<{ cliente_id: string; setor: string; contato_id: string }>(clienteIds, (l, de, ate) =>
        client.from("destinos_de_envio").select("cliente_id, setor, contato_id").in("cliente_id", l).is("tipo", null).range(de, ate),
      );
      const responsaveis = await lerTudo<{ cliente_id: string; responsavel_id: string }>(clienteIds, (l, de, ate) =>
        client.from("cliente_responsaveis").select("cliente_id, responsavel_id").eq("setor", "simples_nacional").in("cliente_id", l).range(de, ate),
      );
      const formas = await lerTudo<{ cliente_id: string; forma_envio: Canal }>(clienteIds, (l, de, ate) =>
        client.from("cliente_cadastro_operacional_sn").select("cliente_id, forma_envio").in("cliente_id", l).range(de, ate),
      );
      return {
        contatos: contatos.map((c): ContatoDb => ({ id: c.id, clienteId: c.cliente_id, telefone: c.telefone, email: c.email })),
        setores: new Set(setores.map((s) => `${s.contato_id}|${s.setor}`)),
        destinos: destinos.map((d): DestinoDb => ({ clienteId: d.cliente_id, setor: d.setor, contatoId: d.contato_id })),
        responsaveis: new Map(responsaveis.map((x) => [x.cliente_id, x.responsavel_id])),
        formas: new Map(formas.map((f) => [f.cliente_id, f.forma_envio])),
      };
    },

    perfisPorEmail: async (emails) => {
      const linhas = await lerTudo<{ id: string; nome: string; email: string; papel: string; setor: string; desativado_em: string | null }>(emails, (l, de, ate) =>
        client.from("perfis").select("id, nome, email, papel, setor, desativado_em").in("email", l).range(de, ate),
      );
      return new Map(linhas.map((p): [string, PerfilDb] => [p.email.toLowerCase(), { id: p.id, nome: p.nome, papel: p.papel, setor: p.setor, desativado: p.desativado_em !== null }]));
    },

    criarContato: async (d) => {
      const id = randomUUID(); // a coluna não tem default: quem insere gera o id (a RPC contato_gravar faz o mesmo)
      const { error } = await client
        .from("cliente_contatos")
        .insert({ id, cliente_id: d.clienteId, nome: d.nome, telefone: d.telefone ?? null, email: d.email ?? null, dono_setor: "simples_nacional" });
      falhou(`criar contato ${d.nome}`, error);
      return id;
    },

    ligarSetor: async (contatoId, setor) => {
      const { error } = await client.from("cliente_contato_setores").upsert({ contato_id: contatoId, setor }, { onConflict: "contato_id,setor", ignoreDuplicates: true });
      falhou(`ligar contato ao setor ${setor}`, error);
    },

    criarDestino: async (d) => {
      const { error } = await client.from("destinos_de_envio").insert({ cliente_id: d.clienteId, setor: d.setor, tipo: null, contato_id: d.contatoId, canal: d.canal });
      falhou(`criar destino de envio (${d.setor})`, error);
    },

    definirResponsavel: async (clienteId, perfilId) => {
      const { error } = await client.from("cliente_responsaveis").insert({ cliente_id: clienteId, setor: "simples_nacional", responsavel_id: perfilId });
      falhou("definir responsável", error);
    },

    definirForma: async (clienteId, forma) => {
      const { error } = await client.from("cliente_cadastro_operacional_sn").update({ forma_envio: forma }).eq("cliente_id", clienteId);
      falhou("definir forma de envio", error);
    },
  };
}
