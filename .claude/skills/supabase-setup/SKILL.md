---
name: supabase-setup
description: Configura o Supabase local de um projeto Next.js deste time — supabase init, config.toml, migrations, seed com usuários por papel, grants/RLS, proxy.ts de sessão e .env.example do Supabase. Use no bootstrap de projeto novo, ou quando o usuário pedir para preparar o banco local, o seed ou a renovação de sessão.
---

# Supabase (banco, auth, RLS e sessão)

Fonte das regras: `docs/arquitetura.md` §3.9 (infra), §3.12 (autorização em camadas) e `docs/testes.md` §5 (ambientes). Modelo real: `supabase/` e `src/proxy.ts` do repositório; `../fullstack-next-bootstrap/templates/supabase/` tem o `config.toml`, o `proxy.ts` e o `renovar-sessao.factory.ts` em uso.

## 1. Instalar e iniciar

```bash
yarn add @supabase/supabase-js @supabase/ssr
yarn add -D pg @types/pg supabase
npx supabase init
```

Troque o `supabase/config.toml` gerado por `templates/supabase/config.toml` e ajuste só `project_id`. Docker precisa estar de pé: `npx supabase start` imprime a API URL e a anon key.

## 2. Variáveis

No `.env.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (valores do `supabase start`) e `SUPABASE_SERVICE_ROLE_KEY` (server-only, nunca com prefixo `NEXT_PUBLIC_`). Depois rode `generate-env-ts` para validá-las.

## 3. Migrations e seed (regras do projeto)

- Migration é a única forma de mudar o schema; nunca alteração manual. Nome `YYYYMMDDHHMMSS_<assunto>.sql`.
- **Toda migration que cria tabela leva `grant` explícito** ao papel que precisa; `anon` não recebe nada sem motivo. Ligue **RLS** em toda tabela.
- Redefinir função `SECURITY DEFINER` usada por RLS: `DROP FUNCTION` antes de recriar (arquitetura §3.9). Timestampe a migration antes de qualquer outra que passe a depender dela.
- `supabase/seed.sql`: um usuário por **papel e setor** (a matriz de RBAC), com identidade em `auth.identities` (sem ela `signInWithPassword` falha), ids fixos que os testes referenciam e senhas só locais. Nunca reutilize no homolog/produção.
- Tipos do banco: `npx supabase gen types typescript --local > src/shared/database.types.ts` quando o schema mudar.
- `npx supabase db reset` aplica as migrations e o seed: deve terminar sem erro.

## 4. Sessão (proxy do Next 16)

`src/proxy.ts` **só renova a sessão**, não decide acesso (arquitetura §3.12, camada 1). Ele chama `renovarSessao` de `src/main/renovar-sessao.factory.ts` (`server-only`, `createServerClient` do `@supabase/ssr` com `cookies.getAll/setAll`). O matcher exclui `_next/static`, `_next/image`, `favicon.ico` e `api/webhooks`. Copie `templates/supabase/proxy.ts` para `src/proxy.ts` e `templates/supabase/renovar-sessao.factory.ts` para `src/main/`.

O cliente do navegador (`createBrowserClient`) existe só em `presentation/auth/`; consulta de dados nunca passa por ele.

## 5. Conferir

`npx supabase db reset` sem erro e `yarn tsc --noEmit` sem erro em `proxy.ts`.
