# Mapa: importador de clientes (planilha + Drive → Supabase)

Rótulo: `wayfinder:map`. Tracker: markdown local (o repositório é público; nada vai ao GitHub). Tickets são os arquivos `NN-*.md` desta pasta.

## Destination

Uma **spec aprovada** de um importador que lê a "lista empresas", localiza o contrato social e as alterações contratuais de cada empresa na cópia local da pasta do Drive, extrai dos documentos os dados do cadastro, grava os arquivos no Storage e as linhas em `clientes` / `cliente_alteracoes_contratuais` do Supabase do Rigoni-contabil. A execução da carga real **não** faz parte deste mapa.

## Notes

- Domínio: contabilidade (Rigoni). Schema de verdade e RPC `criar_cliente` vivem em `Desktop\Rigoni-contabil\supabase\migrations` (`20261002110000_clientes_e_cadastro_operacional.sql` e as de 20261021/22). Este repo (`alimentador`) só consome.
- Consultar: `docs/arquitetura.md`, `docs/testes.md`, `CONTEXT.md`, skills `domain-modeling` e `grilling`.
- Dados de clientes (CNPJ, contratos, relatórios) **nunca** vão para o git nem para o OneDrive: pasta de documentos em `C:\dados\drive-contratos`, saídas em `saida/` (ambos no `.gitignore`).
- Leitura de documentos: local, `unpdf` + `mammoth` (já usados no Rigoni-contabil). Sem API externa.

## Decisions so far

- [01 Regras de negócio do importador](01-regras-de-negocio-do-importador.md): universo, fontes de verdade, extração, falhas e saídas definidos (Q1–Q24).
- [04 Protótipo da extração (letra A local)](04-prototipo-da-extracao.md): sem OCR só ~6% das empresas têm contrato/alteração legível (58% dos PDFs são escaneados) e a data não sai; OCR entra no escopo, recomendação híbrida Tesseract + Sonnet 5.5 (~US$ 8–20 para ~2.100 páginas).
- [03 Baixar a pasta do Drive](03-baixar-a-pasta-do-drive.md): 11.435 de 11.444 arquivos (8,29 GB) em `C:\dados\drive-contratos`, 801 empresas; 9 vazios no próprio Drive; critério: subpastas de contrato social e alterações, mais arquivos pelo nome nas 263 empresas sem a subpasta; alvará fora.
- [06 Motor de leitura de imagens](06-motor-de-leitura-de-imagens.md): híbrido Tesseract local + Sonnet 5.5 só em recortes mascarados de data/número/CNPJ, com `--permitir-api`, nada em disco ou log e dupla leitura concordante; imagens que não são contrato (RG, título etc.) são ignoradas e nunca enviadas.
- [05 Estrutura do importador neste repositório](05-estrutura-do-importador.md): CLI TypeScript sem Next.js; upload + RPC `criar_cliente` com remoção em falha; só local e produção (trava + `--dry-run`); `--cnpj` para refazer; teste de ponta a ponta no lugar do E2E.
- [02 Pesquisa: como baixar a pasta do Drive em massa](02-pesquisa-download-do-drive.md): `gdown` sem credencial, listar, filtrar por regex e baixar só os escolhidos com `--continue`; tamanho total ainda desconhecido.

- [09 Planilha de controle de alterações](09-planilha-controle-alteracoes.md): só 76 linhas, 27 CNPJs (19 carregáveis, ~2%), apenas maio a novembro de 2025 e número em texto livre; ignorada como fonte, número e data seguem vindo do OCR.
- [07 Política de CNPJ ausente](07-politica-cnpj-ausente.md): nenhum documento com CNPJ → `falhas.csv` (estrita ou candidata); divergência continua falha.
- [08 Pessoas físicas na lista](08-pessoas-fisicas-na-lista.md): as 6 ficam fora, em `pessoas-fisicas.csv`.

## Tickets abertos

| Ticket | Tipo | Bloqueado por |
|---|---|---|
| _(nenhum: a fronteira está vazia)_ | | |

## Not yet specified

- **Volume esperado de `falhas.csv`**: na letra A, 55% das pastas não têm contrato nem alteração em lugar algum; a spec precisa dizer que isso é esperado e como a lista será usada.
- **Nome dos objetos no Storage** (acentos, "º" dos nomes de arquivo): detalhe que a spec fecha.
- **Como validar antes da carga em produção**: a spec precisa dizer (piloto local, `--dry-run`, amostra); a execução em si fica fora do mapa.


## Out of scope

- Definir o regime das 120 empresas da lista sem regime nas planilhas SN e TRIBUTARIO (119) ou marcadas "BAIXOU" (1): o importador só as lista em `regime-a-confirmar.csv`.
- Empresas que só existem nas planilhas SN (41) ou TRIBUTARIO (7) e não estão na lista de empresas, e a entidade "OUTRAS ENT.": ignoradas.
- E-mail, contatos e cadastro operacional SN: o schema/RPC já aplicam defaults; o importador não preenche.
- Executar a carga real.
