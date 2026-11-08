import { soDigitos } from "../domain/documento";

/** CSV com ";" e aspas duplas, como o `_estado-final.csv` do download. */
export function linhasDoCsv(texto: string): string[][] {
  const linhas: string[][] = [];
  let campo = "";
  let linha: string[] = [];
  let aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]!;
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === ";") {
      linha.push(campo);
      campo = "";
    } else if (c === "\n") {
      linha.push(campo.replace(/\r$/, ""));
      linhas.push(linha);
      linha = [];
      campo = "";
    } else campo += c;
  }
  if (campo || linha.length) {
    linha.push(campo.replace(/\r$/, ""));
    linhas.push(linha);
  }
  return linhas;
}

/** CNPJ → pasta do Drive que o download aceitou (refinada com o usuário), só das empresas baixadas. */
export function pastaPorCnpjDoEstado(csv: string): Map<string, string> {
  const [cab, ...linhas] = linhasDoCsv(csv.replace(/^﻿/, ""));
  const iDoc = cab?.indexOf("documento") ?? -1;
  const iSit = cab?.findIndex((c) => c.startsWith("situa")) ?? -1;
  const iPasta = cab?.indexOf("pasta(s) do Drive") ?? -1;
  if (iDoc < 0 || iSit < 0 || iPasta < 0) throw new Error("estado-final.csv sem as colunas esperadas");
  const mapa = new Map<string, string>();
  for (const l of linhas) {
    const pasta = l[iPasta]?.trim();
    if (l[iSit] === "BAIXADO" && pasta) mapa.set(soDigitos(l[iDoc] ?? ""), pasta);
  }
  return mapa;
}
