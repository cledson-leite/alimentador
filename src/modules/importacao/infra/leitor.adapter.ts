import { readFile } from "node:fs/promises";

import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";
import WordExtractor from "word-extractor";

import type { ArquivoDocumento, LeitorPort } from "../application/ports/portas";

const MINIMO = 20; // abaixo disso a "camada de texto" é ruído, não conteúdo

async function extrair(a: ArquivoDocumento): Promise<string> {
  const caminho = a.caminho!;
  switch (a.formato) {
    case "pdf": {
      const pdf = await getDocumentProxy(new Uint8Array(await readFile(caminho)));
      const { text } = await extractText(pdf, { mergePages: true });
      return text;
    }
    case "docx":
      return (await mammoth.extractRawText({ path: caminho })).value;
    case "doc":
      return (await new WordExtractor().extract(caminho)).getBody();
    default:
      return "";
  }
}

/** Texto digital do documento; null se for escaneado, imagem, ilegível ou corrompido (vai ao OCR ou às falhas). */
export function leitorDeArquivos(): LeitorPort {
  return {
    lerTexto: async (a) => {
      if (!a.caminho) return null;
      try {
        const texto = (await extrair(a)).trim();
        return texto.length >= MINIMO ? texto : null;
      } catch {
        return null;
      }
    },
  };
}
