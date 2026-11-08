import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { Resultado } from "../application/executar-importacao.use-case";

const celula = (v: string) => (/[;"\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const csv = (cabecalho: string[], linhas: string[][]) =>
  "\uFEFF" + [cabecalho, ...linhas].map((l) => l.map(celula).join(";")).join("\n") + "\n";

/** Reescreve os quatro CSVs de saída (fora do git) a cada execução. */
export async function escreverSaidas(dir: string, r: Resultado): Promise<void> {
  await mkdir(dir, { recursive: true });
  await Promise.all([
    writeFile(join(dir, "carregadas.csv"), csv(["cnpj", "empresa", "regime"], r.carregadas.map((c) => [c.cnpj, c.empresa, c.regime]))),
    writeFile(join(dir, "falhas.csv"), csv(["cnpj", "nome", "etapa", "motivo"], r.falhas.map((f) => [f.cnpj, f.nome, f.etapa, f.motivo]))),
    writeFile(join(dir, "regime-a-confirmar.csv"), csv(["cnpj", "nome"], r.regimeAConfirmar.map((x) => [x.cnpj, x.nome]))),
    writeFile(join(dir, "pessoas-fisicas.csv"), csv(["nome", "documento"], r.pessoasFisicas.map((p) => [p.nome, p.documento]))),
  ]);
}
