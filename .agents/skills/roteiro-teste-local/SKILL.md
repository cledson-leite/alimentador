---
name: roteiro-teste-local
description: Gera, em PDF na pasta Downloads, o roteiro completo de teste manual local (yarn dev) de um grupo de issues antes de subir a PR — preparo com db reset, logins do seed, dados concretos a cadastrar, SQLs que simulam ações externas e passos com resultado esperado. Só gera se houver UI no grupo. Uso — /roteiro-teste-local [base].
argument-hint: [base]
disable-model-invocation: true
---

Argumento: `$ARGUMENTS` = base do diff. Sem base: `gh pr view --json baseRefName` se já existe PR; senão `develop` (em branch empilhada, a branch do ticket anterior). Roda **depois do `/gate-qualidade` e antes do push e da PR**. Não edita código, não faz commit nem push.

## 1. O grupo e a UI

1. Issues do grupo: os `#n` das mensagens de `git log <base>..HEAD` (inclua o corpo) e do nome da branch; confirme a lista com o usuário se ficar ambígua.
2. UI no grupo? `git diff --name-only <base>...HEAD` com `*.tsx`, `*.css` ou arquivos de `src/app`/`presentation`. **Sem UI: diga "sem UI neste grupo, teste manual dispensado" e pare.**

## 2. Levantar os fatos

Chame o subagent `levantador-de-roteiro` (modo `local`) com a base e as issues. Ele só lê e devolve telas, papéis, campos com valor válido e inválido, gatilhos e SQLs, e critérios de aceitação. Use o retorno; não releia o que ele já trouxe.

## 3. Escrever o roteiro (markdown temporário)

**Tudo concreto, sem placeholder** (o usuário já reclamou disto): nada de `<documento>`, "um arquivo qualquer" ou "uma data". Seções:

1. **Antes de começar:** branch (`git switch <branch>`), `yarn install`, `npx supabase start`, **`npx supabase db reset`**, as linhas exatas do `.env.local` que este teste exige (modos `falso`/`mock` do `.env.example`, `PORT=8800`, e `CRON_SECRET` se houver job) e, se a integração for mock, `yarn mock:api`. Depois `yarn dev` e o endereço `http://localhost:8800`. Cada comando em bloco de código, na ordem.
2. **Quem vai usar:** tabela só dos logins do `supabase/seed.sql` que o teste usa: e-mail, senha, papel, setor, para que serve.
3. **Dados a cadastrar:** tabela com o valor exato de cada campo de cada cadastro (entidade principal, documentos de identificação gerados e conferidos pela regra do projeto, e-mail, telefone, datas). Arquivos: o conteúdo e o comando que o cria, ou o caminho de um existente (`supabase/arquivos-seed/`, `mock-api/`).
4. **SQLs que simulam ações externas:** cada um com o comando completo (`psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "..."` ou no Studio em `http://127.0.0.1:54323`), os ids reais e o que o SQL representa. Webhook e job: o `curl` completo com o cabeçalho.
5. **Roteiro:** uma tabela por issue, colunas `# | Passo | Resultado esperado | OK | Obs.`, com `[ ]` na coluna OK. Cubra, por critério de aceitação: caminho feliz, borda e **o que não pode acontecer** (papel sem acesso, valor inválido com a mensagem exata). Passo e resultado dizem o texto que aparece na tela.
6. **Voltar ao zero:** `npx supabase db reset`, e o que mais precisa limpar.
7. **Se algo falhar:** onde olhar (terminal do `yarn dev`, console do navegador, `npx supabase status`).

## 4. Conferir antes de entregar

- Todo login existe no `seed.sql`; toda rota existe em `src/app`; todo documento gerado passou na validação do projeto; toda coluna e tabela dos SQLs existe nas migrations.
- Sem placeholder: `grep -nE "<[A-Za-z_-]+>|qualquer|\.\.\.|TODO" <md>` fora dos blocos de código não pode achar nada.

## 5. PDF

`python -I .agents/scripts/gerar_pdf.py <md> "<Downloads>/Roteiro_Teste_Local_<branch-sem-barra>_<projeto>.pdf" --titulo "Roteiro de teste manual" --subtitulo "<branch> • issues #a, #b" --status "TESTE LOCAL ANTES DA PR" --tipo "teste manual local" --rotulo "Teste manual"`. Renderize a 1ª página e confira com `Read`.

Reporte: caminho do PDF, issues cobertas e o que não foi coberto. O teste em si é do usuário.
