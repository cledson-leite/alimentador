---
name: graphify-integration
description: Instala, inicializa e atualiza o Graphify (github.com/Graphify-Labs/graphify) — grafo de conhecimento do código que o assistente (Claude Code, Codex, Antigravity, Gemini CLI, Cursor e outros) consulta antes de ler arquivos brutos — num projeto que seja um repositório git. É obrigatório em todo projeto deste time, iniciado no bootstrap e atualizado a cada commit, checkout e push. Use no bootstrap, quando o usuário pedir para inicializar/atualizar o Graphify, ou depois de um git pull (o grafo não atualiza sozinho nesse caso).
---

# Graphify: instalação, inicialização e atualização

O projeto precisa ser um repositório git (`git init` já feito, por exemplo pela skill `next-project-init`).

Conteúdo confirmado direto no `README.md` de [Graphify-Labs/graphify](https://github.com/Graphify-Labs/graphify) (lido via `gh api`, não por resumo automático). **Nomenclatura:** o comando do dia a dia é `graphify`, com um "y" só. `graphifyy`, com dois "y", é *apenas* o nome do pacote no PyPI/uv — usado só na linha de instalação do pacote (passo 1), nunca depois disso.

## 1. Instalar a ferramenta na máquina (uma vez só, fora do projeto)

Precisa do `uv` (gerenciador de pacotes Python; o Graphify roda em Python 3.10+). Instale conforme o sistema:

```powershell
winget install --id=astral-sh.uv -e            # Windows
```

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh   # macOS e Linux
```

Feche e reabra o terminal (o PATH só atualiza assim), depois instale o pacote — **aqui, e só aqui, o nome leva dois "y"**:

```bash
uv tool install graphifyy
```

Se `graphify` não for reconhecido depois de instalado:

```bash
uv tool update-shell
```

Pule este passo se `graphify --version` já funcionar. Alternativa ao `uv`: `pipx install graphifyy` (o README recomenda `uv`/`pipx` em vez de `pip` puro, porque os dois isolam o pacote no próprio ambiente e evitam um `ModuleNotFoundError` se o `pip` instalar num Python diferente do que o Graphify resolve em tempo de execução).

## 2. Inicializar no projeto

Rode dentro de `.`, na raiz do projeto (repositório git). Três passos, nesta ordem — `install` e `hook install` **não criam o grafo sozinhos**:

```bash
# 1. instala a skill do Claude Code neste projeto (não no perfil global do usuário)
#    + ativa o modo estrito: bloqueia a PRIMEIRA leitura bruta de código-fonte
#    da sessão até o grafo ser consultado, depois volta a só sugerir — não
#    trava a sessão inteira, dispara no máximo uma vez por sessão.
graphify install --project --strict

# 2. cria o grafo pela primeira vez, offline e sem custo de LLM
#    (equivalente ao /graphify . rodado dentro do próprio Claude Code)
graphify extract . --code-only

# 3. instala os hooks de git que mantêm o grafo atualizado sozinho
#    + um merge driver, para graph.json nunca mostrar conflito de merge
graphify hook install

# 4. hook de push (política do time: o grafo também é atualizado a cada push)
cp .claude/skills/graphify-integration/pre-push .git/hooks/pre-push
```

`graphify-out/` fica no `.gitignore` (grafo é local). O `pre-push` roda `graphify update .` (só AST, sem custo) e nunca bloqueia o push, mesmo se o Graphify faltar.

`graphify install --project` escreve a própria skill em `.claude/skills/graphify/SKILL.md` (mais um `references/` que ela carrega sob demanda) e configura o hook `PreToolUse` do Claude Code. Neste kit a skill já vem versionada e o hook já está em `.claude/settings.json`, via `.claude/hooks/graphify-guard.mjs`, que não faz nada se o `graphify` não estiver instalado. A regra de consultar o grafo primeiro está em `AGENTS.md`, lido por todos os assistentes.

### Outros assistentes (Codex, Antigravity, Gemini CLI, Cursor…)

O passo 1 acima é o do Claude Code. Para outro assistente, troque-o pelo comando da plataforma (o resto não muda; veja a tabela completa no README do Graphify):

| Assistente | Comando (na raiz do projeto) |
|---|---|
| Codex | `graphify install --project --platform codex` (invoque com `$graphify`; para extração em paralelo, `multi_agent = true` em `[features]` do `~/.codex/config.toml`) |
| Google Antigravity | `graphify antigravity install` |
| Gemini CLI | `graphify install --platform gemini` |
| Cursor | `graphify cursor install` |
| Qualquer framework que leia `.agents/skills` | `graphify install --project --platform agents` |

Nessas plataformas não há `PreToolUse` equivalente ao do Claude Code (exceto Gemini CLI): o guia "consulte o grafo primeiro" chega pelo `AGENTS.md`, que este kit já traz.

Saída em `graphify-out/`: `graph.json` (o grafo), `GRAPH_REPORT.md` (god nodes, conexões inesperadas, perguntas sugeridas) e `graph.html` (visualização interativa).

Confira que os hooks ficaram ativos:

```bash
graphify hook status
```

Se o projeto já tiver rodado `graphify install --project` sem `--strict` antes, rode o comando do passo 1 de novo — ele sobrescreve a configuração anterior (o próprio README trata reinstalar como o caminho normal de atualizar a versão da skill: `uv tool upgrade graphifyy && graphify install`).

## 3. Atualização

| Você faz | O Graphify faz |
|---|---|
| `git commit` | reconstrói sozinho — só AST, sem custo de API |
| `git checkout` / `git switch` (troca de branch) | reconstrói sozinho (um `git checkout -- <arquivo>` isolado não conta) |
| `git pull` / `git merge` | **não atualiza sozinho** — rode `graphify update .` logo depois |
| `git push` | reconstrói sozinho, pelo hook `pre-push` do passo 4 |

```bash
graphify update .
```

Se o usuário pedir só para "atualizar o Graphify" num projeto que já tem `graphify-out/`, este é o único comando necessário — não repita os passos 1–2. Para automatizar, o README sugere um alias de git:

```bash
git config --global alias.gpull '!git pull && graphify update .'
```

## Referência rápida (dentro do Claude Code, depois de instalado)

A própria skill do Graphify já orienta o Claude Code a preferir isto a `Grep`/`Read` cru:

```
/graphify query "<pergunta>"
graphify path "<A>" "<B>"
graphify explain "<conceito>"
```

`GRAPH_REPORT.md` continua disponível para uma visão geral de arquitetura sem nenhuma consulta pontual.
