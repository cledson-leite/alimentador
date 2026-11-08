import { validarAmbiente } from "./ambiente";

const REF = "abcdefghijklmnopqrst";

describe("validarAmbiente", () => {
  it("aceita o Supabase local sem flag de produção", () => {
    expect(validarAmbiente({ url: "http://127.0.0.1:54321" }, {})).toEqual({ ambiente: "local" });
    expect(validarAmbiente({ url: "http://localhost:54321" }, {})).toEqual({ ambiente: "local" });
  });

  it("recusa URL que não é local sem --producao", () => {
    expect(() => validarAmbiente({ url: `https://${REF}.supabase.co`, refProducao: REF }, {})).toThrow(/--producao/);
  });

  it("com --producao exige o ref do projeto igual ao do .env", () => {
    expect(() => validarAmbiente({ url: `https://${REF}.supabase.co` }, { producao: true })).toThrow(/SUPABASE_PROD_PROJECT_REF/);
    expect(() =>
      validarAmbiente({ url: `https://${REF}.supabase.co`, refProducao: "outroprojeto" }, { producao: true }),
    ).toThrow(/não confere/);
    expect(validarAmbiente({ url: `https://${REF}.supabase.co`, refProducao: REF }, { producao: true })).toEqual({
      ambiente: "producao",
      ref: REF,
    });
  });

  it("recusa --producao contra o Supabase local, para a flag nunca valer por engano", () => {
    expect(() => validarAmbiente({ url: "http://127.0.0.1:54321", refProducao: REF }, { producao: true })).toThrow(/local/);
  });

  it("não aceita um host que apenas começa como o local", () => {
    expect(() => validarAmbiente({ url: "http://127.0.0.1.evil.com" }, {})).toThrow(/--producao/);
  });
});
