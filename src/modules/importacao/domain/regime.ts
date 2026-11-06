import type { Regime } from "../application/ports/portas";

/**
 * A planilha tributária vence a SN: quem consta nas duas saiu do Simples Nacional. O regime informado manualmente só
 * vale para a empresa que não tem regime em nenhuma das duas planilhas.
 */
export function resolverRegime(
  cnpj: string,
  sn: Set<string>,
  tributario: Map<string, "lucro_presumido" | "lucro_real" | "ignorada">,
  manuais?: Map<string, Regime>,
): Regime | "ignorada" | null {
  const t = tributario.get(cnpj);
  if (t === "ignorada") return "ignorada";
  return t ?? (sn.has(cnpj) ? "simples_nacional" : (manuais?.get(cnpj) ?? null));
}
