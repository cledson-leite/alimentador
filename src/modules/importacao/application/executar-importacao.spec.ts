import { arquivo, cnpjValido, montar, textoAlteracao, textoContrato } from "../../../../test-support/cenario";

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
});
