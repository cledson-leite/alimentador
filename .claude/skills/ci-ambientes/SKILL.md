---
name: ci-ambientes
description: Configura CI (GitHub Actions), ambientes e gitflow de um projeto Next.js deste time — ci.yml, e2e-preview.yml, vercel.json e as branches main/homolog/develop. Use no bootstrap de projeto novo ou quando o usuário pedir pipeline, preview da Vercel ou E2E em homologação.
---

# CI, ambientes e gitflow

Fonte: `docs/testes.md` §5 (ambientes e gitflow). Modelo em `../fullstack-next-bootstrap/templates/ci/`. Pressupõe `lint`, `check:*`, `test`, `test:int` e `test:e2e` (skills `eslint-prettier-clean-arch` e `test-setup-jest-playwright`) e o Supabase local (`supabase-setup`).

## 1. Branches

`main`, `homolog`, `develop` (e `feature/*`). Crie `develop` e `homolog` a partir da `main` e publique-as. Promoção: `feature/*` → PR para `develop` → PR `develop` → `homolog` (dispara o E2E completo) → `main`.

## 2. Workflows (de `templates/ci/` para `.github/workflows/`)

| Arquivo | Quando roda | O que faz |
|---|---|---|
| `ci.yml` | PR e push em `develop`/`homolog`/`main` | lint, naming, deps, `next typegen`, `tsc`, format, unit; build de produção; integração + E2E com Supabase local |
| `e2e-preview.yml` | `deployment_status` da Vercel, só se a `homolog` está na ponta | restaura o Supabase de homologação (migrations + seed) e roda o E2E completo contra o preview |

Ajustes por projeto: em `e2e-preview.yml` revise os nomes dos secrets e inclua os checks próprios do projeto no `ci.yml`.

## 3. Secrets e variáveis (só o usuário cria no GitHub/Vercel)

`SUPABASE_ACCESS_TOKEN`, `SUPABASE_HOMOLOG_DB_PASSWORD`, `SUPABASE_HOMOLOG_PROJECT_REF`, `VERCEL_AUTOMATION_BYPASS_SECRET`, os segredos extras que a suíte E2E do projeto exigir (assinatura de webhook, adapters falsos) e a variável `E2E_PREVIEW_HABILITADO=true`. O `SUPABASE_ACCESS_TOKEN` expira/é revogado: `Invalid access token` no `supabase link` é isso.

## 4. `vercel.json`

`{ "framework": "nextjs" }`; acrescente `crons` só quando houver jobs em `src/app/api/jobs/**`. A homologação usa **projeto Supabase separado**, mesmo schema (mesmas migrations), dados sintéticos, nenhum dado de produção.

## 5. Conferir

Abra uma PR de teste para `develop` e veja o `ci.yml` verde.
