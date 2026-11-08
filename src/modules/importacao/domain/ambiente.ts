export type AmbienteEnv = { url: string; refProducao?: string };
export type AmbienteOpcoes = { producao?: boolean };
export type AmbienteValidado = { ambiente: "local" } | { ambiente: "producao"; ref: string };

const LOCAL = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/;

/** Por padrão só o Supabase local; produção exige --producao e o ref do projeto igual ao do .env. */
export function validarAmbiente(env: AmbienteEnv, opcoes: AmbienteOpcoes): AmbienteValidado {
  const local = LOCAL.test(env.url);
  if (opcoes.producao && local) throw new Error("--producao não vale para o Supabase local");
  if (local) return { ambiente: "local" };
  if (!opcoes.producao) throw new Error("Recusado: a URL não é local. Use --producao para gravar em produção.");
  if (!env.refProducao) throw new Error("Defina SUPABASE_PROD_PROJECT_REF no .env para usar --producao.");
  if (env.url !== `https://${env.refProducao}.supabase.co`) {
    throw new Error("O ref de SUPABASE_PROD_PROJECT_REF não confere com a URL do Supabase.");
  }
  return { ambiente: "producao", ref: env.refProducao };
}
