# 01 Regras de negócio do importador

Tipo: `wayfinder:grilling` · Estado: **fechado**

## Question

Quais são as regras de negócio do importador de clientes (universo, fontes, extração, falhas, saídas)?

## Resolução (decisões do usuário, Q1–Q24)

**Destino e entorno**
- O destino do mapa é a spec; a carga real fica para depois. O código vive neste repo (`alimentador`), standalone, usando `service_role` e a RPC existente `criar_cliente` do Rigoni-contabil, sem migration nova.
- Validação primeiro no Supabase local do Rigoni-contabil, com amostra; só depois o projeto real, por ordem do usuário. Chaves em `.env`.

**Universo**
- Fonte do universo: `C:\Users\csbet\Downloads\lista empresas(4).xlsx` (945 linhas: nome, CNPJ). A planilha só serve para **localizar** a empresa no Drive.
- `C:\Users\csbet\Downloads\CONTROLE SIMPLES NACIONAL .xlsx` define o regime, e a fonte é **somente a aba "Patriki 102026"** (a lista atualizada de empresas ativas no Simples Nacional; as demais abas, mensais e "Angela", são histórico e não entram). CNPJ da lista que está nessa aba → `simples_nacional` (539 empresas, comparação pelos 14 dígitos; a aba tem 581 CNPJs únicos).
- `C:\Users\csbet\Downloads\TRIBUTARIO EMPRESAS.xlsx` (1 aba, 298 CNPJs únicos; colunas CNPJ, nome, IE, regime) traz as empresas **Lucro Presumido** (`L. PRESUMIDO`) e **Lucro Real** (`L. REAL`). Mesmas regras da SN: CNPJ da lista que está nela → `lucro_presumido` ou `lucro_real`.
- Resultado do cruzamento com a lista (938 CNPJs, contagem pelos 14 dígitos): aba SN 540; TRIBUTARIO 291 (256 presumido, 34 real, 1 "OUTRAS ENT."); nas duas planilhas ao mesmo tempo 12; em nenhuma 119.
- Na lista mas **sem regime em nenhuma planilha** (119): **não carrega**; vai para `regime-a-confirmar.csv`.
- Só nas planilhas e **fora da lista** (41 na SN, 7 na TRIBUTARIO): **ignoradas** (nem entram em lista).
- **Conflito:** as 12 empresas que aparecem nas duas planilhas saíram do SN e passaram ao Tributário: **vale a TRIBUTARIO** (9 presumido, 3 real).
- **"OUTRAS ENT."** (1 igreja; regime que o banco não tem): **ignorada**, fora da carga e de todas as listas.
- **Coluna do meio da TRIBUTARIO** ("NAO ATIVO" em 173 linhas, número nas demais) é a Inscrição Estadual, não a situação da empresa: ignorada. Exceção: a linha "BAIXOU" (1 empresa, que está na lista) vai para `regime-a-confirmar.csv`, porque pode indicar empresa encerrada.
- **Totais esperados da lista (938 CNPJs):** 817 carregáveis (528 SN + 289 Tributário), 120 em `regime-a-confirmar.csv` (119 sem regime + 1 "BAIXOU"), 1 ignorada. Cada uma ainda pode cair em `falhas.csv` por problema de documento.

**Fontes de verdade**
- `empresa` e `cnpj` vêm do **contrato**. CNPJ do contrato deve bater exatamente com o da planilha (só dígitos); nome comparado normalizado (caixa, acentos, pontuação, LTDA/ME/EPP, sufixos como "- BAIXADA"). Divergência relevante é falha; se irrelevante, vale o nome do contrato.
- `email` fica vazio (o contrato não traz; a planilha SN é dado operacional). O cadastro operacional nasce pelos defaults da RPC.

**Localizar e classificar documentos**
- **Regra de casamento do nome da lista com a pasta do Drive (decisão do usuário, estrita, em ordem; para no primeiro passo que achar):** (1) a pasta tem o **nome exato** da lista; (2) a pasta tem o **nome sem o hífen e tudo que vem depois** (a lista cortada no hífen, ou a pasta cortada no hífen, igual); (3) o nome da lista aparece **dentro** do nome da pasta, com prefixo ou sufixo aparente; depois, ainda como "prefixo/sufixo aparente" e nesta ordem: (4) **ignorando pontuação** (vírgula, ponto, travessão; `&` = `E`); (5) **sem a forma jurídica** no fim (LTDA, ME, EPP, EIRELI, SA, SS, MEI) em ambos os lados; (6) **espaço entre letras e número de CNPJ no fim da pasta** (`A F VAZ NETO & CIA LTDA 03.468` = `AF VAZ NETO & CIA LTDA`). (7) **todas as palavras da lista, na mesma ordem, dentro do nome da pasta** (a pasta tem palavras a mais, no meio ou no fim: `PRIVILEGE HOME RESORT SPE LTDA` em `PRIVILEGE HOME RESORT EMPREENDIMENTO SPE LTDA`), sem a forma jurídica, com no mínimo 2 palavras. Comparação sem diferença de maiúsculas, acentos e espaços. **Proibido** trocar a ordem das palavras, abreviar, corrigir erro de digitação ou aproximar por semelhança. Zero pastas = falha "pasta não encontrada"; mais de uma no mesmo passo = falha "várias pastas".
- **Busca em todas as pastas e subpastas da empresa** (decisão do usuário; não há mais filtro por nome de subpasta). Quais arquivos são baixados e lidos depende do volume medido na varredura do ticket 03.
- **O conteúdo decide o tipo** (contrato social, alteração, outro); outros documentos são ignorados. Sem nenhum contrato nem alteração = falha "sem documentos".
- Pasta completa do Drive baixada para `C:\dados\drive-contratos` (fora do OneDrive e do git), só subpastas de contrato e arquivos soltos. `Desktop\contratos` tem apenas a letra A.

**Extração (`unpdf` + `mammoth` para texto digital; motor de imagem no ticket 06)**
- Formatos válidos: **PDF, Word (`.docx` e `.doc`) e arquivos de imagem**. `.txt` não é válido. (Revisado depois do ticket 04: a regra "sem OCR agora" caiu; na letra A, 58% dos PDFs candidatos são escaneados.)
- PDF escaneado ou imagem com contrato é **lido**, convertido em **PDF pesquisável com o mesmo conteúdo e formatação**, e esse PDF é o que se persiste no Storage. Na dúvida ou com possibilidade de erro de texto, a empresa é **recusada** e vai para `falhas.csv`.
- Pasta de contratos: nome normalizado contendo "contrato social" ou "alteração" (não só "contrato", que pega o contrato de prestação de serviço do escritório, nem "constituição" sozinha). "Contrato", em todo o projeto, quer dizer só **contrato social e alteração de contrato social**; o **conteúdo** confirma o tipo pelo título nas primeiras linhas, não pela palavra solta.
- Motor de leitura de imagem, segurança e regra das imagens soltas: [ticket 06](06-motor-de-leitura-de-imagens.md) (híbrido Tesseract + Sonnet 5.5, recortes mascarados, `--permitir-api`).
- Data da alteração: a linha final do documento, antes do bloco de assinatura digital, no formato "Cidade, UF, dia mês por extenso e ano". Duas candidatas sem desempate = falha. O contrato social não precisa de data.
- Número da alteração: do **conteúdo** (1, 2, 3...); se não houver, do nome do arquivo; se nenhum tiver mas for alteração, **nº 1** (o banco exige `numero > 0`). Duas ou mais sem número ou número repetido com datas diferentes na mesma empresa = falha. **Sequência quebrada não é falha** (correção do usuário: ele nunca decidiu isso; a pasta pode ter só as alterações mais recentes, e as alterações são gravadas com os números lidos). Divergência entre conteúdo e nome: vale o conteúdo, só aviso.
- Sem contrato social mas com alteração: a mais recente (ou única) vira `contrato_social_caminho` **e** continua em alterações; o Storage recebe **duas cópias** (`{clienteId}/contrato-social/` e `{clienteId}/alteracoes-contratuais/`).

**Falhas e saídas**
- Empresa com **qualquer** falha não é carregada; vai para `falhas.csv` (CNPJ, nome, etapa, motivo) para refazer sob orientação manual. As demais seguem.
- Três CSVs em `saida/` (fora do git), reescritos a cada execução: `carregadas.csv`, `falhas.csv`, `regime-a-confirmar.csv`.
- Reexecução segura: CNPJ já existente em `clientes` é pulado (não duplica nem sobrescreve).

## Fatos levantados

- Schema: `clientes(id, empresa, cnpj UNIQUE, regime NOT NULL, contrato_social_caminho, email, criado_em)`; `cliente_alteracoes_contratuais(id, cliente_id, numero > 0 único por cliente, data não futura, arquivo_caminho)`; bucket privado `documentos-clientes` (PDF/DOC/DOCX, até 10 MB).
- A lista tem 945 linhas e 937 CNPJs únicos de 14 dígitos; 8 linhas são inválidas ou repetidas (ex.: `54.553.6940001-13` vem com a pontuação errada, mas tem 14 dígitos).
- Nomes de subpasta reais na letra A: `0 CONTRATO SOCIAL E ALTERAÇÕES` (49), `0 CONTRATO SOCIAL E ALTERAÇÃOES` (5); 31 arquivos soltos na pasta da empresa.
