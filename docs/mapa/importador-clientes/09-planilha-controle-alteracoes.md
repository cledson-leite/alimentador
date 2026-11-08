# 09 Planilha `2 - CONTROLE ALTERAÇÕES.xlsx`

Tipo: `wayfinder:research` (AFK) · Estado: **fechado** · Bloqueado por: —

## Question

A planilha `2 - CONTROLE ALTERAÇÕES.xlsx`, na raiz do Drive, traz número e data de assinatura das alterações contratuais por empresa? Se traz, com que cobertura e confiabilidade, e ela deve ser fonte de verdade (ou de conferência) no lugar de extrair do documento?

## Contexto

- Não foi lida nem baixada ([03](03-baixar-a-pasta-do-drive.md), "Achado na raiz do Drive").
- No [04](04-prototipo-da-extracao.md), sem OCR só ~6% das empresas têm contrato/alteração legível e a data não sai; o [06](06-motor-de-leitura-de-imagens.md) define o OCR híbrido (US$ 8–20). Se a planilha cobrir bem número e data, o custo e o risco da leitura de imagens caem.
- A planilha tem dado de cliente: baixar só para `C:\dados\drive-contratos` (fora do git e do OneDrive); a pesquisa registra apenas fatos agregados (colunas, cobertura, divergências), sem CNPJ nem nomes.

## Entregáveis

Colunas e abas; nº de empresas cobertas da Lista de empresas; formato de número e data; amostra de conferência contra 5–10 alterações legíveis; recomendação (fonte de verdade, conferência ou ignorar).

## Resolução

Planilha baixada para `C:\dados\drive-contratos\_controle-alteracoes.xlsx` (fora do git). **Recomendação: ignorar como fonte de verdade; não vale nem como conferência geral.**

- **Estrutura:** 9 abas, uma por responsável (BERFON, ENJOY, FOCUS, CERTTO, PACHENKI, VIVIAN PARANHOS, ELEANDRO DIAS, MARLON STA TEREZA, THIAGO PASQUINI), com layouts diferentes. É um log de alterações feitas pela Rigoni, não um histórico das empresas.
- **Tamanho:** 76 linhas não vazias no total. Só **32 linhas têm CNPJ**, de **27 CNPJs**. A aba ENJOY não tem CNPJ; a THIAGO PASQUINI tem só nomes.
- **Período:** todas as datas entre **maio e novembro de 2025**. Alterações anteriores não aparecem.
- **Número da alteração:** texto livre ("13ª ALT", "SEGUNDA ALTERAÇÃO", "DÉCIMA ALTERAÇÃO", "DISTRATO", "ABERTURA"), sem formato único.
- **Cobertura:** 20 dos 27 CNPJs estão na Lista de empresas, **19 entre as 817 carregáveis (~2%)**, e cada um com a alteração mais recente, não com todas.
- **Conclusão para a spec:** o número e a data das alterações continuam vindo dos documentos (OCR híbrido do [06](06-motor-de-leitura-de-imagens.md)). A planilha não reduz o custo nem o risco da leitura de imagens. Se alguém quiser, os 19 casos servem de amostra de conferência do OCR, sem entrar no importador.
