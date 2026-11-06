export const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

export function pastaPorNomeExato<T extends { nome: string }>(nome: string, pastas: T[]): T | undefined {
  return pastas.find((p) => normalizar(p.nome) === normalizar(nome));
}
