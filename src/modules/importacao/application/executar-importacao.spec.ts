import {
  arquivo,
  cnpjValido,
  formatarCnpj,
  montar,
  textoAlteracao,
  textoAlteracaoReal,
  textoComprovanteCnpj,
  textoContrato,
} from "../../../../test-support/cenario";

import { executarImportacao } from "./executar-importacao.use-case";

const CNPJ = cnpjValido("112223330001");

describe("executarImportacao", () => {
  it("carrega a empresa do Simples Nacional cuja pasta tem o nome exato e cujo contrato traz o CNPJ", async () => {
    const c = montar({
      lista: [{ nome: "ACME COMERCIO LTDA", cnpj: CNPJ }],
      sn: [CNPJ],
      pastas: [
        {
          nome: "ACME COMERCIO LTDA",
          arquivos: [arquivo("a1", "contrato social.pdf", textoContrato("ACME COMERCIO LTDA", CNPJ))],
        },
      ],
    });

    const r = await executarImportacao(c.portas, {});

    expect(r.falhas).toEqual([]);
    expect(r.carregadas).toEqual([{ cnpj: CNPJ, empresa: "ACME COMERCIO LTDA", regime: "simples_nacional" }]);
    expect(c.clientes).toHaveLength(1);
    expect(c.clientes[0]).toMatchObject({ cnpj: CNPJ, empresa: "ACME COMERCIO LTDA", regime: "simples_nacional" });
    expect(c.enviados).toHaveLength(1);
  });

  it("usa o regime da planilha tributária quando a empresa também consta na planilha SN", async () => {
    const c = montar({
      lista: [{ nome: "ACME COMERCIO LTDA", cnpj: CNPJ }],
      sn: [CNPJ],
      tributario: { [CNPJ]: "lucro_presumido" },
      pastas: [
        {
          nome: "ACME COMERCIO LTDA",
          arquivos: [arquivo("a1", "contrato social.pdf", textoContrato("ACME COMERCIO LTDA", CNPJ))],
        },
      ],
    });

    const r = await executarImportacao(c.portas, {});

    expect(r.carregadas).toEqual([{ cnpj: CNPJ, empresa: "ACME COMERCIO LTDA", regime: "lucro_presumido" }]);
  });

  it("manda para regimeAConfirmar a empresa marcada como baixada no tributário, mesmo constando na SN", async () => {
    const c = montar({
      lista: [{ nome: "ACME COMERCIO LTDA", cnpj: CNPJ }],
      sn: [CNPJ],
      tributario: { [CNPJ]: "baixou" },
      pastas: [
        {
          nome: "ACME COMERCIO LTDA",
          arquivos: [arquivo("a1", "contrato social.pdf", textoContrato("ACME COMERCIO LTDA", CNPJ))],
        },
      ],
    });

    const r = await executarImportacao(c.portas, {});

    expect(r.carregadas).toEqual([]);
    expect(r.regimeAConfirmar).toEqual([{ cnpj: CNPJ, nome: "ACME COMERCIO LTDA" }]);
  });

  it("ignora de vez a entidade marcada como ignorada no tributário: nem carrega nem lista", async () => {
    const c = montar({
      lista: [{ nome: "IGREJA", cnpj: CNPJ }],
      sn: [CNPJ],
      tributario: { [CNPJ]: "ignorada" },
      pastas: [],
    });

    const r = await executarImportacao(c.portas, {});

    expect(r).toMatchObject({ carregadas: [], falhas: [], regimeAConfirmar: [], pessoasFisicas: [], puladas: [] });
  });

  it("não carrega empresa sem regime em nenhuma planilha e a lista em regimeAConfirmar", async () => {
    const c = montar({
      lista: [{ nome: "ACME COMERCIO LTDA", cnpj: CNPJ }],
      pastas: [
        {
          nome: "ACME COMERCIO LTDA",
          arquivos: [arquivo("a1", "contrato social.pdf", textoContrato("ACME COMERCIO LTDA", CNPJ))],
        },
      ],
    });

    const r = await executarImportacao(c.portas, {});

    expect(r.carregadas).toEqual([]);
    expect(r.regimeAConfirmar).toEqual([{ cnpj: CNPJ, nome: "ACME COMERCIO LTDA" }]);
    expect(c.enviados).toEqual([]);
    expect(c.clientes).toEqual([]);
  });

  it("manda para falhas a empresa cuja pasta não existe no Drive, sem adivinhar", async () => {
    const c = montar({
      lista: [{ nome: "ACME COMERCIO LTDA", cnpj: CNPJ }],
      sn: [CNPJ],
      pastas: [{ nome: "OUTRA EMPRESA LTDA", arquivos: [] }],
    });

    const r = await executarImportacao(c.portas, {});

    expect(r.carregadas).toEqual([]);
    expect(r.falhas).toEqual([
      { cnpj: CNPJ, nome: "ACME COMERCIO LTDA", etapa: "pasta", motivo: "pasta não encontrada" },
    ]);
    expect(c.clientes).toEqual([]);
  });

  it("manda para falhas a empresa cujo contrato traz CNPJ de outra raiz", async () => {
    const outro = cnpjValido("998887770001");
    const c = montar({
      lista: [{ nome: "ACME COMERCIO LTDA", cnpj: CNPJ }],
      sn: [CNPJ],
      pastas: [
        {
          nome: "ACME COMERCIO LTDA",
          arquivos: [arquivo("a1", "contrato social.pdf", textoContrato("ACME COMERCIO LTDA", outro))],
        },
      ],
    });

    const r = await executarImportacao(c.portas, {});

    expect(r.carregadas).toEqual([]);
    expect(r.falhas).toEqual([
      { cnpj: CNPJ, nome: "ACME COMERCIO LTDA", etapa: "cnpj", motivo: "CNPJ do documento diverge da lista" },
    ]);
    expect(c.enviados).toEqual([]);
  });

  it("aceita contrato que cita a matriz quando a lista tem a filial (mesma raiz de 8 dígitos)", async () => {
    const filial = cnpjValido("112223330002");
    const c = montar({
      lista: [{ nome: "ACME COMERCIO LTDA", cnpj: filial }],
      sn: [filial],
      pastas: [
        {
          nome: "ACME COMERCIO LTDA",
          arquivos: [arquivo("a1", "contrato social.pdf", textoContrato("ACME COMERCIO LTDA", CNPJ))],
        },
      ],
    });

    const r = await executarImportacao(c.portas, {});

    expect(r.falhas).toEqual([]);
    expect(r.carregadas).toEqual([{ cnpj: filial, empresa: "ACME COMERCIO LTDA", regime: "simples_nacional" }]);
  });

  it("manda para falhas a empresa cujos documentos não trazem nenhum CNPJ", async () => {
    const c = montar({
      lista: [{ nome: "ACME COMERCIO LTDA", cnpj: CNPJ }],
      sn: [CNPJ],
      pastas: [
        {
          nome: "ACME COMERCIO LTDA",
          arquivos: [arquivo("a1", "contrato social.pdf", textoContrato("ACME COMERCIO LTDA"))],
        },
      ],
    });

    const r = await executarImportacao(c.portas, {});

    expect(r.carregadas).toEqual([]);
    expect(r.falhas).toEqual([
      { cnpj: CNPJ, nome: "ACME COMERCIO LTDA", etapa: "cnpj", motivo: "nenhum documento traz CNPJ" },
    ]);
    expect(c.enviados).toEqual([]);
  });

  it("grava as alterações com número e data lidos do conteúdo, mais uma cópia de cada arquivo no Storage", async () => {
    const N = "ACME COMERCIO LTDA";
    const c = montar({
      lista: [{ nome: N, cnpj: CNPJ }],
      sn: [CNPJ],
      pastas: [
        {
          nome: N,
          arquivos: [
            arquivo("a1", "contrato social.pdf", textoContrato(N, CNPJ)),
            arquivo("a3", "2 alteracao.pdf", textoAlteracao(N, CNPJ, "SEGUNDA", "20 de agosto de 2023")),
            arquivo("a2", "1 alteracao.pdf", textoAlteracao(N, CNPJ, "PRIMEIRA", "10 de maio de 2022")),
          ],
        },
      ],
    });

    const r = await executarImportacao(c.portas, {});

    expect(r.falhas).toEqual([]);
    const cliente = c.clientes[0] as { alteracoes: { numero: number; data: string; arquivoCaminho: string }[] };
    expect(cliente.alteracoes.map(({ numero, data }) => ({ numero, data }))).toEqual([
      { numero: 1, data: "2022-05-10" },
      { numero: 2, data: "2023-08-20" },
    ]);
    expect(c.enviados).toHaveLength(3);
    expect(cliente.alteracoes.every((a) => a.arquivoCaminho.includes("/alteracoes-contratuais/"))).toBe(true);
  });

  it("usa a alteração mais recente como contrato social quando não há contrato, com duas cópias no Storage", async () => {
    const N = "ACME COMERCIO LTDA";
    const c = montar({
      lista: [{ nome: N, cnpj: CNPJ }],
      sn: [CNPJ],
      pastas: [
        {
          nome: N,
          arquivos: [
            arquivo("a1", "1 alteracao.pdf", textoAlteracao(N, CNPJ, "PRIMEIRA", "10 de maio de 2022")),
            arquivo("a2", "2 alteracao.pdf", textoAlteracao(N, CNPJ, "SEGUNDA", "20 de agosto de 2023")),
          ],
        },
      ],
    });

    const r = await executarImportacao(c.portas, {});

    expect(r.falhas).toEqual([]);
    const cliente = c.clientes[0] as { contratoSocialCaminho: string };
    expect(cliente.contratoSocialCaminho).toContain("/contrato-social/");
    expect(c.enviados.filter((e) => e.origemId === "a2")).toHaveLength(2);
    expect(c.enviados).toHaveLength(3);
  });

  it("grava as alterações com os números lidos, mesmo faltando números ou não começando em 1", async () => {
    const N = "ACME COMERCIO LTDA";
    const c = montar({
      lista: [{ nome: N, cnpj: CNPJ }],
      sn: [CNPJ],
      pastas: [
        {
          nome: N,
          arquivos: [
            arquivo("a0", "contrato social.pdf", textoContrato(N, CNPJ)),
            arquivo("a1", "1 alteracao.pdf", textoAlteracao(N, CNPJ, "PRIMEIRA", "10 de maio de 2022")),
            arquivo("a3", "3 alteracao.pdf", textoAlteracao(N, CNPJ, "TERCEIRA", "20 de agosto de 2023")),
          ],
        },
      ],
    });

    const r = await executarImportacao(c.portas, {});

    expect(r.falhas).toEqual([]);
    const cliente = c.clientes[0] as { alteracoes: { numero: number }[] };
    expect(cliente.alteracoes.map((a) => a.numero)).toEqual([1, 3]);
  });

  it("grava a pasta que só tem as alterações mais recentes, com os números do documento", async () => {
    const N = "ACME COMERCIO LTDA";
    const c = montar({
      lista: [{ nome: N, cnpj: CNPJ }],
      sn: [CNPJ],
      pastas: [
        {
          nome: N,
          arquivos: [
            arquivo("a4", "4 alteracao.pdf", textoAlteracao(N, CNPJ, "QUARTA", "10 de maio de 2022")),
            arquivo("a5", "5 alteracao.pdf", textoAlteracao(N, CNPJ, "QUINTA", "20 de agosto de 2023")),
          ],
        },
      ],
    });

    const r = await executarImportacao(c.portas, {});

    expect(r.falhas).toEqual([]);
    const cliente = c.clientes[0] as { alteracoes: { numero: number }[] };
    expect(cliente.alteracoes.map((a) => a.numero)).toEqual([4, 5]);
  });

  it("manda para falhas a alteração sem data legível, sem enviar nada ao Storage", async () => {
    const N = "ACME COMERCIO LTDA";
    const c = montar({
      lista: [{ nome: N, cnpj: CNPJ }],
      sn: [CNPJ],
      pastas: [
        {
          nome: N,
          arquivos: [
            arquivo("a0", "contrato social.pdf", textoContrato(N, CNPJ)),
            arquivo("a1", "1 alteracao.pdf", textoAlteracao(N, CNPJ, "PRIMEIRA")),
          ],
        },
      ],
    });

    const r = await executarImportacao(c.portas, {});

    expect(r.falhas).toEqual([
      { cnpj: CNPJ, nome: N, etapa: "data", motivo: "data da alteração ausente ou ambígua" },
    ]);
    expect(c.enviados).toEqual([]);
  });

  const N = "ACME COMERCIO LTDA";
  const empresaOk = (extra = {}) =>
    montar({
      lista: [{ nome: N, cnpj: CNPJ }],
      sn: [CNPJ],
      pastas: [{ nome: N, arquivos: [arquivo("a1", "contrato social.pdf", textoContrato(N, CNPJ))] }],
      ...extra,
    });

  it("pula o CNPJ que já existe em clientes, sem enviar nem sobrescrever", async () => {
    const c = empresaOk({ existentes: [CNPJ] });

    const r = await executarImportacao(c.portas, {});

    expect(r.puladas).toEqual([CNPJ]);
    expect(r.carregadas).toEqual([]);
    expect(c.enviados).toEqual([]);
  });

  it("carrega uma vez só o CNPJ repetido na lista", async () => {
    const c = empresaOk({
      lista: [
        { nome: N, cnpj: CNPJ },
        { nome: "ACME COMERCIO LTDA ", cnpj: CNPJ },
      ],
    });

    const r = await executarImportacao(c.portas, {});

    expect(r.carregadas).toHaveLength(1);
    expect(c.clientes).toHaveLength(1);
  });

  it("separa as pessoas físicas (documento que não é CNPJ) e não tenta casar pasta", async () => {
    const c = empresaOk({ lista: [{ nome: "JOAO DA SILVA", cnpj: "12345678901" }, { nome: N, cnpj: CNPJ }] });

    const r = await executarImportacao(c.portas, {});

    expect(r.pessoasFisicas).toEqual([{ nome: "JOAO DA SILVA", documento: "12345678901" }]);
    expect(r.falhas).toEqual([]);
    expect(r.carregadas).toHaveLength(1);
  });

  it("recusa CNPJ com dígito verificador inválido antes de tocar o Storage", async () => {
    const ruim = CNPJ.slice(0, 13) + (CNPJ.endsWith("1") ? "2" : "1");
    const c = empresaOk({ lista: [{ nome: N, cnpj: ruim }], sn: [ruim] });

    const r = await executarImportacao(c.portas, {});

    expect(r.falhas).toEqual([{ cnpj: ruim, nome: N, etapa: "cnpj", motivo: "CNPJ da lista inválido" }]);
    expect(c.enviados).toEqual([]);
  });

  it("remove os arquivos enviados quando a gravação do cliente falha", async () => {
    const c = empresaOk({ criarCliente: "falha" });

    const r = await executarImportacao(c.portas, {});

    expect(r.falhas).toEqual([{ cnpj: CNPJ, nome: N, etapa: "cadastro", motivo: "RPC fora do ar" }]);
    expect(c.removidos).toEqual(c.enviados.map((e) => e.caminho));
  });

  it("não apaga os arquivos quando a resposta se perdeu mas o cliente foi gravado", async () => {
    const c = empresaOk({ criarCliente: "resposta-perdida" });

    const r = await executarImportacao(c.portas, {});

    expect(r.carregadas).toHaveLength(1);
    expect(c.removidos).toEqual([]);
  });

  describe("casamento do nome da lista com a pasta do Drive", () => {
    const casa = async (nomeLista: string, nomePasta: string) => {
      const c = montar({
        lista: [{ nome: nomeLista, cnpj: CNPJ }],
        sn: [CNPJ],
        pastas: [{ nome: nomePasta, arquivos: [arquivo("a1", "cs.pdf", textoContrato(nomeLista, CNPJ))] }],
      });
      return executarImportacao(c.portas, {});
    };

    it.each([
      ["passo 1, nome exato sem diferença de caixa e acento", "AÇAÍ COMERCIO LTDA", "acai comercio ltda"],
      ["passo 2, pasta cortada no hífen", "ACME COMERCIO LTDA", "ACME COMERCIO LTDA - empresa"],
      ["passo 3, nome da lista dentro da pasta", "ACME COMERCIO LTDA", "ACME COMERCIO LTDA inicia na Rigoni em 22/01/2026"],
      ["passo 4, ignorando pontuação e & = E", "ACME COMERCIO & CIA LTDA", "ACME, COMERCIO E CIA. LTDA"],
      ["passo 5, sem a forma jurídica", "ACME COMERCIO LTDA", "ACME COMERCIO EIRELI"],
      ["passo 6, espaço entre letras e CNPJ no fim da pasta", "AF VAZ NETO LTDA", "A F VAZ NETO LTDA 03.468"],
      ["passo 7, palavras na mesma ordem com palavras a mais", "PRIVILEGE HOME RESORT SPE LTDA", "PRIVILEGE HOME RESORT EMPREENDIMENTO SPE LTDA"],
    ])("casa: %s", async (_caso, lista, pasta) => {
      const r = await casa(lista, pasta);
      expect(r.falhas).toEqual([]);
      expect(r.carregadas).toHaveLength(1);
    });

    it.each([
      ["palavras em outra ordem", "ALS COMERCIO E SERVICOS LTDA", "ALS SERVICOS E COMERCIO LTDA"],
      ["abreviação", "ACME INTERNACIONAL LTDA", "ACME INT LTDA"],
      ["erro de digitação", "TEIXEIRA COMERCIO LTDA", "TEXEIRA COMERCIO LTDA"],
    ])("não casa por aproximação: %s", async (_caso, lista, pasta) => {
      const r = await casa(lista, pasta);
      expect(r.carregadas).toEqual([]);
      expect(r.falhas[0]).toMatchObject({ etapa: "pasta", motivo: "pasta não encontrada" });
    });

    const duasPastas = (docA: string, docB: string) =>
      montar({
        lista: [{ nome: "ACME COMERCIO LTDA", cnpj: CNPJ }],
        sn: [CNPJ],
        pastas: [
          { nome: "ACME COMERCIO LTDA - empresa A", arquivos: [arquivo("a1", "cs.pdf", docA)] },
          { nome: "ACME COMERCIO LTDA - empresa B", arquivos: [arquivo("b1", "cs.pdf", docB)] },
        ],
      });

    it("com duas pastas candidatas, fica com a que o contrato diz ser da empresa (CNPJ da lista)", async () => {
      const outra = cnpjValido("998887770001");
      const c = duasPastas(textoContrato("OUTRA EMPRESA LTDA", outra), textoContrato("ACME COMERCIO LTDA", CNPJ));

      const r = await executarImportacao(c.portas, {});

      expect(r.falhas).toEqual([]);
      expect(r.carregadas.map((x) => x.empresa)).toEqual(["ACME COMERCIO LTDA"]);
      expect(c.enviados.map((e) => e.origemId)).toEqual(["b1"]);
    });

    it("manda para falhas quando duas pastas candidatas trazem o mesmo CNPJ (mesma empresa, só uma vale)", async () => {
      const igual = textoContrato("ACME COMERCIO LTDA", CNPJ);
      const c = duasPastas(igual, igual);

      const r = await executarImportacao(c.portas, {});

      expect(r.falhas).toEqual([
        { cnpj: CNPJ, nome: "ACME COMERCIO LTDA", etapa: "pasta", motivo: "várias pastas com o mesmo CNPJ" },
      ]);
      expect(c.enviados).toEqual([]);
    });

    it("manda para falhas quando nenhuma das pastas candidatas traz o CNPJ da lista", async () => {
      const outra = cnpjValido("998887770001");
      const c = duasPastas(textoContrato("X LTDA", outra), textoContrato("Y LTDA", cnpjValido("554443330001")));

      const r = await executarImportacao(c.portas, {});

      expect(r.falhas).toEqual([
        { cnpj: CNPJ, nome: "ACME COMERCIO LTDA", etapa: "pasta", motivo: "várias pastas, nenhuma com o CNPJ da lista" },
      ]);
    });
  });

  describe("pasta compartilhada por mais de uma linha da lista", () => {
    const FILIAL = cnpjValido("112223330002");
    const OUTRA_RAIZ = cnpjValido("998887770001");

    it("cria um cliente por CNPJ para matriz e filial, cada um com a cópia dos documentos", async () => {
      const c = montar({
        lista: [
          { nome: N, cnpj: CNPJ },
          { nome: N, cnpj: FILIAL },
        ],
        sn: [CNPJ, FILIAL],
        pastas: [{ nome: N, arquivos: [arquivo("a1", "contrato social.pdf", textoContrato(N, CNPJ))] }],
      });

      const r = await executarImportacao(c.portas, {});

      expect(r.carregadas.map((x) => x.cnpj)).toEqual([CNPJ, FILIAL]);
      expect(c.enviados.map((e) => e.caminho)).toHaveLength(2);
      expect(new Set(c.enviados.map((e) => e.caminho)).size).toBe(2);
    });

    it("carrega só a dona da pasta quando duas empresas de raiz diferente colidem no nome", async () => {
      const c = montar({
        lista: [
          { nome: N, cnpj: OUTRA_RAIZ },
          { nome: N, cnpj: CNPJ },
        ],
        sn: [CNPJ, OUTRA_RAIZ],
        pastas: [{ nome: N, arquivos: [arquivo("a1", "contrato social.pdf", textoContrato(N, CNPJ))] }],
      });

      const r = await executarImportacao(c.portas, {});

      expect(r.carregadas.map((x) => x.cnpj)).toEqual([CNPJ]);
      expect(r.falhas).toEqual([
        { cnpj: OUTRA_RAIZ, nome: N, etapa: "cnpj", motivo: "CNPJ do documento diverge da lista" },
      ]);
    });
  });

  it("grava no Storage objetos com nome seguro (sem acento, 'º', espaços ou barras)", async () => {
    const c = montar({
      lista: [{ nome: N, cnpj: CNPJ }],
      sn: [CNPJ],
      pastas: [{ nome: N, arquivos: [arquivo("a1", "1º ALTERAÇÃO / contrato social.pdf", textoContrato(N, CNPJ))] }],
    });

    await executarImportacao(c.portas, {});

    expect(c.enviados[0]!.caminho).toMatch(/^[0-9a-f-]{36}\/contrato-social\/1o-alteracao-contrato-social\.pdf$/);
  });

  it("não deixa dois arquivos de nomes parecidos sobrescreverem o mesmo objeto no Storage", async () => {
    const c = montar({
      lista: [{ nome: N, cnpj: CNPJ }],
      sn: [CNPJ],
      pastas: [
        {
          nome: N,
          arquivos: [
            arquivo("a0", "contrato social.pdf", textoContrato(N, CNPJ)),
            arquivo("a1", "1 alteração.pdf", textoAlteracao(N, CNPJ, "PRIMEIRA", "10 de maio de 2022")),
            arquivo("a2", "2 alteracao.pdf", textoAlteracao(N, CNPJ, "SEGUNDA", "20 de agosto de 2023")),
            arquivo("a3", "1  ALTERAÇÃO.pdf", textoAlteracao(N, CNPJ, "TERCEIRA", "20 de agosto de 2024")),
          ],
        },
      ],
    });

    await executarImportacao(c.portas, {});

    const caminhos = c.enviados.map((e) => e.caminho);
    expect(caminhos).toHaveLength(4);
    expect(new Set(caminhos).size).toBe(4);
  });

  it("com a lista de CNPJs processa só essas empresas (para refazer falhas)", async () => {
    const outro = cnpjValido("554443330001");
    const c = montar({
      lista: [
        { nome: N, cnpj: CNPJ },
        { nome: "OUTRA LTDA", cnpj: outro },
      ],
      sn: [CNPJ, outro],
      pastas: [
        { nome: N, arquivos: [arquivo("a1", "cs.pdf", textoContrato(N, CNPJ))] },
        { nome: "OUTRA LTDA", arquivos: [arquivo("b1", "cs.pdf", textoContrato("OUTRA LTDA", outro))] },
      ],
    });

    const r = await executarImportacao(c.portas, { cnpjs: [outro] });

    expect(r.carregadas.map((x) => x.cnpj)).toEqual([outro]);
    expect(r.falhas).toEqual([]);
  });

  describe("formas reais de escrever o nome e o tipo do documento", () => {
    const carregaCom = async (arquivos: ReturnType<typeof arquivo>[], nomeLista = N) => {
      const c = montar({ lista: [{ nome: nomeLista, cnpj: CNPJ }], sn: [CNPJ], pastas: [{ nome: nomeLista, arquivos }] });
      const r = await executarImportacao(c.portas, {});
      return { r, c };
    };

    it("lê o nome na linha logo abaixo do título quando o corpo não o põe entre aspas", async () => {
      const texto = ["PRIMEIRA ALTERAÇÃO CONTRATUAL", N, `CNPJ: ${formatarCnpj(CNPJ)}`, "Cascavel/PR, 20 de fevereiro de 2026."].join("\n");

      const { r } = await carregaCom([arquivo("a1", "1 alteracao.pdf", texto)]);

      expect(r.falhas).toEqual([]);
      expect(r.carregadas.map((x) => x.empresa)).toEqual([N]);
    });

    it("lê o nome do empresário individual (nome completo seguido do CPF) no título", async () => {
      const texto = [
        "INSTRUMENTO DE ALTERAÇÃO DO EMPRESÁRIO INDIVIDUAL",
        "LEONARDO DALMINA SILVA 12345678901",
        `CNPJ: ${formatarCnpj(CNPJ)}`,
        "Cascavel, Pr., 20 de junho de 2025.",
      ].join("\n");

      const { r } = await carregaCom([arquivo("a1", "1 alteracao.pdf", texto)], "LEONARDO DALMINA SILVA");

      expect(r.falhas).toEqual([]);
      expect(r.carregadas.map((x) => x.empresa)).toEqual(["LEONARDO DALMINA SILVA"]);
    });

    it("lê o nome do empresário individual na linha logo abaixo do título, antes do CNPJ", async () => {
      const texto = [
        "ALTERAÇÃO DO INSTRUMENTO DE INSCRIÇÃO DE EMPRESÁRIO INDIVIDUAL",
        "F SHIRO SAITO DISTRIBUIDORA",
        `CNPJ: ${formatarCnpj(CNPJ)}`,
        "Cascavel/PR, 20 de junho de 2025.",
      ].join("\n");

      const { r } = await carregaCom([arquivo("a1", "1 alteracao.pdf", texto)], "F SHIRO SAITO DISTRIBUIDORA");

      expect(r.falhas).toEqual([]);
      expect(r.carregadas.map((x) => x.empresa)).toEqual(["F SHIRO SAITO DISTRIBUIDORA"]);
    });

    it("lê o nome em 'adotará como nome empresarial: X LTDA' quando o contrato começa pelos sócios", async () => {
      const texto = [
        "Pelo presente instrumento particular de Contrato Social:",
        "EDUARDA SCHRODER, brasileira, solteira, empresária, residente em Marechal Cândido Rondon - PR",
        `A sociedade adotará como nome empresarial: ${N}, e usará a expressão ACME como nome fantasia, CNPJ ${formatarCnpj(CNPJ)}.`,
      ].join("\n");

      const { r } = await carregaCom([arquivo("a1", "contrato social.pdf", texto)]);

      expect(r.falhas).toEqual([]);
      expect(r.carregadas.map((x) => x.empresa)).toEqual([N]);
    });

    it("acha o título e o número da alteração mesmo atrás do carimbo da Junta e de cabeçalhos de página", async () => {
      const texto = [
        "JUNTA COMERCIAL DO ESTADO DO PARANÁ - SEDE",
        "CERTIFICO O REGISTRO EM 10/05/2022 14:30 SOB Nº 20221234567.",
        "PROTOCOLO 221234567 - 10/05/2022",
        "Página 1 de 5",
        "Página 2 de 5",
        "Página 3 de 5",
        "OITAVA ALTERAÇÃO CONTRATUAL DA SOCIEDADE EMPRESÁRIA LIMITADA",
        N,
        `CNPJ: ${formatarCnpj(CNPJ)}`,
        "Cascavel/PR, 20 de fevereiro de 2026.",
      ].join("\n");

      const { r, c } = await carregaCom([arquivo("a1", "8 oitava alteracao.pdf", texto)]);

      expect(r.falhas).toEqual([]);
      const cliente = c.clientes[0] as { alteracoes: { numero: number }[] };
      expect(cliente.alteracoes.map((a) => a.numero)).toEqual([8]);
      expect(r.carregadas.map((x) => x.empresa)).toEqual([N]);
    });

    it("diz que precisa de OCR quando o arquivo se chama contrato/alteração mas o texto só traz cabeçalhos de página", async () => {
      const texto = ["Página 1 de 5", "Página 2 de 5", "Página 3 de 5", "Página 4 de 5", "Página 5 de 5"].join("\n");

      const { r } = await carregaCom([arquivo("a1", "8 OITAVA ALTERAÇÃO CONTRATUAL.pdf", texto)]);

      expect(r.carregadas).toEqual([]);
      expect(r.falhas).toEqual([
        { cnpj: CNPJ, nome: N, etapa: "documentos", motivo: "contrato ou alteração sem texto legível (precisa de OCR)" },
      ]);
    });

    it.each([
      ["alteração contratual", "celebrar a OITAVA ALTERAÇÃO CONTRATUAL da sociedade"],
      ["sem acento", "celebrar a OITAVA ALTERACAO CONTRATUAL da sociedade"],
      ["no plural", "celebrar a OITAVA das ALTERAÇÕES CONTRATUAIS da sociedade"],
      ["alteração do contrato social", "celebrar a OITAVA ALTERAÇÃO DO CONTRATO SOCIAL da sociedade"],
      ["alteração de contrato social", "celebrar a OITAVA alteração de contrato social da sociedade"],
    ])("reconhece como alteração o documento que traz '%s' no texto, mesmo sem título", async (_caso, frase) => {
      const texto = [
        "Os sócios, já qualificados, resolvem de comum acordo",
        `${frase}, que se regerá pelas cláusulas seguintes.`,
        `“${N}”, inscrita no CNPJ ${formatarCnpj(CNPJ)}.`,
        "Cascavel/PR, 20 de fevereiro de 2026.",
      ].join("\n");

      const { r, c } = await carregaCom([arquivo("a1", "alteracao.pdf", texto)]);

      expect(r.falhas).toEqual([]);
      const cliente = c.clientes[0] as { alteracoes: { numero: number }[] };
      expect(cliente.alteracoes.map((a) => a.numero)).toEqual([8]);
    });

    it.each([
      ["protocolo da Junta", "Secretaria da Micro e Pequena Empresa\nProtocolo 241234567\nEvento: Alteração contratual\nSituação: em análise"],
      ["pedido de alteração cadastral", "Cadastro de Contribuintes - Comprovante do Pedido\nNatureza do Pedido: Alteração contratual de Inscrição Estadual"],
      ["orientação interna", "Alterações para rodar em 03/2026\n* Alteração contratual - VIA BR INFORMATICA LTDA\nAlterar razão social para: ACME LTDA"],
    ])("ignora %s que cita 'alteração contratual' mas não é o instrumento, sem bloquear a empresa", async (_caso, texto) => {
      const { r, c } = await carregaCom([
        arquivo("a1", "contrato social.pdf", textoContrato(N, CNPJ)),
        arquivo("a2", "protocolo.pdf", texto),
      ]);

      expect(r.falhas).toEqual([]);
      expect(c.enviados.map((e) => e.origemId)).toEqual(["a1"]);
    });

    describe("termos de constituição", () => {
      const resto = [
        `“${N}”, inscrita no CNPJ ${formatarCnpj(CNPJ)}.`,
        "CLÁUSULA PRIMEIRA: O capital social é de R$ 10.000,00, dividido em quotas.",
      ];

      it.each([
        ["contrato de constituição", "CONTRATO DE CONSTITUIÇÃO DE SOCIEDADE EMPRESÁRIA LIMITADA"],
        ["contrato de constituicao, sem acento", "CONTRATO DE CONSTITUICAO DE SOCIEDADE LIMITADA"],
        ["contratos de constituição, no plural", "CONTRATOS DE CONSTITUIÇÃO"],
        ["ato de constituição", "ATO DE CONSTITUIÇÃO DE SOCIEDADE EMPRESÁRIA LIMITADA UNIPESSOAL"],
        ["atos de constituição", "ATOS DE CONSTITUIÇÃO DA SOCIEDADE"],
        ["ato constitutivo", "ATO CONSTITUTIVO DA SOCIEDADE LIMITADA"],
        ["atos constitutivos", "ATOS CONSTITUTIVOS DA SOCIEDADE"],
        ["contrato constitutivo", "CONTRATO CONSTITUTIVO DE SOCIEDADE"],
        ["instrumento de constituição", "INSTRUMENTO DE CONSTITUIÇÃO DE SOCIEDADE LIMITADA"],
        ["com ordinal ou número antes", "0 ATO DE CONSTITUIÇÃO"],
      ])("reconhece %s como contrato quando é o título", async (_caso, titulo) => {
        const { r } = await carregaCom([arquivo("a1", "doc.pdf", [titulo, ...resto].join("\n"))]);

        expect(r.falhas).toEqual([]);
        expect(r.carregadas.map((x) => x.empresa)).toEqual([N]);
      });

      it.each([
        ["ato de constituição", "Os sócios, por este ato de constituição, resolvem"],
        ["atos constitutivos", "Registrada nos atos constitutivos da sociedade, a empresa"],
        ["contrato de constituição", "Conforme o contrato de constituição abaixo descrito"],
      ])("reconhece %s no corpo, sem título, quando o conteúdo confirma instrumento societário", async (_caso, linha) => {
        const { r } = await carregaCom([arquivo("a1", "doc.pdf", [linha, ...resto].join("\n"))]);

        expect(r.falhas).toEqual([]);
        expect(r.carregadas.map((x) => x.empresa)).toEqual([N]);
      });

      it("não aceita menção passageira ao ato constitutivo, sem cláusulas nem capital", async () => {
        const { r } = await carregaCom([arquivo("a1", "procuracao.pdf", "Procuração conforme os atos constitutivos da empresa.\nOutorgante: fulano")]);

        expect(r.carregadas).toEqual([]);
        expect(r.falhas[0]).toMatchObject({ etapa: "documentos" });
      });
    });

    describe("contrato social reconhecido pelo conteúdo", () => {
      const societario = [
        "CLÁUSULA PRIMEIRA: O capital social é de R$ 10.000,00, dividido em quotas.",
        "CLÁUSULA SEGUNDA: O objeto social da sociedade será o comércio varejista.",
      ];
      const corpo = (primeira: string, ...resto: string[]) =>
        [primeira, `“${N}”, inscrita no CNPJ ${formatarCnpj(CNPJ)}.`, ...resto].join("\n");

      it.each([
        ["contrato social no corpo", "Os sócios resolvem constituir sociedade, por este contrato social, regida pelas cláusulas abaixo."],
        ["contratos sociais (plural)", "Os sócios resolvem constituir sociedade, conforme os contratos sociais registrados."],
        ["só 'contrato' no título", "CONTRATO DA SOCIEDADE EMPRESÁRIA LIMITADA"],
      ])("aceita %s quando o texto traz cláusulas e capital social", async (_caso, linha) => {
        const { r } = await carregaCom([arquivo("a1", "contrato.pdf", corpo(linha, ...societario))]);

        expect(r.falhas).toEqual([]);
        expect(r.carregadas.map((x) => x.empresa)).toEqual([N]);
      });

      it.each([
        ["menção passageira, sem cláusulas nem capital", "Conforme consta no contrato social da empresa, segue a procuração."],
        ["contrato de prestação de serviços do escritório", "CONTRATO DE PRESTAÇÃO DE SERVIÇOS CONTÁBEIS"],
        ["contrato de locação", "CONTRATO DE LOCAÇÃO DE IMÓVEL COMERCIAL"],
      ])("não aceita %s como contrato social", async (_caso, linha) => {
        const sem = _caso.startsWith("menção") ? [] : _caso.includes("prestação") ? ["CLÁUSULA PRIMEIRA: o capital social e as quotas", "serviço de contabilidade"] : ["CLÁUSULA PRIMEIRA: o locador cede o imóvel"];
        const { r } = await carregaCom([arquivo("a1", "outro.pdf", corpo(linha, ...sem))]);

        expect(r.carregadas).toEqual([]);
        expect(r.falhas[0]).toMatchObject({ etapa: "documentos" });
      });
    });

    it("reconhece 'CONTRATO DE CONSTITUIÇÃO' como contrato, mesmo sem a palavra 'social' no título", async () => {
      const texto = [N, "CONTRATO DE CONSTITUIÇÃO", "VIVIANE RENATA, brasileira, empresária", `“${N}”, inscrita no CNPJ ${formatarCnpj(CNPJ)}`].join("\n");

      const { r } = await carregaCom([arquivo("a1", "0 contrato social.pdf", texto)]);

      expect(r.falhas).toEqual([]);
      expect(r.carregadas.map((x) => x.empresa)).toEqual([N]);
    });

    it("reconhece o contrato de constituição que abre pelo sócio, sem título, pela CLÁUSULA PRIMEIRA", async () => {
      const texto = [
        "EVILASIO DE CARVALHO JUNIOR, brasileiro, nascido no dia 10 de setembro de 1980, natural da Cidade de Cascavel",
        `CLÁUSULA PRIMEIRA: A sociedade terá como denominação empresarial o nome "${N}", com sede e foro em Cascavel/PR,`,
        "CLÁUSULA SEGUNDA: O objeto social da sociedade será:",
        `CNPJ ${formatarCnpj(CNPJ)}`,
      ].join("\n");

      const { r } = await carregaCom([arquivo("a1", "contrato.pdf", texto)]);

      expect(r.falhas).toEqual([]);
      expect(r.carregadas.map((x) => x.empresa)).toEqual([N]);
    });

    it("reconhece a alteração que abre pela folha de 'Motivos' e traz CLÁUSULAs, lendo nome e data", async () => {
      const texto = [
        "Motivos: a) Alteração do endereço da empresa;",
        "b) Consolidação Contratual e posteriores alterações.",
        "ARI ANTONIO SCHUTZ, brasileiro, nascido no dia 10 de junho de 1970",
        `CLÁUSULA PRIMEIRA: A sociedade gira sob o nome empresarial: ${N}, inscrita no CNPJ ${formatarCnpj(CNPJ)}`,
        "Cascavel/PR, 20 de fevereiro de 2026.",
      ].join("\n");

      const { r, c } = await carregaCom([arquivo("a1", "1 alteracao.pdf", texto)]);

      expect(r.falhas).toEqual([]);
      const cliente = c.clientes[0] as { alteracoes: { data: string }[] };
      expect(cliente.alteracoes.map((a) => a.data)).toEqual(["2026-02-20"]);
    });

    it("reconhece 'ALTERAÇÃO POR TRANSFORMAÇÃO' quando a palavra de contrato vem na linha seguinte", async () => {
      const texto = [
        "ALTERAÇÃO POR TRANSFORMAÇÃO",
        "DO INSTRUMENTO DE INSCRIÇÃO DE EMPRESÁRIO INDIVIDUAL EM",
        "SOCIEDADE EMPRESÁRIA LIMITADA UNIPESSOAL",
        `“${N}”, inscrita no CNPJ ${formatarCnpj(CNPJ)}.`,
        "Cascavel/PR, 20 de fevereiro de 2026.",
      ].join("\n");

      const { r } = await carregaCom([arquivo("a1", "1 alteracao.pdf", texto)]);

      expect(r.falhas).toEqual([]);
      expect(r.carregadas.map((x) => x.empresa)).toEqual([N]);
    });

    it.each([
      ["página de portal", "Alteração\nMatriz\nSolicitação concluída com sucesso!"],
      ["e-mail", "Bom dia. Preciso de uma atualização de dados\nPrezado(a), A Jucesp adota os procedimentos"],
      ["manual", "PARA ALTERAÇÃO:\nQUANDO FOR ESCRITORIO ADM\nALTERAÇÃO DO TIPO DE UNIDADE"],
      ["pedido da Receita Estadual", "ESTADO DO PARANÁ\nSecretaria de Estado da Fazenda\nReceita Estadual\nPEDIDO DE ALTERAÇÃO DE CONTADOR\nCNPJ 11.222.333/0001-81"],
      [
        "confirmação de troca de contabilista da Receita Estadual",
        "Receita Estadual\nComprovante de Pedido de Alteração de Contabilista\nCNPJ 11.222.333/0001-81\nConfirmação de Alteração de Contabilista/Contrato Contábil",
      ],
      ["consulta QSA", "Consulta Quadro de Sócios e Administradores - QSA\nCNPJ: 11.222.333/0001-81\nNome Empresarial: ACME LTDA"],
    ])("não trata %s como alteração contratual, só por conter a palavra 'alteração'", async (_caso, texto) => {
      const { r } = await carregaCom([arquivo("a1", "outro.pdf", texto)]);

      expect(r.carregadas).toEqual([]);
      expect(r.falhas[0]).toMatchObject({ etapa: "documentos", motivo: "sem contrato social nem alteração" });
    });
  });

  describe("pasta aceita no download (ticket 03)", () => {
    const base = (extra = {}) =>
      montar({
        lista: [{ nome: "TEXEIRA COMERCIO LTDA", cnpj: CNPJ }],
        sn: [CNPJ],
        pastas: [{ nome: "TEIXEIRA COMERCIO LTDA", arquivos: [arquivo("a1", "cs.pdf", textoContrato("TEIXEIRA COMERCIO LTDA", CNPJ))] }],
        ...extra,
      });

    it("usa a pasta que o download aceitou, mesmo que o nome da lista não case pelas regras", async () => {
      const c = base({ pastaPorCnpj: { [CNPJ]: "TEIXEIRA COMERCIO LTDA" } });

      const r = await executarImportacao(c.portas, {});

      expect(r.falhas).toEqual([]);
      expect(r.carregadas.map((x) => x.empresa)).toEqual(["TEIXEIRA COMERCIO LTDA"]);
    });

    it("sem a pasta no mapeamento, segue valendo a regra estrita (e não aproxima por semelhança)", async () => {
      const r = await executarImportacao(base().portas, {});

      expect(r.falhas[0]).toMatchObject({ etapa: "pasta", motivo: "pasta não encontrada" });
    });

    it("mesmo com a pasta mapeada, o CNPJ do contrato continua sendo a prova final", async () => {
      const outro = cnpjValido("998887770001");
      const c = montar({
        lista: [{ nome: "TEXEIRA COMERCIO LTDA", cnpj: CNPJ }],
        sn: [CNPJ],
        pastas: [{ nome: "TEIXEIRA COMERCIO LTDA", arquivos: [arquivo("a1", "cs.pdf", textoContrato("TEIXEIRA COMERCIO LTDA", outro))] }],
        pastaPorCnpj: { [CNPJ]: "TEIXEIRA COMERCIO LTDA" },
      });

      const r = await executarImportacao(c.portas, {});

      expect(r.falhas[0]).toMatchObject({ etapa: "cnpj", motivo: "CNPJ do documento diverge da lista" });
    });
  });

  describe("comprovante de CNPJ na pasta", () => {
    const carrega = async (arquivos: ReturnType<typeof arquivo>[]) => {
      const c = montar({ lista: [{ nome: N, cnpj: CNPJ }], sn: [CNPJ], pastas: [{ nome: N, arquivos }] });
      const r = await executarImportacao(c.portas, {});
      return { r, c };
    };

    it("cadastra a empresa sem contrato nem alteração quando só há o comprovante de CNPJ", async () => {
      const { r, c } = await carrega([arquivo("a1", "cartao cnpj.pdf", textoComprovanteCnpj(N, CNPJ))]);

      expect(r.falhas).toEqual([]);
      expect(r.carregadas).toEqual([{ cnpj: CNPJ, empresa: N, regime: "simples_nacional" }]);
      expect(c.clientes[0]).toMatchObject({ cnpj: CNPJ, empresa: N, contratoSocialCaminho: null, alteracoes: [] });
      expect(c.enviados).toEqual([]);
    });

    it("usa o comprovante como prova do CNPJ quando o contrato de constituição não o traz", async () => {
      const { r, c } = await carrega([
        arquivo("a1", "contrato social.pdf", textoContrato(N)),
        arquivo("a2", "cartao cnpj.pdf", textoComprovanteCnpj(N, CNPJ)),
      ]);

      expect(r.falhas).toEqual([]);
      expect(c.clientes[0]).toMatchObject({ cnpj: CNPJ });
      expect(c.enviados.map((e) => e.origemId)).toEqual(["a1"]);
    });

    it("exige CNPJ idêntico no comprovante: o da matriz não prova a linha de uma filial (filial é outra empresa)", async () => {
      const filial = cnpjValido("112223330002");
      const c = montar({
        lista: [{ nome: `${N} - FILIAL LONDRINA`, cnpj: filial }],
        sn: [filial],
        pastas: [{ nome: `${N} - FILIAL LONDRINA`, arquivos: [arquivo("a1", "cartao cnpj.pdf", textoComprovanteCnpj(N, CNPJ))] }],
      });

      const r = await executarImportacao(c.portas, {});

      expect(r.carregadas).toEqual([]);
      expect(r.falhas[0]).toMatchObject({ etapa: "cnpj", motivo: "CNPJ do documento diverge da lista" });
    });

    it("grava a filial com o nome 'EMPRESA - FILIAL X' e o CNPJ da própria filial", async () => {
      const filial = cnpjValido("112223330002");
      const c = montar({
        lista: [{ nome: `${N} - FILIAL LONDRINA`, cnpj: filial }],
        sn: [filial],
        pastas: [
          {
            nome: `${N} - FILIAL LONDRINA`,
            arquivos: [arquivo("a1", "cartao cnpj.pdf", textoComprovanteCnpj(N, filial)), arquivo("a2", "cs.pdf", textoContrato(N, CNPJ))],
          },
        ],
      });

      const r = await executarImportacao(c.portas, {});

      expect(r.falhas).toEqual([]);
      expect(c.clientes[0]).toMatchObject({ cnpj: filial, empresa: `${N} - FILIAL LONDRINA` });
    });

    it("manda para falhas quando o CNPJ do comprovante é de outra raiz", async () => {
      const outro = cnpjValido("998887770001");
      const { r } = await carrega([arquivo("a1", "cartao cnpj.pdf", textoComprovanteCnpj(N, outro))]);

      expect(r.falhas).toEqual([
        { cnpj: CNPJ, nome: N, etapa: "cnpj", motivo: "CNPJ do documento diverge da lista" },
      ]);
    });
  });

  describe("a mesma alteração em mais de um arquivo", () => {
    const montarComCopias = (textoDaCopia: string) =>
      montar({
        lista: [{ nome: N, cnpj: CNPJ }],
        sn: [CNPJ],
        pastas: [
          {
            nome: N,
            arquivos: [
              arquivo("a0", "contrato social.pdf", textoContrato(N, CNPJ)),
              arquivo("a1", "1 alteracao.doc", textoAlteracao(N, CNPJ, "PRIMEIRA", "10 de maio de 2022"), "doc"),
              arquivo("a2", "1 alteracao.pdf", textoDaCopia),
            ],
          },
        ],
      });

    it("trata PDF e DOC com o mesmo número e a mesma data como um documento só, mantendo o PDF", async () => {
      const c = montarComCopias(textoAlteracao(N, CNPJ, "PRIMEIRA", "10 de maio de 2022"));

      const r = await executarImportacao(c.portas, {});

      expect(r.falhas).toEqual([]);
      const cliente = c.clientes[0] as { alteracoes: { numero: number }[] };
      expect(cliente.alteracoes.map((a) => a.numero)).toEqual([1]);
      expect(c.enviados.map((e) => e.origemId).sort()).toEqual(["a0", "a2"]);
    });

    it("o PDF predomina sobre o DOC do mesmo número mesmo que a leitura traga datas diferentes", async () => {
      const c = montarComCopias(textoAlteracao(N, CNPJ, "PRIMEIRA", "11 de maio de 2022"));

      const r = await executarImportacao(c.portas, {});

      expect(r.falhas).toEqual([]);
      const cliente = c.clientes[0] as { alteracoes: { numero: number; data: string }[] };
      expect(cliente.alteracoes.map(({ numero, data }) => ({ numero, data }))).toEqual([{ numero: 1, data: "2022-05-11" }]);
      expect(c.enviados.map((e) => e.origemId).sort()).toEqual(["a0", "a2"]);
    });

    it("continua falhando quando dois PDFs trazem o mesmo número com datas diferentes", async () => {
      const c = montar({
        lista: [{ nome: N, cnpj: CNPJ }],
        sn: [CNPJ],
        pastas: [
          {
            nome: N,
            arquivos: [
              arquivo("a0", "contrato social.pdf", textoContrato(N, CNPJ)),
              arquivo("a1", "1 alteracao.pdf", textoAlteracao(N, CNPJ, "PRIMEIRA", "10 de maio de 2022")),
              arquivo("a2", "1 alteracao b.pdf", textoAlteracao(N, CNPJ, "PRIMEIRA", "11 de maio de 2022")),
            ],
          },
        ],
      });

      const r = await executarImportacao(c.portas, {});

      expect(r.falhas).toEqual([
        { cnpj: CNPJ, nome: N, etapa: "numero", motivo: "número de alteração repetido" },
      ]);
      expect(c.enviados).toEqual([]);
    });
  });

  describe("linha de data da alteração como nos contratos reais", () => {
    it.each([
      ["Cascavel/PR, 20 de fevereiro de 2026."],
      ["Cascavel/PR 20 de fevereiro de 2026."],
      ["Cascavel - PR, 20 de fevereiro de 2026."],
      ["Cascavel (PR), 20 de fevereiro de 2026."],
      ["Cascavel-Pr. 20 de fevereiro de 2026."],
      ["Cascavel, Pr., 20 de fevereiro de 2026."],
      ["Cascavel, 20 de fevereiro de 2026."],
      ["20 de fevereiro de 2026."],
      ["Cascavel/PR, 20 de Fevereiro de 2026"],
    ])("lê a data em %s mesmo com o bloco de assinaturas depois", async (linha) => {
      const c = montar({
        lista: [{ nome: N, cnpj: CNPJ }],
        sn: [CNPJ],
        pastas: [
          {
            nome: N,
            arquivos: [
              arquivo("a0", "contrato social.pdf", textoContrato(N, CNPJ)),
              arquivo("a1", "1 alteracao.pdf", textoAlteracaoReal(N, CNPJ, "PRIMEIRA", linha)),
            ],
          },
        ],
      });

      const r = await executarImportacao(c.portas, {});

      expect(r.falhas).toEqual([]);
      const cliente = c.clientes[0] as { alteracoes: { data: string }[] };
      expect(cliente.alteracoes.map((a) => a.data)).toEqual(["2026-02-20"]);
    });
  });
});
