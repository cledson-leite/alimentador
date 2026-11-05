---
name: esteira-refinar
description: Estação 1 da esteira de desenvolvimento — refina uma ideia crua até a spec e o PRODUCT.md (wayfinder, grilling, improve-codebase-architecture, to-spec, impeccable init). Uso — /esteira-refinar <descrição da feature ou sistema>.
argument-hint: <descrição>
disable-model-invocation: true
---

Argumento: `$ARGUMENTS` = a ideia crua. Sem ele, pergunte e pare. É uma etapa **interativa**: roda aqui, no contexto principal, e conversa com o usuário.

## 1. Contexto fixo

Leia `docs/arquitetura.md`, `docs/testes.md` e `CONTEXT.md` (se existir). O usuário nunca precisa apontá-los.

## 2. Mapa (wayfinder)

1. Chame a Skill `wayfinder` com a descrição e o contexto acima, sem número de mapa: entra em "chartear o mapa" e cria a issue `wayfinder:map` com os tickets da fronteira.
2. Enquanto houver ticket de fronteira sem decisão, chame `wayfinder` de novo com o número do mapa. **Um ticket por chamada** (só `research` pode ir em paralelo). Cada ticket é resolvido com `grilling`: as perguntas vão ao usuário.
3. Pare quando a fronteira esvaziar.

## 3. Configuração do repositório

Chame `setup-matt-pocock-skills`: confere `docs/agents/issue-tracker.md`, `domain.md` e os rótulos do triage. Sem isso o `to-spec` não acha os artefatos.

## 4. Arquitetura da região afetada

`docs/arquitetura.md` existe, então chame `improve-codebase-architecture` **limitada à região que o mapa tocou**, para limpar o débito antes do novo desenho. Aplique só o que o usuário aprovar.

## 5. Spec e PRODUCT.md

1. `to-spec`: colapsa as decisões na spec formal (problema, solução, user stories, decisões de implementação e de teste, fora de escopo), publicada como issue `ready-for-agent`.
2. `impeccable init`: grava/atualiza o `PRODUCT.md` aproveitando o contexto ainda fresco.

## 6. Saída

Reporte: nº do mapa e quantos tickets foram resolvidos; nº da spec; confirmação de que `CONTEXT.md`, ADRs e `PRODUCT.md` foram atualizados. **Critério de saída: spec aprovada pelo usuário.** Peça a aprovação e indique o próximo passo: `/esteira-planejar <nº da spec>`.

Não gere tickets nem implemente nada aqui.
