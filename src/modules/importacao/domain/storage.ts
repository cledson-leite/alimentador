/** Nome de objeto aceito pelo Storage: sem acento, "º"/"ª", espaços nem barras. */
export function nomeSeguro(nome: string): string {
  const ponto = nome.lastIndexOf(".");
  const [base, ext] = ponto > 0 ? [nome.slice(0, ponto), nome.slice(ponto + 1)] : [nome, ""];
  const limpa = (s: string) =>
    s
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  return ext ? `${limpa(base) || "arquivo"}.${limpa(ext)}` : limpa(base) || "arquivo";
}
