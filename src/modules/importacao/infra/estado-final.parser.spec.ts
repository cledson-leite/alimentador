import { pastaPorCnpjDoEstado } from "./estado-final.parser";

const CAB = "empresa (lista);documento;regime;uso previsto;situação do download;pasta(s) do Drive;arquivos baixados;justificativa";

describe("pastaPorCnpjDoEstado", () => {
  it("mapeia o CNPJ à pasta só para as empresas que o download baixou", () => {
    const csv = [
      "﻿" + CAB,
      "ACME LTDA;11222333000181;simples_nacional;carregável;BAIXADO;ACME LTDA - empresa;3;ok",
      "SEM PASTA LTDA;99888777000100;simples_nacional;carregável;NÃO BAIXADO;;0;sem pasta",
    ].join("\r\n");

    expect(pastaPorCnpjDoEstado(csv)).toEqual(new Map([["11222333000181", "ACME LTDA - empresa"]]));
  });

  it("aceita campos entre aspas com ; e aspas duplas, e só dígitos do documento", () => {
    const csv = [CAB, 'X;"11.222.333/0001-81";simples_nacional;carregável;BAIXADO;"PASTA; ""A"" LTDA";1;"just; ""x"""'].join("\n");

    expect(pastaPorCnpjDoEstado(csv)).toEqual(new Map([["11222333000181", 'PASTA; "A" LTDA']]));
  });

  it("recusa um arquivo sem as colunas esperadas, em vez de mapear errado", () => {
    expect(() => pastaPorCnpjDoEstado("a;b\n1;2")).toThrow(/colunas/);
  });
});
