import { regimesManuaisDoCsv } from "./regimes-manuais.parser";

const CAB = "cnpj;nome na lista de empresas;pasta no Drive;regime (preencher: simples_nacional, lucro_presumido ou lucro_real)";

describe("regimesManuaisDoCsv", () => {
  it("lê o regime preenchido por CNPJ e ignora as linhas em branco", () => {
    const csv = [
      "﻿" + CAB,
      "11222333000181;ACME LTDA;pasta A;lucro_presumido",
      "44373409000100;OUTRA LTDA;pasta B;",
      "55555555000155;TERCEIRA LTDA;pasta C;simples_nacional",
    ].join("\r\n");

    expect(regimesManuaisDoCsv(csv)).toEqual(
      new Map([
        ["11222333000181", "lucro_presumido"],
        ["55555555000155", "simples_nacional"],
      ]),
    );
  });

  it("aceita o CNPJ formatado e maiúsculas ou espaços no regime", () => {
    const csv = [CAB, "11.222.333/0001-81;ACME;pasta;  LUCRO_REAL "].join("\n");

    expect(regimesManuaisDoCsv(csv)).toEqual(new Map([["11222333000181", "lucro_real"]]));
  });

  it("recusa valor de regime inválido, listando as linhas, em vez de gravar um regime errado", () => {
    const csv = [CAB, "11222333000181;ACME;pasta;presumido", "44373409000100;OUTRA;pasta;simples"].join("\n");

    expect(() => regimesManuaisDoCsv(csv)).toThrow(/11222333000181.*presumido[\s\S]*44373409000100.*simples/);
  });

  it("recusa CNPJ que não tem 14 dígitos nas linhas preenchidas", () => {
    expect(() => regimesManuaisDoCsv([CAB, "123;ACME;pasta;lucro_real"].join("\n"))).toThrow(/123/);
  });

  it("recusa arquivo sem as colunas de CNPJ e de regime", () => {
    expect(() => regimesManuaisDoCsv("a;b\n1;2")).toThrow(/colunas/);
  });
});
