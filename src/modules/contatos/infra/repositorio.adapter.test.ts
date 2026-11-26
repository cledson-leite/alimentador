import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

import { cnpjValido } from "../../../../test-support/cenario";
import { carregarEnv } from "../../../env";
import { importarContatos } from "../application/importar-contatos.use-case";
import { agruparPorCnpj, lerLinha } from "../domain/contato";

import { repositorioSupabase } from "./repositorio.adapter";

// Só roda no Supabase LOCAL (nunca em produção): `SUPABASE_URL=http://127.0.0.1:54321` e a service_role local no ambiente.
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

describe("repositorioSupabase + importarContatos (Supabase local)", () => {
  const CNPJ = cnpjValido("900000300001");
  const clienteId = randomUUID();
  let noAr = false;
  const client = env ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }) : null!;

  beforeAll(async () => {
    noAr = await supabaseLocalNoAr();
    if (!noAr) {
      console.warn("Supabase local fora do ar: testes de integração dos contatos foram pulados.");
      return;
    }
    await client.from("clientes").delete().eq("cnpj", CNPJ);
    const { error } = await client.rpc("criar_cliente", {
      p_id: clienteId,
      p_empresa: "TESTE CONTATOS LTDA",
      p_cnpj: CNPJ,
      p_regime: "simples_nacional",
      p_contrato_social_caminho: null,
      p_alteracoes: [],
    });
    if (error) throw new Error(error.message);
  });

  afterAll(async () => {
    if (noAr) await client.from("clientes").delete().eq("cnpj", CNPJ);
  });

  it("grava contatos nos 3 setores, destinos SN/RH e forma de envio; reexecutar não duplica", async () => {
    if (!noAr) return;
    const rotulo = `${CNPJ.slice(0, 2)}.${CNPJ.slice(2, 5)}.${CNPJ.slice(5, 8)}/${CNPJ.slice(8, 12)}-${CNPJ.slice(12)}`;
    const contatos = agruparPorCnpj([
      lerLinha(1, ["TESTE", rotulo, "ANA", "WHATS", "45 9973-8126", null])!,
      lerLinha(2, ["TESTE", rotulo, "BIA", "EMAIL", null, "bia@teste.com.br"])!,
    ]);
    const repo = repositorioSupabase(client);

    const r1 = await importarContatos(repo, { contatos, responsaveis: [] }, { dryRun: false });
    expect(r1.contatos.map((c) => c.resultado)).toEqual(["criado", "criado"]);

    const { data: cts } = await client.from("cliente_contatos").select("id, nome, dono_setor").eq("cliente_id", clienteId);
    expect(cts).toHaveLength(2);
    expect(cts!.every((c) => c.dono_setor === "simples_nacional")).toBe(true);
    const { data: setores } = await client.from("cliente_contato_setores").select("setor").in("contato_id", cts!.map((c) => c.id));
    expect([...new Set(setores!.map((s) => s.setor))].sort()).toEqual(["rh", "simples_nacional", "ura"]);
    const { data: destinos } = await client.from("destinos_de_envio").select("setor, canal").eq("cliente_id", clienteId);
    expect(destinos).toHaveLength(4);
    const { data: op } = await client.from("cliente_cadastro_operacional_sn").select("forma_envio").eq("cliente_id", clienteId).single();
    expect(op!.forma_envio).toBe("whatsapp_e_email");

    const r2 = await importarContatos(repo, { contatos, responsaveis: [] }, { dryRun: false });
    expect(r2.contatos.map((c) => c.resultado)).toEqual(["ja_existia", "ja_existia"]);
    expect(r2.destinos.every((d) => d.resultado === "ja_existia")).toBe(true);
    const { count } = await client.from("cliente_contatos").select("id", { count: "exact", head: true }).eq("cliente_id", clienteId);
    expect(count).toBe(2);
  });

  it("define o responsável SN com um funcionário ativo do SN", async () => {
    if (!noAr) return;
    const { data: perfil } = await client.from("perfis").select("id, email").eq("setor", "simples_nacional").eq("papel", "funcionario").is("desativado_em", null).limit(1).maybeSingle();
    if (!perfil) {
      console.warn("Sem funcionário SN no Supabase local: teste de responsável pulado.");
      return;
    }
    const r = await importarContatos(repositorioSupabase(client), { contatos: [], responsaveis: [{ email: perfil.email.toLowerCase(), arquivo: "x.xlsx", cnpjs: [CNPJ] }] }, { dryRun: false });
    expect(r.responsaveis[0]).toMatchObject({ resultado: "definido" });
    const { data } = await client.from("cliente_responsaveis").select("responsavel_id").eq("cliente_id", clienteId).eq("setor", "simples_nacional").single();
    expect(data!.responsavel_id).toBe(perfil.id);
  });
});
