---
name: eslint-prettier-clean-arch
description: Configura ESLint, Prettier, regras de camada (dependency-cruiser) e o verificador de nomenclatura num projeto Next.js já criado, copiando os arquivos que estão em uso no repositório (templates/config). Use quando o usuário pedir lint/formatação, ordem de imports, diretivas ('use client'/'use server') por tipo de arquivo, regra de dependência entre camadas ou nomenclatura kebab-case por sufixo.
---

# ESLint + Prettier + camadas + nomenclatura

Pressupõe projeto Next.js com `src/` e alias `@/*` (skill `next-project-init`). **O repositório manda:** os arquivos prontos estão em `../fullstack-next-bootstrap/templates/`. Copie-os, não reescreva. Se divergirem de `docs/arquitetura.md` (Anexos A, B, E e seção 3.4), o doc é que se atualiza.

## 1. Instalar

```bash
yarn add server-only
yarn add -D prettier eslint-config-prettier prettier-plugin-tailwindcss @ianvs/prettier-plugin-sort-imports dependency-cruiser typescript@^6
```

`typescript@^6` é exigência: o `dependency-cruiser` não suporta TS 7 (analisa 0 módulos em silêncio).

## 2. Copiar (de `templates/`, para a raiz do projeto)

| De | Para | O que faz |
|---|---|---|
| `config/.prettierrc.json`, `config/.prettierignore` | raiz | estilo e ordem de imports (builtin, react, next, terceiros, `@/app`, `@/presentation`, `@/main`, `@/modules`, `@/shared`, relativos) |
| `config/eslint.config.mjs` | raiz | diretivas por tipo de arquivo, `server-only`, sem API Routes (Anexo B) |
| `config/.dependency-cruiser.cjs` | raiz | acesso entre pastas: domain/application/infra/presentation (Anexo A) |
| `scripts/check-naming.mjs` | `scripts/` | kebab-case por sufixo de papel (Anexo E) |
| `scripts/new-module.mjs` | `scripts/` | cria a árvore de um módulo e o factory no `main` (Anexo C) |

O `eslint.config.mjs` importa nomes de `eslint-config-next`, que mudam entre versões: se o lint quebrar no import, compare com `node -e "console.log(Object.keys(require('eslint-config-next/core-web-vitals')))"` e ajuste os dois imports do topo.

## 3. Scripts

```bash
npm pkg set "scripts.lint=eslint" "scripts.lint:fix=eslint --fix" "scripts.format=prettier --write ." "scripts.format:check=prettier --check ." "scripts.check:deps=depcruise src --config .dependency-cruiser.cjs" "scripts.check:naming=node scripts/check-naming.mjs" "scripts.new:module=node scripts/new-module.mjs"
```

## 4. Conferir

```bash
yarn format && yarn lint && yarn check:deps && yarn check:naming
```
