import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { documentosDoDisco } from "./documentos.adapter";

describe("documentosDoDisco", () => {
  it("encontra os arquivos mesmo quando o id do Drive tem '_' ou '-' nos 6 primeiros caracteres", async () => {
    const raiz = await mkdtemp(join(tmpdir(), "docs-"));
    await mkdir(join(raiz, "A", "ACME"), { recursive: true });
    const ids = ["1_iibPJabc", "1Yd_4Aabc", "1-aCLJabc", "1ZGT3Wabc"];
    const nomes = ["a", "b", "c", "d"];
    for (const [i, id] of ids.entries()) await writeFile(join(raiz, "A", "ACME", `${nomes[i]}__${id.slice(0, 6)}.pdf`), "x");
    const manifesto = ids.map((id, i) => ({ letra: "A", empresa: "ACME", id, path: `A/ACME/${nomes[i]}.pdf` }));
    await writeFile(join(raiz, "_selecionados.json"), JSON.stringify(manifesto));

    const pastas = await documentosDoDisco(raiz, [join(raiz, "_selecionados.json")]).listarPastas();

    expect(pastas).toHaveLength(1);
    expect(pastas[0]!.arquivos.map((a) => a.id).sort()).toEqual([...ids].sort());
  });
});
