import { randomUUID } from "node:crypto";

import {
  cnpjsDoTexto,
  datasFinais,
  ehDocumentoBase,
  numeroDoConteudo,
  numeroInicialDoNome,
  numeroDoNome,
  raiz,
  semAcento,
  tipoDoDocumento,
} from "../domain/documento";
import { cnpjValido } from "../domain/cnpj";
import { casarPasta, type Casamento } from "../domain/pasta";
import { nomeSeguro } from "../domain/storage";
import { resolverRegime } from "../domain/regime";

import type { ArquivoDocumento, CadastroPort, DocumentosPort, LeitorPort, PlanilhasPort, Regime } from "./ports/portas";

export type Portas = {
  planilhas: PlanilhasPort;
  documentos: DocumentosPort;
  leitor: LeitorPort;
  cadastro: CadastroPort;
  /** Pasta aceita por empresa no download (CNPJ → nome da pasta). Opcional. */
  pastaPorCnpj?: Map<string, string>;
  /** Regime informado à mão para empresas sem regime nas planilhas (CNPJ → regime). Opcional. */
  regimesManuais?: Map<string, Regime>;
  /** Data (ISO) da alteração informada à mão (CNPJ → data), usada só quando o texto não traz uma data única. Opcional. */
  datasManuais?: Map<string, string>;
};

export type Falha = { cnpj: string; nome: string; etapa: string; motivo: string };
export type Carregada = { cnpj: string; empresa: string; regime: Regime };
export type Resultado = {
  carregadas: Carregada[];
  falhas: Falha[];
  regimeAConfirmar: { cnpj: string; nome: string }[];
  pessoasFisicas: { nome: string; documento: string }[];
  puladas: string[];
};

type Lido = { arquivo: ArquivoDocumento; texto: string; tipo: "contrato" | "alteracao" | "cnpj" };

class FalhaDeEmpresa extends Error {
  constructor(
    readonly etapa: string,
    readonly motivo: string,
  ) {
    super(motivo);
  }
}

const hoje = () => new Date().toISOString().slice(0, 10);

export type OpcoesImportacao = { cnpjs?: string[] };

export async function executarImportacao(portas: Portas, opcoes: OpcoesImportacao): Promise<Resultado> {
  const alvo = opcoes.cnpjs ? new Set(opcoes.cnpjs) : null;
  const lista = (await portas.planilhas.lerLista()).filter((l) => !alvo || alvo.has(l.cnpj));
  const sn = await portas.planilhas.lerSn();
  const tributario = await portas.planilhas.lerTributario();
  const pastas = await portas.documentos.listarPastas();
  const resultado: Resultado = { carregadas: [], falhas: [], regimeAConfirmar: [], pessoasFisicas: [], puladas: [] };

  const vistos = new Set<string>();
  for (const linha of lista) {
    if (!/^\d{14}$/.test(linha.cnpj)) {
      resultado.pessoasFisicas.push({ nome: linha.nome, documento: linha.cnpj });
      continue;
    }
    if (vistos.has(linha.cnpj)) continue;
    vistos.add(linha.cnpj);
    const regime = resolverRegime(linha.cnpj, sn, tributario, portas.regimesManuais);
    if (regime === "ignorada") continue;
    if (!regime) {
      resultado.regimeAConfirmar.push({ cnpj: linha.cnpj, nome: linha.nome });
      continue;
    }
    try {
      if (!cnpjValido(linha.cnpj)) throw new FalhaDeEmpresa("cnpj", "CNPJ da lista inválido");
      if (await portas.cadastro.existe(linha.cnpj)) {
        resultado.puladas.push(linha.cnpj);
        continue;
      }
      // A pasta que o download aceitou (refinada com o usuário, inclusive candidatas confirmadas) vale mais
      // que o casamento por nome; sem ela, vale a regra estrita. O CNPJ do contrato segue sendo a prova final.
      const aceita = pastas.find((p) => p.nome === portas.pastaPorCnpj?.get(linha.cnpj));
      const casamento: Casamento<(typeof pastas)[number]> = aceita ? { tipo: "unica", pasta: aceita } : casarPasta(linha.nome, pastas);
      const empresa = await carregar(portas, linha.cnpj, linha.nome, regime, casamento);
      resultado.carregadas.push({ cnpj: linha.cnpj, empresa, regime });
    } catch (e) {
      if (!(e instanceof FalhaDeEmpresa)) throw e;
      resultado.falhas.push({ cnpj: linha.cnpj, nome: linha.nome, etapa: e.etapa, motivo: e.motivo });
    }
  }
  return resultado;
}

/** Só vale a pena passar por OCR o arquivo que, pelo nome, pode ser contrato, alteração ou documento de CNPJ. */
const parecePertinente = (nome: string) => /contrat|altera|cnpj|cartao|constitu|\bato\b|social/.test(semAcento(nome).toLowerCase());

type Lida = { lidos: Lido[]; pendentes: ArquivoDocumento[] };

/** Leitura normal da pasta. `pendentes` são os arquivos pertinentes sem texto legível, candidatos a OCR. */
async function lerPasta(portas: Portas, pasta: { arquivos: ArquivoDocumento[] }): Promise<Lida> {
  const lidos: Lido[] = [];
  const pendentes: ArquivoDocumento[] = [];
  for (const arquivo of pasta.arquivos) {
    const lido = await portas.leitor.lerTexto(arquivo);
    if (lido === null && parecePertinente(arquivo.nome)) pendentes.push(arquivo);
    const texto = lido ?? "";
    const tipo = tipoDoDocumento(texto);
    if (tipo !== "outro") lidos.push({ arquivo, texto, tipo });
  }
  return { lidos, pendentes };
}

/**
 * OCR local só quando a leitura normal não basta: nenhum documento reconhecido ou nenhum CNPJ no texto. Os documentos
 * lidos assim entram na mesma classificação e passam pelas mesmas regras (CNPJ, nome, data).
 */
async function completarComOcr(portas: Portas, cnpj: string, { lidos, pendentes }: Lida): Promise<Lido[]> {
  const precisa = lidos.length === 0 || provaDoCnpj(lidos, cnpj) === "ausente";
  if (!precisa || !portas.leitor.lerComOcr) return lidos;
  const resultado = [...lidos];
  for (const arquivo of pendentes) {
    // O modelo só vê o que o OCR não leu: texto lido que não é contrato (RG, CNH...) nunca é enviado.
    const texto = (await portas.leitor.lerComOcr(arquivo)) ?? (await portas.leitor.lerComModelo?.(arquivo)) ?? null;
    const tipo = texto ? tipoDoDocumento(texto) : "outro";
    if (texto && tipo !== "outro") resultado.push({ arquivo, texto, tipo });
  }
  return resultado;
}

/**
 * Mais de uma pasta casou pelo nome: o conteúdo decide. Fica a pasta cujos documentos trazem o CNPJ da lista.
 * CNPJs diferentes entre as pastas são empresas diferentes; o mesmo CNPJ em mais de uma é a mesma empresa e só uma vale.
 */
async function desempatar(portas: Portas, cnpj: string, pastas: { arquivos: ArquivoDocumento[] }[]): Promise<Lida> {
  const donas: Lida[] = [];
  for (const pasta of pastas) {
    const lida = await lerPasta(portas, pasta);
    if (provaDoCnpj(lida.lidos, cnpj) === "ok") donas.push(lida);
  }
  if (donas.length === 1) return donas[0]!;
  throw new FalhaDeEmpresa(
    "pasta",
    donas.length === 0 ? "várias pastas, nenhuma com o CNPJ da lista" : "várias pastas com o mesmo CNPJ",
  );
}

/** Razão social na lista, sem as anotações do escritório ("- empresa", "inicia na Rigoni em...", "- MATRIZ", "- FILIAL X"). */
function razaoSocialDaLista(nome: string): string {
  return nome
    .replace(/\s+-\s+(?:empresa|responsabilid\w*|baixad\w*|n[aã]o falar.*|antig\w*|matriz|filial\b.*|inicia\b.*|incia\b.*)$/i, "")
    .replace(/\s+inicia\b.*$/i, "")
    .trim();
}

/**
 * O CNPJ da lista precisa aparecer nos documentos: contrato e alteração podem citar a matriz (vale a raiz de 8 dígitos),
 * mas o comprovante de CNPJ é do próprio estabelecimento e exige o número idêntico (filial é outra empresa).
 */
function provaDoCnpj(lidos: Lido[], cnpj: string): "ok" | "ausente" | "diverge" {
  if (lidos.every((l) => cnpjsDoTexto(l.texto).length === 0)) return "ausente";
  const bate = lidos.some((l) => {
    const cnpjs = cnpjsDoTexto(l.texto);
    return l.tipo === "cnpj" ? cnpjs.includes(cnpj) : cnpjs.some((c) => raiz(c) === raiz(cnpj));
  });
  return bate ? "ok" : "diverge";
}

async function carregar(
  portas: Portas,
  cnpj: string,
  nomeLista: string,
  regime: Regime,
  casamento: Casamento<{ arquivos: ArquivoDocumento[] }>,
): Promise<string> {
  if (casamento.tipo === "nenhuma") throw new FalhaDeEmpresa("pasta", "pasta não encontrada");
  const lida = casamento.tipo === "unica" ? await lerPasta(portas, casamento.pasta) : await desempatar(portas, cnpj, casamento.pastas);
  const lidos = await completarComOcr(portas, cnpj, lida);
  if (lidos.length === 0) {
    // O arquivo existe e se chama contrato/alteração, mas o texto não traz o instrumento (páginas em imagem): é caso de OCR.
    const pareceContrato = casamento.tipo === "unica" && casamento.pasta.arquivos.some((a) => /contrat|altera/i.test(semAcento(a.nome)));
    throw new FalhaDeEmpresa(
      "documentos",
      pareceContrato ? "contrato ou alteração sem texto legível (precisa de OCR)" : "sem contrato social nem alteração",
    );
  }

  // A empresa está na lista, com CNPJ e razão social, tem regime nas planilhas e pasta no Drive: o CNPJ da lista vale.
  // Documento sem CNPJ não reprova (contrato de constituição costuma não trazê-lo); só um CNPJ DIFERENTE reprova.
  if (provaDoCnpj(lidos, cnpj) === "diverge") throw new FalhaDeEmpresa("cnpj", "CNPJ do documento diverge da lista");

  const contrato = lidos.find((l) => l.tipo === "contrato");
  // A razão social vigente é a da lista (o contrato de constituição pode trazer o nome antigo, trocado numa alteração).
  const nomeDoDocumento = razaoSocialDaLista(nomeLista);
  // Filial é outra empresa, com CNPJ próprio: o nome é "EMPRESA - FILIAL X" (o trecho da filial vem da lista).
  const filial = cnpj.slice(8, 12) !== "0001" ? nomeLista.match(/\bfilial\b.*$/i)?.[0] : undefined;
  const empresa = filial ? `${nomeDoDocumento} - ${filial.toUpperCase()}` : nomeDoDocumento;

  // Documento-base ("0 ALTERAÇÃO..."): havendo outras alterações, ele é só o contrato social e não entra na numeração.
  const todasAlteracoes = lidos.filter((l) => l.tipo === "alteracao");
  const base = (l: Lido) => numeroDoConteudo(l.texto) === null && ehDocumentoBase(l.arquivo.nome);
  const bases = todasAlteracoes.some((l) => !base(l)) ? todasAlteracoes.filter(base) : [];
  const alteracoes = numerar(todasAlteracoes.filter((l) => !bases.includes(l)), portas.datasManuais?.get(cnpj));

  const id = randomUUID();
  const enviados: string[] = [];
  const subir = async (pasta: string, a: ArquivoDocumento) => {
    const seguro = nomeSeguro(a.nome);
    let caminho = `${id}/${pasta}/${seguro}`;
    for (let n = 2; enviados.includes(caminho); n++) caminho = `${id}/${pasta}/${n}-${seguro}`;
    await portas.cadastro.enviar(caminho, a);
    enviados.push(caminho);
    return caminho;
  };

  try {
    // Só o comprovante de CNPJ: a empresa é cadastrada sem contrato e sem alterações, e nada vai ao Storage.
    const doContrato = contrato ?? bases.find((l) => l.arquivo.formato === "pdf") ?? bases[0] ?? alteracoes.at(-1)?.lido;
    const contratoCaminho = doContrato ? await subir("contrato-social", doContrato.arquivo) : null;
    const itens = [];
    for (const a of alteracoes) {
      itens.push({
        id: randomUUID(),
        numero: a.numero,
        data: a.data,
        arquivoCaminho: await subir("alteracoes-contratuais", a.lido.arquivo),
      });
    }
    await portas.cadastro.criarCliente({ id, empresa, cnpj, regime, contratoSocialCaminho: contratoCaminho, alteracoes: itens });
  } catch (e) {
    // Resposta perdida: se o cliente foi gravado, os arquivos são dele e não se apaga nada.
    if (await portas.cadastro.existe(cnpj)) return empresa;
    await portas.cadastro.remover(enviados);
    throw new FalhaDeEmpresa("cadastro", e instanceof Error ? e.message : String(e));
  }
  return empresa;
}

function numerar(alteracoes: Lido[], dataManual?: string) {
  const datados = alteracoes.map((lido) => {
    const datas = datasFinais(lido.texto);
    if (datas.length !== 1 && dataManual) datas[0] = dataManual;
    if (datas.length !== 1) throw new FalhaDeEmpresa("data", "data da alteração ausente ou ambígua");
    if (datas[0]! > hoje()) throw new FalhaDeEmpresa("data", "data da alteração no futuro");
    return { lido, data: datas[0]!, numero: numeroInicialDoNome(lido.arquivo.nome) ?? numeroDoConteudo(lido.texto) ?? numeroDoNome(lido.arquivo.nome) };
  });
  // A mesma alteração costuma estar na pasta em mais de um formato (PDF e DOC): mesmo número e mesma data
  // é um documento só, e vale o formato de melhor leitura. Mesmo número com datas diferentes segue sendo falha.
  const melhorFormato = ["pdf", "docx", "doc", "imagem"];
  // O PDF predomina: DOC/DOCX com o mesmo número de um PDF é cópia dele, mesmo que a leitura traga outra data.
  const semCopiaEmOutroFormato = datados.filter(
    (d) =>
      d.lido.arquivo.formato === "pdf" ||
      !datados.some(
        (o) =>
          o.lido.arquivo.formato === "pdf" &&
          // Mesmo número, ou mesmo dia com um dos dois sem número (minuta em PDF sem prefixo e a versão numerada em DOCX).
          (o.numero === d.numero || ((o.numero === null || d.numero === null) && o.data === d.data)),
      ),
  );
  // O PDF sem número fica com o número da cópia numerada descartada (mesmo dia).
  for (const d of semCopiaEmOutroFormato) {
    d.numero ??= datados.find((o) => o !== d && o.data === d.data && o.numero !== null && !semCopiaEmOutroFormato.includes(o))?.numero ?? null;
  }
  const unicos = new Map<string, (typeof datados)[number]>();
  for (const d of semCopiaEmOutroFormato) {
    const chave = `${d.numero ?? "sem-numero"}|${d.data}`;
    const atual = unicos.get(chave);
    if (!atual || melhorFormato.indexOf(d.lido.arquivo.formato) < melhorFormato.indexOf(atual.lido.arquivo.formato)) {
      unicos.set(chave, d);
    }
  }
  const semNumero = [...unicos.values()].filter((d) => d.numero === null);
  if (semNumero.length > 1) throw new FalhaDeEmpresa("numero", "mais de uma alteração sem número");
  const numerados = [...unicos.values()]
    .map((d) => ({ ...d, numero: d.numero ?? 1 }))
    .sort((a, b) => a.numero - b.numero);
  numerados.forEach((d, i) => {
    if (d.numero === numerados[i - 1]?.numero) throw new FalhaDeEmpresa("numero", "número de alteração repetido");
  });
  return numerados;
}
