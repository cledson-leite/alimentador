# Teste manual

Dois roteiros em PDF (pasta `Downloads`), um antes da PR e outro depois da promoção à homologação. Quem faz o teste é o usuário; as skills só entregam o roteiro. Nenhuma edita código, commita ou faz push.

| # | Comando | Quando | Para quem | Condição |
|---|---|---|---|---|
| 1 | `/roteiro-teste-local [base]` | depois do `/gate-qualidade`, **logo antes de subir a PR** | quem desenvolve; técnico, `yarn dev` | o grupo de issues da PR tem UI; sem UI, dispensa |
| 2 | `/roteiro-teste-homolog <PR de promoção>` | depois da promoção à `homolog`, com o **E2E Preview verde** | testers e apresentação; **sem jargão** | há novidade visível na promoção |

## 1. Local (antes da PR)
- **Preparo completo:** `git switch`, `yarn install`, `npx supabase start`, **`npx supabase db reset`**, linhas do `.env.local` com os modos `falso`/`mock`, `yarn mock:api` se preciso, `yarn dev` em `http://localhost:8800`.
- **Logins** do `seed.sql` que o teste usa; **dados exatos** de cada cadastro (documentos gerados e validados, valores, conteúdo e comando de cada arquivo); **SQLs e `curl`** que simulam o que vem de fora (webhooks de terceiros, jobs, tempo).
- **Passos** em tabela `# | Passo | Resultado esperado | OK | Obs.` por critério de aceitação: feliz, borda e o que não pode acontecer.

## 2. Homologação (preview)
- Mesmos critérios, adaptados: sem `db reset` nem comando; endereço do preview; aviso de que o banco volta ao inicial a cada atualização; o que não é testável lá (SQL, jobs desligados) dito claramente.
- Linguagem de quem usa o sistema, com o benefício de cada novidade e um **roteiro de apresentação** (ordem das telas e o que dizer). Modelo: o guia de teste manual da homologação que já existe em `Downloads`.

## Peças
- Agente `levantador-de-roteiro` (só lê): levanta telas, papéis, campos válidos e inválidos, gatilhos externos, SQLs e critérios de aceitação a partir do diff e das issues.
- `.claude/scripts/gerar_pdf.py`: ganhou blocos de código, listas numeradas, tabelas de roteiro (colunas `#`, `OK` e `Obs.` com largura fixa) e `--rotulo`.

## Regras
- **Nenhum placeholder** (`<documento>`, "um arquivo qualquer"): o roteiro é conferido contra o seed, as rotas e as migrations antes de ser entregue.
- Sem UI no grupo ou na promoção, o roteiro não é gerado.
