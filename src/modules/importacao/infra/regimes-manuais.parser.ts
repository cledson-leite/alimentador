import { soDigitos } from "../domain/documento";

import { linhasDoCsv } from "./estado-final.parser";

import type { Regime } from "../application/ports/portas";

const VALIDOS: Regime[] = ["simples_nacional", "lucro_presumido", "lucro_real"];

/**
 * Regime informado à mão para empresas que não constam na SN nem no tributário. Só vale CNPJ e regime; linha com o
 * regime em branco é ignorada (a empresa segue sem regime). Valor inválido ou CNPJ malformado interrompe a leitura,
 * listando as linhas, em vez de gravar um regime errado.
 */
export function regimesManuaisDoCsv(csv: string): Map<string, Regime> {
  const [cab, ...linhas] = linhasDoCsv(csv.replace(/^﻿/, ""));
  const iCnpj = cab?.findIndex((c) => c.trim().toLowerCase() === "cnpj") ?? -1;
  const iRegime = cab?.findIndex((c) => c.trim().toLowerCase().startsWith("regime")) ?? -1;
  if (iCnpj < 0 || iRegime < 0) throw new Error("Arquivo de regimes sem as colunas de CNPJ e de regime");

  const mapa = new Map<string, Regime>();
  const erros: string[] = [];
  for (const l of linhas) {
    const valor = (l[iRegime] ?? "").trim().toLowerCase();
    if (valor === "") continue;
    const cnpj = soDigitos(l[iCnpj] ?? "");
    if (cnpj.length !== 14) erros.push(`CNPJ "${l[iCnpj] ?? ""}" não tem 14 dígitos (regime "${valor}")`);
    else if (!VALIDOS.includes(valor as Regime)) erros.push(`${cnpj}: regime "${valor}" inválido (use ${VALIDOS.join(", ")})`);
    else mapa.set(cnpj, valor as Regime);
  }
  if (erros.length > 0) throw new Error(`Arquivo de regimes com erro:\n${erros.join("\n")}`);
  return mapa;
}
