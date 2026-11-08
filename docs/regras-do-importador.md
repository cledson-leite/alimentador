# Regras do importador de clientes

Registro único das regras de negócio **decididas pelo usuário** e aplicadas pelo importador. Quando houver conflito com os tickets em `docs/mapa/` ou com a spec, **este documento vale** (ele contém as correções feitas depois). Cada regra diz de onde veio e onde está testada. Nada aqui contém dado de cliente: o repositório é público.

Spec: [`docs/specs/importador-clientes.md`](specs/importador-clientes.md) · Glossário: `CONTEXT.md` · Decisão sobre testes: [`adr/0001`](adr/0001-teste-de-integracao-no-lugar-do-e2e.md).

## 1. Universo e regime

- A **Lista de empresas** (nome e CNPJ) define o universo. Cada linha é uma empresa; `empresa` e `cnpj` gravados vêm dela quando o documento não traz.
- O regime vem de duas planilhas: **SN** (só a aba "Patriki 102026", que é a lista atualizada) e **Tributário** (presumido e real). Quando a empresa consta nas duas, **vale o Tributário**.
- **Só três informações contam, nas três fontes: CNPJ, nome/razão social e regime.** Qualquer outra coluna das planilhas é **ignorada** (ex.: a coluna da inscrição estadual, onde aparecia "BAIXOU": a empresa marcada assim é carregada normalmente pelo regime que a planilha traz).
- Sem regime em nenhuma das duas: **não carrega**, vai para `regime-a-confirmar.csv`. **OUTRAS ENT.** é ignorada.
- **Regime informado manualmente** (terceira fonte, só para quem não tem regime nas planilhas): o usuário preenche a coluna "regime" do arquivo `saida/sem-regime-prontas-para-confirmar.csv` (`simples_nacional`, `lucro_presumido` ou `lucro_real`) e o importador o lê por `--regimes <arquivo>` (esse arquivo é o padrão). O regime da SN e do tributário **sempre vence** o manual. Linha em branco = continua sem regime. Valor inválido ou CNPJ malformado **interrompe a execução** com a lista das linhas, sem gravar nada.
- **Empresas só nas planilhas:** a empresa que consta na SN ou na Tributária e **não** na Lista de empresas **também é carregada** (decisão do usuário), com o nome da planilha sem as anotações do escritório ("(SAIU 01/08)", "- BAIXADA 10/26"...). CNPJ com dois nomes diferentes nas planilhas é conflito e fica de fora; associação, condomínio e cartório seguem fora da carga. Para elas o Drive é baixado só com **contrato social e alterações** (mais o comprovante de CNPJ, lido só para conferência: ele predomina sobre o CNPJ citado no contrato).
- **Fora da carga:** pessoas físicas (CPF) em `pessoas-fisicas.csv`; condomínios, associações, cartórios e tabelionatos; a planilha de controle de alterações (cobre ~2%).
- CNPJ repetido na lista: carrega uma vez só.

## 2. Pasta do Drive

- A pasta que o download (ticket 03) aceitou para cada empresa, registrada em `_estado-final.csv`, **vale mais** que o casamento por nome.
- Sem ela, vale a **regra estrita** de casamento, nesta ordem, parando no primeiro passo que achar: nome exato; nome sem o hífen e o que vem depois; nome da lista dentro do nome da pasta; sem pontuação; sem forma jurídica; espaço entre letras e CNPJ no fim da pasta; mesmas palavras na mesma ordem. **Proibido** trocar a ordem das palavras, abreviar, corrigir digitação ou aproximar por semelhança.
- **Dúvida ou ambiguidade se resolve pelo conteúdo** do contrato ou alteração. Se mais de uma pasta casa: CNPJs diferentes são empresas diferentes e vale a que traz o CNPJ da lista; CNPJs iguais são a mesma empresa e **só uma vale** (vai para falhas até o usuário indicar qual).
- A busca de documentos vale para **todas as subpastas** da empresa. Matriz e filiais dividem uma pasta: cada CNPJ da lista vira um cliente, com cópia dos documentos.

## 3. Como o documento é reconhecido (pelo conteúdo, nunca pelo nome do arquivo)

**Contrato social e equivalentes:** "contrato social", "contrato de constituição", "ato de constituição", "instrumento de constituição", "ato constitutivo", "contrato constitutivo", no singular ou plural, com ou sem acento. Vale como **título**, no começo da linha. No **corpo**, só vale se o conteúdo confirmar instrumento societário: cláusulas mais capital social, quotas, objeto social ou denominação. Só a palavra "contrato" também precisa dessa confirmação. **Contrato de prestação de serviços** (o do escritório), locação e outros "contrato de…" **não** são contrato social. Menção passageira ("conforme o contrato social…") não conta.

**Alteração contratual:** "alteração contratual" ou equivalente: "alterações contratuais", "alteração do contrato social", "alteração do ato constitutivo", "alteração por …" (transformação, incorporação, cisão, transferência de sede), com ordinal ou número antes ("oitava", "3ª"). O **título** e a folha de **Motivos** (mudanças efetivas na empresa, ex.: alteração de endereço, objeto, quadro social, consolidação) definem. A frase sozinha, no corpo, só vale se o documento tiver **cláusulas**. Título deslocado (depois da 3ª linha, atrás de carimbo da Junta) também exige cláusulas.

**Não são alteração nem contrato:** **requerimento** e **capa do requerimento** da Junta (decide o título: se "CAPA" ou "REQUERIMENTO" abre o documento antes de qualquer título de alteração), protocolo da Junta, pedido ou confirmação da Receita Estadual, troca de contador, orientação interna, **procuração, substabelecimento e certidão de cartório** (mandato; citam "alteração contratual" e trazem cláusulas, mas decide o título), termo de quitação, certificado MEI, QSA, RG, CNH, certidões.

**Comprovante de CNPJ** (Comprovante de Inscrição e de Situação Cadastral): é documento reconhecido, prova o CNPJ e traz o nome empresarial.

**Outro estado:** contrato com formato de outra Junta (ex.: Santa Catarina) e o formato antigo do Ministério são **ignorados por enquanto**.

## 4. CNPJ

- Em contrato e alteração compara-se a **raiz de 8 dígitos** (eles citam a matriz). No **comprovante** exige-se o **CNPJ idêntico** (14 dígitos): **filial é outra empresa**, com CNPJ próprio, e o comprovante da matriz não prova a linha da filial.
- CNPJ **diferente** no documento reprova (divergência).
- **Número no nome do arquivo:** "0" (ex.: "0 ALTERAÇÃO POR TRANSFORMAÇÃO") é só a ordem de arquivamento do escritório e marca o **documento-base**. Havendo outras alterações, ele é só o **contrato social** (PDF primeiro) e não entra na numeração; sozinho, vale como alteração 1 (o banco exige número > 0).
- CNPJ **ausente** nos documentos **não reprova**: a empresa está na lista, com CNPJ e razão social, tem regime e pasta no Drive, então **vale o CNPJ da lista**. (Corrige o ticket 07, que mandava para falhas.)
- CNPJ da lista com dígito verificador inválido reprova antes de tocar o Storage.

## 5. Nome da empresa

O `empresa` gravado é sempre a **razão social da lista**, sem as anotações do escritório ("- empresa", "inicia na Rigoni em…", "- MATRIZ", "- FILIAL X"). O nome do contrato **não** é usado, porque o contrato de constituição pode trazer o nome antigo (a razão social é trocada numa alteração). **Filial** é gravada como `EMPRESA - FILIAL X` (o trecho vem da lista), com o CNPJ da própria filial.

## 6. Alterações: número, data e duplicatas

- **Número:** o do **começo do nome do arquivo** ("2 PRIMEIRA ALTERAÇÃO...", "02_Alteracao...": sequência do escritório, única na pasta), senão o do conteúdo (título), senão o de qualquer número no nome, senão 1. O ordinal do título recomeça a cada transformação societária e por isso colide. Duas ou mais sem número reprova.
- **Cópia em outro formato:** além do mesmo número, vale também o **mesmo dia com um dos dois sem número** (minuta em PDF sem prefixo + versão numerada em DOCX): é um documento só, vale o PDF e ele herda o número da cópia.
- **Sequência quebrada NÃO é falha** (o usuário nunca decidiu isso): a pasta pode ter só as alterações mais recentes e elas são gravadas com os números lidos.
- **PDF predomina:** a mesma alteração em PDF e em DOC/DOCX (mesmo número) conta **uma vez**, vale o PDF, **mesmo que a leitura traga datas diferentes**. Dois PDFs com o mesmo número e datas diferentes reprovam.
- **Data:** só se exige da **alteração**. Contrato social, constituição e comprovante **não precisam de data**. É a **última linha de data** do documento, no formato "dia de mês de ano": a **cidade e o estado são ignorados** (qualquer cidade, UF com barra, hífen, parênteses ou sem UF), pontuação no fim é tolerada e a data pode vir quebrada em duas linhas. Não pode ser futura.
- Sem contrato social e com alteração: a mais recente ocupa o lugar do contrato e continua como alteração (duas cópias no Storage).

## 7. Empresa sem contrato nem alteração

Só o **comprovante de CNPJ** na pasta: a empresa é cadastrada **sem contrato e sem alterações** (`contrato_social_caminho` nulo, nada vai ao Storage). Sem nenhum documento reconhecido: falha ("sem contrato social nem alteração"). Se o arquivo se chama contrato ou alteração mas o texto não traz o instrumento (páginas em imagem), o motivo diz que **precisa de OCR**.

## 8. Leitura de documentos e OCR

- Texto digital: PDF, DOCX e DOC. Texto ilegível (fonte sem mapeamento de caracteres) é tratado como **sem texto**.
- **OCR local** (Tesseract em português, dentro do projeto): só quando a leitura normal não basta, e só em arquivo que pelo nome parece contrato, alteração ou CNPJ (nunca RG, CNH etc.). Tudo lido por OCR passa pelas mesmas regras. `--sem-ocr` desliga. Documentos longos: 8 primeiras e 4 últimas páginas.
- **Segunda leitura pelo modelo** (Sonnet 5.5, esforço médio, `claude-sonnet-5-5`): só com `--permitir-api` e `ANTHROPIC_API_KEY` no `.env`, e só para o arquivo pertinente que nem o OCR leu (devolveu nada). O modelo transcreve as páginas (8 primeiras e 4 últimas, em memória, nada vai a disco nem a log) e o texto passa pelas mesmas regras. Arquivo que o OCR leu e não é contrato (RG, CNH...) **nunca** é enviado. Recusa, resposta cortada ou ilegível = sem texto. `--max-api <n>` (padrão 200) é o teto de chamadas; estourar aborta a execução. `--dry-run --permitir-api` só conta quantos arquivos iriam, sem enviar. (Substitui o desenho de recortes e mascaramento do ticket 06, que não se aplica a quem o OCR não leu.) Antes da carga real, conferir a política de retenção de dados da conta na Anthropic.

## 9. Download complementar do Drive

Além do ticket 03, foram baixados do Drive: documentos de CNPJ da raiz da empresa e contratos, alterações e equivalentes que o ticket 03 não pegou, em qualquer subpasta, **SN primeiro, depois Tributário**. Filtros: fora documentos de sócios, empresas antigas, MEI, alvará, procuração, prestação de serviços, protocolo, requerimento e pedidos da Receita. Tudo fica em `C:\dados\drive-contratos` (fora do git e do OneDrive), com manifestos `_selecionados*.json` próprios.

## 10. Ambientes e segurança

Por padrão só o Supabase **local**. Produção exige `--producao`, `SUPABASE_PROD_PROJECT_REF` igual ao da URL e confirmação digitada do ref. `--dry-run` não toca em nada externo. Reexecução é segura (CNPJ existente é pulado). Se a gravação falha, os arquivos enviados são removidos; se a resposta se perde mas o cliente foi gravado, nada é apagado. Dados de cliente, `.env` e `saida/` nunca vão para o git.

## 11. Pendências conhecidas (não são regra, são o que falta)

- **54 empresas sem pasta** no Drive: só o usuário pode apontar a pasta.
- **29 com número de alteração repetido** (inclui matriz e filiais que dividem pasta) e **11 com CNPJ divergente** (em parte colisões de nome, por desenho).
- A gravação **sem contrato** (`contrato_social_caminho` nulo) ainda **não foi testada** contra a RPC `criar_cliente` no Supabase local.
- A carga real em produção não foi executada.

## 12. Marco de medição

`--dry-run` nos dados reais, antes do download complementar do item 9: **711 de 945 linhas da lista prontas** (817 têm regime; 120 sem regime; 6 pessoas físicas; 2 ignoradas). A medição com o download complementar fica registrada abaixo quando terminar.
