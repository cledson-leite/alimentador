# 05 Estrutura do importador neste repositório

Tipo: `wayfinder:grilling` (HITL) · Estado: **fechado** · Bloqueado por: —

## Question

Este repo não tem `src/`, `package.json` nem `supabase/`. Como o importador se encaixa em `docs/arquitetura.md` e `docs/testes.md`, como depende do schema do Rigoni-contabil, como cumpre TDD e teste de integração, onde ficam segredos e saídas, e como garante atomicidade entre o Storage e a RPC `criar_cliente`?

## Resolução

Q4 foi respondida pelo usuário; Q1, Q2, Q3, Q5 e Q6 foram aceitas por ele sem objeção (mesmo critério das rodadas anteriores).

- **Esqueleto (Q1):** CLI TypeScript com Yarn, Zod e Jest, sem Next.js nem `presentation`. Mesmas regras de nome (kebab-case com sufixo) e de camadas do `arquitetura.md`: módulo `importacao` com `domain`, `application`, `infra`, mais `main`. Lint e dependency-cruiser vêm das skills do time. Bibliotecas já usadas no Rigoni-contabil: `unpdf`, `mammoth`, `read-excel-file`, `@supabase/supabase-js`.
- **Cadastro (Q2):** não copia o caso de uso `CriarCliente` do app. Como o `scripts/seed-teste-zap.mjs` do Rigoni-contabil, sobe os arquivos (remover e depois enviar, sem `upsert`, que falha no Storage local) e chama a RPC `criar_cliente` com `service_role`. Traz duas garantias do app: valida o CNPJ antes de tocar o Storage; se a RPC falhar, remove os arquivos enviados; se a resposta se perder, confere pelo CNPJ se o cliente foi gravado antes de apagar qualquer arquivo.
- **Schema (Q3):** este repo não guarda migrations. Na partida o importador confere a RPC `criar_cliente` (com `numero` nas alterações) e o bucket `documentos-clientes`; se faltar, para com mensagem clara. Testes de integração rodam contra o Supabase local subido em `Rigoni-contabil` (`supabase start`), com URL e chave no `.env`; se estiver fora do ar, o teste é pulado com observação (permitido pelo `testes.md`).
- **Ambientes e trava (Q4, ajustada pelo usuário):** só **Supabase local** e **produção** (projeto já criado no dashboard); não há homologação. Por padrão recusa qualquer URL que não seja local. Produção exige `--producao`, o ref do projeto igual a `SUPABASE_PROD_PROJECT_REF` no `.env` e confirmação digitada do ref. `--dry-run` lê, extrai e gera os três CSVs sem tocar no Supabase nem no Storage.
- **Refazer falhas (Q5):** `--cnpj` com lista de CNPJs processa só essas empresas, depois que o usuário corrigir os arquivos na pasta local. Sem arquivo de correções nem tela.
- **Testes (Q6):** sem Playwright (não há tela). Em seu lugar, um teste de integração de ponta a ponta com pasta de fixtures sintéticas (PDFs gerados com `pdf-lib`, nunca documento de cliente) contra o Supabase local. TDD e cobertura de 90% de linhas e 85% de branches mantidos. A exceção ao `testes.md` vira um ADR curto (a escrever junto da spec).
- **Segredos e saídas:** `.env` validado por Zod (`src/env.ts`, `.env.example`), com `NEXT_PUBLIC_SUPABASE_URL` substituído por `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_PROD_PROJECT_REF`. `saida/` e `.env` no `.gitignore`; documentos em `C:\dados\drive-contratos`, fora do repo e do OneDrive.
