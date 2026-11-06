import { soDigitos } from "../domain/documento";

import type { LinhaLista } from "../application/ports/portas";

type Linhas = unknown[][];

const texto = (c: unknown) => (c == null ? "" : String(c).trim());

export function linhasDaLista(rows: Linhas): LinhaLista[] {
  return rows
    .map((r) => ({ nome: texto(r[0]), cnpj: soDigitos(texto(r[1])) }))
    .filter((l) => l.nome !== "" || l.cnpj !== "");
}

export function cnpjsDoSn(rows: Linhas): Set<string> {
  const cab = rows.findIndex((r) => r.some((c) => texto(c).toUpperCase() === "CNPJ"));
  if (cab < 0) throw new Error('Planilha SN sem coluna "CNPJ"');
  const col = rows[cab]!.findIndex((c) => texto(c).toUpperCase() === "CNPJ");
  const cnpjs = rows
    .slice(cab + 1)
    .map((r) => soDigitos(texto(r[col])))
    .filter((c) => c.length === 14);
  return new Set(cnpjs);
}

export function regimesDoTributario(rows: Linhas): Map<string, "lucro_presumido" | "lucro_real" | "ignorada"> {
  const mapa = new Map<string, "lucro_presumido" | "lucro_real" | "ignorada">();
  for (const r of rows) {
    const regime = texto(r[3]).toUpperCase();
    const cnpj = soDigitos(texto(r[0]));
    if (cnpj.length !== 14) continue;
    if (regime === "L. PRESUMIDO") mapa.set(cnpj, "lucro_presumido");
    else if (regime === "OUTRAS ENT.") mapa.set(cnpj, "ignorada");
    else if (regime === "L. REAL") mapa.set(cnpj, "lucro_real");
  }
  return mapa;
}
