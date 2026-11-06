# Spec: importador de clientes (planilhas + Drive → Supabase)

Rótulo: `ready-for-agent` · Tracker: markdown local (o repositório é público; nada vai ao GitHub) · Origem: [mapa](../mapa/importador-clientes/map.md), tickets 01 a 09.

## Problem Statement

O escritório tem cerca de 945 empresas numa **Lista de empresas** e os documentos delas espalhados numa pasta do Drive (milhares de PDFs, Words e imagens, boa parte escaneada). Hoje não existe cadastro dessas empresas no sistema (Rigoni-contabil). Cadastrar uma a uma, abrindo o **Contrato social** e cada **Alteração contratual** para copiar CNPJ, nome, número e data, é inviável e sujeito a erro. Pior, um erro silencioso (documento gravado na empresa errada, regime trocado) é difícil de achar depois.

## Solution

Uma ferramenta de linha de comando que, para cada empresa da Lista de empresas, localiza a pasta dela na cópia local do Drive, identifica o Contrato social e as Alterações contratuais, extrai os dados do cadastro dos próprios documentos, sobe os arquivos para o Storage e grava `clientes` e `cliente_alteracoes_contratuais` no Supabase do Rigoni-contabil. Na dúvida, a empresa **não** é carregada: vai para a **Lista de falhas** com o motivo, para ser refeita sob orientação manual. O que não é carregado por falta de regime ou por não ser empresa sai em listas próprias. A spec cobre a ferramenta; a carga real em produção é uma execução posterior, por ordem do usuário.

## User Stories

1. Como responsável pelo cadastro, quero que a ferramenta leia a Lista de empresas, para que o universo da carga seja só as empresas que o escritório atende.
2. Como responsável, quero que o regime venha da Planilha SN (só a aba "Patriki 102026") e da Planilha tributária, para que `simples_nacional`, `lucro_presumido` e `lucro_real` sejam gravados sem digitação.
3. Como responsável, quero que, quando a empresa está nas duas planilhas, valha a Planilha tributária, para que quem saiu do Simples Nacional não entre com regime velho.
4. Como responsável, quero que empresas da lista sem regime em nenhuma planilha (e a marcada "BAIXOU") saiam em `regime-a-confirmar.csv` e não sejam carregadas, para que ninguém seja cadastrado com regime chutado.
5. Como responsável, quero que CNPJs que só existem nas planilhas e não estão na lista, e a entidade "OUTRAS ENT.", sejam ignorados, para que a carga não cresça além do universo definido.
6. Como responsável, quero que condomínios, associações e cartórios (planilha `condominios-associacoes-sem-cnpj`) fiquem fora da carga, para que só empresas com contrato social entrem.
7. Como responsável, quero que as 6 linhas de pessoa física saiam em `pessoas-fisicas.csv`, sem tentar casar pasta e sem mudar o schema, para decidir sobre elas depois.
8. Como responsável, quero que a pasta da empresa seja achada por uma regra estrita e previsível (nome exato; nome sem o hífen e o que vem depois; nome da lista dentro da pasta com prefixo/sufixo aparente; sem pontuação; sem forma jurídica; espaço entre letras e CNPJ no fim; palavras na mesma ordem), para que eu possa prever o resultado e nunca haja "jogada de palavras".
9. Como responsável, quero que a regra nunca troque a ordem das palavras, abrevie, corrija digitação ou aproxime por semelhança, para que casamento errado não aconteça em silêncio.
10. Como responsável, quero que "pasta não encontrada" e "várias pastas" vão para a Lista de falhas, sem adivinhar, para que eu indique a pasta certa e refaça.
11. Como responsável, quero um arquivo de candidatas aproximadas para eu confirmar uma a uma, para que o que a regra estrita deixa de fora possa ser aproveitado com minha ordem.
12. Como responsável, quero que a ferramenta procure documentos em todas as subpastas da empresa, para que contratos fora da pasta "esperada" também sejam achados.
13. Como responsável, quero que o conteúdo do documento decida se é contrato social, alteração ou outro, para que o nome do arquivo não engane.
14. Como responsável, quero que documentos que não são contrato social nem alteração (alvará, procuração, prestação de serviço, RG etc.) sejam ignorados, para que "contrato" signifique só o contrato social e suas alterações.
15. Como responsável, quero que `empresa` e `cnpj` gravados venham do Contrato social, para que o cadastro reflita o documento oficial.
16. Como responsável, quero que o CNPJ do documento seja comparado com o da lista pela raiz de 8 dígitos, para que contratos que citam a matriz sejam aceitos.
17. Como responsável, quero que divergência de CNPJ entre documento e lista mande a empresa para a Lista de falhas, para que nada seja gravado na empresa errada.
18. Como responsável, quero que, quando nenhum documento da pasta traz CNPJ, a empresa vá para a Lista de falhas com o motivo "nenhum documento traz CNPJ", para que eu confirme a pasta e refaça com `--cnpj`.
19. Como responsável, quero que, nas colisões de nome entre empresas de raiz de CNPJ diferente, só a dona da pasta (a que o CNPJ do documento confirma) seja carregada e a outra vá para a Lista de falhas.
20. Como responsável, quero que matriz e filiais (mesma raiz de CNPJ, uma só pasta) virem um `clientes` cada, com cópia dos mesmos documentos, para que `cnpj` continue único.
21. Como responsável, quero que o mesmo CNPJ repetido na lista (erro de digitação no nome) seja carregado uma vez só.
22. Como responsável, quero que nome divergente relevante entre lista e documento seja falha, e irrelevante (caixa, acento, pontuação, LTDA/ME/EPP, "- BAIXADA") use o nome do documento.
23. Como responsável, quero que a Alteração contratual ganhe número (do conteúdo; senão do nome do arquivo; senão 1) e data de assinatura (a linha final antes da assinatura digital), para que a sequência por empresa fique correta.
24. Como responsável, quero que alteração sem data legível, número repetido com datas diferentes ou mais de uma alteração sem número mandem a empresa para a Lista de falhas, e que sequência com buracos ou que não começa em 1 seja gravada com os números lidos, sem falha.
25. Como responsável, quero que, sem Contrato social mas com alteração, a mais recente (ou única) ocupe o lugar do contrato social e continue como alteração, com duas cópias no Storage, para que o cadastro fique completo.
26. Como responsável, quero que PDFs escaneados e imagens com contrato sejam lidos por OCR local e persistidos como PDF pesquisável com a imagem original, para que o conteúdo e a formatação fiquem idênticos.
27. Como responsável, quero que imagens avulsas que não são contrato (RG, título, procuração, print da Junta) sejam ignoradas e nunca enviadas a nenhuma API.
28. Como responsável, quero que imagens do mesmo contrato (mesmo nome-base e sequência) formem um só PDF em ordem natural, e que imagem pequena (lado maior < 1.000 px), sequência quebrada ou tipos misturados mandem a empresa para a Lista de falhas.
29. Como responsável, quero que `.doc` (Word 97) seja lido por biblioteca Node e `.doc` ilegível vá para a Lista de falhas, sem depender de LibreOffice.
30. Como responsável, quero uma segunda leitura por modelo (Sonnet 5.5) só de data, número e CNPJ quando o OCR duvida, aceitando o campo só se as duas leituras concordam, para reduzir erro sem mandar o contrato inteiro.
31. Como responsável pela segurança dos dados, quero que a API fique desligada por padrão e só rode com `--permitir-api` e chave no `.env`, para que nenhum dado saia sem ordem expressa.
32. Como responsável pela segurança dos dados, quero que só recortes mascarados (CPF, RG, CEP, e-mail, telefone cobertos) e no máximo 3 por documento sejam enviados, nunca página inteira, e nunca gravados em disco nem em log.
33. Como responsável pela segurança dos dados, quero teto de chamadas e de custo por execução que aborte ao estourar, e resposta recusada, inválida ou ambígua tratada como falha.
34. Como responsável, quero ver no `--dry-run` quantas regiões seriam enviadas à API, sem enviar nada.
35. Como responsável, quero que a ferramenta recuse qualquer URL do Supabase que não seja local por padrão, para não gravar em produção por engano.
36. Como responsável, quero que produção exija `--producao`, o ref do projeto igual ao do `.env` e confirmação digitada do ref, para que a carga real seja deliberada.
37. Como responsável, quero um `--dry-run` que leia, extraia e gere os CSVs sem tocar no Supabase nem no Storage, para validar antes de carregar.
38. Como responsável, quero que a ferramenta confira na partida que a RPC `criar_cliente` (com `numero` nas alterações) e o bucket `documentos-clientes` existem, e pare com mensagem clara se faltarem.
39. Como responsável, quero que a ferramenta valide o CNPJ antes de tocar o Storage e, se a RPC falhar, remova os arquivos enviados; se a resposta se perder, confira pelo CNPJ antes de apagar qualquer coisa, para não deixar lixo nem apagar dado bom.
40. Como responsável, quero que reexecutar seja seguro: CNPJ já existente em `clientes` é pulado, sem duplicar nem sobrescrever.
41. Como responsável, quero `--cnpj` com uma lista de CNPJs para refazer só essas empresas depois de corrigir os arquivos na pasta local, sem tela nem arquivo de correções.
42. Como responsável, quero `carregadas.csv`, `falhas.csv`, `regime-a-confirmar.csv` e `pessoas-fisicas.csv` reescritos a cada execução, com CNPJ, nome, etapa e motivo, para saber exatamente o que aconteceu com cada empresa.
43. Como responsável, quero que dados de clientes (documentos, CSVs, `.env`) fiquem fora do git e do OneDrive, para que nada sensível vá para o repositório público.
44. Como responsável, quero que o nome dos objetos no Storage trate acentos e o "º" dos nomes de arquivo, para que o upload não falhe por caractere inválido.
45. Como responsável, quero validar primeiro no Supabase local com uma amostra e só depois rodar em produção, para ter confiança no resultado.
46. Como responsável, quero que a ligação arquivo → empresa use o manifesto (empresa + id do Drive) e não o caminho em disco, para que pastas com "/" no nome (datas) não troquem de empresa.

## Implementation Decisions

- **Forma:** CLI TypeScript (Yarn, Zod, Jest), sem Next.js e sem camada `presentation`. Módulo `importacao` com camadas `domain`, `application`, `infra` e `main`, nas mesmas regras de nomenclatura e de dependência de `docs/arquitetura.md`. Bibliotecas já usadas no Rigoni-contabil: `unpdf`, `mammoth`, `read-excel-file`, `@supabase/supabase-js`; mais um leitor de `.doc` (por exemplo `word-extractor`) e Tesseract para OCR.
- **Fluxo por empresa:** localizar pasta → listar candidatos (manifesto) → ler/classificar por conteúdo → validar CNPJ e nome → numerar e datar alterações → montar arquivos finais → subir ao Storage → chamar a RPC → registrar nos CSVs. Qualquer falha para a empresa e segue com as demais.
- **Universo e regime:** a Lista de empresas só localiza a empresa; `empresa` e `cnpj` gravados vêm do Contrato social. Regime: Planilha tributária vence a Planilha SN; sem regime ou "BAIXOU" → `regime-a-confirmar.csv`. Totais esperados: 938 CNPJs, 817 carregáveis (528 SN + 289 tributário), 120 a confirmar, 1 ignorada; cada uma ainda pode cair em falhas por documento.
- **Documentos:** formatos válidos são PDF, `.docx`, `.doc` e imagens; `.txt` não. O conteúdo decide o tipo pelo título nas primeiras linhas. Alvará nunca é contrato.
- **Casamento de pasta:** regra estrita em passos ordenados (ver User Stories 8 a 11), parando no primeiro que achar. Candidatas aproximadas não são usadas sem confirmação do usuário. **Dúvida ou ambiguidade se resolve pelo conteúdo do contrato ou alteração:** se mais de uma pasta casa no mesmo passo, lê-se o CNPJ dos documentos de cada uma; CNPJs diferentes são empresas diferentes e vale a pasta que traz o CNPJ da lista; CNPJs iguais são a mesma empresa e só uma vale (vai para `falhas.csv` até o usuário indicar qual).
- **CNPJ:** compara-se a raiz de 8 dígitos. Presente e igual → ok; presente e diferente → falha; ausente em todos os documentos → falha ("nenhum documento traz CNPJ"), tanto para pasta estrita quanto candidata (ticket 07). **O comprovante de CNPJ (Comprovante de Inscrição e de Situação Cadastral) da pasta também prova o CNPJ e fornece o nome empresarial** (correção do usuário): contrato de constituição sem CNPJ + comprovante com o CNPJ da lista sobe com o contrato; pasta só com o comprovante cadastra a empresa **sem contrato e sem alterações** (`contrato_social_caminho` nulo, nada vai ao Storage). Comprovante de outra raiz de CNPJ é divergência (falha).
- **Alterações:** número do conteúdo, depois do nome, depois 1; data da linha final antes da assinatura digital ("Cidade, UF, dia mês por extenso e ano"); regras de falha da US 24 (a sequência não é validada: buraco ou início acima de 1 não é falha). A mesma alteração em mais de um formato (PDF e DOC/DOCX) conta uma vez e o PDF predomina; mesmo número com datas diferentes segue sendo falha. Sem Contrato social, a alteração mais recente ocupa o lugar dele com duas cópias no Storage (pastas de contrato social e de alterações contratuais, por `clienteId`).
- **Matriz e filiais:** um `clientes` por CNPJ da lista, cópias dos mesmos documentos em `{clienteId}/...`.
- **Motor de leitura de imagens (ticket 06):** Tesseract local em tudo gera o PDF pesquisável mantendo a imagem original; o Sonnet 5.5 (esforço médio) só faz segunda leitura de data, número e CNPJ em recortes mascarados, com `--permitir-api`, teto de chamadas e custo, chave dedicada com limite de gasto no painel, e aceite só quando as duas leituras concordam. Limiar de confiança do OCR a calibrar no piloto.
- **Cadastro:** não copia o caso de uso do app; sobe arquivos (remove e depois envia, sem `upsert`) e chama `criar_cliente` com `service_role`. Valida CNPJ antes do Storage; remove arquivos se a RPC falhar; confere por CNPJ se a resposta se perder.
- **Schema:** sem migration nova; este repositório não guarda migrations. `clientes(id, empresa, cnpj único, regime, contrato_social_caminho, email, criado_em)` e `cliente_alteracoes_contratuais(id, cliente_id, numero > 0 único por cliente, data não futura, arquivo_caminho)`; bucket privado `documentos-clientes` (PDF/DOC/DOCX, até 10 MB). `email` fica vazio; o cadastro operacional nasce pelos defaults da RPC.
- **Ambientes:** só Supabase local e produção. Padrão recusa URL não local; produção exige `--producao`, ref igual a `SUPABASE_PROD_PROJECT_REF` e confirmação digitada. `--dry-run` não toca em nada externo.
- **Flags:** `--dry-run`, `--producao`, `--permitir-api`, `--cnpj <lista>`.
- **Saídas** (pasta `saida/`, fora do git, reescritas a cada execução): `carregadas.csv`, `falhas.csv`, `regime-a-confirmar.csv`, `pessoas-fisicas.csv`.
- **Segredos:** `.env` validado por Zod (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PROD_PROJECT_REF`, chave da API só quando usada); `.env` e `saida/` no `.gitignore`.
- **Documentos de origem:** cópia local fora do OneDrive e do git; ligação arquivo → empresa pelo manifesto (campo `empresa` + `id`), nunca por separador de caminho.
- **ADR:** escrever um ADR curto registrando a exceção ao `docs/testes.md` (teste de integração de ponta a ponta no lugar do E2E de tela) junto da implementação.
- **Nomes dos objetos no Storage:** a implementação normaliza acentos e o "º" (detalhe fechado na construção, coberto por fixture).
- **Pessoas físicas:** fora da carga, em `pessoas-fisicas.csv`, sem mudança de schema (ticket 08).

## Testing Decisions

- **Um seam só:** o caso de uso que roda o importador inteiro. Entradas: pasta de documentos (fixtures), as três planilhas e as flags. Saídas observáveis: arquivos no Storage, chamadas à RPC `criar_cliente`, e os quatro CSVs. Leitor de imagens/API simulado; Supabase local real.
- **O que é um bom teste aqui:** descreve um cenário de empresa (entradas) e afirma o resultado externo (linha em `clientes`, objetos no Storage, linha em `carregadas.csv` ou `falhas.csv` com o motivo). Não testa funções internas de casamento, classificação ou OCR isoladamente.
- **Cenários mínimos (viram fixtures):** casamento em cada passo da regra estrita; pasta não achada e várias pastas; CNPJ igual, divergente e ausente; raiz de matriz/filial; colisão de raiz diferente; CNPJ duplicado na lista; regime SN, tributário, conflito e sem regime; sem contrato social só com alteração; número ausente e repetido; sequência com buraco ou começando acima de 1 (grava); duas datas sem desempate; PDF digital, escaneado, imagem avulsa que não é contrato, imagens em sequência, imagem pequena; `.doc` ilegível; reexecução (CNPJ já existente é pulado); falha da RPC com remoção dos arquivos; `--dry-run` sem efeitos; trava de produção; API desligada por padrão e teto de custo.
- **Fixtures:** sintéticas (PDFs gerados com `pdf-lib`), nunca documento de cliente.
- **TDD** (red-green-refactor) e cobertura de 90% de linhas e 85% de branches, como no `docs/testes.md`.
- **Prior art:** o `scripts/seed-teste-zap.mjs` e os testes de integração com Supabase local do Rigoni-contabil; se o Supabase local estiver fora do ar, o teste é pulado com observação (permitido pelo `testes.md`).

## Out of Scope

- Executar a carga real em produção.
- Definir o regime das 120 empresas sem regime (só saem em `regime-a-confirmar.csv`).
- Empresas que só existem nas planilhas SN (41) ou tributária (7), e "OUTRAS ENT.".
- E-mail, contatos e cadastro operacional SN (a RPC aplica defaults).
- Condomínios, associações, cartórios e pessoas físicas.
- Mudar o schema ou a RPC do Rigoni-contabil; tela de correções; leitura da planilha `2 - CONTROLE ALTERAÇÕES` (ticket 09: cobre ~2% e fica fora).
- Casamento de pasta por aproximação sem confirmação do usuário.

## Further Notes

- **Volume esperado de `falhas.csv`:** é grande e é esperado. Na letra A, 55% das pastas não têm contrato nem alteração em lugar algum; 58% dos PDFs candidatos são escaneados; 36 carregáveis já ficaram sem arquivos no download. Sem OCR só ~6% das empresas têm contrato/alteração legível. A lista é a fila de trabalho manual do usuário, que corrige a pasta e refaz com `--cnpj`.
- **Custo estimado do OCR híbrido:** ~US$ 8–20 para ~2.100 páginas (ticket 04).
- **Pendência do usuário (não bloqueia):** confirmar uma a uma as 40 linhas de `_candidatos-aproximados.csv`.
- **Antes da carga real:** conferir a política de retenção de dados da conta na Anthropic (fora do controle do código) e rodar piloto local com amostra.
- **Glossário:** termos em negrito estão em `CONTEXT.md` (Lista de empresas, Planilha SN, Planilha tributária, Contrato social, Alteração contratual, Lista de falhas, Regime a confirmar).
