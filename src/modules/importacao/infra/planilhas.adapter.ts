import { readSheet } from "read-excel-file/node";

import { cnpjsDoSn, linhasDaLista, regimesDoTributario } from "./planilhas.parser";

import type { PlanilhasPort } from "../application/ports/portas";

const ABA_SN = "Patriki 102026";

export type CaminhosPlanilhas = { lista: string; sn: string; tributario: string };

export function planilhasXlsx(c: CaminhosPlanilhas): PlanilhasPort {
  return {
    lerLista: async () => linhasDaLista(await readSheet(c.lista)),
    lerSn: async () => cnpjsDoSn(await readSheet(c.sn, ABA_SN)),
    lerTributario: async () => regimesDoTributario(await readSheet(c.tributario)),
  };
}
