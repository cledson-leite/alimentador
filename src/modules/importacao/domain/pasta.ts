export const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const semPontuacao = (s: string) =>
  s
    .replace(/&/g, " e ")
    .replace(/[.,;:\-–/'"()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const FORMA = /\s(?:ltda|me|epp|eireli|sa|ss|mei)$/;
const semForma = (s: string) => s.replace(FORMA, "").trim();

const semNumeros = (s: string) => s.replace(/\b[\d.]+\b/g, " ").replace(/\s+/g, " ").trim();

/** "a f vaz" → "af vaz": letras soltas em sequência viram uma palavra. */
const juntaLetras = (s: string) => s.replace(/\b(?:[a-z] )+[a-z]\b/g, (m) => m.replace(/ /g, ""));

const corteNoHifen = (s: string) => s.split(/\s+-\s*/)[0]!.trim();

const escapar = (s: string) => s.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");

const contem = (pasta: string, nome: string) =>
  nome.length > 0 && new RegExp("(?:^|\\s)" + escapar(nome) + "(?:\\s|$)").test(pasta);

/** As palavras da lista aparecem na pasta, na mesma ordem, com palavras a mais no meio ou no fim. */
function mesmaOrdem(pasta: string, nome: string): boolean {
  const palavras = nome.split(" ");
  if (palavras.length < 2) return false;
  let i = 0;
  for (const w of pasta.split(" ")) if (w === palavras[i]) i++;
  return i === palavras.length;
}

type Passo = (pasta: string, lista: string) => boolean;

const PASSOS: Passo[] = [
  (p, l) => p === l,
  (p, l) => corteNoHifen(p) === l || p === corteNoHifen(l) || corteNoHifen(p) === corteNoHifen(l),
  (p, l) => contem(p, l),
  (p, l) => contem(semPontuacao(p), semPontuacao(l)),
  (p, l) => contem(semForma(semPontuacao(p)), semForma(semPontuacao(l))),
  (p, l) => {
    const f = (s: string) => juntaLetras(semNumeros(semForma(semPontuacao(s))));
    return contem(f(p), f(l));
  },
  (p, l) => mesmaOrdem(semForma(semPontuacao(p)), semForma(semPontuacao(l))),
];

export type Casamento<T> = { tipo: "unica"; pasta: T } | { tipo: "nenhuma" } | { tipo: "varias" };

/** Regra estrita, em ordem; para no primeiro passo que achar. Nunca troca ordem, abrevia nem aproxima. */
export function casarPasta<T extends { nome: string }>(nomeLista: string, pastas: T[]): Casamento<T> {
  const lista = normalizar(nomeLista);
  for (const passo of PASSOS) {
    const achadas = pastas.filter((p) => passo(normalizar(p.nome), lista));
    if (achadas.length === 1) return { tipo: "unica", pasta: achadas[0]! };
    if (achadas.length > 1) return { tipo: "varias" };
  }
  return { tipo: "nenhuma" };
}
