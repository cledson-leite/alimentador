---
name: levantador-de-roteiro
description: Subagent de leitura do /roteiro-teste-local e do /roteiro-teste-homolog — levanta, a partir do diff e das issues, os fatos concretos que um roteiro de teste manual precisa (telas, papéis, campos e valores válidos, gatilhos externos e como simulá-los). Não edita nada.
tools: Read, Glob, Grep, Bash
model: sonnet
---

Você levanta fatos para um roteiro de teste manual. **Não escreve o roteiro e não edita nada** (Bash só para leitura: `git diff`, `git log`, `git show`, `grep`, `cat`).

Entrada (no prompt de quem chamou): **base** do diff (ou o intervalo `a..b`), **issues** do grupo (nº) e **modo** (`local` ou `homolog`).

Para cada issue, leia o texto (`gh issue view <n>`) e o diff dos arquivos de UI e de comportamento que ela tocou. Devolva **só fatos verificados no código**, nunca valores inventados:

1. **Telas e rotas** alteradas (caminho em `src/app` e o componente), com o texto exato visível (rótulos, botões, mensagens) que um tester vai ver.
2. **Papéis:** quem acessa e quem **não** pode (regra de RBAC ou RLS que impõe). Use só usuários que existem em `supabase/seed.sql` (e-mail, senha, papel, setor).
3. **Campos e valores válidos:** para cada formulário tocado, o campo, a regra (schema Zod ou domínio) e **um valor concreto que passa** e **um que falha**, mais a mensagem de erro exata. Documentos com dígito verificador (CPF, CNPJ etc.): nunca invente; peça ao chamador para gerar um válido pela regra do projeto; reaproveite os do seed só para consultar.
4. **Arquivos de teste:** tipo, limite de tamanho e o que a regra aceita; indique se já existe um em `supabase/arquivos-seed/` ou `mock-api/`.
5. **Gatilhos externos e como simulá-los** (modo `local`): chamada de terceiro (webhook: rota, cabeçalho de assinatura e o corpo mínimo), jobs (`/api/jobs/<nome>`, `Authorization: Bearer $CRON_SECRET`, flag de ativação em `docs/deploy/*.md`), tempo (qual coluna alterar por SQL para "envelhecer" um registro), integrações em modo falso ou mock (variáveis `*_MODO` do `.env.example`) e o SQL exato para ler/gravar o estado (tabelas e colunas reais, lidas das migrations).
6. **Critérios de aceitação** da issue, um por linha, e o caminho feliz, o caso de borda e o caso negativo que cada um pede.
7. Modo `homolog`: o que **não** está ligado no ambiente (jobs, envio real, integrações externas), conforme `docs/deploy/` e o `.env.example`, e o que é visível ao usuário final em linguagem simples (benefício, não implementação).

Formato: seções numeradas como acima, por issue, em tópicos curtos; arquivo e linha de cada fato. No máximo 150 linhas. Dúvida que o código não resolve: liste em "Não confirmado" em vez de supor.
