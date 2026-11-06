import { readFile } from "node:fs/promises";

import { createWorker, type Worker } from "tesseract.js";
import { getDocumentProxy, renderPageAsImage } from "unpdf";

import type { ArquivoDocumento, LeitorPort } from "../application/ports/portas";

/** Documentos longos: as primeiras páginas trazem título e partes, as últimas trazem a data e as assinaturas. */
const PAGINAS_DO_INICIO = 8;
const PAGINAS_DO_FIM = 4;
const ESCALA = 2.5;

export type LeitorComOcr = LeitorPort & { encerrar(): Promise<void> };

export type OpcoesOcr = {
  /** Pasta onde o Tesseract guarda o modelo do português, para baixar uma vez só. Fora do repositório. */
  cache: string;
};

function paginasParaLer(total: number): number[] {
  const todas = Array.from({ length: total }, (_, i) => i + 1);
  if (total <= PAGINAS_DO_INICIO + PAGINAS_DO_FIM) return todas;
  return [...todas.slice(0, PAGINAS_DO_INICIO), ...todas.slice(-PAGINAS_DO_FIM)];
}

/**
 * Acrescenta OCR local ao leitor normal. O Tesseract roda na própria máquina: nada do documento sai dela. O worker
 * é criado na primeira vez que o OCR é necessário e reaproveitado; `encerrar` o libera.
 */
export function leitorComOcr(base: LeitorPort, opcoes: OpcoesOcr): LeitorComOcr {
  let worker: Promise<Worker> | null = null;
  const obter = () => (worker ??= createWorker("por", 1, { cachePath: opcoes.cache }));

  const reconhecer = async (imagem: Uint8Array | Buffer): Promise<string> => {
    const { data } = await (await obter()).recognize(Buffer.from(imagem));
    return data.text;
  };

  const lerPdf = async (caminho: string): Promise<string> => {
    const pdf = await getDocumentProxy(new Uint8Array(await readFile(caminho)));
    const textos: string[] = [];
    for (const pagina of paginasParaLer(pdf.numPages)) {
      const png = (await renderPageAsImage(pdf, pagina, { canvasImport: () => import("@napi-rs/canvas"), scale: ESCALA })) as Uint8Array;
      textos.push(await reconhecer(png));
    }
    return textos.join("\n");
  };

  return {
    lerTexto: (a) => base.lerTexto(a),
    lerComOcr: async (a: ArquivoDocumento) => {
      if (!a.caminho) return null;
      try {
        const texto = a.formato === "pdf" ? await lerPdf(a.caminho) : a.formato === "imagem" ? await reconhecer(await readFile(a.caminho)) : "";
        return texto.trim() === "" ? null : texto;
      } catch {
        return null;
      }
    },
    encerrar: async () => {
      if (worker) await (await worker).terminate();
      worker = null;
    },
  };
}
