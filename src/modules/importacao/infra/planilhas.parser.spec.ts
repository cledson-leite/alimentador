import { cnpjsDoSn, empresasForaDaLista, linhasDaLista, regimesDoTributario } from "./planilhas.parser";

describe("interpretação das planilhas", () => {
  it("lê a lista de empresas (nome, CNPJ) e guarda só os dígitos do documento", () => {
    const rows = [
      ["ACME COMERCIO LTDA", "11.222.333/0001-81"],
      ["JOAO DA SILVA", "123.456.789-01"],
      [null, null],
    ];

    expect(linhasDaLista(rows)).toEqual([
      { nome: "ACME COMERCIO LTDA", cnpj: "11222333000181" },
      { nome: "JOAO DA SILVA", cnpj: "12345678901" },
    ]);
  });

  it("lê os CNPJs da planilha SN pela coluna do cabeçalho 'CNPJ', ignorando linhas acima dele", () => {
    const rows = [
      [null, null, null, "55"],
      ["RAZÃO SOCIAL", "JB", "CNPJ", "IE"],
      ["ACME", "x", "11.222.333/0001-81", "1"],
      ["OUTRA", "x", null, "2"],
    ];

    expect(cnpjsDoSn(rows)).toEqual(new Set(["11222333000181"]));
  });

  it("lê o regime do tributário e marca 'OUTRAS ENT.' como ignorada", () => {
    const rows = [
      ["11.222.333/0001-81", "ACME", "123", "L. PRESUMIDO"],
      ["44.373.409/0001-00", "OUTRA", "999", "L. REAL"],
      ["55.555.555/0001-55", "IGREJA", "1", "OUTRAS ENT."],
    ];

    expect(regimesDoTributario(rows)).toEqual(
      new Map([
        ["11222333000181", "lucro_presumido"],
        ["44373409000100", "lucro_real"],
        ["55555555000155", "ignorada"],
      ]),
    );
  });

  it("só considera CNPJ, nome e regime: o que estiver na coluna da IE (ex.: BAIXOU) é ignorado", () => {
    const rows = [
      ["11.222.333/0001-81", "ACME", "BAIXOU", "L. PRESUMIDO"],
      ["44.373.409/0001-00", "OUTRA", "NAO ATIVO", "L. REAL"],
    ];

    expect(regimesDoTributario(rows)).toEqual(
      new Map([
        ["11222333000181", "lucro_presumido"],
        ["44373409000100", "lucro_real"],
      ]),
    );
  });

  it("empresas só da SN ou do tributário entram com o nome sem anotações; conflito de nome, associação e OUTRAS ENT. ficam fora", () => {
    const sn = [
      ["X", "EMPRESA", "CNPJ"],
      ["a", "ALFA LTDA (SAIU 01/08)", "11.222.333/0001-81"],
      ["a", "BETA LTDA - BAIXADA 10/26", "55.555.555/0001-55"],
      ["a", "NA LISTA LTDA", "22.333.444/0001-81"],
      ["a", "UM NOME", "66.666.666/0001-66"],
      ["a", "ASSOCIAÇÃO DOS AMIGOS", "77.777.777/0001-77"],
    ];
    const trib = [
      ["33.444.555/0001-81", "GAMA LTDA", "1", "L. REAL"],
      ["66.666.666/0001-66", "OUTRO NOME", "1", "L. PRESUMIDO"],
      ["88.888.888/0001-88", "IGREJA", "1", "OUTRAS ENT."],
    ];

    expect(empresasForaDaLista(sn, trib, new Set(["22333444000181"]))).toEqual([
      { nome: "ALFA LTDA", cnpj: "11222333000181" },
      { nome: "BETA LTDA", cnpj: "55555555000155" },
      { nome: "GAMA LTDA", cnpj: "33444555000181" },
    ]);
  });
});
