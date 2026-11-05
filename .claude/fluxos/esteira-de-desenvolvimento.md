# Esteira de desenvolvimento

Do ideia crua ao código revisado e commitado. **Nunca faz push**: um hook (`hooks/pedir-push.mjs`) pede confirmação a cada `git push`.

Cada estação é uma skill de entrada manual. O que passa de uma para a outra são **artefatos** (issues no GitHub, ledger em arquivo), não contexto: dá para dar `/clear` entre estações.

| # | Comando | O que faz | Skills usadas | Critério de saída |
|---|---|---|---|---|
| 1 | `/esteira-refinar <descrição>` | mapa de decisões, arquitetura da região, spec, PRODUCT.md | `wayfinder`, `grilling`, `setup-matt-pocock-skills`, `improve-codebase-architecture`, `to-spec`, `impeccable init` | spec aprovada pelo usuário |
| 2 | `/esteira-planejar <spec>` | tickets verticais cortados em par backend/frontend, triage, label de frente | `to-tickets`, `triage` | backlog com `frente:frontend` ou `frente:backend` (um por ticket) e triage executada |
| 3 | `/implementar-issue <n> [base]` | branch empilhada, TDD, commits | `implement` (`tdd`), `diagnosing-bugs` | commitado, `tsc`, lint e testes verdes |
| 4 | `/gate-qualidade [base]` | laço de revisão sobre o diff | `impeccable audit`, `ponytail-review`, `code-review-spec`, `retro` | zero apontamentos novos em cada etapa |

**Antes de subir a PR:** se o grupo de issues tem UI, `/roteiro-teste-local` gera o roteiro de teste manual em PDF (ver `teste-manual.md`). Sem UI, dispensa.

## Decisões
- **Branch por ticket, empilhada** (sem branch de integração nem `implement-spec`).
- **Fatia vertical = par de tickets**: cada fatia que cruza as duas frentes vira um ticket de backend e outro de frontend (o frontend bloqueado pelo backend par). Fatia de uma frente só vira um ticket. Frente = label, sem `frente:ambas`.
- **`/wizard` fora**: gera script bash para passo humano; a extração de regras é do `wayfinder` com `grilling`.
- **Impeccable no gate**: `audit` primeiro; quando ele recomenda outras skills do impeccable, o gate as executa. `impeccable-full` não participa.
- **Skills que viraram chamáveis por skill** (sem `disable-model-invocation`): `wayfinder`, `to-spec`, `to-tickets`, `triage`, `improve-codebase-architecture`, `setup-matt-pocock-skills`, `implement`, `retro` e, desde o fluxo 4, o próprio `gate-qualidade` (o `/auditar-release` o chama). `esteira-refinar`, `esteira-planejar` e `implementar-issue` continuam manuais.
- **`implement` não roda `code-review-spec`**: a revisão é só da estação 4.

## Gate de qualidade
- Laço por etapa: `auditor-de-qualidade` (subagent, só lê) devolve apontamentos novos, a skill corrige ou pergunta ao usuário, registra no ledger e roda de novo. **Teto: 5 rodadas por etapa.**
- Ledger: `.claude/state/<branch>/ledger.md` (fora do git). Evita repetir apontamento e dispensa levar o histórico no contexto.
- Um commit por etapa que mudou arquivo, só com arquivos tocados pelo gate.
- Subagent só no `impeccable audit` e no `ponytail-review` (leitura pesada, saída pequena). `code-review-spec` já paraleliza sozinho; `retro` conversa com o usuário.

## Fora desta esteira
`/revisar-pr` e `/aprovar-pr` (depois do push e da PR), auditoria de PR e auditoria da `develop`: são outros fluxos.
