# Download em massa da pasta pública do Drive

## Recomendação

Use **gdown (Python 3.12) em dois passos**, sem credencial:

1. Listar: `gdown.download_folder(id=..., skip_download=True)` devolve `(id, path, local_path)` de cada arquivo sem baixar nada. Filtre em Python pelo `path` (Letra > empresa > subpasta de contrato, mais os arquivos soltos), usando um padrão tolerante ao nome variável da subpasta (por exemplo, regex em `contrat`, sem diferenciar maiúsculas).
2. Baixar só os selecionados, um a um, com `gdown --continue --retries 5 "https://drive.google.com/uc?id=<ID>" -O <destino>`. Isso evita baixar o que não interessa e permite retomar arquivo por arquivo.

Instalação: `py -3.12 -m pip install gdown`. Não precisa de rclone, gcloud nem chave de API.

Alternativa (plano B): Drive API v3 com chave de API, só se o gdown falhar. Não adotada porque a documentação oficial de `files.list` e de autorização só cita escopos OAuth e não confirma o uso de chave para arquivos públicos (não verificado). rclone fica descartado: sem credencial própria, a doc dele só cobre acesso autenticado (OAuth ou service account) e o client_id compartilhado "will stop working during 2026".

## Fatos e fontes

- **Acesso sem credencial**: o código do `download_folder` (gdown) não tem tratamento de login; lê a visão pública da pasta e exige o compartilhamento "Qualquer pessoa com o link". Fonte: https://github.com/wkentaro/gdown/blob/main/gdown/download_folder.py
- **Limite de 50 arquivos**: não existe no código atual (sem constante nem teto de contagem). Se aparecer em versão antiga, atualize com `pip install -U gdown`. Falha de um arquivo não interrompe os demais; os erros saem juntos ao final (`DownloadError`). Mesma fonte.
- **Retomada**: `--continue` reaproveita downloads parciais e pula arquivos completos; `--retries N` (padrão 0) usa backoff exponencial com jitter, teto de 30 s. Em pasta, falha esgotada em um arquivo não impede os outros. Se o servidor recusar o intervalo de bytes, o gdown para o arquivo e mantém o parcial. Na API Python, `resume=True` equivale. Fonte: https://github.com/wkentaro/gdown (README, FAQ).
- **Limitações**: o Drive encerra conexões longas após cerca de 1 hora (use `--continue` e `--retries`); erros de permissão e de cota não são repetidos; a listagem da pasta e o `--json` não têm retry. Fonte: README do gdown.
- **Cota da API oficial (se usar o plano B)**: 325.000 unidades/min por usuário por projeto, 1.000.000/min por projeto; cada download custa 200 unidades; 403 "User rate limit exceeded" e 429 pedem backoff exponencial com jitter de até 1.000 ms. Fonte: https://developers.google.com/workspace/drive/api/guides/limits
- **Sem limite diário por usuário documentado** na página de limites da API. O gdown não usa a API, então vale o limite não documentado de "Too many users have viewed or downloaded this file" do Drive: se ocorrer, esperar ~24 h ou copiar o arquivo para outro Drive (não verificado em fonte primária).
- **Plano B, detalhes**: `files.list` aceita `q` e `pageSize` até 1000, com `pageToken` para paginar; `files.get?alt=media` baixa blobs e aceita cabeçalho `Range` para retomar; arquivos Google Docs/Sheets só exportam até 10 MB via `files.export`. Fontes: https://developers.google.com/workspace/drive/api/reference/rest/v3/files/list e https://developers.google.com/workspace/drive/api/guides/manage-downloads
- **Tamanho total**: não estimado (a pasta não foi baixada nem listada). Descobrir no passo 1: a listagem com `skip_download=True` não traz tamanhos; para somar, seria preciso a API ou baixar. Em aberto.

## Pontos em aberto

- Se os arquivos soltos incluem Google Docs/Sheets nativos: o gdown baixa esses via exportação; confirmar o formato desejado no passo 1.
- Rodar o passo 1 e checar a contagem de arquivos antes de baixar.
