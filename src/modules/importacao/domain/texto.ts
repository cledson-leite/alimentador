const MINIMO_DE_LETRAS = 15;
const MINIMO_DE_LEGIVEL = 0.7;

/**
 * Distingue texto de verdade da saída de um PDF cuja fonte não tem mapeamento de caracteres (sai lixo no lugar das
 * letras). Texto assim deve ser tratado como "sem texto" e seguir para OCR, em vez de ser classificado.
 */
export function textoLegivel(texto: string): boolean {
  const caracteres = [...texto];
  const letras = caracteres.filter((c) => /\p{L}/u.test(c)).length;
  if (letras < MINIMO_DE_LETRAS) return false;
  const legiveis = caracteres.filter((c) => /[\p{L}\p{N}\s.,:;/()\-–'"“”ºª°&%@#$+=?!]/u.test(c)).length;
  return legiveis / caracteres.length >= MINIMO_DE_LEGIVEL;
}
