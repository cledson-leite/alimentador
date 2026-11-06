import { randomUUID } from "node:crypto";

import {
  cnpjsDoTexto,
  datasFinais,
  nomeEmpresarial,
  numeroDoConteudo,
  numeroDoNome,
  raiz,
  tipoDoDocumento,
} from "../domain/documento";
import { cnpjValido } from "../domain/cnpj";
import { casarPasta, type Casamento } from "../domain/pasta";
import { resolverRegime } from "../domain/regime";

import type { ArquivoDocumento, CadastroPort, DocumentosPort, LeitorPort, PlanilhasPort, Regime } from "./ports/portas";

export type Portas = {
  planilhas: PlanilhasPort;
  documentos: DocumentosPort;
  leitor: LeitorPort;
  cadastro: CadastroPort;
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

type Lido = { arquivo: ArquivoDocumento; texto: string; tipo: "contrato" | "alteracao" };

class FalhaDeEmpresa extends Error {
  constructor(
    readonly etapa: string,
    readonly motivo: string,
  ) {
    super(motivo);
  }
}

const hoje = () => new Date().toISOString().slice(0, 10);

export async function executarImportacao(portas: Portas, _opcoes: Record<string, never>): Promise<Resultado> {
  const lista = await portas.planilhas.lerLista();
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
    const regime = resolverRegime(linha.cnpj, sn, tributario);
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
      const empresa = await carregar(portas, linha.cnpj, regime, casarPasta(linha.nome, pastas));
      resultado.carregadas.push({ cnpj: linha.cnpj, empresa, regime });
    } catch (e) {
      if (!(e instanceof FalhaDeEmpresa)) throw e;
      resultado.falhas.push({ cnpj: linha.cnpj, nome: linha.nome, etapa: e.etapa, motivo: e.motivo });
    }
  }
  return resultado;
}

async function carregar(
  portas: Portas,
  cnpj: string,
  regime: Regime,
  casamento: Casamento<{ arquivos: ArquivoDocumento[] }>,
): Promise<string> {
  if (casamento.tipo === "nenhuma") throw new FalhaDeEmpresa("pasta", "pasta não encontrada");
  if (casamento.tipo === "varias") throw new FalhaDeEmpresa("pasta", "várias pastas");
  const pasta = casamento.pasta;

  const lidos: Lido[] = [];
  for (const arquivo of pasta.arquivos) {
    const texto = (await portas.leitor.lerTexto(arquivo)) ?? "";
    const tipo = tipoDoDocumento(texto);
    if (tipo !== "outro") lidos.push({ arquivo, texto, tipo });
  }
  if (lidos.length === 0) throw new FalhaDeEmpresa("documentos", "sem contrato social nem alteração");

  const cnpjs = lidos.flatMap((l) => cnpjsDoTexto(l.texto));
  if (cnpjs.length === 0) throw new FalhaDeEmpresa("cnpj", "nenhum documento traz CNPJ");
  if (!cnpjs.some((c) => raiz(c) === raiz(cnpj))) throw new FalhaDeEmpresa("cnpj", "CNPJ do documento diverge da lista");

  const contrato = lidos.find((l) => l.tipo === "contrato");
  const empresa = nomeEmpresarial((contrato ?? lidos[0]!).texto);
  if (!empresa) throw new FalhaDeEmpresa("nome", "nome da empresa não encontrado no documento");

  const alteracoes = numerar(lidos.filter((l) => l.tipo === "alteracao"));

  const id = randomUUID();
  const enviados: string[] = [];
  const subir = async (pasta: string, a: ArquivoDocumento) => {
    const caminho = `${id}/${pasta}/${a.nome}`;
    await portas.cadastro.enviar(caminho, a);
    enviados.push(caminho);
    return caminho;
  };

  try {
    const contratoCaminho = await subir("contrato-social", (contrato ?? alteracoes.at(-1)!.lido).arquivo);
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

function numerar(alteracoes: Lido[]) {
  const datados = alteracoes.map((lido) => {
    const datas = datasFinais(lido.texto);
    if (datas.length !== 1) throw new FalhaDeEmpresa("data", "data da alteração ausente ou ambígua");
    if (datas[0]! > hoje()) throw new FalhaDeEmpresa("data", "data da alteração no futuro");
    return { lido, data: datas[0]!, numero: numeroDoConteudo(lido.texto) ?? numeroDoNome(lido.arquivo.nome) };
  });
  const semNumero = datados.filter((d) => d.numero === null);
  if (semNumero.length > 1) throw new FalhaDeEmpresa("numero", "mais de uma alteração sem número");
  const numerados = datados
    .map((d) => ({ ...d, numero: d.numero ?? 1 }))
    .sort((a, b) => a.numero - b.numero);
  numerados.forEach((d, i) => {
    if (d.numero === numerados[i - 1]?.numero) throw new FalhaDeEmpresa("numero", "número de alteração repetido");
  });
  if (numerados.length > 0 && numerados.some((d, i) => d.numero !== i + 1)) {
    throw new FalhaDeEmpresa("numero", "sequência de alterações quebrada");
  }
  return numerados;
}
