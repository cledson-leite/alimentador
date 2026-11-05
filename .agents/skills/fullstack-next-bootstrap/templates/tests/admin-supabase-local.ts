import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { exigirSupabaseLocal } from "./exigir-supabase-local";

const URL_LOCAL = "http://127.0.0.1:54321";

type Criar = (
  url: string,
  chave: string,
  opcoes: { auth: { persistSession: false } },
) => SupabaseClient;

// Client service_role das suítes de integração destrutivas. O destino é validado ANTES de o client
// existir: com URL remota (mesmo com a chave presente), inválida ou fora do loopback, nenhum I/O
// administrativo chega a ser possível. `criar` só existe para o teste provar essa ordem.
export function criarAdminLocal(
  chave: string,
  url: string = process.env.NEXT_PUBLIC_SUPABASE_URL ?? URL_LOCAL,
  criar: Criar = createClient as Criar,
): SupabaseClient {
  exigirSupabaseLocal(url);
  return criar(url, chave, { auth: { persistSession: false } });
}
