import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { pastasDoManifesto, type EntradaManifesto } from "./documentos.manifesto";

import type { DocumentosPort } from "../application/ports/portas";

/** Arquivos baixados terminam em `__<6 primeiros caracteres do id do Drive>.<ext>`. */
async function indiceDoDisco(raiz: string): Promise<Map<string, string>> {
  const indice = new Map<string, string>();
  const visitar = async (dir: string) => {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const caminho = join(dir, e.name);
      if (e.isDirectory()) await visitar(caminho);
      else {
        const m = e.name.match(/__([^_.]{6})\.[A-Za-z0-9]+$/);
        if (m) indice.set(m[1]!, caminho);
      }
    }
  };
  await visitar(raiz);
  return indice;
}

export function documentosDoDisco(raiz: string, manifestos: string[]): DocumentosPort {
  return {
    listarPastas: async () => {
      const entradas: EntradaManifesto[] = [];
      for (const m of manifestos) entradas.push(...(JSON.parse(await readFile(m, "utf-8")) as EntradaManifesto[]));
      return pastasDoManifesto(entradas, await indiceDoDisco(raiz));
    },
  };
}
