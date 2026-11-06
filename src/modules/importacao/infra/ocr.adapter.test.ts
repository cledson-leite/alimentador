import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createCanvas } from "@napi-rs/canvas";
import { PDFDocument } from "pdf-lib";

import { leitorComOcr } from "./ocr.adapter";

import type { LeitorPort } from "../application/ports/portas";

const CACHE = "C:/dados/ocr-cache";
const semTexto: LeitorPort = { lerTexto: async () => null };

/** Imagem com texto grande e nítido, como uma página escaneada simples. */
function paginaEmPng(linhas: string[]): Buffer {
  const canvas = createCanvas(1600, 900);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 1600, 900);
  ctx.fillStyle = "#000000";
  ctx.font = "56px sans-serif";
  linhas.forEach((l, i) => ctx.fillText(l, 60, 120 + i * 110));
  return canvas.toBuffer("image/png");
}

describe("leitorComOcr (Tesseract local)", () => {
  const ocr = leitorComOcr(semTexto, { cache: CACHE });
  afterAll(() => ocr.encerrar());

  it("lê o texto de um PDF escaneado (só imagem, sem camada de texto)", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ocr-"));
    const png = paginaEmPng(["COMPROVANTE DE INSCRICAO", "NOME EMPRESARIAL", "ACME COMERCIO LTDA"]);
    const pdf = await PDFDocument.create();
    const imagem = await pdf.embedPng(png);
    const pagina = pdf.addPage([1600, 900]);
    pagina.drawImage(imagem, { x: 0, y: 0, width: 1600, height: 900 });
    const caminho = join(dir, "escaneado.pdf");
    await writeFile(caminho, await pdf.save());

    const texto = await ocr.lerComOcr!({ id: "1", nome: "cnpj.pdf", formato: "pdf", caminho });

    expect(texto).toMatch(/ACME/);
    expect(texto).toMatch(/NOME EMPRESARIAL/);
  }, 120_000);

  it("lê o texto de um arquivo de imagem", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ocr-"));
    const caminho = join(dir, "cartao.png");
    await writeFile(caminho, paginaEmPng(["CADASTRO NACIONAL", "DA PESSOA JURIDICA"]));

    const texto = await ocr.lerComOcr!({ id: "2", nome: "cartao.png", formato: "imagem", caminho });

    expect(texto).toMatch(/PESSOA JURIDICA/);
  }, 120_000);

  it("devolve null para arquivo que não é PDF nem imagem e para caminho que não existe, sem derrubar a execução", async () => {
    expect(await ocr.lerComOcr!({ id: "3", nome: "a.doc", formato: "doc", caminho: "C:/nao/existe.doc" })).toBeNull();
    expect(await ocr.lerComOcr!({ id: "4", nome: "b.pdf", formato: "pdf", caminho: "C:/nao/existe.pdf" })).toBeNull();
  }, 120_000);
});
