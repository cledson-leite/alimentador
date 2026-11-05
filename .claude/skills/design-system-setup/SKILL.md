---
name: design-system-setup
description: Monta a base de UI de um projeto Next.js deste time — cn(), providers de tema e React Query, primitivas ui/ no estilo shadcn (cva) e tokens do globals.css — copiando os arquivos em uso no repositório. Use no bootstrap de projeto novo ou quando o usuário pedir design system, tema claro/escuro ou átomos base.
---

# Design system e base de UI

Fonte: `docs/arquitetura.md` §4.4 (Atomic Design), §5 (tokens, tema, cva/cn) e `DESIGN.md`. **O repositório manda:** não há CLI do shadcn nem `components.json`; as primitivas de `ui/` são escritas à mão no estilo shadcn (cva + tokens). Modelo em `../fullstack-next-bootstrap/templates/design/`.

## 1. Instalar

```bash
yarn add class-variance-authority clsx tailwind-merge next-themes @tanstack/react-query lucide-react zustand react-hook-form @hookform/resolvers zod
```

## 2. Copiar (de `templates/design/`)

| De | Para |
|---|---|
| `utils.ts` | `src/presentation/lib/utils.ts` (`cn` = clsx + twMerge) |
| `providers/theme.provider.tsx`, `providers/query.provider.tsx` | `src/presentation/providers/` |
| `ui/button.tsx`, `input.tsx`, `label.tsx`, `select.tsx`, `textarea.tsx` | `src/presentation/components/ui/` |
| `globals.css` | `src/app/globals.css` |

Crie também `providers/app.providers.tsx` (`'use client'`) compondo `ThemeProvider` e `QueryProvider`, e use-o no `src/app/layout.tsx`.

## 3. Regras que valem desde o início

- Cor só por **token semântico** (`--primary`, `--destructive`, `--muted`…) em CSS variables; sem cor crua do Tailwind em componente.
- Dois temas, **light como padrão**, `enableSystem` desligado.
- `'use client'` só em `*.container.tsx`, `providers/`, `ui/`, `error.tsx`, `global-error.tsx` (o lint já impõe).
- **A paleta nasce do sentimento do produto** (`docs/arquitetura.md` §5.1): leia o sentimento que o produto deve transmitir em `PRODUCT.md` (gerado pelo `/esteira-refinar`); se não estiver lá, pergunte ao usuário antes de colorir. Escolha as cores pela teoria da psicologia das cores, em tons pastel, e registre a justificativa em `DESIGN.md`. Os valores do `globals.css` do template são só um ponto de partida neutro: troque-os, mantenha os nomes dos tokens e confira o contraste AA nos dois temas.
- Se um dia adotar o CLI do shadcn, crie o `components.json` com os aliases do Anexo C de `arquitetura.md` antes do primeiro `add`.

## 4. Conferir

`yarn lint && yarn tsc --noEmit && yarn build`
