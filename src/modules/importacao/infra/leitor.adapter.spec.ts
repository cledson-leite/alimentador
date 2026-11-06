import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { PDFDocument, StandardFonts } from "pdf-lib";

import { leitorDeArquivos } from "./leitor.adapter";

async function pdf(texto?: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const pagina = doc.addPage();
  if (texto) pagina.drawText(texto, { x: 50, y: 700, size: 12, font: await doc.embedFont(StandardFonts.Helvetica) });
  return doc.save();
}

describe("leitorDeArquivos", () => {
  it("devolve o texto de um PDF digital", async () => {
    const dir = await mkdtemp(join(tmpdir(), "leitor-"));
    const caminho = join(dir, "contrato.pdf");
    await writeFile(caminho, await pdf("CONTRATO SOCIAL ACME LTDA"));

    const texto = await leitorDeArquivos().lerTexto({ id: "1", nome: "contrato.pdf", formato: "pdf", caminho });

    expect(texto).toContain("CONTRATO SOCIAL ACME LTDA");
  });

  it("devolve null para PDF sem camada de texto (escaneado) e para imagem", async () => {
    const dir = await mkdtemp(join(tmpdir(), "leitor-"));
    const caminho = join(dir, "escaneado.pdf");
    await writeFile(caminho, await pdf());
    const leitor = leitorDeArquivos();

    expect(await leitor.lerTexto({ id: "1", nome: "e.pdf", formato: "pdf", caminho })).toBeNull();
    expect(await leitor.lerTexto({ id: "2", nome: "i.jpg", formato: "imagem", caminho })).toBeNull();
  });

  it("devolve null quando o arquivo está corrompido, em vez de derrubar a execução", async () => {
    const dir = await mkdtemp(join(tmpdir(), "leitor-"));
    const caminho = join(dir, "quebrado.pdf");
    await writeFile(caminho, "isto não é um pdf");

    expect(await leitorDeArquivos().lerTexto({ id: "1", nome: "q.pdf", formato: "pdf", caminho })).toBeNull();
  });
});
