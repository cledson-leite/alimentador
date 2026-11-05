# Estratégia de Testes

Fonte única das regras de teste do projeto. O `arquitetura.md` define camadas, portas e nomes e **remete a este documento** sem repetir regras de teste; este documento remete de volta às seções de arquitetura de que depende, também sem repeti-las.

**Depende de** (definido em `arquitetura.md`):

- as **portas OUT** da `application` são os pontos de substituição nos testes, e a `application` nunca importa `infra` (seções 3.4 e 3.6);
- Server Actions são a única borda do cliente, e o handler de webhook é o único endpoint HTTP (seção 3.13);
- nomes dos arquivos de teste: `*.spec.ts(x)`, `*.test.ts` e `e2e/*.e2e.ts` (seção 0.2);
- arquivos de teste ficam fora da análise de dependências (Anexo A).

## 1. TDD e definição de pronto

### 1.1 TDD é obrigatório em toda feature

Nenhuma linha de implementação de produção é escrita sem um teste anterior que falhe primeiro (Red → Green → Refactor). Vale para toda unidade de trabalho: caso de uso, entidade, value object, Builder, view, hook/ViewModel, presenter e repositório.

- O ciclo TDD é a prática dentro da fase de implementação do ciclo de desenvolvimento assistido por IA, não uma etapa separada.
- As fases de planejamento e de geração de tarefas produzem as tarefas de teste **antes** das tarefas de implementação correspondentes.
- Tarefa ou PR que entrega implementação sem teste commitado antes (ou junto, na mesma unidade lógica) viola esta regra. Teste escrito depois só para "bater cobertura" não é TDD.

### 1.2 Definição de pronto

Uma tarefa só termina quando:

1. o teste unitário existe e passa, para toda peça com lógica (seção 3);
2. existe teste de integração para **cada fronteira entre camadas que a tarefa criou ou alterou** (seção 4.2);
3. o cenário principal da mudança tem um `*.e2e.ts` **no mesmo diff** (seção 4.3);
4. cobertura e qualidade cumprem a seção 6.

## 2. Pirâmide de testes

```
        /\
       /E2E\          <- Playwright CLI: do diff e regressão completa
      /------\
     /Integr. \       <- Jest (+ Supertest nos webhooks): fronteiras entre camadas
    /----------\
   / Unit/Compo \     <- Jest + RTL: prioridade, maior volume, base da pirâmide
  /--------------\
```

O unitário é o nível priorizado: toda classe, função e método com lógica tem teste (getters triviais não). Integração e E2E cobrem o que o unitário não alcança por definição:

- **Unitário** prova que cada lado se comporta corretamente **isolado**.
- **Integração** prova que os dois lados **se encaixam** quando conectados de verdade.
- **E2E** prova o comportamento observável pelo usuário.

## 3. O que testar, onde e com quê

| Peça ou fronteira | Nível | Ferramenta | Substituições | O que garante |
|---|---|---|---|---|
| `shared`, `domain` (entidades, value objects, Builders, domain services) | Unitário | Jest | nenhuma | Regras e invariantes. Builder e value object rejeitam estado inválido em `build()` / `criar()` e acumulam os erros |
| `application` (casos de uso, mappers de saída) | Unitário | Jest | portas OUT falsas em memória | Orquestração, autorização e DTO de saída |
| Presenter | Unitário | Jest | nenhuma | Formatação e mapeamento (função pura) |
| Views (atoms, molecules, organisms, templates, pages) | Unitário | Jest + RTL | nenhuma (recebem props) | O que é renderizado e como reage a evento. O `ui/` do shadcn **não** é testado |
| ViewModel (hook, store Zustand, schema Zod, queries) | Unitário | Jest + RTL (`renderHook`) | Server Action substituída no limite do módulo `*.actions.ts` | Composição de React Query, Zustand e RHF |
| Container (`*.container.tsx`) | Unitário | Jest + RTL | hook do ViewModel substituído (`jest.mock`) | A View recebe os dados do hook e a ação do usuário chama o hook |
| `presentation` ↔ `application` (Server Action → caso de uso real) | Integração | Jest | o `main` é substituído por uma composição com portas OUT falsas | Input DTO válido e inválido, sessão exigida e `ActionResult` devolvido |
| `application` ↔ `infra` (caso de uso + repositório real) | Integração | Jest | nenhuma; Supabase local | O caso de uso funciona contra a implementação real da porta |
| `infra` ↔ Supabase (repositórios, gateways, mappers Row ↔ entidade, RPC, Realtime, **políticas RLS**) | Integração | Jest (ou Jest + Supertest, o que servir melhor pro caso) | Teste de integração real contra Supabase local, executado dentro da própria suíte — nunca execução manual da ferramenta (ex.: rodar o Supabase CLI à parte). Se for genuinamente impossível rodar, pula o teste e registra uma observação explicando o motivo | SQL, Storage, Auth e Realtime. **Substitui o unitário** desse código |
| Handler de webhook ↔ caso de uso | Integração | Jest + Supertest | provedor externo simulado | Assinatura inválida, idempotência e status HTTP |
| Fluxos afetados pelo diff | E2E do diff | Playwright CLI | nenhuma | A mudança funciona de ponta a ponta |
| Aplicação inteira | E2E completo | Playwright CLI | nenhuma | A mudança não quebrou o que já funcionava |

## 4. Regras por nível

### 4.1 Unitário e componente (`*.spec.ts`, `*.spec.tsx`)

- **Isolamento:** nunca se testa contra o Supabase real, nem client nem server. O ponto de substituição são as portas OUT (`arquitetura.md`, seção 3.6).
- **RTL:** testa comportamento observável pelo usuário (o que é renderizado, o que reage a evento), não detalhe interno do componente.
- **Container:** é um arquivo de poucas linhas que chama o hook do ViewModel e entrega o resultado à View. Todo Container tem **um teste RTL curto**, com o hook substituído por `jest.mock`, que verifica duas coisas: a View recebe os dados que o hook devolve, e uma ação do usuário chama a função do hook. A lógica em si já é testada no hook e na View; este teste só prova que os dois estão ligados. Vale para todo Container, sem exceção.

### 4.2 Integração (`*.test.ts`)

- **Critério:** existe sempre que duas camadas se comunicam por uma fronteira real do sistema, e não apenas por um mock.
- **"Sempre":** toda nova fronteira (novo repositório, gateway, mapper, Server Action, webhook) precisa do teste de integração antes de ser considerada completa. Não é opcional mesmo com boa cobertura unitária, porque unitário e integração respondem perguntas diferentes.
- **`infra`:** com frequência não é testável unitariamente, porque existe para encapsular a dependência externa. Não se força um teste unitário mockando o próprio Supabase; o teste de integração é o substituto legítimo, não um extra.
- **Supertest** é uma ferramenta, não um nível: o teste de webhook que o usa é um teste de integração como os demais e usa o sufixo `*.test.ts`. Só entra onde há HTTP real (o handler de webhook).
- **Ambiente:** Supabase local (seção 5); o próprio teste monta o estado inicial de que precisa.

### 4.3 E2E (`*.e2e.ts`, Playwright CLI)

Há **duas execuções**, com objetivos diferentes:

1. **E2E do diff:** cobre só o que a mudança alterou. Roda `playwright test --only-changed=<branch-base>` (por exemplo, `develop`), que executa os arquivos `*.e2e.ts` adicionados ou alterados no diff. Roda no ambiente Dev (seção 5).
2. **E2E completo (regressão):** roda toda a suíte `e2e/**/*.e2e.ts` no ambiente de homolog, para provar que o diff não quebrou nada que já funcionava. Bloqueia a promoção para `main`. Se a suíte ficar lenta, divida com `--shard`.

**O que faz o E2E do diff funcionar.** O `--only-changed` seleciona **arquivos de teste alterados**, não código-fonte alterado. Por isso toda mudança de comportamento visível ao usuário cria ou atualiza o `*.e2e.ts` correspondente **no mesmo diff** (definição de pronto, seção 1.2). Uma mudança sem E2E no diff não executa nada no passo 1 e só é pega pela regressão completa.

Todo `*.e2e.ts` entra na suíte da regressão completa e ali permanece.

## 5. Ambientes e gitflow

Branches: `main`, `homolog`, `develop` e `feature/*`.

| Ambiente | Onde | Banco | O que roda |
|---|---|---|---|
| **Dev** | Máquina do dev e CI da branch de feature | Supabase local (`supabase start`), com as migrations e o seed do repositório | unitário, integração, E2E do diff |
| **Homolog** | Cópia do ambiente de `main` | Projeto Supabase de homologação, com dados sintéticos | E2E completo |

Fluxo (proposta):

- **PR de `feature/*` para `develop`:** unitário, integração e E2E do diff, todos verdes para o merge.
- **Promoção para `homolog`:** deploy no ambiente de homologação e E2E completo. Só o que passa segue para `main`.

**Banco de homologação.** Precisa espelhar o funcionamento real do sistema sem expor dado crítico:

1. **Projeto Supabase separado**, com URL e chaves próprias. Nenhuma chave de homologação vale em produção, nem o contrário.
2. **Mesmo schema de `main`:** as mesmas migrations, aplicadas pelo pipeline, nunca alteração manual.
3. **Dados sintéticos**, gerados por um seed versionado no repositório. Nenhum dado de produção é copiado para homologação.
4. **Usuários de teste por papel e por unidade**, cobrindo a matriz de RBAC, para que o E2E exercite autorização e RLS de verdade.
5. **Serviços externos** (pagamento, e-mail, provedor de embeddings) em modo sandbox do provedor ou simulados na porta OUT: mesmo comportamento, sem efeito real.
6. **Estado previsível:** o E2E completo começa do seed, com o banco de homologação restaurado antes da execução, e cada teste cria os dados de que precisa, sem depender de ordem.
7. **Paridade:** o Supabase local usa as mesmas migrations e o mesmo seed, então dev, CI e homologação se comportam do mesmo jeito.

## 6. Cobertura e qualidade

Reforça o que a `constitution.md` já define (seção 5.3).

- **Mínimo:** 90% de statement, line e function; 85% de branch.
- **Proibido:** teste que não afirma comportamento real (por exemplo, só instancia um componente sem asserção significativa) e teste redundante que cobre a mesma branch de outro sem motivo.
- **Número não basta:** a revisão de PR verifica se o teste exercita a regra de negócio ou o caminho de erro relevante, e não apenas se passa e soma percentual.

## 7. Configuração

### 7.1 Sufixos

| Nível | Sufixo | Runner | Onde fica |
|---|---|---|---|
| Unitário e componente | `*.spec.ts`, `*.spec.tsx` | Jest, projeto `unit` | ao lado do arquivo testado |
| Integração | `*.test.ts` | Jest, projeto `integration` | ao lado do arquivo testado |
| E2E | `*.e2e.ts` | Playwright | em `e2e/` |

Por que assim:

- Cada nível tem um sufixo próprio, então cada runner encontra só os seus arquivos, sem lista de exceções para manter.
- `*.e2e.ts` não é casado pelo padrão padrão do Playwright (`test|spec`); ele só o encontra porque o `testMatch` declara isso. Assim o Jest e o Playwright não se enxergam por acidente.
- Supertest não tem sufixo próprio (ver seção 4.2).

### 7.2 Jest e Playwright

Verificado: o casamento de arquivos do Jest e do Playwright, e o `--only-changed` em um repositório git de teste. Não verificado: a combinação com `next/jest` e a execução real contra Supabase e homologação.

```js
// jest.config.mjs
const ignorar = ["/node_modules/", "/e2e/"];   // e2e/ é do Playwright

export default {
  projects: [
    {
      displayName: "unit",                        // unitário e componente
      testMatch: ["**/*.spec.{ts,tsx}"],
      testPathIgnorePatterns: ignorar,
    },
    {
      displayName: "integration",                 // integração (inclui os de webhook com Supertest)
      testMatch: ["**/*.test.ts"],
      testPathIgnorePatterns: ignorar,
    },
  ],
};
```

```ts
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.e2e.ts",   // o padrão do Playwright (test|spec) não pega *.e2e.ts
});
```

```json
"test": "jest --selectProjects unit",
"test:int": "jest --selectProjects integration",
"test:e2e": "playwright test",
"test:e2e:diff": "playwright test --only-changed=develop"
```

`test:e2e:diff` precisa do histórico do branch base disponível no CI (clone completo, não raso).
