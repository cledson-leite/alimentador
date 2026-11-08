import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { leitorComModelo } from "./modelo.adapter";

import type { LeitorComOcr } from "./ocr.adapter";

const base: LeitorComOcr = { lerTexto: async () => null, encerrar: async () => {} };
const resposta = (texto: string, stop = "end_turn") => ({ stop_reason: stop, content: [{ type: "text", text: texto }] });

async function imagem() {
  const caminho = join(await mkdtemp(join(tmpdir(), "modelo-")), "contrato.png");
  await writeFile(caminho, Buffer.from("89504e470d0a1a0a", "hex"));
  return { id: "a1", nome: "contrato.png", formato: "imagem" as const, caminho };
}

describe("leitorComModelo", () => {
  it("manda a imagem a Sonnet 5.5 com esforço médio e devolve o texto transcrito", async () => {
    const create = jest.fn().mockResolvedValue(resposta("CONTRATO SOCIAL"));
    const leitor = leitorComModelo(base, { maxChamadas: 5, cliente: { messages: { create } } as never });

    expect(await leitor.lerComModelo!(await imagem())).toBe("CONTRATO SOCIAL");
    expect(create.mock.calls[0]![0]).toMatchObject({ model: "claude-sonnet-5-5", output_config: { effort: "medium" } });
  });

  it("recusa, resposta cortada ou ILEGÍVEL viram null", async () => {
    for (const r of [resposta("x", "refusal"), resposta("x", "max_tokens"), resposta("ILEGÍVEL")]) {
      const leitor = leitorComModelo(base, { maxChamadas: 5, cliente: { messages: { create: jest.fn().mockResolvedValue(r) } } as never });
      expect(await leitor.lerComModelo!(await imagem())).toBeNull();
    }
  });

  it("estourar o teto de chamadas aborta; simular conta e não envia", async () => {
    const create = jest.fn().mockResolvedValue(resposta("x"));
    const teto = leitorComModelo(base, { maxChamadas: 1, cliente: { messages: { create } } as never });
    await teto.lerComModelo!(await imagem());
    await expect(teto.lerComModelo!(await imagem())).rejects.toThrow("Teto de 1");

    const seco = leitorComModelo(base, { maxChamadas: 5, simular: true, cliente: { messages: { create } } as never });
    expect(await seco.lerComModelo!(await imagem())).toBeNull();
    expect(seco.chamadas()).toBe(1);
    expect(create).toHaveBeenCalledTimes(1);
  });
});
