# 06 Motor de leitura de imagens

Tipo: `wayfinder:grilling` (HITL) · Estado: **fechado**

## Question

Os contratos escaneados (PDF sem texto e arquivos de imagem) precisam virar PDF pesquisável com o mesmo conteúdo e formatação; dúvida ou risco de erro de texto manda a empresa para a lista de falhas. Qual é o motor de leitura e que cuidados de segurança ele leva? Aqui "contrato" é só **contrato social e alteração de contrato social**.

## Resolução

**Motor: híbrido, aprovado pelo usuário.** Tesseract local em tudo (gera o PDF com a imagem original mantida e uma camada de texto, então a formatação é idêntica). Sonnet 5.5 (`claude-sonnet-5-5`, esforço médio) só como segunda leitura de data, número da alteração e CNPJ, quando a confiança do OCR nessas regiões for baixa. O campo só é aceito quando as duas leituras concordam; senão a empresa vai para `falhas.csv`. Chave da API só no `.env`, em produção.

**Medidas de segurança (objetivo: o menor risco possível de vazamento; risco zero não é prometido):**
1. **Desligado por padrão.** A API só é chamada com `--permitir-api` e chave no `.env`. O `--dry-run` mostra quantas regiões seriam enviadas e não envia nada.
2. **Só recortes, nunca página inteira:** a região do título/número da alteração, a linha da data final e a linha do CNPJ. Máximo de 3 recortes por documento.
3. **Documento que não é contrato social nem alteração nunca é enviado.** A classificação (RG, título de eleitor, procuração, autorização, guias) é feita pelo OCR local, antes de qualquer envio.
4. **Mascaramento local antes do envio:** pelas caixas de palavras do Tesseract, qualquer trecho com padrão de CPF, RG, CEP, e-mail ou telefone no recorte é coberto por tarja preta.
5. **Nada vai a disco nem a log:** recortes existem só em memória. Logs e CSVs guardam CNPJ da empresa, página, hash e tamanho do recorte e o campo devolvido, nunca o conteúdo da imagem nem o texto lido.
6. **Chave dedicada a este trabalho**, com limite de gasto configurado no painel da Anthropic, validada por Zod, nunca impressa. O teto de chamadas e o de custo por execução abortam a execução ao estourar.
7. **Resposta recusada (`refusal`), inválida ou ambígua não vira dado:** a empresa vai para as falhas.
8. **Testes só com fixtures sintéticas** e a API simulada nos testes unitários; nada de documento real no git.
9. **Fora do controle do código:** a retenção de dados pela API depende da configuração e do contrato da organização com a Anthropic. Antes da carga real, o usuário confere a política de retenção da conta.

**Imagens soltas (observado na letra A):** 97 imagens no total, 48 em pastas de contrato social/alteração, em 14 empresas, e **nenhuma das 14 amostradas era contrato**: eram RG, título de eleitor, autorizações, print da Junta e procuração, com resolução baixa (cerca de 700×900). Regra:
- Cada imagem é classificada pelo OCR, pelo título nas primeiras linhas; imagem que não é contrato social nem alteração é **ignorada** (e nunca enviada).
- Imagens classificadas como contrato, na mesma pasta e com o mesmo nome-base mais um número de sequência, formam **um só documento** (um PDF, páginas em ordem natural do nome). Imagem avulsa vira PDF de uma página.
- Lado maior da imagem abaixo de 1.000 px, grupo com sequência quebrada ou tipos misturados: empresa vai para as falhas.

**Pontos que ficam como padrão técnico da spec (sem pergunta ao usuário):** limiar de confiança do OCR a calibrar no piloto com fixtures; leitor de `.doc` (Word 97) por biblioteca Node (por exemplo `word-extractor`), sem LibreOffice, e `.doc` ilegível vai para as falhas.
