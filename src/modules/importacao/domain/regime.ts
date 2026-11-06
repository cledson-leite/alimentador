import type { Regime } from "../application/ports/portas";

/** A planilha tributária vence a SN: quem consta nas duas saiu do Simples Nacional. */
export function resolverRegime(
  cnpj: string,
  sn: Set<string>,
  tributario: Map<string, "lucro_presumido" | "lucro_real">,
): Regime | null {
  return tributario.get(cnpj) ?? (sn.has(cnpj) ? "simples_nacional" : null);
}
