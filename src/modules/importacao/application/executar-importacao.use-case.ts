import { randomUUID } from "node:crypto";

import { cnpjsDoTexto, ehContratoSocial, nomeEmpresarial, raiz } from "../domain/documento";
import { pastaPorNomeExato } from "../domain/pasta";
import { resolverRegime } from "../domain/regime";

import type { CadastroPort, DocumentosPort, LeitorPort, PlanilhasPort, Regime } from "./ports/portas";

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
};

export async function executarImportacao(portas: Portas, _opcoes: Record<string, never>): Promise<Resultado> {
  const lista = await portas.planilhas.lerLista();
  const sn = await portas.planilhas.lerSn();
  const tributario = await portas.planilhas.lerTributario();
  const pastas = await portas.documentos.listarPastas();
  const resultado: Resultado = { carregadas: [], falhas: [], regimeAConfirmar: [] };

  for (const linha of lista) {
    const pasta = pastaPorNomeExato(linha.nome, pastas);
    const regime = resolverRegime(linha.cnpj, sn, tributario);
    if (!regime) {
      resultado.regimeAConfirmar.push({ cnpj: linha.cnpj, nome: linha.nome });
      continue;
    }
    if (!pasta) {
      resultado.falhas.push({ cnpj: linha.cnpj, nome: linha.nome, etapa: "pasta", motivo: "pasta não encontrada" });
      continue;
    }
    const arq = pasta.arquivos[0]!;
    const texto = (await portas.leitor.lerTexto(arq)) ?? "";
    if (!ehContratoSocial(texto)) continue;
    const cnpjs = cnpjsDoTexto(texto);
    if (cnpjs.length === 0) {
      resultado.falhas.push({
        cnpj: linha.cnpj,
        nome: linha.nome,
        etapa: "cnpj",
        motivo: "nenhum documento traz CNPJ",
      });
      continue;
    }
    if (!cnpjs.some((c) => raiz(c) === raiz(linha.cnpj))) {
      resultado.falhas.push({
        cnpj: linha.cnpj,
        nome: linha.nome,
        etapa: "cnpj",
        motivo: "CNPJ do documento diverge da lista",
      });
      continue;
    }
    const id = randomUUID();
    const caminho = `${id}/contrato-social/${arq.nome}`;
    const empresa = nomeEmpresarial(texto)!;
    await portas.cadastro.enviar(caminho, arq);
    await portas.cadastro.criarCliente({
      id,
      empresa,
      cnpj: linha.cnpj,
      regime,
      contratoSocialCaminho: caminho,
      alteracoes: [],
    });
    resultado.carregadas.push({ cnpj: linha.cnpj, empresa, regime });
  }
  return resultado;
}
