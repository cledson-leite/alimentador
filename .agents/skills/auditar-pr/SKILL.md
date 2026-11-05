---
name: auditar-pr
description: Revisão profunda de uma Pull Request, só leitura — confere o CI, audita o diff real da PR (impeccable audit, ponytail-review, code-review-spec, diagnosing-bugs) e entrega um relatório em PDF com apontamentos P0/P1/P2 e o parecer. Não altera código, não faz merge nem push. O relatório é sempre comentado na PR, inclusive em caso de aprovação. Uso — /auditar-pr <nº da PR>.
argument-hint: <pr>
disable-model-invocation: true
---

Argumento: `$ARGUMENTS` = nº da PR (sem ele, rode `gh pr list` e pergunte). **Etapa estritamente analítica:** nenhum arquivo do repositório é editado; o CI do GitHub já cobre lint, tipos, build e testes pesados, aqui se audita a qualidade do diff.

## Fase 1: contexto, CI e diff

1. `gh pr view <n> --json title,body,state,baseRefName,headRefName,headRefOid,commits,closingIssuesReferences,statusCheckRollup` e `gh pr checks <n>`.
2. **CI vermelho:** pare a auditoria de código. Leia o log da falha (`gh run view <id> --log-failed`), chame `diagnosing-bugs` para isolar a causa e vá direto à Fase 3 com isso como **P0**. **CI pendente:** siga e registre "CI pendente" no parecer (não declare verde). **CI verde:** siga.
3. Worktree descartável no head da PR (não use `gh pr checkout`: o working tree do usuário pode estar sujo):
   ```bash
   git fetch origin pull/<n>/head && SHA=$(git rev-parse FETCH_HEAD)
   git fetch origin <baseRefName> && MB=$(git merge-base origin/<baseRefName> $SHA)
   D=$(mktemp -d)/pr-<n> && git worktree add --detach "$D" $SHA
   ```
4. O diff é `git diff $MB..$SHA`, contra a **base real da PR** (pode ser outra branch da pilha, não só `develop`). Para cobrir as branches e commits que compõem a PR: `git log --format='%h %s' $MB..$SHA` e, por commit, `git branch -r --contains <sha>` (branches de origem). Anote quais commits vêm de outra branch da pilha: o relatório atribui cada achado ao commit/branch.
5. Issues da PR (`closingIssuesReferences` e `Closes|Refs #n` do corpo): são a "spec" para a Fase 2.
6. **Ledger do histórico da PR** (antes de auditar): `gh pr view <n> --json comments` e releia os comentários anteriores (relatórios de revisão e devolutivas de resposta). Monte `L=$(mktemp)` no formato `ID | etapa | resumo | status | commit`, com **todo apontamento já tratado**: `resolvido`, `mantido` (decisão de não mudar), `adiado` (ticket) ou `recusado`. Só entra o que ainda está **sem resposta**. O código a auditar é sempre o do head atual (`$SHA`): um item `resolvido` só volta se o head ainda o mostra quebrado, e então cite o commit da devolutiva.

## Fase 2: auditorias (sequência rigorosa, só leitura)

Rode nesta ordem. Toda chamada ao subagent `auditor-de-qualidade` (Agent tool) leva: etapa, **base** (`$MB`), **raiz** (`$D`) e **ledger** (`$L`, do passo 6; `nenhum` só na primeira revisão da PR). Ele devolve só a tabela de apontamentos novos.

1. **UI/UX**, só se o diff tem `*.tsx`, `*.css` ou `DESIGN.md`: etapa `impeccable-audit`. Registre todo desvio que impeça 20/20 (acessibilidade, design system, estados de erro, responsividade).
2. **Enxugamento:** etapa `ponytail-review` (código morto, abstração desnecessária, dependência redundante).
3. **Padrões e spec:** chame `code-review-spec` você mesmo, com `$MB` como ponto fixo, dentro de `$D`, com as issues do passo 5 como spec. Os padrões são `docs/arquitetura.md` e `docs/testes.md` (desacoplamento, tipagem estrita, integridade da arquitetura). Descarte do relatório dele tudo o que consta em `$L`; os revisores internos não recebem o ledger, então **você** filtra.
4. **Lógica e segurança:** etapa `logica-seguranca` do subagent (tratamento de exceção, vazamento de memória/estado, secrets, brechas de segurança, regressão de regra de negócio).

Nenhum apontamento é aplicado. PoC local só se for indispensável para provar um bug complexo, dentro de `$D`.

## Fase 3: relatório e entrega

1. Classifique cada achado:
   - **P0, bloqueante** (parecer ALTERAÇÕES NECESSÁRIAS): CI vermelho, vulnerabilidade, quebra de contrato de API, regressão grave.
   - **P1, qualidade** (REFATORAÇÃO RECOMENDADA): violação de `arquitetura.md`/`testes.md`, apontamento do ponytail, desvio de UI de impacto médio, código redundante.
   - **P2, melhoria** (APROVAR COM OBSERVAÇÕES): estético, nomenclatura, documentação.
2. Escreva o markdown em um arquivo temporário (`mktemp`). Estrutura: parágrafo de síntese; `## Contexto da PR` (tabela: head, base e SHAs, CI, composição por commit/branch, issues); `## Resumo dos apontamentos` (tabela ID · Gravidade · Fase · `arquivo:linha` · resumo; IDs `P0-1`, `P1-1`…); uma `## <ID> • <título>` por apontamento com evidência e sugestão de correção; `## Já decididos antes (não reapontados)` (tabela tema · onde foi tratado, só quando o ledger não é vazio; não conta nos P0/P1/P2); `## Cobertura e limites` (o que foi auditado e o que **não** foi: nada de execução de browser, banco ou ambientes); `## Parecer`.
3. PDF no modelo da casa:
   `python -I .agents/scripts/gerar_pdf.py <md> "<Downloads>/Revisao_PR<n>_<projeto>.pdf" --pr <n> --titulo "Revisão profunda" --subtitulo "<título da PR> • head <sha curto>" --status "<PARECER>" --tipo "revisão profunda"`.
   Renderize a 1ª página e confira com `Read`.
4. `git worktree remove --force "$D"`.
5. **Comente sempre na PR**, qualquer que seja o parecer (inclusive aprovação): `gh pr comment <n> --body-file <md>`. O comentário é o próprio relatório em markdown, com o parecer no topo e o caminho do PDF só no seu reporte (o PDF não sobe ao GitHub).

Reporte: parecer, contagem P0/P1/P2, caminho do PDF e o que não foi coberto. **Nunca** merge, push, edição de código nem fechamento de issue (o comentário é a única escrita no GitHub): resolver os apontamentos é do usuário (`/revisar-pr` trata a devolutiva depois).
