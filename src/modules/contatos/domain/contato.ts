import { cnpjValido } from "../../importacao/domain/cnpj";

export type Canal = "whatsapp" | "email" | "whatsapp_e_email";
export type Forma = "whatsapp" | "email" | "acessorias" | null;

export type ContatoLido = {
  nome: string;
  /** Telefone já normalizado: `(45) 99973-8126`. */
  telefone?: string;
  email?: string;
  /** Deduzido do telefone e do e-mail do contato. */
  canal?: Canal;
  nomeDerivado?: boolean;
};

export type LinhaContatos = { linha: number; cnpj: string; empresa: string; contatos: ContatoLido[]; avisos: string[] };

/** Setores que enxergam todo contato importado (a "dona" da carga: URA, Simples Nacional e RH). */
export const SETORES_DO_CONTATO = ["ura", "simples_nacional", "rh"] as const;
/** Setores que recebem destino de envio (`destinos_de_envio.setor` só aceita setores reais, não a URA). */
export const SETORES_COM_DESTINO = ["simples_nacional", "rh"] as const;

export const soDigitos = (v: string) => v.replace(/\D/g, "");

/** Mesma regra do Rigoni-contabil (`shared/kernel/telefone.ts`): tira o 55 e põe o 9 no celular de 8 dígitos. */
export function chaveTelefone(telefone: string): string | undefined {
  const d = soDigitos(telefone);
  const nacional = d.length > 11 && d.startsWith("55") ? d.slice(2) : d;
  const chave = nacional.replace(/^(\d{2})([6-9]\d{7})$/, "$19$2");
  return chave.length === 10 || chave.length === 11 ? chave : undefined;
}

export function formatarTelefone(chave: string): string {
  const meio = chave.length === 11 ? 5 : 4;
  return `(${chave.slice(0, 2)}) ${chave.slice(2, 2 + meio)}-${chave.slice(2 + meio)}`;
}

const SEPARADOR = /\s*(?:\/\/|\/|;)\s*|\s+e\s+/i;
const parte = (v: unknown) => String(v ?? "").trim();

function formaDe(v: string): Forma {
  const f = v.toUpperCase();
  if (f === "WHATS" || f === "WHATSAPP") return "whatsapp";
  if (f === "EMAIL" || f === "E-MAIL") return "email";
  if (f.startsWith("ACESSORI")) return "acessorias";
  return null;
}

function emailsDe(v: string): string[] {
  return v
    .replace(/^e-?mail\s*:?\s*/i, "")
    .toLowerCase()
    .split(/[\s;,]+/)
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
}

function nomeDe(partes: string[]): string {
  const certas = partes.map((p) => p.replace(/FINACEIRO/gi, "FINANCEIRO"));
  const ultima = certas[certas.length - 1] ?? "";
  // "FINANCEIRO// MYLENA": o setor da empresa vem antes da pessoa.
  return certas.length > 1 ? `${ultima} (${certas.slice(0, -1).join(", ")})` : ultima;
}

/** O canal vem do que o contato tem, não da coluna "forma": só WhatsApp, só e-mail ou os dois. */
function canalDe(telefone?: string, email?: string): Canal | undefined {
  return telefone && email ? "whatsapp_e_email" : telefone ? "whatsapp" : email ? "email" : undefined;
}

/** Uma linha da planilha: [empresa, CNPJ, nome do contato, forma de envio, telefone, e-mail]. Várias pessoas na mesma linha viram vários contatos. */
export function lerLinha(linha: number, celulas: unknown[]): LinhaContatos | undefined {
  const [empresa, cnpjBruto, nomeBruto, formaBruta, telefoneBruto, emailBruto] = celulas.map(parte);
  const cnpj = soDigitos(cnpjBruto ?? "");
  if (!cnpjBruto) return undefined;
  const avisos: string[] = [];
  if (!cnpjValido(cnpj)) return { linha, cnpj, empresa: empresa ?? "", contatos: [], avisos: [`CNPJ inválido: ${cnpjBruto}`] };

  const forma = formaDe(formaBruta ?? "");
  const emails = emailsDe(emailBruto ?? "");
  if (emailBruto && emails.length === 0) avisos.push(`e-mail inválido: ${emailBruto}`);
  const telefones = (telefoneBruto ?? "").split(SEPARADOR).filter(Boolean).flatMap((t) => {
    const chave = chaveTelefone(t);
    if (!chave) avisos.push(`telefone inválido: ${t}`);
    return chave ? [formatarTelefone(chave)] : [];
  });
  const partes = (nomeBruto ?? "").split(SEPARADOR).filter(Boolean);

  const pessoas: { nome: string; telefone?: string }[] =
    telefones.length > 1
      ? telefones.map((telefone, i) => ({ nome: nomeDe(partes.length === telefones.length ? [partes[i]!] : partes), telefone }))
      : [{ nome: nomeDe(partes), telefone: telefones[0] }];

  const contatos: ContatoLido[] = [];
  pessoas.forEach((p, i) => {
    const email = i === 0 ? emails[0] : undefined;
    if (!p.telefone && !email) {
      if (p.nome || forma) avisos.push(`sem WhatsApp nem e-mail${p.nome ? `: ${p.nome}` : ""}`);
      return;
    }
    const derivado = !p.nome && email ? email.split("@")[0]!.toUpperCase() : undefined;
    contatos.push({
      nome: p.nome || derivado!,
      telefone: p.telefone,
      email,
      canal: canalDe(p.telefone, email),
      ...(derivado ? { nomeDerivado: true } : {}),
    });
  });
  // E-mails além do primeiro viram contatos próprios (a linha dava mais de um endereço).
  for (const email of emails.slice(1)) {
    contatos.push({ nome: email.split("@")[0]!.toUpperCase(), email, canal: canalDe(undefined, email), nomeDerivado: true });
  }
  return { linha, cnpj, empresa: empresa ?? "", contatos, avisos };
}

export type ContatosDoCnpj = { cnpj: string; empresa: string; contatos: ContatoLido[]; avisos: string[] };

/** Junta as linhas do mesmo CNPJ (cliente com mais de um contato) e tira contatos repetidos (mesmo WhatsApp ou e-mail). */
export function agruparPorCnpj(linhas: LinhaContatos[]): ContatosDoCnpj[] {
  const porCnpj = new Map<string, ContatosDoCnpj>();
  for (const l of linhas) {
    const g = porCnpj.get(l.cnpj) ?? { cnpj: l.cnpj, empresa: l.empresa, contatos: [], avisos: [] };
    g.avisos.push(...l.avisos.map((a) => `linha ${l.linha}: ${a}`));
    for (const c of l.contatos) {
      const chave = c.telefone ? chaveTelefone(c.telefone) : undefined;
      const repetido = g.contatos.some((x) => (chave && x.telefone && chaveTelefone(x.telefone) === chave) || (c.email && x.email === c.email));
      if (!repetido) g.contatos.push(c);
    }
    porCnpj.set(l.cnpj, g);
  }
  return [...porCnpj.values()];
}

/** Forma de envio do cliente a partir dos canais dos contatos que viram destino. */
export function formaDoCliente(contatos: ContatoLido[]): Canal | undefined {
  const canais = new Set(contatos.flatMap((c) => (c.canal ? [c.canal] : [])));
  const zap = canais.has("whatsapp") || canais.has("whatsapp_e_email");
  const mail = canais.has("email") || canais.has("whatsapp_e_email");
  return zap && mail ? "whatsapp_e_email" : zap ? "whatsapp" : mail ? "email" : undefined;
}

const CNPJ_FORMATADO = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;

/** Arquivo de responsável (nome = e-mail do perfil): o CNPJ de cada linha é o primeiro que aparece nas 4 primeiras colunas. */
export function cnpjsDoArquivoDeResponsavel(linhas: unknown[][]): string[] {
  const achados = linhas.flatMap((l) => {
    const c = l.slice(0, 4).map(parte).find((v) => CNPJ_FORMATADO.test(v));
    return c ? [soDigitos(c)] : [];
  });
  return [...new Set(achados)];
}

/** `lentzgabrielly@gmail.com.xlsx` → `lentzgabrielly@gmail.com`; nome sem e-mail → undefined. */
export function emailDoNomeDoArquivo(nome: string): string | undefined {
  const base = nome.replace(/\\/g, "/").split("/").pop()!.replace(/\.xlsx$/i, "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(base) ? base : undefined;
}
