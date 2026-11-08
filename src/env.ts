import { readFileSync } from "node:fs";

import { z } from "zod";

const vazioVira = (v: unknown) => (v === "" ? undefined : v);

const schema = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_PROD_PROJECT_REF: z.preprocess(vazioVira, z.string().min(1).optional()),
  ANTHROPIC_API_KEY: z.preprocess(vazioVira, z.string().min(1).optional()),
});

export type Env = z.infer<typeof schema>;

export function lerEnv(fonte: Record<string, string | undefined> = process.env): Env {
  const r = schema.safeParse(fonte);
  if (!r.success) {
    const campos = r.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Variáveis de ambiente inválidas ou ausentes: ${campos}. Veja .env.example.`);
  }
  return r.data;
}

/** Lê o arquivo .env (se existir) e valida; variáveis já definidas no ambiente vencem as do arquivo. */
export function carregarEnv(arquivo = ".env"): Env {
  let doArquivo: Record<string, string> = {};
  try {
    doArquivo = Object.fromEntries(
      readFileSync(arquivo, "utf-8")
        .split(/\r?\n/)
        .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/))
        .filter((m): m is RegExpMatchArray => m !== null)
        .map((m) => [m[1]!, m[2]!.replace(/^(['"])(.*)\1$/, "$2")]),
    );
  } catch {
    // sem .env: vale só o ambiente do processo
  }
  return lerEnv({ ...doArquivo, ...process.env });
}
