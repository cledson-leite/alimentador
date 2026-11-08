# 07 Política quando nenhum documento da pasta traz CNPJ

Tipo: `wayfinder:grilling` (HITL) · Estado: **fechado** · Bloqueado por: —

## Question

Quando a pasta casou com a empresa (regra estrita ou candidata) mas **nenhum documento** dela traz CNPJ no texto, o importador aceita a empresa ou a manda para `falhas.csv`?

## Contexto

- O contrato social original muitas vezes não tem CNPJ (ele nasce depois do registro); as alterações costumam trazê-lo. Ver [03](03-baixar-a-pasta-do-drive.md), "Aprendizado para a spec".
- Medido em 34 candidatas: 23 confirmadas, **6 sem CNPJ no texto digital** (nenhuma contradiz), 5 só escaneadas (dependem do OCR do [06](06-motor-de-leitura-de-imagens.md)).
- A decisão vale para os dois casos: pasta casada pela regra estrita e pasta "candidata".
- Hoje a regra do [01](01-regras-de-negocio-do-importador.md) exige divergência de CNPJ ou nome → `falhas.csv`; aqui o caso é **ausência**, não divergência.

## Correção posterior (substitui a resolução abaixo)

**CNPJ ausente nos documentos NÃO reprova: a empresa é carregada com o CNPJ da lista** (decisão do usuário: se está na lista tem CNPJ e razão social, a pasta existe no Drive e o regime vem das planilhas). Só um CNPJ **diferente** nos documentos reprova (divergência). Quando o nome não sai do documento, vale a razão social da lista, sem as anotações do escritório.

## Resolução (original, superada)

**Decisão do usuário: vai para `falhas.csv`.** Se nenhum documento da pasta traz CNPJ no texto (ou na leitura de imagens do [06](06-motor-de-leitura-de-imagens.md)), a empresa não é carregada, seja a pasta casada pela regra estrita ou "candidata". Motivo na lista: "nenhum documento traz CNPJ". O usuário confirma a pasta e refaz com `--cnpj`.

- Vale para a **ausência** de CNPJ; a **divergência** continua falha pelo [01](01-regras-de-negocio-do-importador.md).
- Consequência: as 6 candidatas sem CNPJ no texto e parte das 5 só escaneadas (que dependem do OCR) podem cair em `falhas.csv`; a spec deve dizer que isso é esperado.
