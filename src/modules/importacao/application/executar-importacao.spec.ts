import { arquivo, cnpjValido, montar, textoContrato } from "../../../../test-support/cenario";

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
});
