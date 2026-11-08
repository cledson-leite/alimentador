# 0001. Teste de integração de ponta a ponta no lugar do E2E de tela

Estado: aceito · Origem: [spec do importador](../specs/importador-clientes.md), ticket 05 do mapa.

## Contexto

O `docs/testes.md` exige um `*.e2e.ts` (Playwright) no mesmo diff do cenário principal. O importador é um CLI: não tem tela, rota nem navegador, então não há o que o Playwright dirigir.

## Decisão

O papel do E2E é coberto por um único seam: o caso de uso `executarImportacao`, exercitado com fixtures sintéticas (nunca documento de cliente) e portas em memória para planilhas, documentos, leitor e cadastro. O adaptador do Supabase tem teste de integração próprio contra o Supabase local do Rigoni-contabil; se ele estiver fora do ar, o teste é pulado com aviso (o `testes.md` permite).

Demais regras do `testes.md` seguem valendo: TDD, nenhum teste de função interna, cobertura de 90% de linhas e 85% de branches.

## Consequências

- Casamento de pasta, regime, CNPJ, alterações e rollback são testados pelo comportamento externo, e refatorar o interior não quebra testes.
- A leitura real de planilhas e de documentos escaneados não é coberta por fixtures; ela é verificada por execução `--dry-run` nos dados locais, que imprime só contagens agregadas.
