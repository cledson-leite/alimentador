const LOOPBACK = /^[a-z]+:\/\/([^@/]*@)?(127\.0\.0\.1|localhost)([:/]|$)/;

// Suítes de integração que apagam dados chamam isto antes de qualquer setup: com variáveis de
// ambiente apontando para uma base compartilhada/remota, falham alto em vez de limpar o que é de
// outros.
export function exigirSupabaseLocal(...destinos: readonly string[]): void {
  for (const destino of destinos) {
    if (!LOOPBACK.test(destino)) {
      throw new Error("Suíte destrutiva só roda contra o Supabase/PostgreSQL local (loopback).");
    }
  }
}

// Destino das suítes e2e que preparam dados: o Supabase local ou, só numa rodada contra um deploy
// (`baseUrl`), o projeto de homologação cujo ref foi declarado em `refHomolog`. Qualquer outro
// host remoto, inclusive produção, continua recusado.
export function exigirDestinoDoE2E(
  supabaseUrl: string,
  opcoes: { baseUrl?: string; refHomolog?: string },
): void {
  const { baseUrl, refHomolog } = opcoes;
  if (baseUrl && refHomolog && /^[a-z0-9]{20}$/.test(refHomolog)) {
    if (supabaseUrl === `https://${refHomolog}.supabase.co`) return;
  }
  exigirSupabaseLocal(supabaseUrl);
}
