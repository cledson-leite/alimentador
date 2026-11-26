import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { Linha, Resultado } from "../application/importar-contatos.use-case";

const celula = (v: string) => (/[;"\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const csv = (linhas: Linha[]) =>
  "﻿" +
  [["cnpj", "empresa", "item", "resultado", "detalhe"], ...linhas.map((l) => [l.cnpj, l.empresa, l.item, l.resultado, l.detalhe ?? ""])].map((l) => l.map(celula).join(";")).join("\n") +
  "\n";

/** Reescreve os CSVs de saída (fora do git) a cada execução; `prefixo` separa simulação de carga real. */
export async function escreverSaidas(dir: string, prefixo: string, r: Resultado): Promise<void> {
  await mkdir(dir, { recursive: true });
  await Promise.all(
    (Object.keys(r) as (keyof Resultado)[]).map((nome) => writeFile(join(dir, `${prefixo}-${nome}.csv`), csv(r[nome]))),
  );
}
