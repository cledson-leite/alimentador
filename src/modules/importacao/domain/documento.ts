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
const LINHA_DATA = /^[^,]+,\s*[A-Z]{2}\.?,\s*(\d{1,2})\s*[º°]?\s*de\s+([a-zçã]+)\s+de\s+(\d{4})/i;

/** Datas candidatas ("Cidade, UF, dia de mês de ano") nas últimas linhas antes da assinatura digital. */
export function datasFinais(texto: string): string[] {
  const linhas = texto.split("\n").map((l) => l.trim()).filter(Boolean);
  const assinatura = linhas.findIndex((l) => /assinad[oa] digitalmente|assinatura digital/i.test(l));
  const corpo = assinatura >= 0 ? linhas.slice(0, assinatura) : linhas;
  const datas = new Set<string>();
  for (const l of corpo.slice(-5)) {
    const m = semAcento(l).match(LINHA_DATA);
    const mes = m ? MESES.indexOf(m[2]!.toLowerCase()) : -1;
    if (m && mes >= 0) {
      datas.add(`${m[3]}-${String(mes + 1).padStart(2, "0")}-${m[1]!.padStart(2, "0")}`);
    }
  }
  return [...datas];
}
