import { lerOpcoes } from "./opcoes";

describe("lerOpcoes", () => {
  it("usa os padrões seguros: sem produção, sem API, sem dry-run, todas as empresas", () => {
    expect(lerOpcoes([])).toMatchObject({ producao: false, permitirApi: false, dryRun: false, cnpjs: undefined });
  });

  it("lê as flags e normaliza a lista de CNPJs para só dígitos", () => {
    const o = lerOpcoes(["--dry-run", "--producao", "--permitir-api", "--cnpj", "11.222.333/0001-81, 44373409000100"]);

    expect(o).toMatchObject({
      dryRun: true,
      producao: true,
      permitirApi: true,
      cnpjs: ["11222333000181", "44373409000100"],
    });
  });

  it("liga o OCR local por padrão e o desliga com --sem-ocr", () => {
    expect(lerOpcoes([]).semOcr).toBe(false);
    expect(lerOpcoes(["--sem-ocr"]).semOcr).toBe(true);
  });

  it("usa por padrão o arquivo das empresas sem regime e aceita outro com --regimes", () => {
    expect(lerOpcoes([]).regimes).toBe("saida/sem-regime-prontas-para-confirmar.csv");
    expect(lerOpcoes(["--regimes", "D:/outro.csv"]).regimes).toBe("D:/outro.csv");
  });

  it("recusa flag desconhecida em vez de ignorá-la", () => {
    expect(() => lerOpcoes(["--produçao"])).toThrow();
  });

  it("recusa --cnpj com valor que não é CNPJ", () => {
    expect(() => lerOpcoes(["--cnpj", "abc"])).toThrow(/CNPJ/);
  });
});
