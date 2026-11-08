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

/** Anotações do escritório no nome ("(SAIU 01/08)", "- BAIXADA 10/26", "- vai movimentar em 2027"): não fazem parte da razão social. */
const ANOTACAO = /\s*\(.*$|(?:\s+|\s*-\s*)(?:saiu|baixad[ao]|inicia|iniciou|vai movimentar|n[aã]o faz|regime|a partir)\b.*$/i;
const FORA_DA_CARGA = /associa[cç][aã]o|condom[ií]nio|cart[oó]rio|tabeli/i;

/**
 * Empresas que só constam na planilha SN ou na tributária (e não na Lista de empresas): também são carregadas, com o
 * nome da planilha sem as anotações. CNPJ com mais de um nome nas planilhas é conflito e fica de fora; associações,
 * condomínios e cartórios seguem fora da carga.
 */
export function empresasForaDaLista(sn: Linhas, tributario: Linhas, naLista: Set<string>): LinhaLista[] {
  const cab = sn.findIndex((r) => r.some((c) => texto(c).toUpperCase() === "CNPJ"));
  const col = cab < 0 ? -1 : sn[cab]!.findIndex((c) => texto(c).toUpperCase() === "CNPJ");
  const nomes = new Map<string, Set<string>>();
  const anotar = (cnpj: string, nome: string) => {
    if (cnpj.length !== 14 || naLista.has(cnpj)) return;
    nomes.set(cnpj, (nomes.get(cnpj) ?? new Set()).add(nome.replace(ANOTACAO, "").replace(/\s+/g, " ").trim()));
  };
  if (col > 0) for (const r of sn.slice(cab + 1)) anotar(soDigitos(texto(r[col])), texto(r[col - 1]));
  const regimes = regimesDoTributario(tributario);
  for (const r of tributario) {
    const cnpj = soDigitos(texto(r[0]));
    if (regimes.get(cnpj) && regimes.get(cnpj) !== "ignorada") anotar(cnpj, texto(r[1]));
  }
  return [...nomes]
    .filter(([, n]) => n.size === 1)
    .map(([cnpj, n]) => ({ nome: [...n][0]!, cnpj }))
    .filter((l) => l.nome !== "" && !FORA_DA_CARGA.test(l.nome));
}
