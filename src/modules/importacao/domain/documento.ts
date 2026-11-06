const CNPJ = /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g;

export const soDigitos = (s: string) => s.replace(/\D/g, "");
export const raiz = (cnpj: string) => cnpj.slice(0, 8);

export function cnpjsDoTexto(texto: string): string[] {
  return [...texto.matchAll(CNPJ)].map((m) => soDigitos(m[0]));
}

/** Nome entre aspas no corpo ("NOME LTDA", com sede...), que é como os contratos reais o escrevem. */
const NOME_ENTRE_ASPAS = /[“"]([^”"\n]{3,120}?\s(?:LTDA|EIRELI|S\/A|S\.A\.|EPP|ME|SS|MEI))\.?[”"]/i;

export function nomeEmpresarial(texto: string): string | null {
  return texto.match(NOME_ENTRE_ASPAS)?.[1]?.trim() ?? null;
}

const semAcento = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** O título nas primeiras linhas decide o tipo; a palavra solta no corpo não conta. */
export function tipoDoDocumento(texto: string): "contrato" | "alteracao" | "outro" {
  const titulo = semAcento(texto.split("\n").slice(0, 3).join(" ")).toUpperCase();
  if (titulo.includes("ALTERACAO")) return "alteracao";
  if (titulo.includes("CONTRATO SOCIAL")) return "contrato";
  return "outro";
}

const UNIDADES: Record<string, number> = {
  PRIMEIRA: 1, SEGUNDA: 2, TERCEIRA: 3, QUARTA: 4, QUINTA: 5, SEXTA: 6, SETIMA: 7, OITAVA: 8, NONA: 9,
};
const DEZENAS: Record<string, number> = {
  DECIMA: 10, VIGESIMA: 20, TRIGESIMA: 30, QUADRAGESIMA: 40, QUINQUAGESIMA: 50,
};

/** Número da alteração no título ("3ª", "SEGUNDA", "DÉCIMA PRIMEIRA"); null se não houver. */
export function numeroDoConteudo(texto: string): number | null {
  const titulo = semAcento(texto.split("\n").slice(0, 3).join(" ")).toUpperCase();
  const antes = titulo.split("ALTERACAO")[0] ?? "";
  const digitos = antes.match(/(\d+)\s*[ªº°A]?\s*$/);
  if (digitos) return Number(digitos[1]);
  const total = antes
    .split(/\s+/)
    .reduce((s, w) => s + (UNIDADES[w] ?? 0) + (DEZENAS[w] ?? 0), 0);
  return total > 0 ? total : null;
}

export function numeroDoNome(nomeArquivo: string): number | null {
  const m = nomeArquivo.match(/\d+/);
  return m ? Number(m[0]) : null;
}

const MESES = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
/**
 * Linha inteira de data: "Cascavel/PR, 20 de fevereiro de 2026." (UF com barra, hífen, parênteses, ponto ou
 * ausente), ou só "20 de fevereiro de 2026.". Só vale a linha que termina na data; mês no meio de frase não conta.
 */
const LINHA_DATA = new RegExp(`^(?:[^\\d]{2,60}?\\s*)?(\\d{1,2})\\s*[º°o]?\\s+de\\s+(${MESES.join("|")})\\s+de\\s+(\\d{4})\\s*\\.?$`, "i");

/**
 * A data da alteração é a última linha de data do documento: depois dela só vêm o bloco de assinaturas
 * dos sócios e o carimbo da Junta, que não têm esse formato. Devolve no máximo uma data (ISO).
 */
export function datasFinais(texto: string): string[] {
  const linhas = texto.split("\n").map((l) => semAcento(l.trim())).filter(Boolean);
  for (const l of linhas.reverse()) {
    const m = l.match(LINHA_DATA);
    if (m) return [`${m[3]}-${String(MESES.indexOf(m[2]!.toLowerCase()) + 1).padStart(2, "0")}-${m[1]!.padStart(2, "0")}`];
  }
  return [];
}
