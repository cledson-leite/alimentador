# SDD — esteira de desenvolvimento orientada a especificação

Kit de **skills, subagentes, hooks, scripts e documentação de arquitetura** para o Claude Code que leva uma ideia até código revisado, testado e mergeado, seguindo *Spec-Driven Development*: primeiro a decisão e a spec, depois os tickets, depois o código com TDD, e só então a revisão.

Não é uma aplicação. É o que você copia para a raiz de um projeto novo (ou existente) para que o agente trabalhe do mesmo jeito em qualquer sistema.

- **Agnóstico de produto:** nada aqui é de um cliente ou domínio específico.
- **Opinativo na stack:** Next.js 16 (App Router), TypeScript, Supabase, Tailwind + shadcn/ui, Clean Architecture modular, Jest/Playwright, GitHub Actions e Vercel.
- **Em português do Brasil:** documentos, skills e respostas do agente (regra em `AGENTS.md`).
- **Seguro por padrão:** nenhum comando faz `git push`, merge sem ordem sua ou deploy. Um hook pede sua confirmação em todo `git push`.

## Sumário

1. [Pré-requisitos](#pré-requisitos)
2. [Instalação](#instalação)
3. [O processo, em ordem](#o-processo-em-ordem)
4. [Comandos em detalhe](#comandos-em-detalhe)
5. [Catálogo de skills](#catálogo-de-skills)
6. [Subagentes, hooks e scripts](#subagentes-hooks-e-scripts)
7. [Documentação de referência](#documentação-de-referência)
8. [Estrutura do repositório](#estrutura-do-repositório)
9. [Manutenção](#manutenção)
10. [Limitações conhecidas](#limitações-conhecidas)
11. [Créditos](#créditos)

## Pré-requisitos

| Ferramenta | Para quê |
|---|---|
| [Claude Code](https://claude.com/claude-code) | executa as skills e os subagentes |
| `git` e [`gh`](https://cli.github.com) (autenticado: `gh auth login`) | branches, issues, PRs e checagem de CI |
| Node.js 20+ e Yarn | projeto Next.js, scripts do kit e hook de push |
| Docker | Supabase local (`npx supabase start`) |
| Python 3 + `pip install reportlab` | PDFs de auditoria e de roteiro de teste (`gerar_pdf.py`) |
| [`uv`](https://docs.astral.sh/uv/) e `uv tool install graphifyy` | Graphify (grafo de conhecimento). Recomendado; sem ele os hooks não fazem nada |
| Conta no GitHub, Vercel e Supabase | CI, preview e homologação (só quando chegar nessa etapa) |

> **Graphify é opcional para começar, obrigatório no bootstrap.** A skill e a regra "consulte o grafo primeiro" (`AGENTS.md`) já vêm no kit, e o hook `graphify-guard.mjs` não faz nada se o comando não estiver instalado. O binário é um pacote Python e não dá para versioná-lo aqui: instale-o uma vez por máquina (`graphify-integration`, passo 1). Funciona em Claude Code, Codex, Antigravity, Gemini CLI, Cursor e outros: o comando de instalação por assistente está na mesma skill.

## Instalação

Na raiz do projeto de destino, copie:

```text
.claude/          # skills, agentes, fluxos, scripts, hooks e settings
docs/             # arquitetura.md e testes.md (as regras que as skills aplicam)
AGENTS.md         # idioma de comunicação
CLAUDE.md         # instruções do projeto para o Claude Code
CONTEXT.md        # glossário do domínio (template: você preenche)
.gitignore        # ignora .claude/state/, graphify-out/ etc. (ou mescle as linhas)
```

`.agents/` é opcional: é um espelho de `.claude/` com os caminhos reescritos, para outro LLM (Codex, Antigravity etc.) executar os mesmos fluxos. Copie também `LICENSE` e `THIRD_PARTY_NOTICES.md` se redistribuir o kit.

Depois:

```bash
git init                      # se ainda não for um repositório
gh repo create                # ou aponte o remote para um repositório existente
# abra o Claude Code na raiz e rode:
/fullstack-next-bootstrap     # projeto novo e vazio
```

Para um projeto **que já existe**, não rode o bootstrap inteiro: chame só a skill da etapa de que precisa (veja o [catálogo](#bootstrap-uma-vez-por-projeto)).

## O processo, em ordem

Cada estação é uma skill. O que passa de uma para a outra são **artefatos** (issues no GitHub e um arquivo de ledger), não contexto, então você pode dar `/clear` entre elas.

```text
/fullstack-next-bootstrap        projeto novo, uma vez
        │
/esteira-refinar <ideia>         1. ideia → decisões → spec (issue) + PRODUCT.md
        │
/esteira-planejar <nº spec>      2. spec → tickets verticais + label de frente
        │
/implementar-issue <nº> [base]   3. branch por ticket, TDD, commits  (repita por ticket)
        │
/gate-qualidade [base]           4. laço de revisão até zero apontamentos
        │
/roteiro-teste-local [base]      5. roteiro de teste manual em PDF (só se houver UI)
        │
você: git push + abrir a PR      6.
        │
/auditar-pr <nº PR>              7. auditoria só de leitura (PDF + comentário na PR)
        ├─ aprovou  → /aprovar-pr [nº]         8a. squash-merge na develop
        └─ pediu alterações → /revisar-pr <pdf> [pr], depois /auditar-pr de novo   8b.
        │
/auditar-release                 9. develop = release candidate → PDF PRONTA/BLOQUEADA
        │
você: PR da branch de release → /aprovar-pr → PR develop→homolog (merge commit)    10.
        │
/roteiro-teste-homolog <nº PR>   11. guia de teste e apresentação, sem jargão
```

| # | Quando | Comando | Argumentos |
|---|---|---|---|
| 0 | Projeto novo, uma vez | `/fullstack-next-bootstrap` | nenhum |
| 1 | Ideia nova de feature | `/esteira-refinar` | `<descrição>` |
| 2 | Spec aprovada | `/esteira-planejar` | `<nº da spec>` |
| 3 | Cada ticket, na ordem das dependências | `/implementar-issue` | `<issue> [base]` |
| 4 | Ticket (ou grupo) implementado | `/gate-qualidade` | `[base]` |
| 5 | Grupo com UI, antes da PR | `/roteiro-teste-local` | `[base]` |
| 6 | Pronto para subir | você: `git push` e abrir a PR | |
| 7 | PR aberta | `/auditar-pr` | `<nº da PR>` |
| 8a | Auditoria aprovou | `/aprovar-pr` | `[nº da PR]` |
| 8b | Auditoria pediu alterações | `/revisar-pr`, depois `/auditar-pr` | `<pdf> [pr]` |
| 9 | `develop` acumulou mudanças para promover | `/auditar-release` | nenhum |
| 10 | Release auditado | você: PR da release, `/aprovar-pr`, PR `develop`→`homolog` | |
| 11 | Promoção feita e E2E Preview verde | `/roteiro-teste-homolog` | `<nº da PR de promoção>` |
| M | Depois de mudar algo em `.claude/` | `node .claude/scripts/sincronizar-agents.mjs` | `[--verificar]` |

Os fluxos completos estão em [`.claude/fluxos/`](.claude/fluxos) e o guia de bolso em [`.claude/comandos.md`](.claude/comandos.md).

## Comandos em detalhe

### 0. `/fullstack-next-bootstrap`
Cria um projeto fullstack do zero em 8 etapas, conferindo cada uma (até 3 tentativas): `next-project-init` → `eslint-prettier-clean-arch` → `test-setup-jest-playwright` → `generate-env-ts` → `supabase-setup` → `design-system-setup` → `ci-ambientes` → `graphify-integration`. Termina com um relatório do que passou, do que foi corrigido e do que só você pode fazer (secrets do GitHub e da Vercel, projeto Supabase de homologação).

### 1. `/esteira-refinar <descrição>`
Interativo. Lê `docs/arquitetura.md`, `docs/testes.md` e `CONTEXT.md`, faz perguntas (mapa de decisões com `wayfinder` e `grilling`), avalia a arquitetura da região (`improve-codebase-architecture`), publica a **spec** como issue (`to-spec`) e atualiza o `PRODUCT.md` (`impeccable init`). Na primeira vez também configura o tracker (`setup-matt-pocock-skills`). **Saída:** spec aprovada. Não gera tickets nem código.

### 2. `/esteira-planejar <nº da spec>`
Fatia a spec em **tickets verticais** (cada um entrega algo de ponta a ponta, com suas dependências), faz o `triage` e marca a frente com label: `frente:frontend`, `frente:backend` ou `frente:ambas`. **Saída:** tabela do backlog com a ordem das dependências.

### 3. `/implementar-issue <issue> [base]`
Implementa **um ticket por vez** com TDD (`implement` → `tdd`; bugs passam por `diagnosing-bugs`). Cria `feature/<título>` (ou `fix/`). Sem `[base]` parte da `develop`; ticket que depende de outro fica **empilhado** na branch dele (passe a issue ou a branch). Para se houver alteração não commitada em arquivo rastreado. **Saída:** branch commitada com `tsc`, lint e testes verdes. Não faz push nem abre PR.

### 4. `/gate-qualidade [base]`
Laço de revisão sobre `git diff <base>...HEAD`, em quatro etapas, nesta ordem:

1. `impeccable audit` até 20/20 (só se houver UI);
2. `ponytail-review` (código morto e over-engineering);
3. `code-review-spec` (padrões do repositório + aderência à spec, em paralelo);
4. `retro` (retrospectiva do processo e dos guardrails).

Cada etapa só avança com zero apontamentos novos, com no máximo **5 rodadas**. O que é mecânico é corrigido; o que exige decisão vira pergunta para você. O histórico fica em `.claude/state/<branch>/ledger.md` (fora do git), então um apontamento resolvido nunca volta. Um commit por etapa.

### 5. `/roteiro-teste-local [base]`
Gera um PDF em `Downloads` com o passo a passo do teste manual: preparo do ambiente, logins do seed, dados exatos a cadastrar, SQLs e `curl` que simulam o que vem de fora, passos com resultado esperado e como voltar ao zero. Sem UI no grupo de issues, avisa e para.

### 6. Você: push e PR
Reúna o grupo de issues numa PR. O hook pede confirmação do `git push`.

### 7. `/auditar-pr <nº da PR>`
Auditoria **só de leitura**: confere o CI (vermelho vira bloqueio P0) e audita o diff contra a base real da PR, num `git worktree` descartável. Entrega um PDF com apontamentos **P0** (bloqueante), **P1** (qualidade) e **P2** (melhoria) e o parecer, e comenta o mesmo relatório na PR (sempre, inclusive se aprovar).

### 8a. `/aprovar-pr [nº da PR]`
Exige PR aprovada, base `develop` e **CI todo verde**. Faz squash-merge, fecha as issues `Closes`, atualiza a `develop` local, rebaseia as branches empilhadas e publica só as que têm PR aberta, num único `git push`. Invocar o comando é a sua ordem de mergear.

### 8b. `/revisar-pr <pdf> [pr]`
Trata a devolutiva (de qualquer revisor): confere cada apontamento no código do SHA revisado, corrige o que não exige decisão, **pergunta antes do push**, comenta na PR e gera o PDF de resposta. Depois rode `/auditar-pr` de novo.

### 9. `/auditar-release`
Audita a `develop` como release candidate (`origin/homolog..develop`) numa branch `release/auditoria-<data>`: confere o CI, consolida migrations e seeds (só as que a produção ainda não aplicou: você cola o resultado de `select version from supabase_migrations.schema_migrations`), aplica a regra de Clean Code nos comentários, confere cada issue do ciclo contra o diff, procura segredos e variáveis faltando e roda o `gate-qualidade`. **Saída:** PDF **PRONTA PARA HOMOLOGAÇÃO** ou **BLOQUEADA**.

### 10. Você: promover
Push da branch de release e PR para a `develop`; `/aprovar-pr`; PR `develop` → `homolog` com **merge commit** (não squash). O E2E Preview roda sozinho.

### 11. `/roteiro-teste-homolog <nº da PR de promoção>`
Com o E2E Preview verde e alguma novidade visível, gera o guia em linguagem não técnica para testers e apresentação: endereço, logins, o que há de novo, passos com resultado esperado, o que não pode acontecer e um roteiro de apresentação.

## Catálogo de skills

Você só digita os comandos da tabela acima; as demais são chamadas por eles. Todas também funcionam avulsas quando fizerem sentido.

### Bootstrap (uma vez por projeto)

| Skill | O que faz |
|---|---|
| `fullstack-next-bootstrap` | Orquestra as 8 etapas abaixo e entrega o relatório |
| `next-project-init` | Cria o projeto Next.js (App Router, TypeScript, Tailwind, Yarn) e a estrutura da Clean Architecture modular (`domain`/`application`/`infra`/`presentation`, mais `shared` e `main`) |
| `eslint-prettier-clean-arch` | ESLint, Prettier, regras de camada (`dependency-cruiser`), diretivas por tipo de arquivo e verificador de nomenclatura |
| `test-setup-jest-playwright` | Jest, React Testing Library, Supertest e Playwright, com os sufixos `*.spec` / `*.test` / `*.e2e` e o limiar de cobertura |
| `generate-env-ts` | Gera `src/env.ts` e `src/env.client.ts` (Zod) a partir do `.env.example` |
| `supabase-setup` | Supabase local: `config.toml`, migrations, seed por papel, grants/RLS e `proxy.ts` de sessão |
| `design-system-setup` | `cn()`, providers de tema e React Query, primitivas `ui/` (shadcn/cva) e tokens do `globals.css`. A paleta nasce do **sentimento do produto**, light é o tema padrão |
| `ci-ambientes` | `ci.yml`, `e2e-preview.yml`, `vercel.json` e as branches `main` / `homolog` / `develop` |
| `graphify-integration` | Instala e inicializa o Graphify no projeto e o mantém atualizado |

### Esteira (os comandos do dia a dia)

| Skill | Estação |
|---|---|
| `esteira-refinar` | 1. ideia → spec |
| `esteira-planejar` | 2. spec → tickets |
| `implementar-issue` | 3. ticket → código |
| `gate-qualidade` | 4. revisão em laço |
| `roteiro-teste-local` / `roteiro-teste-homolog` | 5 e 11. roteiros de teste manual |
| `auditar-pr` / `revisar-pr` / `aprovar-pr` | 7, 8b e 8a. ciclo de PR |
| `auditar-release` | 9. prontidão do release |

### Método (chamadas pela esteira, úteis avulsas)

| Skill | Para quê |
|---|---|
| `wayfinder` | Planeja trabalho grande demais para uma sessão como um mapa de tickets de decisão |
| `grilling` | Interroga você sobre um plano ou decisão até fechar as pontas soltas |
| `to-spec` | Transforma a conversa numa spec publicada no tracker |
| `to-tickets` | Quebra spec ou plano em tickets verticais com dependências declaradas |
| `triage` | Move issues por uma máquina de estados e escreve briefs prontos para o agente |
| `implement` | Implementa a partir de uma spec ou conjunto de tickets |
| `tdd` | Red → Green → Refactor, com testes de integração |
| `diagnosing-bugs` | Laço de diagnóstico para bugs difíceis e regressões de desempenho |
| `code-review-spec` | Revisa o diff em dois eixos: padrões do repositório e aderência à spec |
| `retro` | Retrospectiva do processo e dos guardrails (lint, checks, docs, skills) |
| `research` | Pesquisa em fontes primárias e registra o resultado em Markdown |
| `prototype` | Protótipo descartável para validar um modelo de estado ou uma UI |
| `domain-modeling` | Constrói o glossário (`CONTEXT.md`) e as ADRs |
| `codebase-design` | Vocabulário de módulos profundos, seams e interfaces |
| `improve-codebase-architecture` | Acha oportunidades de aprofundar módulos e apresenta um relatório HTML |
| `setup-matt-pocock-skills` | Configura uma vez o tracker, as labels de triage e o layout dos docs de domínio |
| `writing-for-agents` | Como escrever skills, `AGENTS.md` e `CLAUDE.md` |

### Qualidade de código e interface

| Skill | Para quê |
|---|---|
| `impeccable` | Projeta, critica, audita e refina interfaces (tipografia, cor, layout, movimento, acessibilidade, texto). `audit` é a etapa 1 do gate |
| `ponytail` | Modo "preguiçoso": a solução mais curta que funciona, antes de abstrações e dependências novas |
| `ponytail-review` | Revisão só de over-engineering: o que apagar e o que o substitui. É a etapa 2 do gate |
| `graphify` | Grafo de conhecimento do código (Claude Code, Codex, Antigravity, Gemini CLI, Cursor…); responde perguntas de arquitetura com `graphify query/path/explain` |

## Subagentes, hooks e scripts

**Subagentes** (`.claude/agents/`, só leitura):

| Agente | Usado por | Função |
|---|---|---|
| `auditor-de-qualidade` | `gate-qualidade`, `auditar-pr`, `auditar-release` | Roda uma auditoria (impeccable, ponytail ou lógica/segurança) sobre o diff e devolve só os apontamentos novos, em tabela curta |
| `levantador-de-roteiro` | `roteiro-teste-local`, `roteiro-teste-homolog` | Levanta do diff e das issues os fatos concretos do roteiro: telas, papéis, campos válidos e inválidos, gatilhos externos e como simulá-los |

**Hooks** (`.claude/settings.json`):

| Hook | Efeito |
|---|---|
| `pedir-push.mjs` | Todo `git push` pede confirmação explícita |
| `graphify-guard.mjs` | Repassa ao `graphify hook-guard` para direcionar leituras e buscas ao grafo antes do código bruto; **não faz nada** se o Graphify não estiver instalado |

**Scripts** (`.claude/scripts/`):

| Script | Função |
|---|---|
| `gerar_pdf.py` | Gera os PDFs de auditoria e de roteiro (ReportLab) |
| `mapear-pilha.mjs` | Mapeia a árvore de branches empilhadas e suas PRs |
| `limpar-backups.mjs` | Apaga os backups `refs/backup/*` de branches já mergeadas |
| `checar-ambiente.mjs` | Procura segredos e variáveis faltando no diff |
| `classificar-migracoes.mjs` | Separa migrations já aplicadas na produção das consolidáveis |
| `sincronizar-agents.mjs` | Mantém `.agents/` em dia com `.claude/` |

## Documentação de referência

| Arquivo | Conteúdo |
|---|---|
| [`docs/arquitetura.md`](docs/arquitetura.md) | Regras de arquitetura: Clean Architecture modular, MVVM com Atomic Design, Server Actions como única borda, design system, cache. As marcadas **[lint]** falham o CI |
| [`docs/testes.md`](docs/testes.md) | TDD obrigatório, pirâmide de testes, o que testar em cada camada, cobertura e definição de pronto |
| [`CONTEXT.md`](CONTEXT.md) | Glossário do **seu** domínio: preencha com `domain-modeling`; as skills usam esses nomes |
| [`.claude/fluxos/`](.claude/fluxos) | Os fluxos completos: esteira, revisão de PR, auditoria da develop, teste manual |
| [`.claude/comandos.md`](.claude/comandos.md) | Guia de bolso dos comandos |

Regras que valem em todo o kit: a paleta de cores vem da psicologia das cores conforme o sentimento do produto (`arquitetura.md` §5.1), tema light por padrão, e cor só por token semântico.

## Estrutura do repositório

```text
.
├── AGENTS.md              idioma (pt-BR) e regra de consulta ao Graphify, para qualquer assistente
├── LICENSE                MIT (conteúdo original)
├── THIRD_PARTY_NOTICES.md licenças das skills de terceiros
├── CLAUDE.md              instruções do projeto para o Claude Code
├── CONTEXT.md             glossário do domínio (template)
├── docs/
│   ├── arquitetura.md
│   └── testes.md
├── .claude/
│   ├── settings.json      hooks (push e graphify)
│   ├── comandos.md
│   ├── agents/            2 subagentes de leitura
│   ├── fluxos/            4 fluxos documentados
│   ├── hooks/             pedir-push.mjs, graphify-guard.mjs
│   ├── scripts/           PDF, pilha de branches, ambiente, migrations, sync
│   └── skills/            ~40 skills (bootstrap, esteira, método, qualidade)
│       └── fullstack-next-bootstrap/templates/   arquivos reais copiados nos projetos
└── .agents/               espelho de .claude/ para outro LLM
```

## Manutenção

Sempre que mudar algo em `.claude/skills`, `agents`, `scripts`, `fluxos`, `hooks` ou `comandos.md`:

```bash
node .claude/scripts/sincronizar-agents.mjs            # reescreve .agents/
node .claude/scripts/sincronizar-agents.mjs --verificar  # só confere (código 1 se defasado)
```

## Limitações conhecidas

- **Stack fixa.** As skills de bootstrap e as regras de arquitetura assumem Next.js 16, Supabase, Vercel e GitHub. Outra stack exige adaptar `docs/` e os templates.
- **Gitflow esperado:** `main`, `homolog` e `develop`. As skills de PR e release usam esses nomes.
- **Graphify:** o binário precisa ser instalado por máquina. Hooks de `PreToolUse` só existem no Claude Code e no Gemini CLI; nos demais assistentes a orientação chega pelo `AGENTS.md`.
- **PDFs** dependem de Python com `reportlab`.
- **Sem testes automatizados do kit em si.** Os templates vêm de um projeto real que os usou, mas o kit não é executado de ponta a ponta por uma suíte própria.

## Licença e créditos

O conteúdo original deste repositório é distribuído sob a licença [MIT](LICENSE). Várias skills são de terceiros e mantêm as licenças deles (Graphify e Impeccable: Apache-2.0; coleção do Matt Pocock e Ponytail: MIT). A lista completa, com origem e licença de cada uma, está em [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
