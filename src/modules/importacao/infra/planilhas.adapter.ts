import { readSheet } from "read-excel-file/node";

import { cnpjsDoSn, empresasForaDaLista, linhasDaLista, regimesDoTributario } from "./planilhas.parser";

import type { PlanilhasPort } from "../application/ports/portas";

const ABA_SN = "Patriki 102026";

export type CaminhosPlanilhas = { lista: string; sn: string; tributario: string };

export function planilhasXlsx(c: CaminhosPlanilhas): PlanilhasPort {
  return {
    lerLista: async () => {
      const lista = linhasDaLista(await readSheet(c.lista));
      const extras = empresasForaDaLista(await readSheet(c.sn, ABA_SN), await readSheet(c.tributario), new Set(lista.map((l) => l.cnpj)));
      return [...lista, ...extras];
    },
    lerSn: async () => cnpjsDoSn(await readSheet(c.sn, ABA_SN)),
    lerTributario: async () => regimesDoTributario(await readSheet(c.tributario)),
  };
}
