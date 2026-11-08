# 02 Pesquisa: como baixar a pasta do Drive em massa

Tipo: `wayfinder:research` (AFK) · Estado: **fechado** · Bloqueado por: —

## Resolução

Detalhe em [docs/pesquisa/download-do-drive.md](../../pesquisa/download-do-drive.md).

- **Ferramenta:** `gdown` em Python 3.12, sem credencial. Lista primeiro com `download_folder(skip_download=True)`, filtra por regex no caminho (subpastas de contrato e arquivos soltos) e baixa só os escolhidos, um a um, com `--continue --retries 5`.
- Sem o limite de 50 arquivos por pasta; depende de a pasta estar como "Qualquer pessoa com o link". Falha em um arquivo não interrompe os outros.
- Retomada: `--continue` pula completos e reaproveita parciais. O Drive derruba conexões longas após ~1 h; erros de permissão e cota não são repetidos.
- Descartados: rclone (só acesso autenticado); Drive API com chave fica como plano B (não confirmado em fonte oficial).
- **Em aberto (vai para o ticket 03):** tamanho total não estimado; limite de "muitos downloads" (~24 h) e exportação de Google Docs nativos sem fonte primária verificada.

## Question

A pasta pública `https://drive.google.com/drive/folders/1AEJT19SSJ54Rjop5KvrBwfVWsJti5n8Y` (subpastas `A` a `Z` > empresa > subpasta de contratos) pode ser baixada em massa sem credencial do usuário? Qual a melhor ferramenta no Windows (gdown, rclone com link público, Drive API com chave, outra), como filtrar para baixar só as subpastas de contrato e os arquivos soltos, quais limites (cota, tamanho total estimado, 50 arquivos por pasta em algumas ferramentas) e como retomar um download interrompido? Resultado em `docs/pesquisa/download-do-drive.md`, com recomendação única.
