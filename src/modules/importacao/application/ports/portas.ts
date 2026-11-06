export type Regime = "simples_nacional" | "lucro_presumido" | "lucro_real";

export type LinhaLista = { nome: string; cnpj: string };

export type ArquivoDocumento = { id: string; nome: string; formato: "pdf" | "doc" | "docx" | "imagem" };
export type Pasta = { nome: string; arquivos: ArquivoDocumento[] };

export interface PlanilhasPort {
  lerLista(): Promise<LinhaLista[]>;
  lerSn(): Promise<Set<string>>;
  /** "baixou": a IE da linha diz BAIXOU; a empresa vai para o regime a confirmar. */
  lerTributario(): Promise<Map<string, "lucro_presumido" | "lucro_real" | "baixou">>;
}

export interface DocumentosPort {
  listarPastas(): Promise<Pasta[]>;
}

export interface LeitorPort {
  /** Texto do documento, ou null quando não há texto legível. */
  lerTexto(arquivo: ArquivoDocumento): Promise<string | null>;
}

export type NovoCliente = {
  id: string;
  empresa: string;
  cnpj: string;
  regime: Regime;
  contratoSocialCaminho: string;
  alteracoes: { id: string; numero: number; data: string; arquivoCaminho: string }[];
};

export interface CadastroPort {
  existe(cnpj: string): Promise<boolean>;
  enviar(caminho: string, origem: ArquivoDocumento): Promise<void>;
  remover(caminhos: string[]): Promise<void>;
  criarCliente(dados: NovoCliente): Promise<void>;
}
