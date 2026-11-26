import { chaveTelefone, formaDoCliente, SETORES_COM_DESTINO, SETORES_DO_CONTATO } from "../domain/contato";

import type { Canal, ContatosDoCnpj } from "../domain/contato";
import type { RepositorioPort } from "./ports";

export type ResponsavelLido = { email: string; arquivo: string; cnpjs: string[] };
export type Entrada = { contatos: ContatosDoCnpj[]; responsaveis: ResponsavelLido[] };

export type Linha = { cnpj: string; empresa: string; item: string; resultado: string; detalhe?: string };
export type Resultado = {
  contatos: Linha[];
  destinos: Linha[];
  formas: Linha[];
  responsaveis: Linha[];
  /** O que a planilha trouxe mas não pôde ser aplicado: CNPJ fora do banco, contato sem canal, perfil inválido, conflito. */
  pendencias: Linha[];
};

const ativoNoSn = (p: { papel: string; setor: string; desativado: boolean }) => p.papel === "funcionario" && p.setor === "simples_nacional" && !p.desativado;

/**
 * Cadastra contatos (com os setores URA, SN e RH), destinos de envio, forma de envio e responsáveis SN.
 * Reexecutar é seguro: o que já existe é reconhecido (mesmo WhatsApp ou e-mail no cliente) e nunca duplicado nem sobrescrito,
 * exceto a forma de envio do cliente, que passa a refletir a planilha. `dryRun` lê tudo e relata, sem escrever.
 */
export async function importarContatos(repo: RepositorioPort, entrada: Entrada, opcoes: { dryRun: boolean; cnpjs?: string[] }): Promise<Resultado> {
  const r: Resultado = { contatos: [], destinos: [], formas: [], responsaveis: [], pendencias: [] };
  const filtro = opcoes.cnpjs ? new Set(opcoes.cnpjs) : undefined;
  const contatos = entrada.contatos.filter((c) => !filtro || filtro.has(c.cnpj));
  const responsaveis = entrada.responsaveis.map((x) => ({ ...x, cnpjs: x.cnpjs.filter((c) => !filtro || filtro.has(c)) }));

  const todos = [...new Set([...contatos.map((c) => c.cnpj), ...responsaveis.flatMap((x) => x.cnpjs)])];
  const clientes = await repo.clientesPorCnpj(todos);
  const estado = await repo.estado([...clientes.values()].map((c) => c.id));
  const escrever = !opcoes.dryRun;
  const acao = (feito: string, simulado: string) => (opcoes.dryRun ? simulado : feito);

  async function definirForma(forma: Canal, clienteId: string, cnpj: string, empresa: string) {
    const atual = estado.formas.get(clienteId);
    if (atual === undefined) {
      r.pendencias.push({ cnpj, empresa, item: "forma de envio", resultado: "cliente_sem_cadastro_operacional_sn", detalhe: forma });
    } else if (atual === forma) {
      r.formas.push({ cnpj, empresa, item: "forma de envio", resultado: "ja_estava", detalhe: forma });
    } else {
      if (escrever) await repo.definirForma(clienteId, forma);
      r.formas.push({ cnpj, empresa, item: "forma de envio", resultado: acao("alterada", "seria_alterada"), detalhe: `${atual} → ${forma}` });
    }
  }

  for (const g of contatos) {
    g.avisos.forEach((a) => r.pendencias.push({ cnpj: g.cnpj, empresa: g.empresa, item: "planilha", resultado: "aviso", detalhe: a }));
    const cliente = clientes.get(g.cnpj);
    if (!cliente) {
      r.pendencias.push({ cnpj: g.cnpj, empresa: g.empresa, item: "cliente", resultado: "nao_encontrado_no_banco" });
      continue;
    }
    const doCliente = estado.contatos.filter((c) => c.clienteId === cliente.id);

    for (const c of g.contatos) {
      const chave = c.telefone ? chaveTelefone(c.telefone) : undefined;
      const existente = doCliente.find((x) => (chave && x.telefone && chaveTelefone(x.telefone) === chave) || (c.email && x.email === c.email));
      let id = existente?.id;
      const rotulo = `${c.nome}${c.nomeDerivado ? " (nome tirado do e-mail)" : ""}`;
      if (!id) {
        id = escrever ? await repo.criarContato({ clienteId: cliente.id, nome: c.nome, telefone: c.telefone, email: c.email }) : `simulado:${g.cnpj}:${c.nome}`;
        doCliente.push({ id, clienteId: cliente.id, telefone: c.telefone ?? null, email: c.email ?? null });
      }
      r.contatos.push({ cnpj: g.cnpj, empresa: cliente.empresa, item: rotulo, resultado: existente ? "ja_existia" : acao("criado", "seria_criado"), detalhe: [c.telefone, c.email].filter(Boolean).join(" · ") });

      for (const setor of SETORES_DO_CONTATO) {
        if (estado.setores.has(`${id}|${setor}`)) continue;
        if (escrever) await repo.ligarSetor(id, setor);
        estado.setores.add(`${id}|${setor}`);
      }
      if (!c.canal) {
        r.pendencias.push({ cnpj: g.cnpj, empresa: cliente.empresa, item: rotulo, resultado: "sem_destino_de_envio", detalhe: "forma ACESSÓRIAS ou sem forma: contato cadastrado, sem destino" });
        continue;
      }
      for (const setor of SETORES_COM_DESTINO) {
        const tem = estado.destinos.some((d) => d.clienteId === cliente.id && d.setor === setor && d.contatoId === id);
        if (!tem) {
          if (escrever) await repo.criarDestino({ clienteId: cliente.id, setor, contatoId: id, canal: c.canal });
          estado.destinos.push({ clienteId: cliente.id, setor, contatoId: id });
        }
        r.destinos.push({ cnpj: g.cnpj, empresa: cliente.empresa, item: `${rotulo} → ${setor}`, resultado: tem ? "ja_existia" : acao("criado", "seria_criado"), detalhe: c.canal });
      }
    }

    const forma = formaDoCliente(g.contatos);
    if (forma) await definirForma(forma, cliente.id, g.cnpj, cliente.empresa);
  }

  // Responsáveis: cada CNPJ tem um só responsável SN; CNPJ em dois arquivos é conflito e não é gravado.
  const donos = new Map<string, string[]>();
  for (const x of responsaveis) for (const c of x.cnpjs) donos.set(c, [...(donos.get(c) ?? []), x.email]);
  const perfis = await repo.perfisPorEmail(responsaveis.map((x) => x.email));
  for (const x of responsaveis) {
    const perfil = perfis.get(x.email);
    const problema = !perfil
      ? "perfil não encontrado"
      : !ativoNoSn(perfil)
        ? `perfil não é funcionário ativo do SN (${perfil.papel}, ${perfil.setor}${perfil.desativado ? ", desativado" : ""})`
        : undefined;
    for (const cnpj of x.cnpjs) {
      const cliente = clientes.get(cnpj);
      const base = { cnpj, empresa: cliente?.empresa ?? "", item: perfil?.nome ?? x.email };
      if (problema) r.pendencias.push({ ...base, resultado: "responsavel_invalido", detalhe: `${x.arquivo}: ${problema}` });
      else if (!cliente) r.pendencias.push({ ...base, resultado: "nao_encontrado_no_banco", detalhe: x.arquivo });
      else if ((donos.get(cnpj) ?? []).length > 1) r.pendencias.push({ ...base, resultado: "conflito_entre_arquivos", detalhe: donos.get(cnpj)!.join(" × ") });
      else {
        const atual = estado.responsaveis.get(cliente.id);
        if (atual === perfil!.id) r.responsaveis.push({ ...base, resultado: "ja_existia" });
        else if (atual) r.pendencias.push({ ...base, resultado: "ja_tem_outro_responsavel", detalhe: "não sobrescrito" });
        else {
          if (escrever) await repo.definirResponsavel(cliente.id, perfil!.id);
          r.responsaveis.push({ ...base, resultado: acao("definido", "seria_definido") });
        }
      }
    }
  }
  return r;
}
