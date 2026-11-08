import type { ArquivoDocumento, Pasta } from "../application/ports/portas";

export type EntradaManifesto = { letra: string; empresa: string; id: string; path: string };

const FORMATOS: Record<string, ArquivoDocumento["formato"]> = {
  pdf: "pdf",
  doc: "doc",
  docx: "docx",
  jpg: "imagem",
  jpeg: "imagem",
  png: "imagem",
};

const semAcento = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/**
 * Liga cada arquivo à empresa pelo manifesto (campo `empresa` + `id`), nunca pelo caminho em disco:
 * pastas com "/" no nome (datas) viram subpastas e trocariam arquivos de empresa.
 * `indice` mapeia os 6 primeiros caracteres do id do Drive ao arquivo baixado.
 */
export function pastasDoManifesto(manifesto: EntradaManifesto[], indice: Map<string, string>): Pasta[] {
  const porEmpresa = new Map<string, ArquivoDocumento[]>();
  const vistos = new Set<string>();
  for (const e of manifesto) {
    const caminho = indice.get(e.id.slice(0, 6));
    const nome = e.path.split("/").at(-1) ?? e.path;
    const formato = FORMATOS[nome.split(".").at(-1)?.toLowerCase() ?? ""];
    if (!caminho || !formato || vistos.has(e.id) || /alvara|modelos utilizados/i.test(semAcento(e.path))) continue;
    vistos.add(e.id);
    const arquivos = porEmpresa.get(e.empresa) ?? [];
    arquivos.push({ id: e.id, nome, formato, caminho });
    porEmpresa.set(e.empresa, arquivos);
  }
  return [...porEmpresa].map(([nome, arquivos]) => ({ nome, arquivos }));
}
