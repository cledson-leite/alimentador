# Idioma de comunicação

Responda sempre em português do Brasil (pt-BR), independentemente do idioma dos comandos ou dos arquivos de código.

# Graphify (grafo de conhecimento do código)

Vale para qualquer assistente (Claude Code, Codex, Antigravity, Gemini CLI, Cursor etc.). Quando `graphify-out/graph.json` existir:

- Para perguntas sobre o código, rode primeiro `graphify query "<pergunta>"`; use `graphify path "<A>" "<B>"` para relações e `graphify explain "<conceito>"` para um conceito. Devolvem um subgrafo pequeno, bem menor que `GRAPH_REPORT.md` ou um grep.
- Se `graphify-out/wiki/index.md` existir, use-o para navegação ampla em vez de ler o código bruto.
- Leia `graphify-out/GRAPH_REPORT.md` só para revisão ampla de arquitetura ou quando `query`/`path`/`explain` não bastarem.
- Depois de alterar código, rode `graphify update .` (só AST, sem custo de API).

Sem `graphify-out/`, trabalhe normalmente. A instalação e a inicialização estão na skill `graphify-integration`.
