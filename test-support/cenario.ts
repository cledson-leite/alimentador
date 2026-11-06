import type {
  CadastroPort,
  DocumentosPort,
  LeitorPort,
  PlanilhasPort,
  ArquivoDocumento,
  Pasta,
} from "@/modules/importacao/application/ports/portas";

export function cnpjValido(base12: string): string {
  const calc = (n: string, pesos: number[]) => {
    const soma = [...n].reduce((s, d, i) => s + Number(d) * pesos[i]!, 0);
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = calc(base12, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calc(base12 + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return `${base12}${d1}${d2}`;
}

export function formatarCnpj(c: string): string {
  return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`;
}

/** Imita a forma dos contratos reais: nome no título e entre aspas curvas no corpo. */
export function textoContrato(nome: string, cnpj?: string): string {
  return [
    "CONTRATO SOCIAL DE CONSTITUIÇÃO",
    "DE SOCIEDADE EMPRESÁRIA LIMITADA",
    nome,
    `“${nome}”, com sede e foro a Rua das Flores, nº 10, Cascavel/PR${cnpj ? `, inscrita no CNPJ sob o nº ${formatarCnpj(cnpj)}` : ""}.`,
  ].join("\n");
}

export function arquivo(id: string, nome: string, texto: string): ArquivoDocumento & { texto: string } {
  return { id, nome, formato: "pdf", texto };
}

export type Cenario = {
  lista?: { nome: string; cnpj: string }[];
  sn?: string[];
  tributario?: Record<string, "lucro_presumido" | "lucro_real" | "baixou" | "ignorada">;
  pastas?: (Pasta & { arquivos: (ArquivoDocumento & { texto: string })[] })[];
  existentes?: string[];
  criarCliente?: "falha" | "resposta-perdida";
};

export function montar(c: Cenario) {
  const textos = new Map<string, string>();
  for (const p of c.pastas ?? []) for (const a of p.arquivos) textos.set(a.id, a.texto);

  const enviados: { caminho: string; origemId: string }[] = [];
  const removidos: string[] = [];
  const clientes: Record<string, unknown>[] = [];
  const existentes = new Set(c.existentes ?? []);

  const planilhas: PlanilhasPort = {
    lerLista: async () => c.lista ?? [],
    lerSn: async () => new Set(c.sn ?? []),
    lerTributario: async () => new Map(Object.entries(c.tributario ?? {})),
  };
  const documentos: DocumentosPort = {
    listarPastas: async () => (c.pastas ?? []).map(({ nome, arquivos }) => ({ nome, arquivos })),
  };
  const leitor: LeitorPort = { lerTexto: async (a) => textos.get(a.id) ?? null };
  const cadastro: CadastroPort = {
    existe: async (cnpj) => existentes.has(cnpj) || clientes.some((x) => x.cnpj === cnpj),
    enviar: async (caminho, origem) => void enviados.push({ caminho, origemId: origem.id }),
    remover: async (caminhos) => void removidos.push(...caminhos),
    criarCliente: async (dados) => {
      if (c.criarCliente === "falha") throw new Error("RPC fora do ar");
      clientes.push(dados as unknown as Record<string, unknown>);
      if (c.criarCliente === "resposta-perdida") throw new Error("timeout");
    },
  };
  return { portas: { planilhas, documentos, leitor, cadastro }, enviados, removidos, clientes };
}

export function textoAlteracao(nome: string, cnpj: string | undefined, ordinal: string, dataExtenso?: string): string {
  return [
    `${ordinal} ALTERAÇÃO DE CONTRATO SOCIAL`,
    nome,
    `“${nome}”, estabelecida à Rua das Flores, nº 10${cnpj ? `, inscrita no CNPJ sob o nº ${formatarCnpj(cnpj)}` : ""}.`,
    ...(dataExtenso ? [`Cascavel, Pr., ${dataExtenso}.`] : []),
    "Assinado digitalmente",
  ].join("\n");
}
