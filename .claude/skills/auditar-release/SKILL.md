---
name: auditar-release
description: Auditoria da develop como release candidate antes de promover à homologação — sincroniza e confere o CI, consolida migrations e seeds, limpa comentários, confere a conformidade com as issues do ciclo, segredos e variáveis de ambiente, roda o gate de qualidade e entrega um PDF de prontidão (PRONTA PARA HOMOLOGAÇÃO ou BLOQUEADA). Corrige em uma branch release/auditoria-<data>; não faz push nem deploy. Uso — /auditar-release.
disable-model-invocation: true
---

Auditoria do que **vai ser promovido**: o diff `origin/homolog..develop`. Só migrations/seeds e comentários são varridos no repositório todo. As correções vão numa branch `release/auditoria-<aaaammdd>` (a `develop` não recebe commit direto). **Nunca `git push`, deploy, nem promoção**: o relatório é a saída; o resto é do usuário.

## 1. Sincronizar e conferir

1. `git status --porcelain` com alteração em arquivo **rastreado** → pare e avise (ex.: uma consolidação de migrations ainda sem commit deve ser commitada ou guardada antes).
2. `git fetch origin && git switch develop && git merge --ff-only origin/develop`.
3. `git log --oneline origin/homolog..develop`. Vazio → "nada a promover", pare.
4. CI da develop: `gh run list --branch develop --workflow ci.yml --limit 1 --json status,conclusion,headSha`. Precisa estar `completed`/`success` **e** com `headSha` = tip da develop. Pendente ou falho → o parecer já é **BLOQUEADA** (falho: `diagnosing-bugs` nos logs); registre e siga só para o relatório.
5. `git switch -c release/auditoria-<aaaammdd>`.

## 2. Banco e código limpo

**2.1 Migrations e seeds.** Só se consolida o que a **produção ainda não aplicou**. O repositório não sabe o que subiu, então a fonte é o banco de produção, por resposta do usuário:

1. Mostre este SQL e peça para rodá-lo no SQL Editor do **projeto de produção** do Supabase e colar o resultado aqui:
   ```sql
   select version from supabase_migrations.schema_migrations order by version;
   ```
2. **Pare e espere a resposta.** Sem ela, não consolide nada e registre "migrations não consolidadas: lista de produção não informada" no relatório (falha fechada).
3. Salve a resposta num arquivo temporário e rode `node .claude/scripts/classificar-migracoes.mjs <arquivo>`. Ele separa: **congeladas** (já em produção: nunca editar nem renomear), **candidatas** (só locais), **renumerar** (candidatas com versão anterior à última de produção) e **divergência** (em produção e ausente do repositório). Divergência → não consolide e relate ao usuário.
4. Consolide **só as candidatas**, no mínimo de arquivos por domínio, com versões **maiores que a última de produção** (renumere as listadas em "renumerar" e atualize referências em `docs/` e `src/`). Mapeie antes de ler inteiro (`grep -n "create table\|alter table\|drop"`).
5. **Prova:** `npx supabase db reset` + `npx supabase db dump --local -f antes.sql` antes; depois da consolidação, de novo (`depois.sql`); o `diff` deve ser vazio (fora ordem e histórico) e `npx jest --selectProjects integration --runInBand` verde. Não passou → desfaça.
6. Seeds: limpe e unifique mantendo os ids fixos que os testes usam. Commit.

**2.2 Comentários (Clean Code).** O código não pode precisar de comentário para ser entendido (`docs/arquitetura.md` §2). **Só ficam:** (a) os exigidos por ferramenta externa (`eslint-disable`, `@ts-expect-error`/`@ts-ignore`, `@jest-environment`, `istanbul ignore`, `prettier-ignore`, cabeçalho de licença); (b) a exceção real, rara, em que o código não consegue se autoexplicar, **justificada**. Todo o resto sai:
- código comentado, comentário que repete nome ou tipo, JSDoc que repete a assinatura: **apague**;
- comentário que **explica o que o código faz ou por quê**: não apague só o texto, **torne o código autoexplicativo** (renomear, extrair função, constante ou tipo com nome que revele a intenção, value object) e então remova o comentário. Refatoração pura, sem mudar comportamento.

**Protocolo (aprendido num piloto que apagou 291 linhas sem refatorar nada e quase perdeu a documentação de segurança e de ambiente):**
1. **Triagem antes de editar.** Subagents `auditor-de-qualidade`, etapa `comentarios`, **em paralelo** por área (`src/modules/<módulo>`, `src/presentation`, `src/shared`, `src/main`, `e2e`, `scripts`, `test-support`, `supabase`), só leem e classificam cada comentário: `ferramenta` (fica), `lixo`, `explica o código` (refatorar) ou `decisão ou regra` (o conhecimento precisa de destino).
2. **Nada de script que apaga em lote o que não é `lixo`.** Só `lixo` (código comentado, repete nome ou tipo, JSDoc que repete a assinatura) se apaga direto.
3. **`explica o código`:** edite o código (renomear não exportado, extrair função, constante ou tipo local) e só então tire o comentário.
4. **`decisão ou regra`:** o conhecimento vai para um destino que exista antes de o comentário sair: ADR em `docs/adr/`, `docs/deploy/`, `.env.example`, `docs/arquitetura.md`, constante ou tipo nomeado, ou um teste que o afirme. Sem destino, o comentário fica como exceção justificada.
5. **Trava mecânica:** arquivo que perde comentário de categoria diferente de `lixo` e não ganha nenhuma mudança em código ou em doc é rejeitado.
6. Aplique **por módulo, um commit por módulo**, e valide cada um com `yarn tsc --noEmit`, `yarn lint`, `yarn format:check` e `yarn test`; se algo quebrar, pare.

**Intocados:** migrations já aplicadas (congeladas), ADRs e docs históricos; só as migrations candidatas entram. Comentários antigos que o fluxo ainda não tratou **ficam como estão**: o fluxo os trata quando cada arquivo for tocado, sem varredura geral forçada. Se uma varredura geral for pedida, é grande (hoje cerca de 3.700 linhas em 650 arquivos).

## 3. Conformidade, arquitetura e ambiente

**3.1 Issues do ciclo.** Os nº das PRs estão em `(#n)` nas mensagens de `origin/homolog..develop`; de cada uma, `closingIssuesReferences`. Subagents `auditor-de-qualidade`, etapa `conformidade`, **em paralelo** (um por issue ou PR), recebem a issue e o diff da PR e devolvem requisito omitido ou escopo não autorizado. Requisito omitido é bloqueio; desvio mecânico você corrige.

**3.2 Arquitetura.** Chame `improve-codebase-architecture` nos módulos tocados pelo diff. Só as candidatas que o usuário escolher são aplicadas.

**3.3 Segredos e ambiente.** `node .claude/scripts/checar-ambiente.mjs origin/homolog`. `FALHA` é bloqueio; `AVISO` vai ao relatório. As variáveis dos ambientes da Vercel ficam "não verificadas".

## 4. Gate de qualidade

Chame a Skill `gate-qualidade` com `origin/homolog` como base: `impeccable audit` (se há UI), `ponytail-review`, `code-review-spec` e `retro`, em laço até zero apontamentos, com commits por etapa.

## 5. Relatório de prontidão

1. Markdown temporário: síntese e status; `## Critérios` (tabela item · resultado: CI, banco, conformidade, segredos e ambiente, gate); `## Banco de dados` (o que foi enxugado e a prova do diff vazio, ou "não consolidado" e o motivo); `## Código e UI` (comentários removidos, conformidade por issue, acoplamento, nota do audit); `## Segredos e ambiente` (saída do script e o que não foi verificado); `## Commits da branch` (hash e mensagem); `## Pendências do usuário`.
2. **BLOQUEADA** se: CI não verde, `FALHA` no ambiente, requisito de issue omitido, apontamento P0 sem resolver ou teto de rodadas estourado no gate. Senão, **PRONTA PARA HOMOLOGAÇÃO**.
3. `python -I .claude/scripts/gerar_pdf.py <md> "<Downloads>/Prontidao_Release_<aaaammdd>_<projeto>.pdf" --titulo "Prontidão do release candidate" --subtitulo "develop • <sha curto>" --status "<PARECER>" --tipo "prontidão do release"`. Renderize a 1ª página e confira com `Read`.

Reporte: parecer, caminho do PDF, branch e commits. Próximo passo do usuário: push da branch, PR para a `develop`, `/aprovar-pr`, e só então a promoção para a `homolog`. Com o E2E Preview verde, `/roteiro-teste-homolog <PR de promoção>` gera o guia de teste e de apresentação.
