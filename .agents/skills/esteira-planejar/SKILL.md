---
name: esteira-planejar
description: Estação 2 da esteira de desenvolvimento — fatia a spec em tickets verticais (to-tickets) já separados em backend e frontend onde a fatia cruza as duas, triageia (triage) e marca a frente de cada um (frente:frontend ou frente:backend). Uso — /esteira-planejar <nº da spec>.
argument-hint: <spec>
disable-model-invocation: true
---

Argumento: `$ARGUMENTS` = nº da issue da spec. Sem ele, pergunte e pare. Interativa: roda no contexto principal.

## 1. Tickets

Leia a spec (`gh issue view`) e chame a Skill `to-tickets`, com a regra de corte abaixo.

**Corte: vertical por fatia, separado por frente.** Primeiro identifique as fatias verticais (comportamento entregável de ponta a ponta, atômico, com grafo de bloqueio). Depois, **cada fatia que toca as duas frentes vira um par de tickets**:

- **backend** da fatia: schema/migrations, RLS, `domain`, `application`, `infra` e Server Actions, com testes unitários (portas falsas) e de RLS/integração. Verificável sem UI. Documenta no PR o contrato das Server Actions.
- **frontend** da fatia: telas, componentes, estado e integração com as Server Actions do backend par, com testes de componente (RTL) e o E2E Playwright do fluxo principal. **Bloqueado pelo backend par** e pelo frontend das fatias das quais a tela depende.

Regras:
- Fatia que toca só uma frente (ex.: anonimização de dados sem tela, runbook de backup) vira **um** ticket, só daquela frente. Não invente o par vazio.
- O corpo de cada ticket cita o ticket par (`#<nº>`) e a fatia de origem, para o par não se perder.
- Bloqueios: backend bloqueado pelo backend das dependências; frontend bloqueado pelo backend par e pelo frontend das dependências. O backend de fatias independentes segue em paralelo.
- Cada ticket continua sendo uma entrega verificável sozinha e cabe em um contexto de implementação.

Mostre o desenho ao usuário (lista numerada com título, frente, bloqueado por e entrega) e só publique após a aprovação, como manda `to-tickets`. Os tickets entram como sub-issues da spec, com bloqueios nativos.

## 2. Triage

Chame a Skill `triage` nos tickets criados e **de fato execute a Skill**: ela é um passo próprio, não um rótulo aplicado de passagem. Garanta que cada ticket termine com exatamente uma categoria (`enhancement` ou `bug`) e um estado, e o brief de agente (AGENT-BRIEF) quando o estado for `ready-for-agent`. Registre prioridade se o projeto usar.

## 3. Frentes (label)

Garanta os rótulos, uma vez: `gh label create "frente:frontend" --force` e `"frente:backend"`.

Cada ticket recebe **exatamente uma** frente, pelo que toca:
- **frontend**: `src/app`, `src/presentation`, `modules/*/presentation` (telas, componentes, estado, integração visual).
- **backend**: `modules/*/{domain,application,infra}`, `src/main`, `supabase/` (API, regras, banco, serviços).

Não existe `frente:ambas`: se um ticket cruza as duas, ele deveria ter sido cortado em par no passo 1.

## 4. Saída

Reporte o backlog em tabela: nº, título, frente, ticket par, bloqueado por. **Critério de saída: backlog estruturado, vertical por fatia e segregado por frente, com triage executada.** Indique o próximo passo: `/implementar-issue <nº> [base]` seguindo a ordem do grafo (primeiro os desbloqueados). Não implemente nada aqui.
