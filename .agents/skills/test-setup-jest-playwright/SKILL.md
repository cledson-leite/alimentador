---
name: test-setup-jest-playwright
description: Instala e configura Jest, React Testing Library, Supertest e Playwright num projeto Next.js já criado, copiando os arquivos em uso no repositório (templates/config e templates/tests), com os sufixos de docs/testes.md (*.spec unitário/componente, *.test integração, *.e2e Playwright) e o limiar de cobertura. Use quando o usuário pedir para configurar testes ou citar testes.md.
---

# Jest + RTL + Supertest + Playwright

Pressupõe projeto Next.js com `src/` e alias `@/*`. **O repositório manda:** copie de `../fullstack-next-bootstrap/templates/`; se divergir de `docs/testes.md`, atualize o doc.

## 1. Instalar

```bash
yarn add -D jest @types/jest jest-environment-jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event supertest @types/supertest @playwright/test
yarn playwright install chromium
```

Supertest só entra nos testes de integração de webhook (testes.md 4.2), não é um nível à parte.

## 2. `tsconfig.json`

Acrescente em `compilerOptions.types`, sem sobrescrever o resto: `["jest", "node"]`.

## 3. Copiar

| De `templates/` | Para |
|---|---|
| `config/jest.config.mjs`, `config/jest.setup.ts` | raiz (projetos `unit` e `integration`, cobertura 90/90/90/85) |
| `config/playwright.config.ts` | raiz |
| `tests/exigir-supabase-local.ts`, `tests/admin-supabase-local.ts` | `test-support/` (trava suíte destrutiva fora do Supabase local) |
| `tests/bypass.setup.ts` | `e2e/` (só se o preview da Vercel tiver Deployment Protection) |

O `playwright.config.ts` é genérico: necessidades do projeto (`globalSetup`, permissões do navegador, cabeçalhos extras) entram depois, por decisão dele.

## 4. Scripts

```bash
npm pkg set "scripts.test=jest --selectProjects unit" "scripts.test:int=jest --selectProjects integration --runInBand" "scripts.test:e2e=playwright test" "scripts.test:e2e:diff=playwright test --only-changed=develop" "scripts.test:cov=jest --coverage"
```

`test:e2e:diff` precisa do histórico da base (`develop`): clone completo no CI.

## 5. Conferir

`yarn test` e `yarn test:int` (sem arquivos de teste ainda, "no tests found" conta como sucesso: o que vale é a config carregar). `test:e2e` só depois de existir um `*.e2e.ts`.

As regras de processo (TDD, definição de pronto, o que não se testa) são orientação de escrita, não algo que esta skill instala.
