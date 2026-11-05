# Revisão de PR

Três comandos independentes: nenhum sabe quem revisou ou aprovou. O `/revisar-pr` só lê um PDF de apontamentos; o `/aprovar-pr` só sabe que a PR foi aprovada. Quem decide a ordem é o usuário.

| # | Comando | Entrada | Saída |
|---|---|---|---|
| 1 | `/auditar-pr <nº>` | a PR | PDF de apontamentos P0/P1/P2 com o parecer, e o mesmo relatório comentado na PR (sempre, inclusive em aprovação) |
| 2 | `/revisar-pr <pdf> [pr]` | o PDF de devolutiva, de quem for (este fluxo ou revisor externo) | correções commitadas, push (com permissão), comentário na PR e PDF de resposta |

Merge e fechamento de issue não são de nenhum dos dois primeiros: são do `/aprovar-pr`, sempre por ordem do usuário (a invocação é a autorização).

## 1. `/auditar-pr` (auditoria, só leitura)

Não edita código, não faz merge nem push. Único efeito no GitHub: o comentário.

| Fase | O que faz | Como |
|---|---|---|
| 1. Contexto e CI | `gh pr view`/`checks`; CI vermelho interrompe a auditoria de código e vira P0 (`diagnosing-bugs` nos logs); CI pendente segue marcado; diff contra a **base real** da PR; commits e branches de origem | `git worktree` descartável no head (não mexe no working tree) |
| 2. Auditorias, em sequência | `impeccable audit` (se há UI), `ponytail-review`, `code-review-spec`, lógica e segurança (`diagnosing-bugs` como análise do diff) | subagent `auditor-de-qualidade` (só lê) em 3 delas; `code-review-spec` roda na skill |
| 3. Relatório | P0 bloqueante · P1 qualidade · P2 melhoria; PDF em `Downloads` por `.claude/scripts/gerar_pdf.py`; comentário na PR | worktree removido ao final |

## 2. `/revisar-pr` (tratamento da devolutiva)

| Passo | O que faz |
|---|---|
| Ler | extrai os apontamentos do PDF (IDs como vierem), o SHA revisado e o que o revisor não verificou |
| Triar | confere cada alegação no código do SHA revisado e aplica os 3 critérios (regra documentada, decisão já tomada, faz sentido agora); com 4 ou mais apontamentos a verificação vai em paralelo para o `auditor-de-qualidade` (etapa `verificar-apontamento`) |
| Corrigir | só o que não exige decisão humana; teste que falha no SHA revisado e passa depois; um commit por apontamento |
| Publicar | pergunta antes do push (e o hook `pedir-push.mjs` pede de novo no comando); depois comentário e PDF de resposta, escritos a partir de um único markdown |
| Fechar | reporta SHAs, comentário, PDF e o que não foi conferido; grava memória da rodada |

## 3. `/aprovar-pr` (aprovação e merge)

Só faz squash-merge na `develop` (não promove para `homolog`/`main`), fecha as issues `Closes`, atualiza a `develop` local, rebaseia a pilha de branches dependentes e publica só as que têm PR aberta.

| Passo | O que faz |
|---|---|
| Pré-checagens | PR aberta, base `develop`, sem conflito, **CI todo verde** (pendente ou falho = pare), head remoto igual ao local, working tree limpo |
| Mapear | `.claude/scripts/mapear-pilha.mjs` devolve a árvore de dependentes (pai, tips, PRs); guarda um backup de cada em `refs/backup/pre-merge<n>/<branch>` |
| Merge | `gh pr merge --squash`, **sem** `--delete-branch` (o rebase precisa do tip antigo) |
| Issues | fecha só as `Closes`, depois do merge confirmado |
| Rebase | `--onto` em ordem topológica, com checagem de colapso, migrations renomeadas se colidirem, `tsc` nas pontas |
| Limpar | `.claude/scripts/limpar-backups.mjs` apaga os backups cuja branch já tem PR mergeada; os das dependentes ficam até as PRs delas serem mergeadas |
| Publicar | **um único `git push`** com um lease por branch com PR aberta (uma confirmação do hook); branch sem PR fica só local |

## Decisões
- PDF por Python (`gerar_pdf.py`, ReportLab), exceção ao "sem Python" do fluxo original; o script é compartilhado por `/auditar-pr` e `/revisar-pr`.
- `gh pr checkout` não é usado na auditoria: o working tree do usuário pode estar sujo.
- O `/revisar-pr` não depende do `/auditar-pr`: nada de marcador, ledger ou rodada compartilhada.
