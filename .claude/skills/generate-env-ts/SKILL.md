---
name: generate-env-ts
description: Gera ou regenera src/env.ts e src/env.client.ts a partir do .env.example de um projeto Next.js, validando cada variável de ambiente com Zod (obrigatória por padrão, schema escolhido pelo nome/formato). Se o .env.example não existir, cria um com PORT=8800 antes de gerar. Use sempre que o .env.example for criado ou alterado, ou quando o usuário pedir validação de variáveis de ambiente / env.ts.
---

# Gerar `env.ts` a partir do `.env.example`

Pressupõe um projeto Next.js com `src/` já existente.

## 0. Se não houver `.env.example`

Não pare. Crie um `.env.example` mínimo na raiz, com a porta do servidor:

```
PORT=8800
```

Isso garante que sempre exista ao menos uma variável para validar, em vez da skill não ter o que fazer. Se o projeto ganhar outras variáveis depois (banco, chaves de serviço etc.), acrescente-as ao `.env.example` e rode esta skill de novo — ela regenera os arquivos a partir do que houver ali no momento.

## 1. Instalar

```bash
yarn add zod
yarn add server-only
```

(Pule qualquer um dos dois que já estiver instalado.)

## 2. Ler e classificar cada variável

Para cada linha `NOME=valor` do `.env.example` (ignore linhas em branco e comentários):

1. **Destino:** nome começando com `NEXT_PUBLIC_` → `src/env.client.ts`; qualquer outro → `src/env.ts`.
2. **Schema Zod**, por nome/valor de exemplo:

| Nome ou valor de exemplo | Schema |
|---|---|
| valor começa com `http://`/`https://`, ou nome termina em `_URL` | `z.url()` |
| nome termina em `_EMAIL` | `z.email()` |
| valor é inteiro, ou nome termina em `_PORT` | `z.coerce.number().int()` |
| valor é `true`/`false` | `z.enum(["true", "false"]).transform((v) => v === "true")` |
| nome é `NODE_ENV` | `z.enum(["development", "test", "production"])` |
| comentário lista valores (`a\|b\|c`) | `z.enum(["a", "b", "c"])` |
| qualquer outro (chaves, segredos, tokens) | `z.string().min(1)` |

3. Toda variável é obrigatória, a menos que um comentário do `.env.example` diga que é opcional (`.optional()`).
4. Crie `env.client.ts` só se houver ao menos uma `NEXT_PUBLIC_*`; nesse caso `env.ts` reexporta com `export * from "./env.client"`.

O código abaixo usa a API do Zod 4 (`z.url()`, `z.email()`, `z.prettifyError`).

## 3. Modelo (adapte às variáveis reais lidas no passo 2)

`src/env.client.ts`:
```ts
import { z } from "zod";

const resultado = z
  .object({
    // uma chave por variável NEXT_PUBLIC_*, na ordem em que aparecem no .env.example
  })
  .safeParse({
    // process.env.NOME literal para cada chave — o Next só troca por valor no bundle do navegador quando o acesso é escrito assim
  });

if (!resultado.success) {
  throw new Error(`Variáveis de ambiente públicas inválidas:\n${z.prettifyError(resultado.error)}`);
}

export const { /* nomes das variáveis */ } = resultado.data;
```

`src/env.ts`:
```ts
import "server-only";
import { z } from "zod";

export * from "./env.client"; // só se env.client.ts existir

const resultado = z
  .object({
    // uma chave por variável que não começa com NEXT_PUBLIC_
  })
  .safeParse({
    // process.env.NOME literal para cada chave
  });

if (!resultado.success) {
  throw new Error(`Variáveis de ambiente inválidas:\n${z.prettifyError(resultado.error)}`);
}

export const { /* nomes das variáveis */ } = resultado.data;
```

A leitura precisa ser um literal `process.env.NOME` para cada chave (não um acesso dinâmico), porque o Next.js só substitui `process.env.NEXT_PUBLIC_*` pelo valor real no bundle do navegador quando o acesso está escrito assim.

## 4. Por que `src/` (raiz) e não outra camada

Isto vale para projetos que seguem a arquitetura Clean Architecture modular deste time (`docs/arquitetura.md`). Se o projeto não seguir essa arquitetura, ignore esta seção e use `src/env.ts` como padrão genérico.

- `shared/`: é TypeScript puro, sem biblioteca (arquitetura.md, seção 3.3) — o Zod quebraria a regra `shared-puro` do Anexo A.
- `domain/`, `application/`, `infra/`: o Anexo A proíbe importar fora do próprio módulo e do `shared`; nenhuma delas deveria acessar env diretamente.
- `main/`: seria o lugar natural (`service_role` só existe ali, seção 3.14), mas o Anexo E só aceita `*.factory.ts` em `main/`, e `env.ts` quebraria `check:naming`.
- `src/` (raiz): sem sufixo obrigatório no Anexo E, sem restrição de quem importa no Anexo A. Na prática só `main`, `src/middleware.ts` e `main/client` o consomem.

O `import "server-only"` em `env.ts` é o que transforma um import indevido do navegador em erro de build, em vez de segredo vazado.

**Ponto em aberto do documento:** `presentation/auth/` só pode importar `@supabase/*` e `shared` (tabela da seção 3.4), mas precisa da URL/chave pública do Supabase. O documento não diz de onde esse arquivo lê essas variáveis — confirme com o usuário antes de decidir, não invente.

## 5. Toda vez que o `.env.example` mudar

Rode esta skill de novo. Ela regenera os dois arquivos a partir do `.env.example` atual — não faz merge incremental.
