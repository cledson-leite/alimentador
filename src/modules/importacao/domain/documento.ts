const CNPJ = /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g;

export const soDigitos = (s: string) => s.replace(/\D/g, "");
export const raiz = (cnpj: string) => cnpj.slice(0, 8);

export function cnpjsDoTexto(texto: string): string[] {
  return [...texto.matchAll(CNPJ)].map((m) => soDigitos(m[0]));
}

export const semAcento = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "");

/** Nome entre aspas no corpo ("NOME LTDA", com sede...), que é como os contratos reais o escrevem. */
const NOME_ENTRE_ASPAS = /[“"]([^”"\n]{3,120}?\s(?:LTDA|EIRELI|S\/A|S\.A\.|EPP|ME|SS|MEI))\.?[”"]/i;

/** Nome na linha logo após "NOME EMPRESARIAL" no comprovante de CNPJ. */
export function nomeDoComprovante(texto: string): string | null {
  const linhas = texto.split("\n").map((l) => l.trim()).filter(Boolean);
  const i = linhas.findIndex((l) => /^NOME EMPRESARIAL$/i.test(l));
  return i >= 0 ? (linhas[i + 1] ?? null) : null;
}

/** "adotará como nome empresarial: X LTDA", quando o contrato abre pela qualificação dos sócios. */
const NOME_EMPRESARIAL_DECLARADO = /nome empresarial:?\s+([^,\n]+?\s(?:LTDA|EIRELI|S\/A|S\.A\.|EPP|ME|SS|MEI))\b/i;
/** Linha que é só o nome (termina na forma societária), como logo abaixo do título da alteração. */
const LINHA_DE_NOME = /^(.{3,120}?\s(?:LTDA|EIRELI|S\/A|S\.A\.|EPP|ME|SS|MEI))\.?$/i;
/** Empresário individual: nome completo seguido do CPF (11 dígitos), sem forma societária. */
const NOME_E_CPF = /(?:^|-\s*)([A-ZÀ-Ú][A-ZÀ-Ú ]{5,80}?)\s+\d{11}\b/;

/**
 * O título fica nas primeiras linhas, mas pode vir atrás do carimbo da Junta ("CERTIFICO O REGISTRO EM...")
 * e de cabeçalhos de página ("Página 1 de 5"); por isso a busca olha uma janela maior do documento.
 */
const JANELA = 60;

/** Linha de título de alteração: "ALTERAÇÃO" no começo (após ordinal), com palavra de contrato na mesma linha. */
const ORDINAL = "(?:PRIMEIRA|SEGUNDA|TERCEIRA|QUARTA|QUINTA|SEXTA|SETIMA|OITAVA|NONA|DECIMA|VIGESIMA|TRIGESIMA|QUADRAGESIMA|QUINQUAGESIMA)";
// Antes de "ALTERAÇÃO" só entram ordinais ("OITAVA", "DÉCIMA QUARTA", "2ª") e "INSTRUMENTO DE": qualquer outra palavra
// ("CONFIRMAÇÃO DE ALTERAÇÃO...", "PEDIDO DE ALTERAÇÃO...") é outro tipo de documento.
const TITULO_DE_ALTERACAO = new RegExp(
  `^(?:[#\\d]+\\s*[ªº°A]?\\s*|INSTRUMENTO (?:PARTICULAR )?DE\\s+|${ORDINAL}\\s+){0,4}ALTERACAO\\b.*(?:CONTRAT|SOCIAL|INSTRUMENTO|INDIVIDUAL)`,
);
/** Linha de título de contrato: começa por "CONTRATO SOCIAL" ou "CONTRATO DE CONSTITUIÇÃO". */
const TITULO_DE_CONTRATO = /^(?:[#\d]+\s*)?CONTRATO (?:SOCIAL|DE CONSTITUICAO)\b/;

/** "ALTERAÇÃO CONTRATUAL", "ALTERAÇÕES CONTRATUAIS", "ALTERAÇÃO DO CONTRATO SOCIAL" (já sem acento e em caixa alta). */
const FRASE_DE_ALTERACAO = /\bALTERAC(?:AO|OES)\s+(?:(?:DO|DE|DOS|DAS)\s+)?(?:CONTRATUAL|CONTRATUAIS|CONTRATO)\b/;

type Tipo = "contrato" | "alteracao" | "cnpj" | "outro";
type Classificacao = { tipo: Tipo; /** índice (nas linhas não vazias) da linha de título, ou -1 */ indice: number; linhas: string[] };

/** O título decide o tipo; a palavra solta no corpo não conta. */
function classificar(texto: string): Classificacao {
  const originais = texto.split("\n").map((l) => l.trim()).filter(Boolean);
  const todas = originais.map((l) => semAcento(l).toUpperCase());
  const resultado = (tipo: Tipo, indice = -1): Classificacao => ({ tipo, indice, linhas: originais });

  // Comprovante de Inscrição e de Situação Cadastral (cartão CNPJ): prova o CNPJ e traz o nome empresarial.
  const cabecalho = todas.slice(0, 12).join(" ");
  if (/COMPROVANTE DE INSCRICAO E DE SITUACAO/.test(cabecalho) && /CADASTRO NACIONAL DA PESSOA JURIDICA/.test(cabecalho)) {
    return resultado("cnpj");
  }

  const janela = todas.slice(0, JANELA);
  const iAlteracao = janela.findIndex((l) => TITULO_DE_ALTERACAO.test(l));
  if (iAlteracao >= 0) return resultado("alteracao", iAlteracao);
  const tituloJunto = todas.slice(0, 3).join(" ");
  if (/ALTERACAO\b.*(CONTRAT|SOCIAL|INSTRUMENTO|INDIVIDUAL)/.test(tituloJunto)) {
    return resultado("alteracao", todas.slice(0, 3).findIndex((l) => l.includes("ALTERACAO")));
  }
  // CLÁUSULA separa instrumento de verdade de página de portal, e-mail ou manual que só citam "alteração".
  const topo = todas.slice(0, 8).join(" ");
  if (/\bCLAUSULA\b/.test(todas.join(" ")) && /MOTIVOS:|CONSOLIDACAO CONTRATUAL|\bALTERACAO\b/.test(topo)) return resultado("alteracao");

  const iContrato = janela.findIndex((l) => TITULO_DE_CONTRATO.test(l));
  if (iContrato >= 0) return resultado("contrato", iContrato);
  if (tituloJunto.includes("CONTRATO SOCIAL")) return resultado("contrato");
  // Constituição sem título: abre pela qualificação dos sócios e declara a denominação na CLÁUSULA PRIMEIRA.
  if (/CLAUSULA PRIMEIRA.*(DENOMINACAO EMPRESARIAL|NOME EMPRESARIAL)/.test(topo)) return resultado("contrato");
  // Toda alteração traz "alteração contratual" ou equivalente no texto (sem acento, plural, "do contrato social").
  const iFrase = todas.findIndex((l) => FRASE_DE_ALTERACAO.test(l));
  if (iFrase >= 0) return resultado("alteracao", iFrase);
  return resultado("outro");
}

export function tipoDoDocumento(texto: string): Tipo {
  return classificar(texto).tipo;
}

export function nomeEmpresarial(texto: string): string | null {
  const entreAspas = texto.match(NOME_ENTRE_ASPAS)?.[1]?.trim();
  if (entreAspas) return entreAspas;
  const declarado = texto.match(NOME_EMPRESARIAL_DECLARADO)?.[1]?.trim();
  if (declarado) return declarado;
  // Sem aspas, o nome fica perto do título (logo abaixo dele), e não perto do carimbo da Junta.
  const { indice, linhas } = classificar(texto);
  const inicio = linhas.slice(Math.max(indice, 0), Math.max(indice, 0) + 6);
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

const UNIDADES: Record<string, number> = {
  PRIMEIRA: 1, SEGUNDA: 2, TERCEIRA: 3, QUARTA: 4, QUINTA: 5, SEXTA: 6, SETIMA: 7, OITAVA: 8, NONA: 9,
};
const DEZENAS: Record<string, number> = {
  DECIMA: 10, VIGESIMA: 20, TRIGESIMA: 30, QUADRAGESIMA: 40, QUINQUAGESIMA: 50,
};

/** Número da alteração na linha do título ("3ª", "SEGUNDA", "DÉCIMA PRIMEIRA"); null se não houver. */
export function numeroDoConteudo(texto: string): number | null {
  const { indice, linhas } = classificar(texto);
  const titulo = semAcento(indice >= 0 ? linhas[indice]! : linhas.slice(0, 3).join(" ")).toUpperCase();
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
