---
name: importar-contatos-sn
description: Lê a planilha de contatos dos clientes do Simples Nacional e os arquivos de carteira por funcionário, acha cada cliente no Supabase pelo CNPJ e cadastra contatos (vários por cliente), formas de envio e responsáveis SN. Use quando o usuário pedir para cadastrar/importar contatos, formas de envio ou responsáveis dos clientes a partir de planilha.
argument-hint: [--dry-run | --producao | --cnpj <lista>]
---

Comando: `yarn contatos` (`src/main/contatos-cli.ts`, módulo `src/modules/contatos`). Responda em pt-BR.

## Fontes

| O quê | Arquivo (padrão) | Formato |
|---|---|---|
| Contatos | `C:/Users/csbet/Downloads/PLANILHA INFORMAÇÃO CONTATOS NOVA.xlsx` (`--contatos`) | sem cabeçalho: empresa, CNPJ, nome do contato, forma (`WHATS`/`EMAIL`/`ACESSORIAS`), telefone, e-mail |
| Responsáveis | todo `<e-mail-do-perfil>.xlsx` em `Downloads` (`--responsavel` repetível; `--sem-responsaveis` pula) | o nome do arquivo é o e-mail do perfil; o primeiro CNPJ das 4 primeiras colunas de cada linha é um cliente da carteira dele |

A planilha de contatos **não** traz responsável; quem o define é o arquivo de carteira. Perfil de líder de setor não recebe carteira (o banco só aceita funcionário ativo do SN): vira pendência `responsavel_invalido`.

## Como rodar (nesta ordem)

1. **Sempre `--dry-run` primeiro.** `yarn contatos --dry-run --producao` (o `.env` deste projeto aponta para produção). Lê o banco, não escreve, e gera `saida/contatos-simulacao-*.csv`.
2. Mostre ao usuário os totais e as `pendencias` (CNPJ fora do banco, contato sem WhatsApp nem e-mail, conflito de responsável). Só siga com ele de acordo.
3. Carga real: `yarn contatos --producao`. Pede digitar o ref do projeto. **Nunca rode a carga real sem ordem expressa do usuário** nesta conversa. Saída: `saida/contatos-carga-*.csv`.
4. Refazer só alguns clientes: `--cnpj 14digitos,14digitos`.

Sem `--producao` a ferramenta só aceita Supabase local (mesma trava do importador). Teste de integração só no local: `SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_ROLE_KEY=<local> yarn test src/modules/contatos/infra` (com o `.env` de produção ele é pulado).

## Regras (decididas pelo usuário)

- **Cliente** = linha de `clientes` com o mesmo CNPJ (14 dígitos). Fora do banco → `nao_encontrado_no_banco`, nada é criado.
- **Vários contatos por cliente**: linhas repetidas do mesmo CNPJ somam; duas pessoas na mesma linha (`OLI // LU`, `ANDERSON e FERNANDA`, com dois telefones) viram dois contatos; e-mails extras viram contatos próprios. Repetido (mesmo WhatsApp ou e-mail no cliente) conta uma vez.
- **Donos do contato: URA, Simples Nacional e RH.** O contato nasce com `dono_setor = simples_nacional` e é ligado aos três em `cliente_contato_setores`.
- **Forma de envio (canal) vem dos dados do contato, não da coluna "forma"**: só WhatsApp → `whatsapp`; só e-mail → `email`; os dois → `whatsapp_e_email`. Vale para todos, inclusive `ACESSORIAS` e linhas sem forma. Vira `destinos_de_envio` (tipo nulo = todos os tipos) para **SN e RH** (a URA não tem destino). A forma de envio do cadastro operacional do cliente passa a ser a união dos canais dos contatos; é a única coisa que a planilha sobrescreve.
- **Telefone**: só com DDD (10 ou 11 dígitos); celular de 8 dígitos ganha o 9 (regra do Rigoni-contabil); gravado como `(45) 99973-8126`. Inválido → aviso, contato descartado.
- **Nome**: `SETOR// PESSOA` vira `PESSOA (SETOR)` (corrige `FINACEIRO`); sem nome mas com e-mail, o nome vem do e-mail e o CSV marca "nome tirado do e-mail".
- **Responsável SN** (`cliente_responsaveis`, setor `simples_nacional`): um por cliente. CNPJ em dois arquivos → `conflito_entre_arquivos`, ninguém é gravado; cliente que já tem outro responsável não é sobrescrito.
- **Reexecutar é seguro**: contato, setor, destino e responsável que já existem são reconhecidos e pulados.

## O que a ferramenta não faz

- Não edita nem apaga contato existente, não cria cliente, não mexe em contatos de outros setores.
- Não usa as RPCs `contato_gravar`/`salvar_contatos_do_cliente`: elas dependem do usuário logado (`dono_do_novo_contato`). Escreve direto nas tabelas com a `service_role`; os gatilhos do banco continuam valendo.
- Os CSVs (`saida/`) têm dados de clientes e ficam fora do git (repositório público).

## Se o schema mudar

Esta skill foi escrita sobre as migrations do Rigoni-contabil até `20261118100000_ura_contatos_por_setor_e_destinos_de_envio`. Antes de rodar depois de uma migration nova em `cliente_contatos`, `destinos_de_envio`, `cliente_contato_setores` ou `cliente_responsaveis`, releia-a em `C:/Users/csbet/OneDrive/Desktop/Rigoni-contabil/supabase/migrations/` e rode o teste de integração local.
