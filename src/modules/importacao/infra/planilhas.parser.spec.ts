import { cnpjsDoSn, linhasDaLista, regimesDoTributario } from "./planilhas.parser";

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
});
