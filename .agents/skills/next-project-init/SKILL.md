---
name: next-project-init
description: Cria um projeto Next.js novo (App Router, TypeScript, Tailwind, Yarn) e monta a estrutura de pastas da Clean Architecture modular deste time (domain/application/infra/presentation por módulo, mais shared e main globais). Use quando o usuário pedir para criar, iniciar ou dar bootstrap num projeto do zero. Não use num projeto que já existe — para isso use eslint-prettier-clean-arch, test-setup-jest-playwright, generate-env-ts ou graphify-integration, conforme o caso.
---

# Iniciar projeto Next.js + estrutura de pastas

**O projeto é sempre `.`**: todo comando roda com o diretório de trabalho atual como raiz. Ele precisa estar vazio (ou só com `.git` e arquivos de config) antes do passo 2.

Fonte das regras: `docs/arquitetura.md` deste time, seções 1, 3.2 e 3.8. Se o arquivo existir no diretório, leia-o antes de aplicar — ele tem prioridade sobre o texto fixo aqui se algo divergir.

## 0. Pré-requisitos

```bash
node -v
yarn -v
git --version
```

Precisa de Node 20+, Yarn e Git.

## 1. Criar o projeto Next.js

```bash
npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-yarn --yes
```

Notas:
- **Use `npx`, não `yarn create`.** Com Yarn 1.x, `yarn create next-app@latest` falha: o Yarn tenta executar um binário chamado `create-next-app@latest`, que não existe. `npx create-next-app@latest` funciona nas duas versões.
- **`--src-dir` (não `--no-src-dir`).** A arquitetura adota `src/`: `app/` fica em `src/app`, e o resto das camadas (`domain`, `application`, `infra`, `presentation`, `shared`, `main`) mora em `src/`.
- **`--import-alias "@/*"`** aponta para `./src/*` quando combinado com `--src-dir`.
- **`--yes`** responde qualquer pergunta residual com o padrão, então o comando não trava esperando input.
- O comando inicializa o git sozinho, a menos que já exista um repositório. O git é pré-requisito de `graphify-integration`, se essa skill for usada depois.

## 2. Estrutura de pastas (arquitetura.md, seções 3.2 e 4.2)

Crie a árvore com `.gitkeep` em cada pasta (mesmo padrão do Anexo C do documento):

```bash
node -e "for (const d of ['src/shared/kernel','src/shared/errors','src/shared/dtos','src/modules','src/main/client','src/presentation/components/ui','src/presentation/components/atoms','src/presentation/components/molecules','src/presentation/components/organisms','src/presentation/components/templates','src/presentation/components/pages','src/presentation/providers','src/presentation/auth','src/presentation/view-models','src/presentation/stores','src/presentation/hooks','src/presentation/lib','e2e','supabase','docs','scripts']) { require('fs').mkdirSync(d,{recursive:true}); require('fs').writeFileSync(d+'/.gitkeep',''); }"
```

Crie os dois únicos arquivos de código que o documento define na seção 3.8 (o resto da árvore — `result.ts`, `preconditions.ts`, `id.types.ts`, os `*.error.ts` — não tem conteúdo definido no documento; não invente: deixe a pasta vazia até o primeiro módulo precisar):

`src/shared/dtos/error.dto.ts`:
```ts
export type ErrorDto = { code: string; message: string; fields?: Record<string, string[]> };
```

`src/shared/dtos/action-result.dto.ts`:
```ts
import type { ErrorDto } from "./error.dto";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: ErrorDto };
```

Se `docs/arquitetura.md` e `docs/testes.md` existirem em outro lugar (o usuário forneceu, por exemplo, em Downloads), copie-os para `docs/` agora.

## Próximos passos

Depois deste, normalmente entram (cada uma é uma skill separada, invocada quando fizer sentido):
1. `eslint-prettier-clean-arch` — ESLint, Prettier, regras de camada, nomenclatura.
2. `test-setup-jest-playwright` — Jest, RTL, Supertest, Playwright.
3. `generate-env-ts` — se houver `.env.example`.
4. `graphify-integration` — se o usuário quiser o Graphify.

Para rodar tudo isso em sequência de uma vez, use a skill `fullstack-next-bootstrap`.
