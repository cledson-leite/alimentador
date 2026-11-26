import { lerLinha, agruparPorCnpj } from "../domain/contato";

import { importarContatos } from "./importar-contatos.use-case";

import type { Canal } from "../domain/contato";
import type { EstadoDb, PerfilDb, RepositorioPort } from "./ports";

const CNPJ = "38034594000124";
const CNPJ2 = "07859686000110";
const planilha = (...linhas: unknown[][]) => agruparPorCnpj(linhas.map((l, i) => lerLinha(i + 1, l)!));

function banco(estado: Partial<EstadoDb> = {}, perfis: Record<string, PerfilDb> = {}) {
  const e: EstadoDb = { contatos: [], setores: new Set(), destinos: [], responsaveis: new Map(), formas: new Map(), ...estado };
  const escritas: string[] = [];
  let n = 0;
  const repo: RepositorioPort = {
    clientesPorCnpj: async (cnpjs) => new Map(cnpjs.filter((c) => c === CNPJ || c === CNPJ2).map((c) => [c, { id: `cli-${c}`, empresa: `Empresa ${c}` }])),
    estado: async () => e,
    perfisPorEmail: async () => new Map(Object.entries(perfis)),
    criarContato: async (d) => (escritas.push(`contato ${d.nome}`), `ct-${++n}`),
    ligarSetor: async (id, setor) => void escritas.push(`setor ${id} ${setor}`),
    criarDestino: async (d) => void escritas.push(`destino ${d.setor} ${d.canal}`),
    definirResponsavel: async (c, p) => void escritas.push(`responsavel ${c} ${p}`),
    definirForma: async (c, f: Canal) => void escritas.push(`forma ${c} ${f}`),
  };
  return { repo, escritas };
}

const funcionaria: PerfilDb = { id: "p1", nome: "DAYANE", papel: "funcionario", setor: "simples_nacional", desativado: false };

describe("importarContatos", () => {
  it("cadastra o contato nos 3 setores, cria destino de SN e RH e acerta a forma de envio", async () => {
    const { repo, escritas } = banco({ formas: new Map([[`cli-${CNPJ}`, "email"]]) });
    const r = await importarContatos(repo, { contatos: planilha(["X", "38.034.594/0001-24", "EDUARDO", "WHATS", "45 9973-8126", null]), responsaveis: [] }, { dryRun: false });
    expect(escritas).toEqual([
      "contato EDUARDO",
      "setor ct-1 ura",
      "setor ct-1 simples_nacional",
      "setor ct-1 rh",
      "destino simples_nacional whatsapp",
      "destino rh whatsapp",
      `forma cli-${CNPJ} whatsapp`,
    ]);
    expect(r.contatos[0]).toMatchObject({ resultado: "criado" });
    expect(r.formas[0]).toMatchObject({ resultado: "alterada", detalhe: "email → whatsapp" });
  });

  it("cliente com mais de um contato cadastra todos", async () => {
    const { repo, escritas } = banco();
    await importarContatos(repo, { contatos: planilha(["X", "38.034.594/0001-24", "ANA", "WHATS", "45 9973-8126", null], ["X", "38.034.594/0001-24", "BIA", "WHATS", "45 9911-0000", null]), responsaveis: [] }, { dryRun: false });
    expect(escritas.filter((e) => e.startsWith("contato"))).toEqual(["contato ANA", "contato BIA"]);
  });

  it("reexecutar não duplica: contato, setores e destinos que já existem são reconhecidos pelo WhatsApp", async () => {
    const { repo, escritas } = banco({
      contatos: [{ id: "ct-9", clienteId: `cli-${CNPJ}`, telefone: "(45) 99973-8126", email: null }],
      setores: new Set(["ct-9|ura", "ct-9|simples_nacional", "ct-9|rh"]),
      destinos: [
        { clienteId: `cli-${CNPJ}`, setor: "simples_nacional", contatoId: "ct-9" },
        { clienteId: `cli-${CNPJ}`, setor: "rh", contatoId: "ct-9" },
      ],
      formas: new Map([[`cli-${CNPJ}`, "whatsapp"]]),
    });
    const r = await importarContatos(repo, { contatos: planilha(["X", "38.034.594/0001-24", "EDUARDO", "WHATS", "45 9973-8126", null]), responsaveis: [] }, { dryRun: false });
    expect(escritas).toEqual([]);
    expect(r.contatos[0]).toMatchObject({ resultado: "ja_existia" });
  });

  it("dry-run relata o que seria feito e não escreve nada", async () => {
    const { repo, escritas } = banco({ formas: new Map([[`cli-${CNPJ}`, "email"]]) });
    const r = await importarContatos(repo, { contatos: planilha(["X", "38.034.594/0001-24", "EDUARDO", "WHATS", "45 9973-8126", null]), responsaveis: [{ email: "d@x.com", arquivo: "d@x.com.xlsx", cnpjs: [CNPJ] }] }, { dryRun: true });
    expect(escritas).toEqual([]);
    expect(r.contatos[0]!.resultado).toBe("seria_criado");
    expect(r.formas[0]!.resultado).toBe("seria_alterada");
  });

  it("CNPJ que não está no banco vai para as pendências", async () => {
    const { repo, escritas } = banco();
    const r = await importarContatos(repo, { contatos: planilha(["X", "63.484.114/0001-74", "ANA", "WHATS", "45 9973-8126", null]), responsaveis: [] }, { dryRun: false });
    expect(escritas).toEqual([]);
    expect(r.pendencias).toEqual([expect.objectContaining({ resultado: "nao_encontrado_no_banco" })]);
  });

  it("contato ACESSÓRIAS só com e-mail vira destino de e-mail", async () => {
    const { repo, escritas } = banco();
    await importarContatos(repo, { contatos: planilha(["X", "38.034.594/0001-24", "NIRA", "ACESSORIAS", null, "nira@gmail.com"]), responsaveis: [] }, { dryRun: false });
    expect(escritas.filter((e) => e.startsWith("destino"))).toEqual(["destino simples_nacional email", "destino rh email"]);
  });

  it("cliente sem cadastro operacional SN não tem a forma de envio alterada", async () => {
    const { repo, escritas } = banco();
    const r = await importarContatos(repo, { contatos: planilha(["X", "38.034.594/0001-24", "ANA", "WHATS", "45 9973-8126", null]), responsaveis: [] }, { dryRun: false });
    expect(escritas.some((e) => e.startsWith("forma"))).toBe(false);
    expect(r.pendencias).toEqual([expect.objectContaining({ resultado: "cliente_sem_cadastro_operacional_sn" })]);
  });

  describe("responsáveis", () => {
    it("define o responsável SN de cada CNPJ do arquivo do perfil", async () => {
      const { repo, escritas } = banco({}, { "d@x.com": funcionaria });
      await importarContatos(repo, { contatos: [], responsaveis: [{ email: "d@x.com", arquivo: "d@x.com.xlsx", cnpjs: [CNPJ, CNPJ2] }] }, { dryRun: false });
      expect(escritas).toEqual([`responsavel cli-${CNPJ} p1`, `responsavel cli-${CNPJ2} p1`]);
    });

    it("perfil que não é funcionário ativo do SN (ex.: líder) não recebe carteira", async () => {
      const { repo, escritas } = banco({}, { "l@x.com": { ...funcionaria, papel: "lider_setor" } });
      const r = await importarContatos(repo, { contatos: [], responsaveis: [{ email: "l@x.com", arquivo: "l@x.com.xlsx", cnpjs: [CNPJ] }] }, { dryRun: false });
      expect(escritas).toEqual([]);
      expect(r.pendencias[0]).toMatchObject({ resultado: "responsavel_invalido" });
    });

    it("CNPJ em dois arquivos é conflito e não é gravado para ninguém", async () => {
      const { repo, escritas } = banco({}, { "a@x.com": funcionaria, "b@x.com": { ...funcionaria, id: "p2" } });
      const r = await importarContatos(
        repo,
        { contatos: [], responsaveis: [{ email: "a@x.com", arquivo: "a", cnpjs: [CNPJ] }, { email: "b@x.com", arquivo: "b", cnpjs: [CNPJ] }] },
        { dryRun: false },
      );
      expect(escritas).toEqual([]);
      expect(r.pendencias.map((p) => p.resultado)).toEqual(["conflito_entre_arquivos", "conflito_entre_arquivos"]);
    });

    it("não sobrescreve quem já tem outro responsável", async () => {
      const { repo, escritas } = banco({ responsaveis: new Map([[`cli-${CNPJ}`, "outro"]]) }, { "d@x.com": funcionaria });
      const r = await importarContatos(repo, { contatos: [], responsaveis: [{ email: "d@x.com", arquivo: "d", cnpjs: [CNPJ] }] }, { dryRun: false });
      expect(escritas).toEqual([]);
      expect(r.pendencias[0]).toMatchObject({ resultado: "ja_tem_outro_responsavel" });
    });
  });

  it("--cnpj limita a execução aos CNPJs informados", async () => {
    const { repo, escritas } = banco();
    await importarContatos(
      repo,
      { contatos: planilha(["X", "38.034.594/0001-24", "ANA", "WHATS", "45 9973-8126", null], ["Y", "07.859.686/0001-10", "BIA", "WHATS", "45 9911-0000", null]), responsaveis: [] },
      { dryRun: false, cnpjs: [CNPJ2] },
    );
    expect(escritas.filter((e) => e.startsWith("contato"))).toEqual(["contato BIA"]);
  });
});
