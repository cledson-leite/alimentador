import type { Regime } from "../application/ports/portas";

/** A planilha tributária vence a SN: quem consta nas duas saiu do Simples Nacional. */
export function resolverRegime(
  cnpj: string,
  sn: Set<string>,
  tributario: Map<string, "lucro_presumido" | "lucro_real" | "baixou">,
): Regime | null {
  const t = tributario.get(cnpj);
  if (t === "baixou") return null;
  return t ?? (sn.has(cnpj) ? "simples_nacional" : null);
}
