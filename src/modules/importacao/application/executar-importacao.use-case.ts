import { randomUUID } from "node:crypto";

import { cnpjsDoTexto, ehContratoSocial, nomeEmpresarial } from "../domain/documento";
import { pastaPorNomeExato } from "../domain/pasta";

import type { CadastroPort, DocumentosPort, LeitorPort, PlanilhasPort, Regime } from "./ports/portas";

export type Portas = {
  planilhas: PlanilhasPort;
  documentos: DocumentosPort;
  leitor: LeitorPort;
  cadastro: CadastroPort;
};

export type Falha = { cnpj: string; nome: string; etapa: string; motivo: string };
export type Carregada = { cnpj: string; empresa: string; regime: Regime };
export type Resultado = { carregadas: Carregada[]; falhas: Falha[] };

export async function executarImportacao(portas: Portas, _opcoes: Record<string, never>): Promise<Resultado> {
  const lista = await portas.planilhas.lerLista();
  const sn = await portas.planilhas.lerSn();
  const pastas = await portas.documentos.listarPastas();
  const resultado: Resultado = { carregadas: [], falhas: [] };

  for (const linha of lista) {
    const pasta = pastaPorNomeExato(linha.nome, pastas);
    if (!pasta || !sn.has(linha.cnpj)) continue;
    const arq = pasta.arquivos[0]!;
    const texto = (await portas.leitor.lerTexto(arq)) ?? "";
    if (!ehContratoSocial(texto) || !cnpjsDoTexto(texto).includes(linha.cnpj)) continue;
    const id = randomUUID();
    const caminho = `${id}/contrato-social/${arq.nome}`;
    const empresa = nomeEmpresarial(texto)!;
    await portas.cadastro.enviar(caminho, arq);
    await portas.cadastro.criarCliente({
      id,
      empresa,
      cnpj: linha.cnpj,
      regime: "simples_nacional",
      contratoSocialCaminho: caminho,
      alteracoes: [],
    });
    resultado.carregadas.push({ cnpj: linha.cnpj, empresa, regime: "simples_nacional" });
  }
  return resultado;
}
