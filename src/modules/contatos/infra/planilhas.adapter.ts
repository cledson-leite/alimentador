import { basename } from "node:path";

import { readSheet } from "read-excel-file/node";

import { agruparPorCnpj, cnpjsDoArquivoDeResponsavel, emailDoNomeDoArquivo, lerLinha } from "../domain/contato";

import type { ResponsavelLido } from "../application/importar-contatos.use-case";
import type { ContatosDoCnpj, LinhaContatos } from "../domain/contato";

/** Planilha de contatos (sem cabeçalho): empresa, CNPJ, nome, forma de envio, telefone, e-mail. */
export async function lerPlanilhaDeContatos(arquivo: string): Promise<ContatosDoCnpj[]> {
  const linhas = await readSheet(arquivo);
  const lidas = linhas.flatMap((l, i): LinhaContatos[] => {
    const lida = lerLinha(i + 1, l);
    return lida ? [lida] : [];
  });
  return agruparPorCnpj(lidas);
}

/** Um arquivo por funcionário, com o e-mail do perfil no nome; cada linha traz o CNPJ de um cliente da carteira dele. */
export async function lerArquivoDeResponsavel(arquivo: string): Promise<ResponsavelLido> {
  const email = emailDoNomeDoArquivo(arquivo);
  if (!email) throw new Error(`O nome do arquivo de responsável precisa ser o e-mail do perfil (ex.: fulano@gmail.com.xlsx): ${basename(arquivo)}`);
  return { email, arquivo: basename(arquivo), cnpjs: cnpjsDoArquivoDeResponsavel(await readSheet(arquivo)) };
}
