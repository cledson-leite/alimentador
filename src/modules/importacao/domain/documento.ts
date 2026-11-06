const CNPJ = /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g;

export const soDigitos = (s: string) => s.replace(/\D/g, "");
export const raiz = (cnpj: string) => cnpj.slice(0, 8);

export function cnpjsDoTexto(texto: string): string[] {
  return [...texto.matchAll(CNPJ)].map((m) => soDigitos(m[0]));
}

/** Nome entre aspas no corpo ("NOME LTDA", com sede...), que é como os contratos reais o escrevem. */
const NOME_ENTRE_ASPAS = /[“"]([^”"\n]{3,120}?\s(?:LTDA|EIRELI|S\/A|S\.A\.|EPP|ME|SS|MEI))\.?[”"]/i;

/** "adotará como nome empresarial: X LTDA", quando o contrato abre pela qualificação dos sócios. */
const NOME_EMPRESARIAL_DECLARADO = /nome empresarial:?\s+([^,\n]+?\s(?:LTDA|EIRELI|S\/A|S\.A\.|EPP|ME|SS|MEI))\b/i;
/** Linha que é só o nome (termina na forma societária), como logo abaixo do título da alteração. */
const LINHA_DE_NOME = /^(.{3,120}?\s(?:LTDA|EIRELI|S\/A|S\.A\.|EPP|ME|SS|MEI))\.?$/i;
/** Empresário individual: nome completo seguido do CPF (11 dígitos), sem forma societária. */
const NOME_E_CPF = /(?:^|-\s*)([A-ZÀ-Ú][A-ZÀ-Ú ]{5,80}?)\s+\d{11}\b/;

export function nomeEmpresarial(texto: string): string | null {
  const entreAspas = texto.match(NOME_ENTRE_ASPAS)?.[1]?.trim();
  if (entreAspas) return entreAspas;
  const declarado = texto.match(NOME_EMPRESARIAL_DECLARADO)?.[1]?.trim();
  if (declarado) return declarado;
  const inicio = texto.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 6);
  const eiTitulo = inicio.findIndex((l) => /EMPRES[AÁ]RIO INDIVIDUAL/i.test(l));
  const abaixoDoTitulo = eiTitulo >= 0 && eiTitulo < 3 ? inicio[eiTitulo + 1] : undefined;
  if (abaixoDoTitulo && abaixoDoTitulo.length <= 80 && !/\d|CNPJ|NIRE/i.test(abaixoDoTitulo)) return abaixoDoTitulo;
  const naLinha = inicio.map((l) => (/ALTERA|CONTRAT|CONSOLIDA/i.test(l) ? null : l.match(LINHA_DE_NOME)?.[1])).find(Boolean);
  if (naLinha) return naLinha.trim();
  if (/EMPRES[AÁ]RI[OA]/i.test(inicio.slice(0, 4).join(" "))) {
    return inicio.slice(0, 4).map((l) => l.match(NOME_E_CPF)?.[1]).find(Boolean)?.trim() ?? null;
  }
  return null;
}

const semAcento = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** O título nas primeiras linhas decide o tipo; a palavra solta no corpo não conta. */
export function tipoDoDocumento(texto: string): "contrato" | "alteracao" | "outro" {
  const linhas = texto.split("\n").slice(0, 3).map((l) => semAcento(l.trim()).toUpperCase());
  if (linhas.some((l) => TITULO_DE_ALTERACAO.test(l))) return "alteracao";
  if (linhas.join(" ").includes("CONTRATO SOCIAL")) return "contrato";
  return "outro";
}

/** Linha de título de alteração: "ALTERAÇÃO" no começo (após ordinal), com palavra de contrato na mesma linha. */
const TITULO_DE_ALTERACAO = /^(?:[#\d]+\s*[ªº°A]?\s*|[A-Z]+\s+){0,3}ALTERACAO\b.*(?:CONTRAT|SOCIAL|INSTRUMENTO|INDIVIDUAL)/;

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
