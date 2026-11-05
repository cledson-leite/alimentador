# Auditoria da develop (release candidate)

`/auditar-release`: audita o que vai ser promovido da `develop` para a `homolog` (`origin/homolog..develop`) e entrega um PDF de prontidão. Corrige numa branch `release/auditoria-<aaaammdd>`; **não faz push, deploy nem promoção**.

| Fase | O que faz | Como |
|---|---|---|
| 1. Sincronizar | working tree limpo, `develop` em dia, algo a promover, CI da develop verde no tip; branch `release/auditoria-<data>` | `.claude/scripts/classificar-migracoes.mjs`; comandos `git`/`gh`; CI vermelho ou pendente = BLOQUEADA |
| 2. Banco e código limpo | consolida migrations e seeds **só as que a produção ainda não aplicou** (o usuário cola o resultado de `select version from supabase_migrations.schema_migrations`; sem ele, não consolida; as já aplicadas ficam congeladas; **prova** por diff de `db dump` e testes de integração); aplica a regra do Clean Code: o código não precisa de comentário (só ficam os exigidos por ferramenta externa e a exceção rara justificada); comentário que explica vira refatoração (nome, extração) e o que é decisão ou regra vai para um destino (ADR, docs, `.env.example`, constante, teste) antes de sair; nada é apagado em lote exceto o `lixo`; comentários antigos ficam como estão até o fluxo tocar o arquivo | comentários por módulo em subagents paralelos, só leitura |
| 3. Conformidade e ambiente | cada issue fechada no ciclo contra o diff da sua PR; `improve-codebase-architecture` nos módulos tocados (o usuário escolhe); segredos e variáveis | subagents `conformidade` em paralelo; `.claude/scripts/checar-ambiente.mjs` |
| 4. Gate | `impeccable audit`, `ponytail-review`, `code-review-spec`, `retro`, em laço, base `origin/homolog` | skill `gate-qualidade` inteira |
| 5. Relatório | PDF PRONTA PARA HOMOLOGAÇÃO ou BLOQUEADA | `.claude/scripts/gerar_pdf.py` |

BLOQUEADA quando: CI não verde, `FALHA` no ambiente, requisito de issue omitido, P0 sem resolver, ou teto de rodadas estourado no gate.

## Decisões
- Correções em branch + PR (a `develop` não recebe commit direto); o `/aprovar-pr` mergeia.
- Escopo de código e UI é o diff desde a homolog; migrations e comentários são varridos no repo todo.
- Specs e tickets são issues do GitHub (não existe `spec.md`).
- Variáveis da Vercel ficam "não verificadas" (Vercel CLI ausente).
- A promoção `develop`→`homolog` é manual e fica fora deste fluxo. Depois dela, com o E2E Preview verde, `/roteiro-teste-homolog` gera o guia (ver `teste-manual.md`).
