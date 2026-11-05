---
name: revisar-pr
description: Trata a devolutiva técnica (PDF) de uma PR, venha de quem vier — extrai os apontamentos, confere cada um contra o código e os 3 critérios do projeto, corrige os que não precisam de decisão humana, pede permissão para o push e, confirmado, publica, comenta na PR e gera o PDF de resposta. Uso — /revisar-pr <caminho-do-PDF> [pr]
argument-hint: <pdf> [pr]
disable-model-invocation: true
---

Argumentos: `$ARGUMENTS` → 1º token = caminho do PDF da devolutiva; 2º (opcional) = número da PR (senão, o do título/cabeçalho do PDF, confirmado com `gh pr view`). Sem PDF, pergunte e pare. A skill não sabe nem precisa saber quem revisou (o processo ou um revisor externo): só lê os apontamentos, resolve, commita, publica, comenta e responde. Nunca faz merge nem fecha issue (isso é do `/aprovar-pr`).

## 1. Ler a devolutiva

1. Extraia o texto: `python -I -X utf8 -c "import pymupdf; [print(p.get_text()) for p in pymupdf.open(r'<pdf>')]"` (o `Read` de PDF falha aqui, sem poppler; se `pymupdf` faltar, `pypdf`). Para ver o layout, renderize uma página para PNG e abra com `Read`.
2. Liste os apontamentos (os IDs como vierem, ex.: `P0-1`, `200-F1`, `G`, `O`), o **SHA revisado**, a base/dependências, a rodada (devolutiva ou revalidação, pelo título do PDF) e o que o revisor diz **não ter verificado**.
3. `gh pr view <n> --json headRefOid,state,baseRefName,headRefName,statusCheckRollup`. Se o head atual ≠ SHA revisado, saiba por quê (rebase? commits novos?) antes de seguir.
4. Esteja na branch da PR: `git status --porcelain` com alteração em arquivo **rastreado** → pare e avise (untracked pode ficar); depois `git switch <headRefName>`.

## 2. Triar cada apontamento (individualmente, sem aplicar nada ainda)

Confira a alegação no código **do SHA revisado** (`git show <sha>:<arquivo>`), não pelo relatório: pode estar certa, errada ou parcial. Até 3 apontamentos, confira você mesmo. Com 4 ou mais, use o subagent `auditor-de-qualidade` na etapa `verificar-apontamento`, **em paralelo** (um por apontamento ou por arquivo): ele só lê e devolve `ID | veredito | evidência arquivo:linha | correção proposta | regra documentada`, o que poupa o contexto principal. A decisão fica com você. Depois, contra os 3 critérios:

1. Conflita com regra documentada (`docs/arquitetura.md`, `testes.md`, Anexos)? Violação **documentada** é obrigatória; só smell sem regra escrita é julgamento.
2. Conflita com decisão já tomada (ADRs em `docs/adr/`, `CONTEXT.md`, memória, comentários da PR/issue)?
3. Faz sentido no estágio atual? Se não, a saída mais barata e rastreável é adiamento formal (issue/comentário), não construir sem objeto.

"Fora do diff" **não** descarta achado real. Cada achado entra em uma de três classes:

- **Resolver** — passa nos critérios e a correção é inequívoca.
- **Decisão humana** — conflito com regra/decisão, escolha de produto, custo/plano, aceite operacional (ex.: cadência do cron), ou ambiente que só o usuário conhece (migration já aplicada onde?).
- **Informativo** — verde/limite do revisor, sem ação.

Se houver **qualquer** item de decisão humana: apresente a triagem por item (o que vai, o que não vai, por quê) com sua recomendação, faça **só as perguntas necessárias** e espere. Os itens "resolver" podem seguir em paralelo se forem independentes dos que aguardam decisão. Se **nenhum** item exigir decisão, vá direto ao passo 3 sem pedir confirmação.

## 3. Corrigir

- Para bug: teste que **falhe no SHA revisado** e passe depois (provar rodando contra a versão antiga). Para concorrência, duas conexões reais (`pg`) num teste de integração.
- Corrija o **princípio**, não só o exemplo citado: `grep` da classe do problema no repo todo e em arquivos irmãos; releia o `git diff` das próprias edições de texto.
- Preserve os controles existentes; nunca enfraqueça, exclua ou pule teste, nem use retry para ficar verde.
- Migration já na `develop` nunca é editada; migration nova da própria PR com timestamp antes de uma da `develop` é renomeada para depois (e atualize referências).
- Valide antes de commitar: `npx tsc --noEmit`, `npx eslint` e `npx prettier --check` nos arquivos tocados, testes unitários afetados e, para banco, `npx supabase db reset` + `npx jest --selectProjects integration --runInBand <caminho em src/>` (sempre com caminho em `src/`: sem ele o Jest pega cópias do código em worktrees). Se o Supabase local estiver parado, `npx supabase start`.
- Commits pequenos, por apontamento, com `(#issue, PR #n <ID>)` no título e o trailer `Co-Authored-By` exigido pelo ambiente. Confira `git diff --cached --name-only` antes de cada commit: só entram arquivos que você tocou.

## 4. Pedir permissão para o push

Use `AskUserQuestion` (uma pergunta): resumo do que foi corrigido, o que ficou de fora e **se o push precisa de force** (branch rebaseada/histórico reescrito → `--force-with-lease` com o SHA remoto esperado, nos dois remotes). Sem "sim", não publique, não comente, não gere PDF final. Nunca ofereça push antes de ter corrigido e validado. O hook `pedir-push.mjs` ainda pede confirmação no próprio comando.

## 5. Publicar (só após o "sim")

1. `git fetch origin`; compare com o remoto. Fast-forward → `git push origin <branch>`; divergente por rebase conhecido → `git push --force-with-lease=<branch>:<sha-remoto-esperado> origin <branch>`; qualquer outra divergência → pare e relate.
2. Confirme `gh pr view <n> --json headRefOid,commits`.
3. **Escreva a resposta uma vez só**, em markdown (arquivo temporário), e use o mesmo arquivo no comentário e no PDF. Estrutura: título `## Devolutiva <k> — resposta (head <sha-antigo> → <sha-novo>)`; parágrafo de síntese; `## Resumo da resposta` (tabela Item · Classificação · Decisão); uma `## <ID> • <título>` por apontamento (o que mudou com `arquivo:linha`/SHA, evidência; tabelas para sequências, `> nota` para limites); `## Validação` (o que rodou e o que não); **Limite:** do que não foi coberto/verificado; `## Antes de produção` quando houver. Honesto: o que não foi executado (CI recém-disparado, QA, ambiente remoto) é dito como tal.
4. Comente na PR: `gh pr comment <n> --body-file <md>`.
5. Gere o PDF no modelo da devolutiva recebida:
   `python -I .agents/scripts/gerar_pdf.py <md> "<Downloads>/Resposta_Devolutiva_PR<n>_<projeto>.pdf" --pr <n> --titulo "Resposta à devolutiva <k>" --subtitulo "<título da PR> • head <sha>" --status "<ex.: P0-1 E P1-2 CORRIGIDOS; P2-1 ADIADO>" --tipo "resposta técnica"`
   Nome `Resposta_Revalidacao<k>_PR<n>…` quando a rodada for revalidação. Renderize a 1ª página para PNG e confira com `Read`. O PDF fica em `Downloads`, como nas rodadas anteriores.
6. Confira o CI do novo head (`gh pr checks <n>`); se ainda pendente, diga isso — não declare verde.

## 6. Fechamento

Reporte em poucas linhas: SHAs, link do comentário, caminho do PDF, o que **não** foi conferido. Grave memória `project_pr<n>_devolutiva<k>.md` e **acrescente** a linha no topo de `MEMORY.md` (leia o arquivo inteiro e prependa, nunca sobrescreva). Nunca feche issue aqui (só no merge — ver `/aprovar-pr`).
