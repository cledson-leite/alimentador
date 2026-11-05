# Comandos que você executa, na ordem de uso

Só os comandos que **você** precisa chamar à mão. As demais skills (`wayfinder`, `to-tickets`, `tdd`, `retro`, `impeccable`…) são chamadas por estes e não se usam sozinhas. A definição de cada fluxo está em `.agents/fluxos/`.

## Resumo

| # | Quando | Comando | Argumentos |
|---|---|---|---|
| 0 | Projeto novo, uma vez | `/fullstack-next-bootstrap` | nenhum |
| 1 | Ideia nova de feature | `/esteira-refinar` | `<descrição>` |
| 2 | Spec aprovada | `/esteira-planejar` | `<nº da spec>` |
| 3 | Para cada ticket, na ordem do grafo | `/implementar-issue` | `<issue> [base]` |
| 4 | Ticket (ou grupo) implementado | `/gate-qualidade` | `[base]` |
| 5 | Grupo com UI, antes da PR | `/roteiro-teste-local` | `[base]` |
| 6 | Antes de subir | você: `git push` e abrir a PR | |
| 7 | PR aberta | `/auditar-pr` | `<nº da PR>` |
| 8a | Auditoria aprovou | `/aprovar-pr` | `[nº da PR]` |
| 8b | Auditoria pediu alterações | `/revisar-pr`, depois `/auditar-pr` de novo | `<pdf> [pr]` |
| 9 | `develop` acumulou mudanças para promover | `/auditar-release` | nenhum |
| 10 | Release auditado | você: PR da branch de release, `/aprovar-pr`, PR `develop`→`homolog` | |
| 11 | Promoção feita e E2E Preview verde | `/roteiro-teste-homolog` | `<nº da PR de promoção>` |
| M | Depois de mudar algo em `.claude/` | `node .agents/scripts/sincronizar-agents.mjs` | `[--verificar]` |

Regra geral: nenhum comando faz `git push`, merge sem ordem sua, nem deploy. O hook `pedir-push.mjs` pede a sua confirmação em todo `git push`. Quem aprova o merge é só o `/aprovar-pr`.

---

## 0. `/fullstack-next-bootstrap`

- **Para quê:** criar um projeto Next.js deste time do zero, já com pastas, lint, camadas, testes, `env.ts`, Supabase, design system, CI e Graphify.
- **Quando:** uma vez, num projeto novo e vazio. Não use num projeto que já existe (para uma parte isolada, chame a skill daquela etapa).
- **Como:** sem argumentos, na raiz do projeto. Ele roda 8 etapas, confere cada uma e tenta até 3 vezes antes de seguir.
- **Saída:** projeto montado e um relatório com o que passou e o que ficou vermelho.
- **Você faz depois:** criar os secrets do GitHub e da Vercel e o projeto Supabase de homologação (ele lista).

## 1. `/esteira-refinar <descrição>`

- **Para quê:** transformar uma ideia crua em decisões fechadas e numa spec.
- **Quando:** no começo de uma feature ou sistema.
- **Como:** passe a ideia em texto livre. É interativo: o comando faz perguntas e você responde. Lê `docs/arquitetura.md`, `docs/testes.md` e `CONTEXT.md` sozinho.
- **Saída:** um mapa de decisões e uma issue de spec (`ready-for-agent`), mais o `PRODUCT.md` atualizado.
- **Próximo:** aprovar a spec e rodar `/esteira-planejar`. Não gera tickets nem código.

## 2. `/esteira-planejar <nº da spec>`

- **Para quê:** fatiar a spec em tickets e marcar a frente de cada um.
- **Quando:** com a spec aprovada.
- **Como:** o número da issue da spec. Corta a spec em fatias verticais e separa cada fatia em um ticket de backend e outro de frontend (o frontend bloqueado pelo backend par), faz o triage e coloca o rótulo `frente:frontend` ou `frente:backend`.
- **Saída:** a tabela do backlog com frente e dependências. Use a ordem das dependências no próximo passo.

## 3. `/implementar-issue <issue> [base]`

- **Para quê:** implementar um ticket numa branch própria, com TDD, deixando commitado.
- **Quando:** um ticket por vez, primeiro os que não dependem de ninguém.
- **Como:** `<issue>` é `#123` ou `123`. `[base]` é o nº de outra issue ou o nome de uma branch (ticket que depende de outro fica **empilhado** sobre a branch dele); sem base, parte da `develop`. Cria `feature/<título>` (`fix/` se for bug). Para se houver alteração não commitada em arquivo rastreado.
- **Saída:** a branch commitada, com `tsc`, lint e testes verdes. **Não faz push nem abre PR.**

## 4. `/gate-qualidade [base]`

- **Para quê:** revisar o que foi feito até não restar apontamento: `impeccable audit` (20/20, só se houver UI), `ponytail-review`, `code-review-spec` e `retro`.
- **Quando:** depois de implementar, antes de qualquer teste manual ou PR.
- **Como:** `[base]` é a base do diff. Sem ela usa a base da PR, ou a `develop`; numa branch empilhada, passe a branch do ticket anterior. Corrige o que é mecânico e **pergunta** o que exige decisão. Até 5 rodadas por etapa. Guarda o histórico em `.agents/state/` para nunca repetir um apontamento.
- **Saída:** commits por etapa e um relatório. Para se houver alteração não commitada.

## 5. `/roteiro-teste-local [base]`

- **Para quê:** gerar o roteiro completo do teste manual local, que você executa antes de subir a PR.
- **Quando:** quando o grupo de issues da PR tem UI. Sem UI, o comando avisa e para.
- **Como:** `[base]` como no gate. Ele lê o diff e as issues e entrega um PDF em `Downloads` com: `git switch`, `yarn install`, `npx supabase start`, `npx supabase db reset`, o `.env.local`, `yarn dev`, os logins do seed, os dados exatos a cadastrar (documentos válidos, arquivos), os SQLs e `curl` que simulam o que vem de fora, os passos com resultado esperado e como voltar ao zero.
- **Você faz:** o teste. Falhou algo, volte ao passo 3 ou 4.

## 6. Você: `git push` e abrir a PR

Reúna o grupo de issues numa PR. O push pede a sua confirmação (hook). Nenhuma skill faz isto por você.

## 7. `/auditar-pr <nº da PR>`

- **Para quê:** auditoria profunda e **só de leitura** da PR.
- **Quando:** com a PR aberta.
- **Como:** o número da PR. Confere o CI (vermelho vira bloqueio P0), audita o diff contra a **base real da PR** e as branches e commits que a compõem (UI, enxugamento, padrões e spec, lógica e segurança) num `git worktree` descartável, sem mexer no seu working tree.
- **Saída:** PDF em `Downloads` com apontamentos P0, P1 e P2 e o parecer, e o **mesmo relatório comentado na PR, sempre, inclusive se aprovar**. Não edita, não faz merge nem push.

## 8a. `/aprovar-pr [nº da PR]`

- **Para quê:** mergear a PR aprovada e arrumar a pilha de branches que dependiam dela.
- **Quando:** a PR já foi aprovada, por quem for, e o **CI está todo verde** (pendente ou falho bloqueia). Só funciona com base `develop`.
- **Como:** sem número, usa a PR da branch atual. Faz squash-merge na `develop`, fecha as issues `Closes`, atualiza a `develop` local, rebaseia as branches empilhadas e publica **só as que têm PR aberta**, num único `git push` com um lease por branch. Invocar este comando é a sua ordem de mergear.
- **Saída:** tabela branch, tip antigo e novo, publicada ou local. Apaga os backups das branches já mergeadas.

## 8b. `/revisar-pr <pdf> [pr]`

- **Para quê:** tratar os apontamentos de uma devolutiva: conferir cada um, corrigir, publicar e responder.
- **Quando:** a auditoria pediu alterações, ou veio um PDF de qualquer revisor.
- **Como:** `<pdf>` é o caminho do PDF de apontamentos; `[pr]` é o nº da PR, se o PDF não o trouxer. A skill não sabe quem revisou. Confere cada apontamento no código do SHA revisado, corrige só o que não exige decisão sua, **pergunta antes do push** e, confirmado, faz o push, comenta na PR e gera o PDF de resposta em `Downloads`.
- **Próximo:** rodar `/auditar-pr <nº>` de novo. Aprovou, vá para 8a.

## 9. `/auditar-release`

- **Para quê:** auditar a `develop` como release candidate antes de promover à homologação.
- **Quando:** a `develop` acumulou mudanças a promover. Se a `homolog` já está igual, ele diz "nada a promover".
- **Como:** sem argumentos, com o working tree limpo. Sincroniza a `develop`, confere o CI do commit exato, consolida migrations e seeds, aplica a regra de Clean Code nos comentários, confere cada issue do ciclo contra o diff, procura segredos e variáveis faltando e roda o `/gate-qualidade`.
- **Você faz no meio:** ele mostra o SQL `select version from supabase_migrations.schema_migrations order by version;`. Rode-o no SQL Editor do **projeto de produção** e cole o resultado. Sem isso ele **não consolida nenhuma migration**. As que a produção já aplicou ficam congeladas.
- **Saída:** branch `release/auditoria-<data>` com as correções e um PDF de prontidão em `Downloads`: **PRONTA PARA HOMOLOGAÇÃO** ou **BLOQUEADA**. Não faz push nem deploy.

## 10. Você: levar o release até a homologação

1. Push da branch `release/auditoria-<data>` e PR para a `develop`.
2. `/aprovar-pr` nessa PR.
3. Abra a PR `develop` → `homolog` e faça o merge como **merge commit** (não squash). O E2E Preview roda sozinho contra o preview.

## 11. `/roteiro-teste-homolog <nº da PR de promoção>`

- **Para quê:** o guia de teste e de apresentação, em linguagem não técnica, para rodar no preview.
- **Quando:** depois da promoção, com o **E2E Preview verde** e alguma novidade visível. Sem as duas condições, ele para.
- **Como:** o número da PR `develop` → `homolog`. Entrega um PDF em `Downloads` com o endereço, os logins, o que há de novo, os passos com resultado esperado, o que não pode acontecer, um roteiro de apresentação e o que não testar na homologação.

## M. Manutenção: `node .agents/scripts/sincronizar-agents.mjs [--verificar]`

- **Para quê:** manter `.agents/` como cópia isolada de `.claude/`, para outro LLM executar os mesmos fluxos.
- **Quando:** sempre que mudar algo em `.agents/skills`, `agents`, `scripts`, `fluxos` ou `hooks`, e este arquivo.
- **Como:** sem argumento copia e reescreve os caminhos para `.agents/...`. Com `--verificar` só diz se está defasado (código de saída 1).
