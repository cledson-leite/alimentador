---
name: atribuir-responsaveis-sn
description: Lê as planilhas de carteira de cada funcionário do Simples Nacional (arquivo nomeado com o e-mail do funcionário), acha cada empresa no Supabase pelo CNPJ e a atribui como responsável SN, só no setor Simples Nacional. Use quando o usuário pedir para atribuir/importar responsáveis dos clientes a partir das planilhas por e-mail.
argument-hint: [--dry-run | --producao | --cnpj <lista>]
---

Comando: `yarn contatos --so-responsaveis` (mesmo CLI de `importar-contatos-sn`, sem ler a planilha de contatos). Responda em pt-BR.

## Fonte

Um arquivo por funcionário em `C:/Users/csbet/Downloads`, **nomeado com o e-mail do perfil** (`fulano@gmail.com.xlsx`). O primeiro CNPJ (`00.000.000/0000-00`) das 4 primeiras colunas de cada linha é uma empresa da carteira dele; o resto do arquivo é ignorado. Sem `--responsavel`, vale todo `*@*.xlsx` da pasta; com ele (repetível) só os arquivos informados.

Hoje: `lentzgabrielly@gmail.com`, `jsskmg15@gmail.com`, `juliadorinirigoni@gmail.com`, `dayanekaziratzi@gmail.com`.

## Como rodar (nesta ordem)

1. `yarn contatos --so-responsaveis --dry-run --producao` (o `.env` aponta para produção). Só lê o banco; gera `saida/responsaveis-simulacao-*.csv`.
2. Mostre os totais e as `pendencias`; só siga com o usuário de acordo.
3. Carga real: `yarn contatos --so-responsaveis --producao` (pede digitar o ref do projeto). **Nunca sem ordem expressa do usuário nesta conversa.**
4. Refazer só algumas empresas: `--cnpj 14digitos,14digitos`.

Sem `--producao` só aceita Supabase local.

## Regras

- Grava em `cliente_responsaveis` com `setor = simples_nacional`; um responsável por empresa.
- O perfil (achado pelo e-mail do arquivo, em `perfis`) precisa ser **funcionário ativo do setor SN**. Líder, outro setor, desativado ou inexistente → `responsavel_invalido`, nada é gravado para aquele arquivo.
- Empresa fora de `clientes` → `nao_encontrado_no_banco`. CNPJ em dois arquivos → `conflito_entre_arquivos` (ninguém é gravado). Empresa que já tem outro responsável → `ja_tem_outro_responsavel` (não sobrescreve). Reexecutar é seguro.
- Responsável é só do setor SN; esta skill não grava responsável de nenhum outro setor.
- Os CSVs de `saida/` têm dados de clientes e ficam fora do git (repositório público).
