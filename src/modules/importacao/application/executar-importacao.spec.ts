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
});
