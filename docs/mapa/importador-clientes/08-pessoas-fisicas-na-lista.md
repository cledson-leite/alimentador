# 08 Pessoas físicas na lista (6 CPFs)

Tipo: `wayfinder:grilling` (HITL) · Estado: **fechado** · Bloqueado por: —

## Question

As 6 linhas da lista de empresas que são pessoas físicas entram na carga? Se sim, como, já que `clientes.cnpj` guarda CNPJ?

## Contexto

- Linhas: `FERNANDO HERIQUE ALVES`, `JOÃO BATISTA LOURENÇO`, `JULIANA PREISNER COLLETE MARTINI`, `MARINA ESTEVES SANTOS - SÃO PAULO` (CPF), `MARINA ESTEVES SANTOS - SOUZA NAVES` (sem documento) e `RODRIGO GONÇALVES RIBEIRO`. Nenhuma tem arquivos baixados ([03](03-baixar-a-pasta-do-drive.md)).
- O schema e a RPC `criar_cliente` vivem em `Desktop\Rigoni-contabil\supabase\migrations`; mudar a coluna ou aceitar CPF seria mudança lá, fora deste repo.
- Opções a avaliar: (a) ficam fora, vão para um CSV próprio; (b) entram em `falhas.csv` com motivo; (c) entram com CPF, exigindo mudança no Rigoni-contabil.

## Resolução

**Decisão do usuário: ficam fora, em CSV próprio.** As 6 linhas de pessoa física (CPF ou sem documento) não são carregadas e saem em `pessoas-fisicas.csv` (nome e documento da lista, sem tentar casar pasta), para decisão futura. Sem mudança no schema do Rigoni-contabil e fora de `falhas.csv`, que fica só para empresas que deveriam carregar.
