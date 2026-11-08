import { textoLegivel } from "./texto";

describe("textoLegivel", () => {
  it("aceita texto normal em português, com acentos, números e pontuação", () => {
    expect(textoLegivel("COMPROVANTE DE INSCRIÇÃO E DE SITUAÇÃO CADASTRAL\nCNPJ 11.222.333/0001-81 - ACME LTDA")).toBe(true);
  });

  it("recusa a saída de uma fonte sem mapeamento de caracteres (símbolos e controles no lugar das letras)", () => {
    const lixo = "\u0000\u0001\u0002\u0003\u0004\u0005\u0006\u0007\b \u0002 \u0002\u0001 \u0007\u000e \u000f \u0005\u0001 \u0010\u0007\u0006";

    expect(textoLegivel(lixo)).toBe(false);
  });

  it("recusa texto com quase só controle ou símbolos, mesmo longo", () => {
    expect(textoLegivel("\u0001\u0002\u0003 ".repeat(40))).toBe(false);
  });

  it("recusa texto curto demais para ser documento", () => {
    expect(textoLegivel("Página 1")).toBe(false);
  });
});
