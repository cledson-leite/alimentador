---
name: roteiro-teste-homolog
description: Gera, em PDF na pasta Downloads, o roteiro de teste manual e de apresentação do que foi promovido à homologação, em linguagem não técnica, para rodar no preview da Vercel — mesmos critérios do teste local, adaptados ao preview. Só depois do E2E Preview verde, e só se houver novidade visível. Uso — /roteiro-teste-homolog <nº da PR de promoção develop→homolog>.
argument-hint: <pr-de-promoção>
disable-model-invocation: true
---

Argumento: `$ARGUMENTS` = nº da PR que promoveu a `develop` para a `homolog` (sem ele, `gh pr list --state merged --base homolog --limit 3` e pergunte). Não edita código, não faz commit nem push.

## 1. Pré-condições

1. `gh pr view <n> --json state,baseRefName,mergeCommit`: `MERGED` e base `homolog`. Senão, pare.
2. O E2E Preview daquele merge precisa estar verde: `gh run list --workflow e2e-preview.yml --branch homolog --limit 5 --json conclusion,headSha,status`, com o `headSha` do merge. Pendente ou falho → pare e diga isso.
3. O que foi promovido: `git show -s --format=%P <merge>` dá `p1` (a homologação antes) e `p2` (a develop). As PRs e issues são os `(#n)` de `git log p1..p2` e os `closingIssuesReferences` delas.
4. Só entram as **novidades visíveis** (diff com `*.tsx`, `*.css` ou `src/app`). Nenhuma → diga "sem novidade visível nesta promoção" e pare.

## 2. Endereço e dados do ambiente

- URL: `gh api repos/{owner}/{repo}/deployments?sha=<merge>` e o `environment_url` do último status `success`. O endereço fixo da branch (alias `<projeto>-git-homolog-…vercel.app`) pode vir do guia anterior; confirme com o usuário se mudou. O preview pode pedir o login da Vercel.
- A homologação **volta ao estado inicial a cada atualização** (o E2E Preview reseta o banco): o que se cadastra à mão some, e contas e dados de exemplo do seed voltam sozinhos. Diga isso no guia.
- Dados de exemplo e de integrações de teste: leia `supabase/seed.sql` e os scripts de seed do projeto.

## 3. Levantar os fatos

Subagent `levantador-de-roteiro` em modo `homolog` com `p1..p2` e as issues visíveis. Ele devolve telas, papéis, campos com valor válido e inválido, critérios de aceitação, o que está desligado na homologação e o benefício de cada novidade em linguagem simples.

## 4. Escrever o guia (markdown temporário)

Para quem **não é da área técnica** e para **apresentar**: sem comando, sem SQL, sem jargão (nada de RLS, RPC, migration, deploy). **Tudo concreto, sem placeholder**: login e senha do seed, valor exato de cada campo, documento válido conforme a regra do projeto (gerado e conferido, nunca inventado), conteúdo de cada arquivo. Seções:

1. **O que você precisa antes de começar:** endereço, aviso do reinício do banco, o que usar (computador, celular, janela anônima, canal externo de teste só se a novidade envolver esse canal).
2. **Quem já existe:** tabela de logins (e-mail, senha, o que cada pessoa faz) e os clientes de exemplo que o teste usa.
3. **O que há de novo nesta versão:** um parágrafo curto por novidade, escrito pelo benefício para quem usa.
4. **Roteiro por novidade:** tabela `# | Passo (o que fazer) | Resultado esperado | OK | Obs.` com `[ ]` na coluna OK, no texto que aparece na tela. Ação que só dá para fazer com SQL ou job (não disponível aqui) vira "não testável na homologação", dito claramente.
5. **O que NÃO pode acontecer:** acessos que cada papel não deve ter, com o resultado esperado.
6. **Roteiro de apresentação:** a ordem das telas, o que mostrar em cada uma e uma ou duas frases para dizer, em linguagem de cliente.
7. **Se algo não responder** e **o que não testar agora** (o que está desligado na homologação).
8. **Fechamento:** checklist `[ ]` de nenhuma tela de erro, ninguém viu dado de outro setor, textos em português correto, e como anotar falha (horário, usuário e print).

Confira antes de entregar: todo login existe no seed, toda rota existe, todo documento (CPF, CNPJ etc.) válido, `grep -nE "<[A-Za-z_-]+>|qualquer|\.\.\.|TODO" <md>` sem achados.

## 5. PDF

`python -I .agents/scripts/gerar_pdf.py <md> "<Downloads>/Roteiro_Homolog_<aaaammdd>_<projeto>.pdf" --titulo "Guia de teste manual da homologação" --subtitulo "<n> novidades • promoção #<n>" --status "ROTEIRO PARA O PREVIEW" --tipo "teste manual da homologação" --rotulo "Homologação"`. Renderize a 1ª página e confira com `Read`.

Reporte: caminho do PDF, novidades cobertas e o que não é testável na homologação.
