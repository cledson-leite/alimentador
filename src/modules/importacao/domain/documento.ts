const CNPJ = /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g;

export const soDigitos = (s: string) => s.replace(/\D/g, "");

export function cnpjsDoTexto(texto: string): string[] {
  return [...texto.matchAll(CNPJ)].map((m) => soDigitos(m[0]));
}

export function nomeEmpresarial(texto: string): string | null {
  const m = texto.match(/nome empresarial\s+([^\n,]+?\s(?:LTDA|EIRELI|S\/A|EPP|ME))\b/i);
  return m?.[1]?.trim() ?? null;
}

export function ehContratoSocial(texto: string): boolean {
  const inicio = texto.split("\n").slice(0, 5).join(" ").toUpperCase();
  return inicio.includes("CONTRATO SOCIAL");
}
