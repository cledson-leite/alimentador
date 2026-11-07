# Glossário do domínio

Linguagem oficial do projeto: cada termo tem um significado único, e o código, as issues e a documentação usam só esses nomes. Preencha a cada termo novo decidido (skill `domain-modeling`; decisões duradouras viram ADRs em `docs/adr/`).

## Language

### Carga de clientes

**Lista de empresas**:
A planilha que define o universo da carga: nome e CNPJ de cada empresa a importar. Serve só para localizar a empresa no Drive; `empresa` e `cnpj` gravados vêm do contrato.
_Avoid_: cadastro de clientes, base de clientes.

**Planilha SN**:
O "CONTROLE SIMPLES NACIONAL". Só a aba "Patriki 102026" vale: ela é a lista atualizada das empresas ativas no regime `simples_nacional`. As outras abas são histórico. CNPJ que só existe nela e não está na Lista de empresas não é importado.
_Avoid_: lista de clientes ativos.

**Planilha tributária**:
O "TRIBUTARIO EMPRESAS": diz quais CNPJs da Lista de empresas são `lucro_presumido` ou `lucro_real`. Quando a empresa também consta na Planilha SN, vale a Planilha tributária (ela saiu do Simples Nacional).
_Avoid_: lista de lucro.

**Contrato social**:
Documento base da empresa. Quando a empresa só tem alterações, a mais recente (ou única) ocupa esse lugar e continua também como Alteração contratual.
_Avoid_: estatuto.

**Alteração contratual**:
Documento que altera o contrato social, com número de sequência único por empresa (1, 2, 3...) e a data de assinatura que aparece no fim do documento. Sem número no conteúdo nem no nome do arquivo, vale 1. A mesma alteração costuma estar na pasta em mais de um formato (PDF e DOC/DOCX): é um documento só, e o PDF predomina.
_Avoid_: aditivo.

**Lista de falhas**:
`falhas.csv`: empresas que não foram carregadas por qualquer problema (pasta não achada, documento escaneado, divergência de CNPJ ou nome, número ou data ambíguos), com o motivo, para refazer sob orientação manual.
_Avoid_: erros, rejeitadas.

**Regime a confirmar**:
`regime-a-confirmar.csv`: empresas da Lista de empresas que não estão na Planilha SN. Não são carregadas até alguém informar o regime delas.
_Avoid_: pendentes.
