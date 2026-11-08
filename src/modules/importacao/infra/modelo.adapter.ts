import { readFile } from "node:fs/promises";
import { extname } from "node:path";

import Anthropic from "@anthropic-ai/sdk";
import { getDocumentProxy, renderPageAsImage } from "unpdf";

import { paginasParaLer, type LeitorComOcr } from "./ocr.adapter";

import type { ArquivoDocumento } from "../application/ports/portas";

const MODELO = "claude-sonnet-5-5";
const ESCALA = 2;
const LIMITE_IMAGEM = 5 * 1024 * 1024;
const TIPOS: Record<string, "image/png" | "image/jpeg" | "image/gif" | "image/webp"> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};
const INSTRUCAO =
  "As imagens são, em ordem, as páginas de um documento digitalizado em português. Transcreva fielmente todo o texto, " +
  "página por página, preservando a ordem e as quebras de linha, sem comentar, resumir nem corrigir. " +
  "Se não houver texto legível, responda apenas: ILEGÍVEL.";

type Cliente = Pick<Anthropic, "messages">;
export type OpcoesModelo = {
  /** Teto de chamadas por execução: ao estourar, a execução aborta. */
  maxChamadas: number;
  /** Só conta quantos arquivos iriam ao modelo; nada é enviado (dry-run). */
  simular?: boolean;
  /** Para teste; por padrão usa a chave dada. */
  cliente?: Cliente;
  apiKey?: string;
};
export type LeitorComModelo = LeitorComOcr & { chamadas(): number };

/**
 * Acrescenta a segunda leitura pelo modelo (Sonnet 5.5, esforço médio) ao leitor com OCR. Os arquivos que o OCR não leu
 * saem da máquina, em memória, direto para a API: nada vai a disco nem a log. Recusa ou resposta incompleta vira null.
 */
export function leitorComModelo(base: LeitorComOcr, opcoes: OpcoesModelo): LeitorComModelo {
  const cliente: Cliente = opcoes.cliente ?? new Anthropic({ apiKey: opcoes.apiKey });
  let chamadas = 0;

  const imagens = async (a: ArquivoDocumento): Promise<{ data: Buffer; tipo: string }[]> => {
    if (!a.caminho) return [];
    if (a.formato === "imagem") {
      const tipo = TIPOS[extname(a.caminho).toLowerCase()];
      const data = tipo ? await readFile(a.caminho) : null;
      return tipo && data && data.length <= LIMITE_IMAGEM ? [{ data, tipo }] : [];
    }
    if (a.formato !== "pdf") return [];
    const pdf = await getDocumentProxy(new Uint8Array(await readFile(a.caminho)));
    const paginas: { data: Buffer; tipo: string }[] = [];
    for (const n of paginasParaLer(pdf.numPages)) {
      const png = (await renderPageAsImage(pdf, n, { canvasImport: () => import("@napi-rs/canvas"), scale: ESCALA })) as Uint8Array;
      paginas.push({ data: Buffer.from(png), tipo: "image/png" });
    }
    return paginas;
  };

  return {
    ...base,
    chamadas: () => chamadas,
    lerComModelo: async (a) => {
      try {
        const paginas = await imagens(a);
        if (paginas.length === 0) return null;
        if (chamadas >= opcoes.maxChamadas) throw new Error(`Teto de ${opcoes.maxChamadas} chamadas à API atingido (--max-api).`);
        chamadas++;
        if (opcoes.simular) return null;
        const r = await cliente.messages.create({
          model: MODELO,
          max_tokens: 16000,
          output_config: { effort: "medium" },
          messages: [
            {
              role: "user",
              content: [
                ...paginas.map((p) => ({
                  type: "image" as const,
                  source: { type: "base64" as const, media_type: p.tipo as "image/png", data: p.data.toString("base64") },
                })),
                { type: "text" as const, text: INSTRUCAO },
              ],
            },
          ],
        });
        if (r.stop_reason !== "end_turn") return null;
        const texto = r.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n").trim();
        return texto === "" || /^ILEGÍVEL\.?$/i.test(texto) ? null : texto;
      } catch (e) {
        if (e instanceof Error && e.message.startsWith("Teto de")) throw e;
        return null;
      }
    },
  };
}
