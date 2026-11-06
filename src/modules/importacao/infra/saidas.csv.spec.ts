import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { escreverSaidas } from "./saidas.csv";

describe("escreverSaidas", () => {
  it("escreve os quatro CSVs, reescrevendo a cada execução e protegendo ; aspas e quebras de linha", async () => {
    const dir = join(await mkdtemp(join(tmpdir(), "saida-")), "saida");
    const resultado = {
      carregadas: [{ cnpj: "11222333000181", empresa: 'ACME; "A" LTDA', regime: "simples_nacional" as const }],
      falhas: [{ cnpj: "99888777000100", nome: "OUTRA", etapa: "cnpj", motivo: "nenhum documento traz CNPJ" }],
      regimeAConfirmar: [{ cnpj: "55444333000122", nome: "SEM REGIME" }],
      pessoasFisicas: [{ nome: "JOAO", documento: "12345678901" }],
      puladas: [],
    };

    await escreverSaidas(dir, resultado);
    await escreverSaidas(dir, { ...resultado, falhas: [] }); // segunda execução reescreve, não acumula

    const ler = async (f: string) => (await readFile(join(dir, f), "utf-8")).replace(/^\uFEFF/, "");
    expect(await ler("carregadas.csv")).toBe('cnpj;empresa;regime\n11222333000181;"ACME; ""A"" LTDA";simples_nacional\n');
    expect(await ler("falhas.csv")).toBe("cnpj;nome;etapa;motivo\n");
    expect(await ler("regime-a-confirmar.csv")).toBe("cnpj;nome\n55444333000122;SEM REGIME\n");
    expect(await ler("pessoas-fisicas.csv")).toBe("nome;documento\nJOAO;12345678901\n");
  });
});
