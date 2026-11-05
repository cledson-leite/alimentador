---
name: aprovar-pr
description: Aprova uma PR já revisada — squash-merge na develop, fecha as issues que ela resolve, atualiza a develop local, rebaseia as branches empilhadas/aninhadas e publica (force-with-lease) só as que têm PR aberta. Uso — /aprovar-pr [número-da-PR]; sem número, usa a PR da branch atual.
argument-hint: [pr]
disable-model-invocation: true
---

Argumentos: `$ARGUMENTS` → número da PR (opcional). Sem número: `gh pr view --json number` na branch atual; se não houver PR, pergunte e pare.

A skill só sabe que a PR foi aprovada (por quem for): não verifica nem depende de quem revisou. Invocar esta skill é a ordem explícita do usuário para: mergear a PR, fechar as issues dela, e dar push **apenas** nas branches que já têm PR aberta. Branch sem PR nunca recebe push nem PR (ver memória `feedback-ticket-branch-strategy`). Nunca `reset --hard`, nunca `--force` sem lease, nunca apagar branch.

## 1. Pré-checagens (qualquer falha = pare e relate)

1. `gh pr view <n> --json state,baseRefName,headRefName,headRefOid,mergeable,statusCheckRollup,body,closingIssuesReferences,title`.
2. `state` = OPEN, base = `develop`, `mergeable` ≠ CONFLICTING. Base diferente de `develop`: pare e avise.
3. CI: todos os checks `SUCCESS` ou `SKIPPED`. Pendente ou falho → pare (não mergeie sobre CI não conferido).
4. `headRefOid` remoto = `git rev-parse origin/<head>` após `git fetch origin`; se divergir da branch local, pare e avise (há commit não publicado ou publicado por outro).
5. `git status --porcelain` sem alteração em arquivo rastreado.

## 2. Mapear antes de mexer em qualquer coisa

1. **Issues:** as de `closingIssuesReferences` e as citadas no corpo como `Closes|Fecha|Resolves #n`. `Refs #n` **não** fecha. A base não é a branch padrão, então o GitHub não fecha sozinho: o fechamento é manual (passo 5).
2. **Branches dependentes:** `node .claude/scripts/mapear-pilha.mjs <headRefName>` devolve, em ordem topológica, cada branch da árvore com **pai direto**, tip local, tip remoto e PR aberta (o pai é a ancestral com mais commits entre a branch da PR e as outras dependentes; backups ficam de fora). Confira o aviso de "sem pai resolvido", se houver. Inclua também PRs abertas (`gh pr list --state open --json number,headRefName,baseRefName`) cuja base seja a branch da PR e que o script não listou.
3. **Anote tudo de uma vez**, num bloco só: a saída do script já traz os "tips antigos" e o remoto esperado de cada branch com PR. Guarde um backup de cada uma como **ref**, sem poluir `git branch`: `git update-ref refs/backup/pre-merge<n>/<branch> <tip>` (para restaurar: `git branch <nome> refs/backup/pre-merge<n>/<branch>`).
4. Mostre o plano em poucas linhas (merge, issues, árvore de branches com pai e quais terão push) e siga — a invocação já é a autorização.

## 3. Merge e develop local

1. `gh pr merge <n> --squash` com o título da PR. **Sem `--delete-branch`**: apagar a branch fecha as PRs filhas que a têm como base e tira o tip antigo de que o rebase precisa.
2. Confirme `gh pr view <n> --json state,mergedAt,mergeCommit` = MERGED.
3. `git fetch origin && git switch develop && git merge --ff-only origin/develop`. O SHA do squash é `mergeCommit.oid`.

## 4. Fechar as issues

Só agora, com o merge confirmado: `gh issue close <n> --comment "Entregue na PR #<pr> (squash <sha curto>) em develop."` para cada issue do passo 2.1. Antes, `gh issue view <n> --json state` (não feche o que já está fechado). Issues `Refs` ficam abertas.

## 5. Rebase da árvore, em ordem topológica (pai antes de filho)

Para cada dependente `F` com pai `P`:

- `git rebase --onto <nova-base> <tip-antigo-de-P> F`
  - `P` = a branch da PR → `nova-base` = `develop`, exclusão = tip antigo da branch da PR.
  - `P` = outra dependente → `nova-base` = `P` já rebaseada, exclusão = tip antigo de `P` (anotado no passo 2.3). **Nunca** o tip antigo de `F`.
- **Depois de cada elo:** `git diff <nova-base> F --stat` não vazio; `git rev-parse` de `F` diferente de `P` e de todas as já rebaseadas. Se colapsou, `git branch -f F <tip-antigo>` e refaça com a exclusão certa.
- Conflito: resolva só se for mecânico e relate o que fez; se envolver decisão de produto/semântica, `git rebase --abort` e pergunte. Nunca descarte o lado de ninguém às cegas.
- **Migrations:** compare timestamps de `supabase/migrations/` entre a develop nova e cada branch. Colisão de versão, ou migration da branch com timestamp anterior a uma já na develop, → renomeie para depois da última (e atualize referências: `grep` do nome antigo em `docs/` e `src/`), como já feito nas #192/#193.
- No fim, rode `npx tsc --noEmit` na ponta de cada cadeia e em pelo menos um elo intermediário que mude assinatura usada por commit de baixo. `git diff --stat` limpo não prova semântica.

## 6. Publicar só quem tem PR aberta

Para cada branch rebaseada com PR aberta:

1. **Um único `git push`** para todas as branches com PR aberta, cada uma com o seu lease: `git push --force-with-lease=<a>:<sha-remoto-esperado-a> --force-with-lease=<b>:<sha-remoto-esperado-b> origin <a> <b>` (os esperados vêm do passo 2.3). Um comando só significa uma confirmação do hook `pedir-push.mjs`, não uma por branch. Se o lease falhar, pare e relate; não repita sem lease.
2. Se a base da PR era a branch mergeada, `gh pr edit <pr> --base develop`.
3. Se a PR tinha `Closes`/`Fecha` de uma issue que acabou de ser tratada, não mexa; só o corpo que o usuário pediu.

Branches sem PR: ficam rebaseadas **só local**. Não ofereça push nem PR.

## 7. Fechamento

1. Tabela final: branch · tip antigo → novo · PR · publicada? (sim/local) · `tsc` ok?
2. Diga o que **não** foi conferido: CI das branches publicadas (recém-disparado), QA manual, ambientes remotos.
3. **Limpe os backups vencidos:** `node .claude/scripts/limpar-backups.mjs` apaga os `refs/backup/` cuja branch já tem PR mergeada (inclui a PR de agora). Os backups das dependentes ficam até as PRs delas serem mergeadas. Backup nunca fica à espera de prazo.
4. Grave uma memória `project_pr<n>_mergeada.md` no formato do índice (SHA do squash, issues fechadas, branches rebaseadas e quais foram publicadas, pendências) e **acrescente** a linha no topo de `MEMORY.md` — leia o arquivo inteiro e prependa, nunca sobrescreva.
