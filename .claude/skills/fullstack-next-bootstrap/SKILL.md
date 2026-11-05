---
name: fullstack-next-bootstrap
description: Bootstrap completo de um projeto fullstack Next.js deste time, do zero — cria o projeto e a estrutura de pastas, configura lint/camadas, testes, env, Supabase, design system, CI/ambientes e o Graphify, verificando cada etapa. Use só para projeto novo; para uma parte isolada invoque a skill da etapa.
---

# Bootstrap completo (orquestradora)

Não repete conteúdo: chama, em ordem, as skills de etapa (cada uma tem a sua fonte de regras e os modelos em `templates/`, que são os arquivos reais do repositório). **O repositório manda**; se um doc divergir, atualize o doc. O projeto é sempre `.`.

## Ordem, verificação e ação

Rode cada skill com a ferramenta `Skill` e depois a verificação. Falhou: leia o erro, corrija o arquivo copiado e repita. **Teto: 3 tentativas por etapa**; na 3ª, registre o comando e o erro e siga para a próxima, sem travar o bootstrap.

| # | Skill | Verificação |
|---|---|---|
| 1 | `next-project-init` | `package.json` e `src/{modules,shared,main}` existem |
| 2 | `eslint-prettier-clean-arch` | `yarn lint`, `check:deps`, `check:naming` com código 0 |
| 3 | `test-setup-jest-playwright` | `yarn test` e `yarn test:int` carregam a config (sem testes ainda é sucesso) |
| 4 | `generate-env-ts` | `.env.example` e `src/env.ts` existem; `yarn tsc --noEmit` sem erro neles |
| 5 | `supabase-setup` | `npx supabase db reset` sem erro |
| 6 | `design-system-setup` | `yarn lint && yarn tsc --noEmit` |
| 7 | `ci-ambientes` | `.github/workflows/ci.yml` presente; branches `develop` e `homolog` criadas |
| 8 | `graphify-integration` | `graphify-out/graph.json` existe, `graphify hook status` ativo e `.git/hooks/pre-push` instalado. **Obrigatório**, sempre roda. |

## Fechamento

```bash
yarn format && yarn lint && yarn check:deps && yarn check:naming && yarn tsc --noEmit && yarn test
```

Termine com um relatório objetivo: o que passou; o que precisou de correção; o que ficou vermelho depois de 3 tentativas (comando e erro exatos); e o que só o usuário pode fazer (secrets do GitHub/Vercel, projeto Supabase de homologação). Não trate item vermelho como verde.

## Rastreabilidade

| Parte | Skill | Fonte |
|---|---|---|
| Projeto, pastas, DTOs base | `next-project-init` | `arquitetura.md` §1, 3.2, 3.8 |
| ESLint, Prettier, camadas, nomenclatura | `eslint-prettier-clean-arch` | Anexos A, B, C, E |
| Jest, RTL, Supertest, Playwright | `test-setup-jest-playwright` | `testes.md` §6, 7 |
| `env.ts` | `generate-env-ts` | decisão da skill |
| Supabase, RLS, sessão | `supabase-setup` | `arquitetura.md` §3.9, 3.12; `testes.md` §5 |
| cn, providers, `ui/`, tokens | `design-system-setup` | `arquitetura.md` §4.4, 5; `DESIGN.md` |
| CI, ambientes, gitflow | `ci-ambientes` | `testes.md` §5 |
| Grafo de conhecimento | `graphify-integration` | README do Graphify |
