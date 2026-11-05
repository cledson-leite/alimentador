---
name: gate-qualidade
description: Estação 4 da esteira de desenvolvimento — pipeline de qualidade em laço sequencial sobre o diff da branch (impeccable audit até 20/20, ponytail-review, code-review-spec, retro), cada etapa só avança com zero apontamentos novos e nunca repete um já resolvido (ledger em arquivo). Uso — /gate-qualidade [base].
argument-hint: [base]
---

Argumento: `$ARGUMENTS` = base do diff. Sem base: `gh pr view --json baseRefName` se a branch tem PR; senão `develop`. Em branch empilhada, passe a branch do ticket anterior. O escopo é sempre `git diff <base>...HEAD`.

## Preparação

1. `git status --porcelain` sem alteração de arquivo rastreado (senão pare: o gate revisa o que está commitado).
2. Ledger: `.agents/state/<branch com / trocado por ->/ledger.md` (ignorado pelo git). Crie com o cabeçalho `ID | etapa | resumo | status | commit` se não existir. **Todo apontamento tratado entra aqui** (`resolvido` ou `recusado`); nada que conste no ledger volta a ser apontado.
3. Liste os arquivos do diff. Há UI (`*.tsx`, `*.css`, `DESIGN.md`)? Isso decide a etapa 1.

## Como cada etapa roda (laço)

1. **Auditar**: chame o subagent `auditor-de-qualidade` (Agent tool) com: etapa, base e caminho do ledger. Ele só lê e devolve uma tabela curta de apontamentos novos. A etapa 3 não usa o subagent (ver abaixo).
2. **Tratar**: mecânico e inequívoco → corrija. Exige decisão (arquitetura, apagar código que pode ser de ticket planejado, custo, escopo) → **pergunte ao usuário** antes.
3. **Registrar** no ledger e **rodar de novo** a mesma etapa. Só avança com zero apontamentos novos.
4. **Teto: 5 rodadas por etapa** (esperar resposta do usuário não conta). Estourou → pare e reporte o que falta e por quê (apontamento que reaparece indica causa raiz não tratada).
5. Etapa que mudou arquivo → **um commit** (Conventional Commits). Antes de commitar confira `git diff --cached --name-only`: só entram arquivos que o gate tocou, nunca `git add -A`.

## Etapas (nesta ordem, sem pular)

**1. `impeccable audit`** — só se há UI no diff (senão registre "design não aplicável"). Saída: **20/20 e zero ações recomendadas**. Quando o audit recomendar outras skills do impeccable (polish, distill, harden, etc.), **siga a recomendação**: invoque-as, depois audite de novo.

**2. `ponytail-review`** — código morto, abstração desnecessária, dependência redundante. Saída: zero apontamentos. `delete` de algo ainda não usado mas possivelmente de ticket planejado: pergunte.

**3. `code-review-spec`** — roda direto aqui (ele já dispara os revisores Standards e Spec em paralelo; os padrões são `docs/arquitetura.md` e `docs/testes.md`). Descarte do relatório o que já está no ledger. Corrija, registre e rode de novo. Saída: zero apontamentos novos.

**4. `retro`** — retrospectiva do processo e dos guardrails (lint, checks, docs, skills). Apresente os candidatos; aplique os que o usuário aprovar, registre e rode de novo. Saída: nenhuma pendência estrutural nova.

## Fim

Reporte: nota final do audit, rodadas por etapa, commits gerados (hash e mensagem), decisões que o usuário tomou, o que parou no teto. **Nunca `git push`** sem ordem explícita (um hook também pede confirmação). Próximo passo: se o grupo tem UI, `/roteiro-teste-local` (teste manual, antes de subir a PR); depois é do usuário: push e PR.
