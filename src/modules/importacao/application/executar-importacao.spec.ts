import { arquivo, cnpjValido, formatarCnpj, montar, textoAlteracao, textoAlteracaoReal, textoContrato } from "../../../../test-support/cenario";

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

  it("manda para falhas a empresa com sequência de alterações quebrada", async () => {
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

    expect(r.falhas).toEqual([
      { cnpj: CNPJ, nome: N, etapa: "numero", motivo: "sequência de alterações quebrada" },
    ]);
    expect(c.enviados).toEqual([]);
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

    it("manda para falhas quando duas pastas casam no mesmo passo", async () => {
      const c = montar({
        lista: [{ nome: "ACME COMERCIO LTDA", cnpj: CNPJ }],
        sn: [CNPJ],
        pastas: [
          { nome: "ACME COMERCIO LTDA - empresa A", arquivos: [] },
          { nome: "ACME COMERCIO LTDA - empresa B", arquivos: [] },
        ],
      });

      const r = await executarImportacao(c.portas, {});

      expect(r.falhas).toEqual([
        { cnpj: CNPJ, nome: "ACME COMERCIO LTDA", etapa: "pasta", motivo: "várias pastas" },
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

    it.each([
      ["página de portal", "Alteração\nMatriz\nSolicitação concluída com sucesso!"],
      ["e-mail", "Bom dia. Preciso de uma atualização de dados\nPrezado(a), A Jucesp adota os procedimentos"],
      ["manual", "PARA ALTERAÇÃO:\nQUANDO FOR ESCRITORIO ADM\nALTERAÇÃO DO TIPO DE UNIDADE"],
    ])("não trata %s como alteração contratual, só por conter a palavra 'alteração'", async (_caso, texto) => {
      const { r } = await carregaCom([arquivo("a1", "outro.pdf", texto)]);

      expect(r.carregadas).toEqual([]);
      expect(r.falhas[0]).toMatchObject({ etapa: "documentos", motivo: "sem contrato social nem alteração" });
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

    it("continua falhando quando o mesmo número aparece com datas diferentes", async () => {
      const c = montarComCopias(textoAlteracao(N, CNPJ, "PRIMEIRA", "11 de maio de 2022"));

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
