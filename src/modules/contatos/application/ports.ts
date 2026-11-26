import type { Canal } from "../domain/contato";

export type ClienteDb = { id: string; empresa: string };
export type ContatoDb = { id: string; clienteId: string; telefone: string | null; email: string | null };
export type PerfilDb = { id: string; nome: string; papel: string; setor: string; desativado: boolean };
export type DestinoDb = { clienteId: string; setor: string; contatoId: string };

/** Foto do que já está gravado para os clientes envolvidos; o caso de uso compara com a planilha e só escreve a diferença. */
export type EstadoDb = {
  contatos: ContatoDb[];
  /** `contatoId|setor` */
  setores: Set<string>;
  destinos: DestinoDb[];
  /** cliente → perfil responsável do setor Simples Nacional */
  responsaveis: Map<string, string>;
  /** cliente → forma de envio do cadastro operacional SN (ausente = cliente sem cadastro operacional) */
  formas: Map<string, Canal>;
};

export interface RepositorioPort {
  clientesPorCnpj(cnpjs: string[]): Promise<Map<string, ClienteDb>>;
  estado(clienteIds: string[]): Promise<EstadoDb>;
  perfisPorEmail(emails: string[]): Promise<Map<string, PerfilDb>>;
  criarContato(d: { clienteId: string; nome: string; telefone?: string; email?: string }): Promise<string>;
  ligarSetor(contatoId: string, setor: string): Promise<void>;
  criarDestino(d: { clienteId: string; setor: string; contatoId: string; canal: Canal }): Promise<void>;
  definirResponsavel(clienteId: string, perfilId: string): Promise<void>;
  definirForma(clienteId: string, forma: Canal): Promise<void>;
}
