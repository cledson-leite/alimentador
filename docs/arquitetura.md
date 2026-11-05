# Arquitetura

Fonte da verdade das decisões de arquitetura do projeto: backend (núcleo), frontend, design system e cache. Escrito para ser lido por pessoas e por agentes de IA.

- Regras marcadas com **[lint]** são verificadas automaticamente (Anexos A, B e E) e falham o CI.
- Itens marcados com **[pendente]** esperam decisão (seção 8). No momento não há nenhum.
- Fora do escopo deste documento: estratégia de testes (`testes.md`, fonte única das regras de teste), segurança (`seguranca.md`), busca, ferramental de IA e fluxo de trabalho (`constitution.md` / `CLAUDE.md`), quando o projeto os tiver.

---

## 0. Vocabulário e nomenclatura

### 0.1 Vocabulário

| Termo | Significado neste projeto |
|---|---|
| **domain** | A camada de domínio da Clean Architecture (entidades, builders, value objects, agregados). Nunca é usado para dizer "assunto" ou "área do negócio". |
| **módulo** | Uma área do negócio isolada (`pedidos`, `faturamento`, `clientes`). Tem as camadas `domain`, `application`, `infra` e `presentation`. |
| **tela / feature** | O assunto de uma tela (lista de pedidos, cadastro de cliente). |
| **Porta IN** | Interface de um caso de uso: o que o mundo externo pede à `application`. |
| **Porta OUT** | Interface de uma dependência que a `application` precisa (repositório, gateway, sessão). Implementada só na `infra`. |
| **View** | Componente do Atomic Design (atom, molecule, organism, template, page). Burra: recebe props e devolve JSX. |
| **ViewModel** | Tudo que dá inteligência a uma tela: hooks, Server Actions, stores, queries, schemas, presenter. É a única camada da apresentação que conversa com a `application`. |
| **Container** | Componente `'use client'` de poucas linhas que liga um ViewModel a uma View. |
| **Presenter** | Função pura que transforma um Output DTO em props prontas para exibição. |
| **Loader** | Função assíncrona de servidor (`*.server.ts`) que busca a carga inicial de uma tela. |
| **DTO** | Objeto simples e serializável que atravessa fronteiras de camada. Nunca contém comportamento. |

### 0.2 Regras de nomenclatura **[lint]**

Convenções globais de nomes de arquivos e diretórios, aplicáveis a qualquer spec. A verificação automática está no Anexo E.

**Regra geral**

- Nomes de arquivos e diretórios em `kebab-case`, sempre minúsculas.
- Nomes indicam **responsabilidade**, não implementação.
- Quando fizer sentido, o sufixo explicita o papel do arquivo.
- Proibido `PascalCase`, `camelCase` ou mistura de maiúsculas em diretórios.

Exemplos de diretórios válidos: `shared`, `pages`, `examples`, `customer-settings`.

**Sufixos recomendados e seu uso neste projeto**

| Sufixo | Uso na regra | Neste projeto |
|---|---|---|
| `*.entity.ts` | entidades de domínio | `domain/entities/` |
| `*.vo.ts` | value objects | `domain/value-objects/` |
| `*.repository.ts` | contratos ou implementações de repositório | contrato em `application/ports/out/`; implementação em `infra/repositories/` (mesmo nome, camadas diferentes) |
| `*.use-case.ts` | casos de uso | `application/use-cases/` |
| `*.service.ts` | serviços de domínio ou serviços do Nest | serviços de domínio em `domain/services/` (o projeto não usa Nest) |
| `*.provider.ts` | interfaces (portas) | portas IN e OUT em `application/ports/in/` e `ports/out/`; o arquivo exporta uma interface cujo identificador termina em `Port` |
| `*.controller.ts` | controllers | não usado (sem Nest); os equivalentes são `*.actions.ts` e `*.webhook.ts` |
| `*.middleware.ts` | middlewares | não usado; `middleware.ts` (ou `proxy.ts`) do Next mantém o nome exigido |
| `*.guard.ts` | guards | não usado (sem Nest). As pré-condições de `shared` ficam em `preconditions.ts` para não confundir |
| `*.factory.ts` | fábricas para clientes, adapters, instâncias ou objetos complexos | `main/` (inclusive `main/client/`) e fábricas de cliente (`supabase-server.factory.ts`, `supabase-browser.factory.ts`) |
| `*.config.ts` | arquivos de configuração | `next.config.ts`, `jest.config.ts`, `playwright.config.ts` |
| `*.types.ts` | tipos auxiliares | `shared/kernel/id.types.ts` |
| `*.page.tsx` | páginas | Pages do Atomic Design em `presentation/components/pages/`. O `page.tsx` do Next é exceção (nome exigido) |
| `*.component.tsx` | componentes | atoms, molecules, organisms e templates. **O nível vem da pasta, não do sufixo** |
| `*.context.tsx` | contextos React e hooks associados | só no `ui/` ou no Container (seção 4.10) |
| `*.provider.tsx` | providers de composição, wrappers globais, integração de runtime | `presentation/providers/` (`theme.provider.tsx`, `query.provider.tsx`); `app.providers.tsx` compõe todos |
| `*.hook.ts` | hooks | hook do ViewModel (`use-criar-pedido.hook.ts`) e demais hooks |
| `*.store.ts` | stores | Zustand |
| `*.spec.ts` | testes automatizados | testes unitários e de componente (`*.spec.tsx` quando o teste usa JSX, com RTL) |

**Sufixos adicionais deste projeto** (a regra pede sufixo que explicite o papel; estes cobrem papéis que a tabela não tem, e vários são usados pelo lint):

| Sufixo | Uso |
|---|---|
| `*.aggregate.ts`, `*.builder.ts`, `*.event.ts` | raiz de agregado, Builder de entidade, evento de domínio |
| `*.error.ts` | erros (`shared/errors/`, `domain/errors/`) |
| `*.dto.ts` | DTOs (`application`, `infra` e `shared`) |
| `*.mapper.ts` | mappers (`application` e `infra`) |
| `*.gateway.ts` | adaptadores de serviços externos e de Realtime (`infra/gateways/`, `infra/realtime/`) |
| `*.schema.ts` | schemas Zod de formulário |
| `*.queries.ts` | React Query: chaves e hooks |
| `*.presenter.ts` | presenters |
| `*.container.tsx` | Containers (`'use client'`) |
| `*.actions.ts` | Server Actions |
| `*.server.ts` | loaders de servidor |
| `*.realtime.ts` | assinatura Realtime no ViewModel |
| `*.webhook.ts` | handlers de webhook |
| `*.test.ts` | testes de integração (inclui os de webhook, feitos com Supertest) |
| `*.e2e.ts` | testes E2E, em `e2e/` |

**Exceções controladas.** Nomes exigidos por ferramentas ou convenções externas mantêm o formato original:

- `README.md`, `SKILL.md`, `CLAUDE.md`, `package.json`, `tsconfig.json`, `spec.md`, `components.json`, `.env.example`, `.dependency-cruiser.cjs`, `eslint.config.mjs`;
- arquivos de convenção do Next.js: `layout.tsx`, `page.tsx`, `loading.tsx`, `error.tsx`, `global-error.tsx`, `not-found.tsx`, `route.ts`, `globals.css`, `middleware.ts` (ou `proxy.ts`);
- pastas de rota do Next.js: `[id]`, `[...slug]`, `(grupo)`, `@slot`;
- arquivos gerados pelo shadcn em `presentation/components/ui/`, `presentation/lib/` e `presentation/hooks/`: só `kebab-case`, sem sufixo.

Fora dessas exceções, prefira sempre `kebab-case`.

**Regra de decisão.** Se um nome estiver ambíguo, prefira a forma que deixe mais claro o que o arquivo representa, em que camada ele vive e qual a responsabilidade principal.

**Como a regra se aplica aqui**

- **Responsabilidade, não implementação:** o arquivo é `pedido.repository.ts` em `infra/repositories/`, não `supabase-pedido.repository.ts`. A tecnologia aparece no identificador da classe (`SupabasePedidoRepository`); a camada, no caminho.
- **Identificadores no código** (classes, tipos, funções) seguem a convenção usual do TypeScript (PascalCase para classes e tipos, camelCase para funções e variáveis). A regra trata apenas de nomes de arquivos e diretórios.
- **Testes:** o sufixo de cada nível de teste (`*.spec.ts`, `*.test.ts`, `*.e2e.ts`) e a configuração dos runners estão em `testes.md` (seção 7).
- **O que o verificador não pega:** "responsabilidade, não implementação" e nomes ambíguos dependem de revisão humana. O script confere formato, pasta e sufixo.

---

## 1. Stack e premissas

| Área | Tecnologia |
|---|---|
| Framework | Next.js 16 (fixar `next@^16`; a documentação consultada é da 16.3.5) com App Router e `cacheComponents: true` (Cache Components). Em v15 a seção 6 precisaria ser reescrita. |
| Linguagem | TypeScript em modo `strict` |
| Banco e serviços | Supabase: Postgres, Auth, Realtime, Storage, RBAC + RLS |
| Estilo | Tailwind CSS, shadcn/ui, `class-variance-authority` (cva), `cn()` (clsx + tailwind-merge) |
| Estado e dados no cliente | React Query, Zustand, React Hook Form, Zod |
| Tema e fonte | `next-themes`, `next/font` |
| Testes | Jest, React Testing Library, Supertest e Playwright CLI (regras em `testes.md`) |

Premissas:

1. **Sem API Routes.** Não existe `route.ts` em `src/app`, exceto webhooks de terceiros em `src/app/api/webhooks/**` (seção 3.13). Toda comunicação cliente→servidor é Server Action; a carga inicial vem de Server Components. **[lint]**
2. **Monólito modular por domínio.** Um deploy, módulos isolados entre si.
3. **Clean Architecture clássica** dentro de cada módulo: `domain`, `application`, `infra`, `presentation`, mais `shared` e `main` globais.
4. **Server Components são o padrão absoluto.** Cliente só onde é exigido (seção 4.6).

---

## 2. Princípios que governam o código

Valem para todo o projeto. Os detalhes de cada um ficam na `constitution.md`; aqui está o que muda na prática da arquitetura.

- **Clean Code:** nomes que revelam intenção, funções pequenas, sem comentário que explique código confuso (reescreva o código).
- **SOLID:** uma responsabilidade por classe; dependa de abstrações (portas), nunca de implementações; extensão por novas implementações de porta, não por `if` em código existente.
- **DRY, KISS, YAGNI:** sem abstração antes da segunda repetição real; sem camada vazia. Uma feature de leitura trivial não ganha entidade nem builder só para "cumprir o padrão" (ver read models na seção 3.6).
- **Object Calisthenics** (rigor em `domain` e `application`; na `presentation` valem as regras 1, 2, 5, 6 e 7):
  1. um nível de indentação por método;
  2. sem `else`;
  3. encapsular primitivos e strings (value objects);
  4. coleções de primeira classe;
  5. um ponto por linha (lei de Demeter);
  6. sem abreviações;
  7. entidades pequenas;
  8. poucas variáveis de instância por classe (o objeto de props conta como uma);
  9. sem setters e sem expor estado mutável (*Tell, Don't Ask*). **Decisão:** entidades podem expor **getters somente leitura** (os mappers precisam ler o estado); todo comportamento continua em métodos da própria entidade, nunca em código externo que decide por ela.
- **Padrões GoF:** usados quando o problema pede, não por decoração. Os recorrentes aqui: **Builder** (criação de entidades), **Adapter** (infra implementando portas OUT, mappers), **Strategy** (variação de regra), **Factory** (composição no `main`).

---

## 3. Backend (núcleo)

### 3.1 Visão

Cada módulo é uma fatia de Clean Architecture (hexagonal): o `domain` no centro, a `application` em volta orquestrando casos de uso por portas, a `infra` implementando as portas OUT, e a `presentation` como adaptador de entrada integrado ao Next.js. Dois diretórios globais completam o desenho: `shared` (utilidades genéricas) e `main` (injeção de dependências).

### 3.2 Estrutura de pastas

```
src/
├─ app/                          convenções do Next.js apenas (layout, page, loading, error, globals.css)
│  └─ api/webhooks/<provedor>/route.ts   única exceção: webhooks de terceiros (seção 3.13)
├─ middleware.ts                 (proxy.ts no Next 16) somente refresh de sessão do Supabase
├─ shared/                       TypeScript puro, sem framework e sem biblioteca
│  ├─ kernel/    result.ts · preconditions.ts · id.types.ts (Brand, Id)
│  ├─ errors/    app.error.ts · domain.error.ts · validation.error.ts · forbidden.error.ts
│  └─ dtos/      action-result.dto.ts · error.dto.ts · paginated.dto.ts
├─ modules/
│  └─ <modulo>/
│     ├─ domain/
│     │  ├─ aggregates/       raízes de agregado (quando há entidades filhas)
│     │  ├─ entities/         construtor privado
│     │  ├─ builders/         públicos, único caminho de criação
│     │  ├─ value-objects/    imutáveis, auto-validados
│     │  ├─ services/         regras que não cabem em uma entidade (ex.: autorização hierárquica)
│     │  ├─ events/           somente quando houver necessidade real
│     │  └─ errors/
│     ├─ application/
│     │  ├─ ports/in/         interfaces dos casos de uso + Input/Output
│     │  ├─ ports/out/        repositórios, gateways, sessão, relógio
│     │  ├─ use-cases/        implementam as portas IN
│     │  ├─ dtos/             Output DTOs compartilhados entre casos de uso
│     │  └─ mappers/          entidade → Output DTO
│     ├─ infra/
│     │  ├─ repositories/     implementam portas OUT de persistência
│     │  ├─ gateways/         implementam portas OUT de serviços externos
│     │  ├─ realtime/         adaptadores que rodam no navegador (Realtime); sem código server-only
│     │  ├─ dtos/             Row DTOs + schemas Zod do formato da tabela
│     │  └─ mappers/          Row ↔ entidade (chamam o Builder)
│     └─ presentation/
│        ├─ view-models/<tela>/   ver seção 4
│        └─ webhooks/             handlers de webhook (<provedor>.webhook.ts)
├─ main/                         injeção de dependências
│  ├─ <modulo>.factory.ts        server-only
│  ├─ supabase-server.factory.ts server-only
│  └─ client/                    factories seguras para o navegador (Realtime)
└─ presentation/                 UI global: views, providers, stores, view-models do shell e auth/ (seção 4)

e2e/  supabase/  docs/  scripts/  CLAUDE.md
```

`src/` é opcional no Next.js. Adotamos porque a raiz também abriga `supabase/`, `e2e/`, `docs/` e arquivos de configuração. Nunca mantenha `app/` na raiz e em `src/` ao mesmo tempo.

### 3.3 Responsabilidade de cada camada

| Camada | Faz | Não faz |
|---|---|---|
| `shared` | Pré-condições (*guard clauses*), `Result`, erros base, DTOs genéricos (`ActionResult`, paginação), helpers puros | Regra de negócio de qualquer módulo; importar framework, Supabase ou React |
| `domain` | Entidades, agregados, value objects, builders, domain services, regras e invariantes | Saber que existe banco, HTTP, React ou Next |
| `application` | Casos de uso, portas IN e OUT, DTOs de entrada/saída, orquestração e autorização | Acessar Supabase, importar `infra` ou `presentation` |
| `infra` | Implementar portas OUT (Supabase, serviços externos), validar linhas com Zod, mapear Row ↔ entidade | Regra de negócio; ser chamada por quem não seja `main` |
| `presentation` | ViewModels e Views (seção 4) | Importar `domain` ou `infra` |
| `main` | Criar instâncias e injetar dependências | Conter lógica |

### 3.4 Regras de dependência **[lint]**

Cada regra vale para a pasta inteira, incluindo subpastas. "Própria" significa o mesmo módulo.

| Camada | Pode importar | Proibido |
|---|---|---|
| `shared` | só `shared` | tudo mais, inclusive bibliotecas |
| `domain` | `shared`, `domain` própria | `application`, `infra`, `presentation`, `main`, `app`, qualquer biblioteca |
| `application` | `shared`, `domain` e `application` próprias | `infra`, `presentation`, `main`, `app`, bibliotecas |
| `infra` | `shared`, `domain`, `application` e `infra` próprias; bibliotecas (Supabase, Zod) | `presentation`, `main`, `app` |
| `main` | `application` e `infra` de qualquer módulo, `shared` | `domain` diretamente, `presentation` |
| view-model | `shared`, tipos de `application` | `domain`, `infra`, `main` (exceto os arquivos das duas linhas abaixo) |
| `*.actions.ts`, `*.server.ts`, `*.webhook.ts` | `main` (servidor), `shared`, tipos de `application` | `domain`, `infra`, `main/client` |
| `*.realtime.ts` | `main/client`, `shared`, tipos de `application` | `domain`, `infra`, `main` de servidor |
| `main/client` | `application`, `infra` (incluindo `infra/realtime`), `shared` | `main` de servidor, `server-only` |
| `presentation/auth/` | `@supabase/*` (cliente do navegador), `shared` | consultas de dados; `main` |
| Views | `shared`, `presentation/components` (níveis abaixo) | `modules/`, `main`, `next/*` (exceto `next/link` e `next/image`), hooks |
| `app/` | `presentation`, containers de módulo, `shared` | `main`, `domain`, `application`, `infra` |

Regras adicionais:

1. **Módulos não se importam.** Só `app/` e `main/` enxergam mais de um módulo (seção 3.11).
2. **Só `main` importa `infra`.** Só `*.actions.ts`, `*.server.ts` e `*.webhook.ts` importam `main` (servidor); só `*.realtime.ts` importa `main/client`.
3. **A entidade de domínio nunca sai da `application`.** Ela cruza `application`↔`infra` pelas portas OUT (ambas conhecem o `domain`), mas nunca chega à `presentation`: o que sai é sempre um Output DTO.
4. **Importe `import type` para interfaces** e mantenha `tsPreCompilationDeps: true` na configuração do lint, senão importações só de tipo ficam invisíveis.
5. **`@supabase/*` só em `infra`, `main` e `presentation/auth/`.**

### 3.5 Entidades, Builders, Value Objects e Agregados

**Entidade.** Construtor **privado**. Sem setters. Expõe **getters somente leitura** para os mappers. Todo comportamento é método da entidade.

**Builder.** Público, fluente, é o **único caminho de criação e de reconstituição** de uma entidade. A entidade entrega ao Builder uma função de criação por um método estático (que enxerga o construtor privado); sem essa função, ninguém instancia a entidade. O `tsc` recusa `new Pedido(...)` fora da classe.

```ts
// domain/entities/pedido.entity.ts
export type PedidoProps = { id: PedidoId; nome: NomeCompleto; papel: Papel; unidadeId?: UnidadeId };

export class Pedido {
  private constructor(private readonly props: Readonly<PedidoProps>) {}
  static builder(): PedidoBuilder { return new PedidoBuilder((p) => new Pedido(p)); }
  get id(): PedidoId { return this.props.id; }
  get nome(): NomeCompleto { return this.props.nome; }        // getters somente leitura
  transferirPara(unidade: UnidadeId): Result<Pedido> { /* comportamento, invariantes */ }
}

// domain/builders/pedido.builder.ts
export class PedidoBuilder {
  constructor(private readonly criar: (p: PedidoProps) => Pedido) {}
  comNome(n: string): this { /* NomeCompleto.criar(n) */ return this; }
  comPapel(p: string): this { /* Papel.criar(p) */ return this; }
  restaurar(dados: PedidoPersistido): this { /* reconstitui a partir da persistência (valores primitivos) */ return this; }
  build(): Result<Pedido> { /* valida obrigatórios e invariantes cruzadas; acumula todos os erros */ }
}
```

Regras do Builder:

- `build()` devolve `Result<Entidade>` e **acumula** os erros (útil para formulários).
- Invariantes cruzadas ficam no `build()` (ex.: "se o papel é Gerente, a unidade é obrigatória").
- O Builder é chamado por dois lugares: o caso de uso (criação) e o mapper da `infra` (reconstituição).
- Erro esperado devolve `Result`. Exceção só para bug ou estado impossível.

**Value Object.** Imutável, igualdade por valor, valida no `criar()` (que devolve `Result`), sem construtor público. Todo primitivo com regra vira VO (`NomeCompleto`, `Email`, `Dinheiro`, `Papel`).

**Agregado.**
- A raiz é a única porta de entrada; entidades filhas só são alteradas por métodos da raiz.
- Um repositório por raiz de agregado.
- Referência a outro agregado é sempre por id, nunca por objeto.
- Uma transação não deve alterar dois agregados; quando precisar de atomicidade entre eles, use uma porta OUT dedicada implementada como função SQL transacional (RPC), nunca uma sequência de chamadas soltas.

**Domain Service.** Regra que envolve mais de um agregado ou não pertence a nenhum, sem estado. Exemplo: `AutorizacaoService` com a hierarquia de papéis e a matriz de acesso por unidade.

### 3.6 Application: portas e casos de uso

- **Porta IN** = interface do caso de uso, com os tipos `Input` e `Output` no mesmo arquivo (`ports/in/criar-pedido.provider.ts`).
- **Porta OUT** = interface de uma dependência (`ports/out/pedido.repository.ts`, `sessao.provider.ts`, `relogio.provider.ts`). Contratos de repositório usam `.repository.ts`; as demais portas, `.provider.ts` (seção 0.2).
- **Caso de uso** implementa uma porta IN e recebe as portas OUT pelo construtor.

```ts
export interface CriarPedidoPort { execute(i: CriarPedidoInput): Promise<Result<PedidoDto>> }
export interface PedidoRepository { salvar(m: Pedido): Promise<Result<void>>; buscarPorId(id: PedidoId): Promise<Pedido | null> }

export class CriarPedido implements CriarPedidoPort {
  constructor(private readonly pedidos: PedidoRepository, private readonly sessao: SessaoPort) {}
  async execute(i: CriarPedidoInput): Promise<Result<PedidoDto>> {
    // 1. autoriza (domain service + usuário da sessão)  2. Pedido.builder()…build()
    // 3. pedidos.salvar(...)                            4. pedidoParaDto(pedido)
  }
}
```

**Read models (consultas).** Casos de uso somente de leitura usam uma porta OUT de consulta (`PedidoQueryPort`) que devolve DTOs de leitura diretamente, sem reconstruir entidades. Escritas passam sempre pelo agregado. Um caso de leitura que precisa de várias consultas as executa **em paralelo dentro do próprio caso** (`Promise.all`) e devolve um único DTO: a tela paga um só roundtrip (seção 4.9).

**Autorização** acontece no caso de uso, com o usuário obtido pela porta OUT `SessaoPort`, nunca na `presentation`.

### 3.7 DTOs

| DTO | Camada | Função |
|---|---|---|
| Input / Output DTO | `application` | Contrato do caso de uso; é o que a `presentation` envia e recebe |
| Row DTO | `infra` | Formato exato da tabela, validado por Zod. Falha alto se o banco divergir |
| View props | `presentation/components` (declarado na View) | Dados prontos para exibir, produzidos pelo presenter |
| `ActionResult<T>`, `ErrorDto`, `PaginatedDto<T>` | `shared` | Formatos genéricos e serializáveis |

Fluxo completo:

```
formulário → Input DTO → Porta IN → Builder/Entidade → Porta OUT → Row DTO → Supabase
Supabase → Row DTO → Mapper → Entidade → mapper de saída (getters) → Output DTO → presenter → View props
```

DTOs são objetos simples (sem classes): a serialização do React Server Components e do `'use cache'` não aceita instâncias de classe.

### 3.8 Erros e `Result`

- `Result<T, E>` (em `shared`) representa falha esperada: validação, não encontrado, conflito, proibido.
- Hierarquia base em `shared/errors`: `AppError` → `DomainError`, `ValidationError`, `ForbiddenError`.
- A Server Action converte `Result`/`AppError` em `ActionResult` serializável; erros nunca atravessam a fronteira como exceção.

```ts
export type ErrorDto = { code: string; message: string; fields?: Record<string, string[]> };
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: ErrorDto };
```

### 3.9 Infra e Supabase

- `infra` só implementa portas OUT. Toda chamada ao `supabase-js` (queries, RPC, Storage, Realtime, Auth) mora aqui.
- O cliente Supabase entra pelo construtor do repositório (criado no `main`), nunca é importado direto.
- Toda linha lida é validada por Zod e convertida em entidade pelo mapper (que chama `Builder.restaurar`).
- Erros do Postgres/Supabase são traduzidos para `AppError` dentro do adapter.
- Tipos do banco vêm de `supabase gen types`.
- **Toda comunicação com o Supabase passa pela `infra`**, com uma única exceção: a autenticação no navegador (abaixo).
- Storage e sessão são portas OUT (`ArquivoStoragePort`, `SessaoPort`), como qualquer outra dependência.
- **Realtime também passa pela `infra`.** Um caso de uso `ObservarXxx` (porta IN, devolve uma função de cancelamento) usa uma porta OUT `XxxMudancasPort`, implementada em `infra/realtime/` sobre o canal do Supabase. A composição roda em `main/client/`, e o ViewModel a consome em `<tela>.realtime.ts`, que alimenta o React Query com `setQueryData`. `infra/realtime/` e `main/client/` não importam nada `server-only`; a assinatura roda com a sessão do usuário, então a RLS continua valendo. O que sai da porta são Output DTOs, nunca linhas cruas do banco.
- **Exceção: autenticação.** O cliente Supabase do navegador (`createBrowserClient`) existe só em `presentation/auth/`, para o que apenas o navegador consegue fazer (fluxos OAuth, magic link, escuta de mudança de sessão). Login e logout por e-mail e senha, e todo o resto, acontecem por Server Action + `SessaoPort`. Nenhuma consulta de dados passa por esse cliente.
- Consultas de busca são um módulo à parte (`busca.md`).

### 3.10 `main` (injeção de dependências)

```ts
// main/pedidos.factory.ts
import "server-only";
export const makeCriarPedido = (): CriarPedidoPort =>
  new CriarPedido(new SupabasePedidoRepository(createSupabaseServer()), new SupabaseSessao(createSupabaseServer()));
```

- Uma função `makeXxx()` por caso de uso, devolvendo a **porta IN**.
- **Por requisição, nunca singleton:** o cliente Supabase depende dos cookies do usuário (sessão e RLS). Um singleton misturaria sessões.
- `import "server-only"` obrigatório em `main/**`.
- É o único lugar com `new` de adaptador. Chaves privilegiadas (`service_role`) só existem aqui, em fábricas de uso explícito (jobs), nunca no caminho de uma requisição de usuário.
- **`main/client/`** reúne as factories que rodam no navegador (hoje, só Realtime). Não importa `server-only` nem o `main` de servidor, e só `*.realtime.ts` a importa.

### 3.11 Comunicação entre módulos

Módulos não se importam. Quando `faturamento` precisa de algo de `pedidos`:

1. `faturamento` declara uma **porta OUT** própria na sua `application` (ex.: `PedidoConsultaPort`);
2. a `infra` de `faturamento` a implementa chamando a **porta IN** de `pedidos` (obtida pelo `main`);
3. os dados trafegam como DTOs.

### 3.12 Autorização em camadas

1. **Middleware/proxy:** só renova a sessão. Não decide acesso.
2. **Server Action:** exige sessão válida antes de chamar o caso de uso.
3. **Caso de uso + domain service:** RBAC e hierarquia (papéis, matriz de acesso por unidade). É testável sem banco.
4. **RLS no Postgres:** defesa em profundidade. Protege mesmo se a aplicação falhar, mas **não substitui** a camada 3, porque não é testável em unidade nem expressa regras condicionais ricas.

### 3.13 Server Actions como única borda

Uma Server Action é um endpoint HTTP público. O pipeline é fixo:

1. validar o input com Zod (nunca confiar no cliente);
2. exigir sessão;
3. chamar a porta IN obtida do `main`;
4. converter o resultado em `ActionResult`.

```ts
"use server";
export async function criarPedidoAction(input: CriarPedidoInput): Promise<ActionResult<PedidoDto>> {
  const parsed = criarPedidoSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error);
  return toActionResult(await makeCriarPedido().execute(parsed.data));
}
```

#### Webhooks de terceiros: a única exceção a "sem Route Handlers"

Decisão tomada a partir da arquitetura e da documentação do Next.js e do Supabase:

- **Receber uma chamada HTTP de fora é um adaptador de entrada**, como a Server Action. A `infra` só implementa portas OUT, isto é, chamadas que o sistema faz, então não existe "receber via infra".
- A documentação do Next.js indica o **Route Handler** para receber webhooks de terceiros, lendo o corpo cru com `request.text()`. Server Actions são tratadas como mutações disparadas pela UI do próprio app e não são um contrato estável para terceiros (avaliação minha).
- Alternativas avaliadas e descartadas:
  - **Edge Function do Supabase** recebendo o webhook: colocaria regra de negócio fora do monólito, em outro runtime e sem o `main`.
  - **Consulta periódica ao provedor:** atrasa a confirmação de eventos como pagamento.
  - **Database Webhooks do Supabase** também são chamadas HTTP e cairiam no mesmo endpoint.

Regras:

1. `route.ts` só é permitido em `src/app/api/webhooks/<provedor>/route.ts`. Qualquer outro `route.ts` falha o CI.
2. Esse `route.ts` só reexporta o `POST` de `modules/<d>/presentation/webhooks/<provedor>.webhook.ts`. **[lint]**
3. O handler `*.webhook.ts` lê o corpo cru, extrai a assinatura, chama uma porta IN pelo `main` e converte o resultado em status HTTP. Sem regra de negócio.
4. **O que puder passar pela `infra` passa.** A verificação de assinatura e a idempotência (guardar o id do evento já processado) acontecem dentro do caso de uso, por portas OUT (`AssinaturaWebhookPort`, `EventoProcessadoRepository`) implementadas na `infra`.
5. Resposta: 2xx quando processou ou já tinha visto o evento; 4xx para assinatura inválida; 5xx para falha transitória (o provedor tenta de novo).
6. O middleware/proxy de sessão exclui `/api/webhooks/**`.

### 3.14 Regras de segurança impostas pela arquitetura

Detalhes em `seguranca.md`. Aqui ficam as que a estrutura garante:

- `service_role` só em `main`, nunca no cliente; variáveis `NEXT_PUBLIC_*` só com a chave `anon`.
- `@supabase/*` só em `infra`, `main` e `presentation/auth/`. **[lint]**
- Webhook: assinatura sempre verificada antes de qualquer efeito, e processamento idempotente.
- `import "server-only"` em `main/**` e em `*.server.ts`.
- Nenhuma Server Action sem validação de input e sem checagem de sessão.
- Nenhum dado por usuário, papel ou unidade em cache compartilhado (seção 6.3).
- RLS ativa em toda tabela exposta.

---

## 4. Frontend

### 4.1 Visão

MVVM com Atomic Design:

- **View** = componentes do Atomic Design. Burra.
- **ViewModel** = hooks, Server Actions, stores, queries, presenter. Único que conversa com a `application`.
- O Next.js (`app/`) só monta: importa Views do Atomic Design e Containers.

```
View (burra: props + callbacks)
  ▲ props                    │ callbacks
Container ('use client') ──► ViewModel (React Query · Zustand · RHF)
                                   │ chama
                                   ▼
                    Server Action (*.actions.ts) ──► main ──► Porta IN ──► Caso de Uso
```

### 4.2 Estrutura

```
src/
├─ app/                                 só arquivos de convenção; importa Views e Containers
├─ modules/<modulo>/presentation/
│  └─ view-models/<tela>/
│     ├─ <tela>.actions.ts              'use server'
│     ├─ <tela>.server.ts               loader de carga inicial (import "server-only")
│     ├─ <tela>.queries.ts              React Query: fábrica de chaves + hooks
│     ├─ <tela>.realtime.ts             (opcional) assinatura Realtime via main/client → setQueryData
│     ├─ <tela>.store.ts                Zustand (estado de cliente da tela)
│     ├─ <tela>.schema.ts               Zod (formulário)
│     ├─ <tela>.presenter.ts            Output DTO → props da View (função pura)
│     ├─ use-<tela>.hook.ts             hook do ViewModel: compõe queries, mutation, store e form
│     └─ <tela>.container.tsx           'use client'
└─ presentation/
   ├─ components/  ui/ · atoms/ · molecules/ · organisms/ · templates/ · pages/
   ├─ providers/   theme.provider.tsx · query.provider.tsx · app.providers.tsx   ('use client')
   ├─ auth/        cliente Supabase do navegador, só para autenticação (seção 3.9)
   ├─ view-models/ · stores/                                (globais: shell, unidade ativa)
   ├─ hooks/                                                (usados só pelo ui/ do shadcn)
   └─ lib/utils.ts                                          (cn)
```

### 4.3 Peças e responsabilidades

**View** (`presentation/components/{atoms,molecules,organisms,templates,pages}`)
- Recebe props, devolve JSX. Sem hooks, sem Server Actions, sem stores, sem `next/*` (exceto `next/link` e `next/image`, seção 4.11). **[lint]**
- Sem diretiva `'use client'`: funciona no ambiente em que for importada.
- **Não conhece módulo, domain, application nem ViewModel.** Só declara o tipo das props que precisa; quem se adapta é o ViewModel. **[lint]**
- Recebe dados já formatados para exibição.
- Pode ter nome de assunto (`pedido-form.component.tsx`); isso não a torna dependente de nada, porque as props são strings e números.

**ViewModel** (`modules/<d>/presentation/view-models/<tela>/`)
- Contém toda a inteligência da tela: dados (React Query), estado de cliente (Zustand), formulário (RHF + Zod), chamadas (Server Actions).
- Fala com a `application` só por `*.actions.ts` e `*.server.ts` (servidor, via `main`) e por `*.realtime.ts` (navegador, via `main/client`).
- Não importa `domain` nem `infra`. **[lint]**

**Presenter**
- Função pura Output DTO → props da View (datas, moeda, rótulos, ordenação de exibição). Testável sem React.
- Pode importar o **tipo** de props da View.

**Container** (`*.container.tsx`)
- Único arquivo com `'use client'` do módulo.
- Chama o hook do ViewModel e passa o resultado à View. Aceita `children` e slots vindos do servidor.
- Só ele e o presenter importam Views. **[lint]**

**Loader** (`*.server.ts`)
- Busca a carga inicial no servidor, passa pelo presenter e devolve props prontas.
- Pode usar `'use cache'` apenas para dado público (seção 6.3).

### 4.4 Atomic Design e shadcn/ui

| Nível | Onde | Regra |
|---|---|---|
| **ui/** | `presentation/components/ui/` | Gerado pelo CLI do shadcn. É a biblioteca de átomos e moléculas básicas. **Não é duplicado nem envolvido por wrappers.** É código de terceiro: pode ter hooks e `'use client'` internos. |
| **atoms/** | `.../atoms/` | Só o que o shadcn **não** oferece. Antes de criar, confira o registry. |
| **molecules/** | `.../molecules/` | Composição de atoms e `ui/`. |
| **organisms/** | `.../organisms/` | Composição de molecules/atoms, com layout real. |
| **templates/** | `.../templates/` | Estrutura da tela com **slots** (`ReactNode`); sem dados. Sempre Server. |
| **pages/** | `.../pages/` | Template preenchido por slots com conteúdo. Sempre Server. |

- Cada nível só importa níveis abaixo. **[lint]**
- Todas as Views são globais (`presentation/components/`). Não existe View dentro de módulo.
- Aliases do `components.json` (Anexo C) apontam o shadcn para `presentation/`.
- Edição de arquivos do `ui/` é permitida para adicionar variantes (cva) ou ajustar tokens; toda edição é deliberada e registrada no PR, para não ser perdida em um `shadcn add` posterior.

### 4.5 `layout.tsx` e `page.tsx` × Atomic Design

São conceitos diferentes com nomes parecidos:

| Next.js | Atomic Design |
|---|---|
| `layout.tsx`: convenção de roteamento que envolve rotas filhas | **Template**: estrutura visual com slots |
| `page.tsx`: convenção que resolve "qual URL renderiza o quê" | **Page**: template preenchido |

`layout.tsx` e `page.tsx` **importam** o Template e a Page do Atomic Design e montam os slots com Containers. Não contêm estrutura visual própria.

```tsx
// app/layout.tsx  (Server Component)
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <AppProviders>
          <DashboardTemplate sidebar={<SidebarContainer />} header={<HeaderContainer />}>
            {children}
          </DashboardTemplate>
        </AppProviders>
      </body>
    </html>
  );
}

// app/pedidos/page.tsx  (Server Component)
export default async function Page() {
  const tabela = await carregarTabelaPedidos();      // *.server.ts → props prontas
  return (
    <PedidosPage
      filtro={<PedidoFiltroContainer />}
      tabela={<PedidosTable {...tabela} acoes={(m) => <RemoverPedidoContainer id={m.id} />} />}
      formulario={<CriarPedidoContainer />}
    />
  );
}
```

### 4.6 Server Components × Client Components

**Princípio:** Server Component é o padrão absoluto. Componente de cliente só existe onde o cliente é exigido, e a fronteira fica no **menor nível do Atomic Design** que contém a interação, para renderizar o mínimo possível no navegador.

**Quando o cliente é exigido (lista fechada):**
- estado ou efeito: `useState`, `useReducer`, `useEffect`;
- handlers de evento: `onClick`, `onChange`, `onSubmit`;
- APIs do navegador: `window`, `localStorage`, `IntersectionObserver`;
- hooks de biblioteca: React Query, Zustand, React Hook Form;
- Context com valor reativo (providers);
- Realtime e Auth no navegador.

**O que não justifica cliente:** buscar dado (use Server Component ou loader), formatar valor (função pura no presenter), estilo condicional (variantes e classes), estrutura de layout.

**Onde colocar a fronteira, de baixo para cima:**

1. **Não há interação?** Server. É uma View sem Container.
2. **A interação é só visual e o shadcn já a cobre** (dialog, tabs, accordion, tooltip, dropdown)? O próprio `ui/` já é a fronteira de cliente. Sua View continua Server e só compõe; o conteúdo estático que você passa como `children` continua renderizado no servidor.
3. **Precisa de dado reativo, mutation, formulário, store ou realtime?** Container, no menor nível possível: **atom → molecule → organism**, nessa ordem de preferência.

**Regras:**

1. `'use client'` só é permitido em `*.container.tsx`, `presentation/providers/**`, `presentation/components/ui/**` (shadcn), `error.tsx` e `global-error.tsx`. **[lint]**
2. **Templates e pages são sempre Server.** Um container não importa template nem page. **[lint]**
3. O Container renderiza **só a região interativa**. O conteúdo estático ao redor é montado no servidor e entra como slot (`children` ou prop `ReactNode`).
4. Tudo que um Container importa entra no bundle do cliente. Por isso o Container importa a menor View que resolve o caso, e as partes estáticas são extraídas para o servidor por slots.
5. **Interação por item de uma lista:** a lista (organism) fica no servidor; a ação de cada linha é um Container pequeno passado por slot (`acoes={(m) => <RemoverPedidoContainer id={m.id} />}`). A lista inteira não vira cliente por causa de um botão.
6. **View com callbacks** (`onSubmit`, `onChange`) só é montada por Container, porque funções não cruzam de Server para Client. **View sem callbacks** pode ser montada por qualquer um.
7. Dados que entram no cliente são DTOs serializáveis: objetos simples, arrays, datas. Nunca entidade nem instância de classe.
8. **Carga inicial:** o `page.tsx` (Server) chama o loader e passa o resultado ao Container como `initialData` do React Query. Mutations e leituras reativas usam Server Action.
9. Regiões que leem dados de requisição (cookies, headers, `searchParams`) ficam dentro de `<Suspense>`, exigência dos Cache Components.

**Exemplo — tela de pedidos:**

| Peça | Nível | Ambiente |
|---|---|---|
| `PedidosPage`, `DashboardTemplate` | page, template | Server |
| `PedidosTable` (linhas estáticas) | organism | Server |
| Botão remover + confirmação | atom/molecule com `ui/Dialog` | Client (`RemoverPedidoContainer`) |
| Campo de filtro | molecule | Client (`PedidoFiltroContainer`) |
| Formulário de cadastro | organism | Client (`CriarPedidoContainer`) |

### 4.7 Taxonomia de estado

| Tipo | Onde vive | Ferramenta |
|---|---|---|
| UI efêmera e visual (aberto/fechado, hover) | Dentro do componente do `ui/` (Radix) ou, se preciso, no Container | Estado do componente shadcn / `useState` no Container |
| Cliente global (não vem do servidor) | Store local da tela (`<tela>.store.ts`) ou global (`presentation/stores`) | Zustand |
| Servidor / HTTP | Cache do React Query | `useQuery` / `useMutation` |
| Formulário | Hook do ViewModel | React Hook Form + `zodResolver` |

Regras:
- **Dado vindo do servidor nunca entra no Zustand.** Duplicaria o cache do React Query e perderia invalidação e refetch.
- Chaves do React Query hierárquicas: `[modulo, agregado, ...filtros]` (por exemplo `['pedidos', 'lista', unidadeId, filtros]`), permitindo invalidar por prefixo.
- Realtime (`<tela>.realtime.ts`) alimenta o cache com `queryClient.setQueryData`; não cria fonte paralela.

### 4.8 Formulários e validação

Três camadas, cada uma com um propósito, sem repetir regra:

| Camada | Valida | Ferramenta |
|---|---|---|
| ViewModel (`<tela>.schema.ts`) | Formato e obrigatoriedade, para feedback imediato ao usuário | Zod + RHF |
| Server Action | Formato do input recebido (nunca confiar no cliente) | Zod |
| `domain` (Builder, VO) | Invariantes de negócio | Código de domínio |

### 4.9 Server Actions e leituras

| Situação | Mecanismo |
|---|---|
| Leitura inicial de uma tela | Loader `*.server.ts` chamado pelo `page.tsx` |
| Leitura reativa no cliente (filtro, paginação) | React Query chamando uma Server Action |
| Escrita | Server Action dentro de `useMutation`, invalidando por prefixo de chave |

- Toda Server Action devolve `ActionResult<T>`.
- Como não há Route Handlers, leituras reativas não têm cache HTTP; o cache delas é o do React Query.
**Decisão sobre leituras reativas.** A documentação do Next.js informa que o cliente despacha Server Functions **uma de cada vez** (detalhe de implementação que pode mudar) e recomenda buscar dados em Server Components ou agrupar o trabalho em uma única função. A solução de melhor desempenho e menor custo de manutenção é manter **um único mecanismo** (React Query + Server Action) e impedir que a fila serial apareça:

1. **A carga inicial é sempre do servidor** (loader, dentro de `<Suspense>`): consultas em paralelo no servidor, streaming e nenhuma action no primeiro carregamento. A query usa `initialData` e `staleTime` ≥ 30 s para não refazer a busca ao montar.
2. **Uma action por interação.** Consultas relacionadas viram um único caso de leitura, que as paraleliza dentro do servidor (seção 3.6).
3. **Entrada digitada usa debounce** (300 ms) e a paginação usa `placeholderData: keepPreviousData`, para não enfileirar chamadas nem piscar a tela.
4. **Proibido disparar várias actions de leitura em paralelo no cliente** (por exemplo, três `useQuery` com action montando juntos). É item do checklist de PR.
5. Se uma versão futura do Next.js remover a execução serial, nada muda na arquitetura; a regra 4 apenas deixa de ser necessária.

Descartado: filtro e paginação por parâmetros de URL (`searchParams`). Seria rápido, mas criaria um segundo mecanismo de leitura reativa ao lado do React Query.

### 4.10 Compound Components

Compound Components são **ortogonais** ao Atomic Design: tratam de como as partes de um componente se compõem, não de granularidade.

- O `ui/` do shadcn já os usa (`Dialog`, `Select`, `Card.Header`).
- Nas Views próprias, só a **forma estrutural** (subcomponentes estáticos: `Card.Header`, `Card.Body`), sem Context nem estado, já que Views não têm hooks.
- Compound com estado compartilhado por Context vive no `ui/` ou no Container.

### 4.11 Navegação e mídia

**Decisão:** Views podem importar `next/link` e `next/image`. Os dois funcionam em Server e Client Components e não exigem hooks. Todo o resto de `next/*` continua proibido nas Views: `next/navigation` (`useRouter`, `usePathname`…) é hook e pertence ao ViewModel. **[lint]**

---

## 5. Design system

O design system vive em `presentation/components` e em `app/globals.css` (tokens). Tailwind + shadcn são a base.

### 5.1 Tokens e cores

- Toda cor vem de **tokens semânticos** definidos em CSS variables (`--primary`, `--success`, `--warning`, `--destructive`, `--muted`…), no formato exigido pelo shadcn. Cor crua do Tailwind (`bg-blue-500`) não aparece em componente.
- A paleta é escolhida pela **teoria da psicologia das cores**, de acordo com o sentimento que o produto deve transmitir, registrado na descrição do produto.
- Paleta em **tons pastel**.
- Dois temas obrigatórios, **dark e light**, ambos adaptados aos tokens do shadcn. **Light é o padrão.**
- Novas intenções de cor (sucesso, alerta, informação) entram como tokens; se precisarem de variante em um componente, adicione uma variante ao `cva` do arquivo do `ui/`.

### 5.2 Toggle de tema

- `next-themes` é o mecanismo **padrão obrigatório**; só se troca por decisão explícita registrada.
- Persistência local e ausência de flash de tema errado no SSR são responsabilidade dele.
- Zustand só entra se algum ponto da UI precisar ler o tema fora do hook do `next-themes`.
- Provider em `presentation/providers/theme.provider.tsx`; `<html suppressHydrationWarning>`.

### 5.3 Tipografia

- **Roboto** é a família padrão, carregada com `next/font` e exposta como CSS variable (`--font-sans`).
- A família é um **token único**: trocar por outra é editar um lugar.
- Escala tipográfica e tamanhos de espaçamento definidos como tokens claros.

### 5.4 Responsividade

- **Mobile-first**: o CSS base é o celular; telas maiores evoluem por `min-width`.
- Breakpoints são os **padrões do Tailwind**, até `2xl`. Nenhum breakpoint customizado; acima do `2xl` o layout é fluido, com largura máxima.

| Alvo | Breakpoint |
|---|---|
| Celular | base |
| Tablet | `md` |
| Desktop 720p | `xl` |
| Desktop 1080p e 2K | `2xl` |

### 5.5 `cva` e `cn()`

- `cva` define **quais classes** uma variante produz, com tipagem e autocomplete.
- `cn()` (clsx + tailwind-merge) **mescla** as classes com qualquer `className` externo sem conflito.
- Os dois trabalham juntos, e o código gerado pelo shadcn já os combina. `cn()` fica em `presentation/lib/utils.ts`.

---

## 6. Cache

Modelo do **Next.js 16 com Cache Components**. Neste modelo tudo é dinâmico por padrão, e o cache é adotado explicitamente com `'use cache'`.

### 6.1 Princípio

**Cada dado tem um único dono de cache.** Nunca duas camadas cacheando a mesma fonte com TTLs diferentes. "Performático, porém eficiente" significa cachear onde há ganho real e onde é seguro.

### 6.2 Camadas

| Camada | Onde | Compartilhado entre usuários? | Uso no projeto |
|---|---|---|---|
| `'use cache'` (Cache Components) | Servidor | **Sim** | Só dado público/institucional, em `*.server.ts` |
| React Query | Navegador do usuário | Não | Todo dado por usuário, papel ou unidade; leitura reativa |
| Router Cache | Navegador | Não | Gerenciado pelo Next.js; não configurar manualmente |
| `fetch` nativo | Servidor | Depende do escopo | Chamadas a APIs externas ficam em gateways da `infra`; só são cacheadas se o loader estiver em escopo `'use cache'` |
| CDN/Edge | Vercel | Sim | Sem Route Handlers não há respostas HTTP de dados; só assets estáticos |
| Postgres | Banco | — | Materialized view / tabela de cache (seção 6.9) |
| Redis/Upstash | Externo | — | Só com evidência de necessidade (seção 6.9) |

### 6.3 Regra crítica de segurança

**`'use cache'` armazena o resultado compartilhado por todos os usuários do deployment.** Usado com dado que depende de quem pede, faz o usuário A ver o dado do usuário B sem nenhum erro aparente.

- **Permitido:** dado público ou institucional, igual para todos (catálogos, tabelas de referência, textos institucionais).
- **Proibido:** qualquer dado que dependa de usuário, papel, unidade ou RLS. Esse dado é cacheado só no React Query (que é por navegador).
- O Next.js não permite ler `cookies()`/`headers()` dentro de um escopo `'use cache'`; como o cliente Supabase da requisição depende dos cookies, consultas com sessão não rodam ali. Isso reforça a regra.
- Exceção (por exemplo, dado por unidade com a autorização feita fora do escopo e a unidade como argumento da chave) exige **registro da decisão e revisão de segurança**.
- `'use cache: private'` **não é adotado**; uma decisão futura precisa ser registrada.

### 6.4 Onde a diretiva vive

- `'use cache'` só aparece em `*.server.ts` (loaders) da `presentation`. **[lint]**
- Nunca em `domain`, `application`, `infra` ou `*.actions.ts`. Cachear ali violaria a Dependency Rule.
- Argumentos e retornos de escopos cacheados são serializáveis: **DTOs simples, nunca entidades**.
- `next.config.ts` habilita `cacheComponents: true`.

### 6.5 Duração: `cacheLife`

- **Todo escopo `'use cache'` declara `cacheLife` explicitamente.** Sem isso vale o perfil `default` (stale de 5 min no cliente, revalidate de 15 min no servidor, sem expiração), que esconde a decisão.
- Perfis permitidos: `hours`, `days`, `weeks`, `max`.
- `seconds` e `minutes` não são usados aqui: dado que muda em segundos ou minutos pertence ao React Query, não ao cache compartilhado.

### 6.6 Invalidação

| Função | Onde | Comportamento | Quando usar |
|---|---|---|---|
| `updateTag(tag)` | **Só** em Server Action | Expira na hora; a próxima leitura espera o dado novo (*read-your-own-writes*) | Após uma mutation cujo resultado o usuário precisa ver imediatamente |
| `revalidateTag(tag, 'max')` | Server Action ou contexto sem action | Serve o dado antigo enquanto atualiza em segundo plano (*stale-while-revalidate*) | Mudanças tolerantes a atraso |
| `refresh()` | Server Action | Atualiza dados não cacheados da rota atual | Após a ação, sem tag envolvida |

- Chame `cacheTag(...)` no escopo cacheado e `updateTag(...)` na action que altera o dado.
- **Nomenclatura de tags:** `<modulo>:<agregado>` e `<modulo>:<agregado>:<id>`, em minúsculas e com hífen; até 256 caracteres; diferenciam maiúsculas de minúsculas.

```ts
// loader
export async function carregarEstados() {
  "use cache";
  cacheLife("max");
  cacheTag("referencias:estados");
  // …
}
// action que altera
updateTag("referencias:estados");
```

### 6.7 React Query (dono do dado por usuário)

Valores iniciais, a calibrar por medição:

| Tipo de dado | `staleTime` | `gcTime` |
|---|---|---|
| Cadastro (muda pouco) | 5 min | 30 min |
| Saldos (voláteis) | 0 (refaz ao montar/focar) | 5 min |
| Alimentado por Realtime | `Infinity` (a assinatura atualiza via `setQueryData`) | 30 min |
| Busca digitada | 30 s | 5 min |

- Toda mutation invalida por **prefixo** de chave, não a árvore inteira.
- A carga inicial vem como `initialData` do loader; use `staleTime` ≥ 30 s para não refazer a busca ao montar.

### 6.8 Anti-duplicação

Um dado servido por `'use cache'` em Server Component **não** vira também uma query do React Query, e vice-versa. O dono é único.

### 6.9 Cache no backend

1. **Materialized view** para agregações pesadas (relatórios, saldos consolidados), com estratégia de refresh definida. Ela **não aplica RLS** das tabelas de origem: só é lida por função/consulta que filtre por autorização explicitamente.
2. **Cache por hash do input** para chamadas externas caras (por exemplo, geração de embedding): tabela `cache_entries(hash, payload, expires_at)`, consultada no gateway da `infra`.
3. **Redis/Upstash** só com métrica que prove o gargalo. Antes disso, é YAGNI.

### 6.10 Comportamento em produção

**Decisão: `'use cache'` simples, sem `'use cache: remote'` por padrão.**

- O cache em memória do `'use cache'` não é compartilhado entre instâncias serverless e costuma ser descartado depois da requisição (documentação do Next.js). Isso só pesa para conteúdo resolvido em tempo de requisição.
- Aqui o `'use cache'` é restrito a dado público (seção 6.3), que entra na **static shell**: pré-renderizada e, na Vercel, servida por ISR. Esse conteúdo não depende do cache em memória. A documentação do Next.js diz que, para conteúdo da shell, `'use cache'` "é geralmente suficiente".
- É também a opção mais rápida: não faz consulta de cache pela rede, não tem custo de infraestrutura e não exige configuração.
- **Trocar depois custa uma linha** (a diretiva no `*.server.ts`), então adiar não cria dívida.
- **Critério para adotar `'use cache: remote'` em uma função específica** (todos juntos):
  1. o conteúdo é resolvido em tempo de requisição, fora da shell (dentro de `<Suspense>`);
  2. protege um upstream caro, lento ou com limite de taxa;
  3. a homologação mostrou baixa taxa de acerto ou carga excessiva no upstream.
- **Evitar** quando a operação já é rápida (< 50 ms), quando a chave é quase única por requisição (filtros, valores livres) ou quando o dado muda em segundos ou minutos.
- Chamadas externas caras (por exemplo, embedding) já têm cache em Postgres por hash (seção 6.9) e não usam `remote`.

### 6.11 Checklist de decisão

1. O dado depende de usuário, papel ou unidade? **Sim →** React Query (e loader sem cache). **Não →** passo 2.
2. É público/institucional e estável? **Sim →** `'use cache'` em `*.server.ts`, com `cacheLife` explícito e `cacheTag`. **Não →** sem cache compartilhado.
3. Existe mutation que o altera? **Sim →** `updateTag` na action (ou `revalidateTag(tag, 'max')` se tolerar atraso).
4. Já existe outro dono de cache para esse dado? **Sim →** não crie um segundo.
5. É agregação pesada ou chamada externa cara? **Sim →** seção 6.9.

---

## 7. Testes

Todas as regras de teste (TDD, pirâmide, o que testar em cada camada, cobertura, configuração e definição de pronto) estão **somente** em `testes.md`. Este documento não as repete: o `testes.md` lista as seções daqui de que depende (portas OUT, Server Actions e webhooks, nomes de arquivo e análise de dependências).

---

## 8. Decisões tomadas e pendências

**Decisões tomadas**

1. **Supabase só pela `infra`**, com uma exceção: **autenticação** no navegador, restrita a `presentation/auth/` (seção 3.9). **Realtime passa pela `infra`** (porta OUT + `infra/realtime/` + `main/client/`).
2. **Webhooks** são a única exceção à regra "sem Route Handlers", em `src/app/api/webhooks/**`, com o handler fino e o processamento por portas da `infra` (seção 3.13).
3. **Views podem importar `next/link` e `next/image`.** O resto de `next/*` continua proibido (seção 4.11).
4. **Entidades expõem getters somente leitura**, sem setters (seções 2 e 3.5).
5. **Leituras reativas por Server Action + React Query**, com carga inicial sempre no servidor, uma action por interação e consultas relacionadas agrupadas em um caso de leitura (seções 3.6 e 4.9). Filtro por URL descartado para manter um só mecanismo.
6. **Cache em produção:** `'use cache'` simples para dado público na static shell; `'use cache: remote'` só por critério medido, função a função (seção 6.10).
7. **Versão do Next.js:** major 16 fixado (`next@^16`); a documentação consultada é da 16.3.5.
8. **Nomenclatura:** regras globais de nomes incorporadas (seção 0.2), com verificação automática (Anexo E).
9. **Testes:** documento separado, `testes.md`, como fonte única das regras de teste. Este documento só aponta para ele (seções 0.2 e 7, Anexo D).

**Pendentes de decisão**

Nenhum.

**Propostas do redator a confirmar**

- Read models sem entidade para consultas puras (seção 3.6).
- `'use client'` permitido apenas em `*.container.tsx`, `providers/`, `ui/`, `error.tsx` e `global-error.tsx`.
- Compound Components com Context só no `ui/` ou no Container.
- Convenção de tags de cache `<modulo>:<agregado>[:<id>]`.
- Dado compartilhado em `'use cache'` restrito a conteúdo público; exceções por registro de decisão.
- Nenhuma cor crua do Tailwind nas Views; só tokens semânticos.
- Adaptações da regra de nomenclatura ao projeto (seção 0.2): `*.provider.ts` para as portas (contratos de repositório ficam em `.repository.ts`), `*.component.tsx` para atoms, molecules, organisms e templates (o nível vem da pasta), `*.hook.ts` no hook do ViewModel, `*.spec.ts` (unitário), `*.test.ts` (integração) e `*.e2e.ts` (E2E) nos testes, `preconditions.ts` no lugar de `guard.ts`, `supabase-server.factory.ts`, e a lista de sufixos adicionais.
- Nomes novos introduzidos pelas últimas revisões: `*.realtime.ts`, `*.webhook.ts`, `infra/realtime/`, `main/client/`, `presentation/auth/`, `AssinaturaWebhookPort`, `EventoProcessadoRepository`.

---

## Anexo A — Regras de dependência (`.dependency-cruiser.cjs`) **[testado]**

Instale `dependency-cruiser` e `typescript@^6` (a ferramenta ainda não suporta TypeScript 7; com ele ela analisa 0 módulos em silêncio). Rode:

```bash
npx depcruise src --config .dependency-cruiser.cjs
```

```js
const MOD = "^src/modules/([^/]+)";   // $1 = nome do módulo
const VIEWS = "^src/presentation/components/(atoms|molecules|organisms|templates|pages)/";

module.exports = {
  forbidden: [
    { name: "shared-puro", severity: "error", from: { path: "^src/shared/" }, to: { pathNot: "^src/shared/" } },
    { name: "domain-so-shared", severity: "error",
      from: { path: `${MOD}/domain/` }, to: { pathNot: ["^src/shared/", "^src/modules/$1/domain/"] } },
    { name: "application-so-domain-e-shared", severity: "error",
      from: { path: `${MOD}/application/` }, to: { pathNot: ["^src/shared/", "^src/modules/$1/(domain|application)/"] } },
    { name: "infra-so-dentro-do-modulo", severity: "error",
      from: { path: `${MOD}/infra/` }, to: { pathNot: ["^src/shared/", "^src/modules/$1/(domain|application|infra)/", "node_modules/"] } },

    { name: "so-main-importa-infra", severity: "error",
      from: { pathNot: ["^src/main/", "/infra/"] }, to: { path: "^src/modules/[^/]+/infra/" } },
    { name: "so-actions-importam-main", severity: "error",
      from: { path: "^src/(modules|presentation|app)/", pathNot: "\\.(actions|server|webhook)\\.tsx?$" }, to: { path: "^src/main/(?!client/)" } },
    { name: "so-realtime-importa-main-client", severity: "error",
      from: { pathNot: ["\\.realtime\\.tsx?$", "^src/main/"] }, to: { path: "^src/main/client/" } },
    { name: "main-client-sem-servidor", severity: "error",
      from: { path: "^src/main/client/" }, to: { path: ["^src/main/(?!client/)", "node_modules/server-only/"] } },
    { name: "supabase-so-em-infra-main-e-auth", severity: "error",
      from: { pathNot: ["^src/modules/[^/]+/infra/", "^src/main/", "^src/presentation/auth/"] }, to: { path: "@supabase/" } },
    { name: "webhook-route-so-importa-handler", severity: "error",
      from: { path: "^src/app/api/webhooks/" }, to: { pathNot: ["^src/modules/[^/]+/presentation/webhooks/", "node_modules/"] } },
    { name: "modulos-isolados", severity: "error",
      from: { path: `${MOD}/` }, to: { path: "^src/modules/[^/]+/", pathNot: "^src/modules/$1/" } },
    { name: "app-so-presentation", severity: "error",
      from: { path: "^src/app/" }, to: { path: "^src/modules/[^/]+/(domain|application|infra)/" } },
    { name: "presentation-global-sem-modulos", severity: "error",
      from: { path: "^src/presentation/" }, to: { path: "^src/modules/" } },

    { name: "view-burra", severity: "error",
      from: { path: VIEWS }, to: { path: ["^src/main/", "^src/modules/[^/]+/(domain|application|infra)/", "/view-models/"] } },
    { name: "view-sem-next", severity: "error",
      from: { path: VIEWS }, to: { path: "node_modules/next/(?!(link|image)\\.js)" } },
    { name: "so-container-e-presenter-importam-view", severity: "error",
      from: { path: "^src/modules/", pathNot: "\\.(container|presenter)\\.tsx?$" }, to: { path: "^src/presentation/components/" } },
    { name: "viewmodel-sem-domain-nem-infra", severity: "error",
      from: { path: "^src/modules/[^/]+/presentation/view-models/" }, to: { path: "^src/modules/[^/]+/(domain|infra)/" } },
    { name: "container-so-atom-molecule-organism", severity: "error",
      from: { path: "\\.container\\.tsx$" }, to: { path: "^src/presentation/components/(templates|pages)/" } },

    { name: "ad-atom", severity: "error", from: { path: "/atoms/" }, to: { path: "/(molecules|organisms|templates|pages)/" } },
    { name: "ad-molecule", severity: "error", from: { path: "/molecules/" }, to: { path: "/(organisms|templates|pages)/" } },
    { name: "ad-organism", severity: "error", from: { path: "/organisms/" }, to: { path: "/(templates|pages)/" } },
    { name: "ad-template", severity: "error", from: { path: "/templates/" }, to: { path: "/pages/" } },
  ],
  options: {
    tsConfig: { fileName: "tsconfig.json" },
    tsPreCompilationDeps: true,      // enxerga `import type`
    doNotFollow: { path: "node_modules" },
    exclude: { path: "\\.(spec|test)\\.tsx?$" },   // testes unitários (*.spec) e de integração (*.test)
  },
};
```

Verificação feita: em uma árvore de teste com 55 módulos, 22 arquivos com violações plantadas geraram 30 ocorrências, todas detectadas, sem falso positivo em arquivo válido (inclusive `next/link`, `next/image`, cliente Supabase em `infra/` e em `presentation/auth/`, `*.realtime.ts` usando `main/client` e a rota de webhook reexportando o handler). As regras `ad-molecule`, `ad-organism` e `infra-so-dentro-do-modulo` não foram exercitadas nesse teste.

**Falha de CI adicional** (premissa 1): nenhum `route.ts` fora de `src/app/api/webhooks/`. O comando deve imprimir **nada**; qualquer linha é violação.

```bash
find src/app -name "route.ts*" -not -path "src/app/api/webhooks/*"
```

## Anexo B — Diretivas e hooks (`eslint.config.mjs`) **[testado]**

Todas as regras usam a mesma chave `no-restricted-syntax`, e o ESLint **substitui** (não soma) as opções entre blocos. Por isso há um bloco base e blocos de exceção que repetem a lista sem a diretiva liberada.

```js
const sel = (v, message) => ({ selector: `ExpressionStatement > Literal[value='${v}']`, message });
const CLIENT = sel("use client", "'use client' só em *.container.tsx, providers/, ui/ (shadcn) e error.tsx");
const SERVER = sel("use server", "'use server' só em *.actions.ts");
const CACHE  = sel("use cache",  "'use cache' só em *.server.ts");
const HOOK_CALL   = { selector: "CallExpression[callee.name=/^use[A-Z]/]", message: "View burra: sem hooks." };
const HOOK_IMPORT = { selector: "ImportDeclaration[source.value='react'] ImportSpecifier[imported.name=/^use[A-Z]/]", message: "View burra: sem hooks." };
const rule = (...s) => ({ "no-restricted-syntax": ["error", ...s] });

export default [
  { files: ["src/**/*.{ts,tsx}"], rules: rule(CLIENT, SERVER, CACHE) },                         // padrão: nenhuma diretiva
  { files: ["**/*.container.tsx", "src/presentation/providers/**", "src/presentation/components/ui/**",
            "src/app/**/error.tsx", "src/app/**/global-error.tsx"], rules: rule(SERVER, CACHE) },  // libera 'use client'
  { files: ["**/*.actions.ts"], rules: rule(CLIENT, CACHE) },                                    // libera 'use server'
  { files: ["**/*.server.ts"], rules: rule(CLIENT, SERVER) },                                    // libera 'use cache'
  { files: ["src/presentation/components/{atoms,molecules,organisms,templates,pages}/**/*.tsx"],  // Views: sem hooks
    rules: rule(CLIENT, SERVER, CACHE, HOOK_CALL, HOOK_IMPORT) },
];
```

Em um projeto real, combine este bloco com o parser do `typescript-eslint`. O teste feito usou um parser JS simples.

## Anexo C — Configuração e scaffolding

**`components.json` (shadcn)** — ajuste antes do primeiro `shadcn add`:

```json
"aliases": {
  "components": "@/presentation/components",
  "ui": "@/presentation/components/ui",
  "utils": "@/presentation/lib/utils",
  "lib": "@/presentation/lib",
  "hooks": "@/presentation/hooks"
}
```

**`scripts/new-module.mjs`** — cria as pastas do módulo e o factory no `main` (`"new:module": "node scripts/new-module.mjs"`):

```js
import { mkdirSync, writeFileSync, existsSync } from "node:fs";

const nome = process.argv[2];
if (!/^[a-z][a-z0-9-]*$/.test(nome ?? "")) { console.error("uso: npm run new:module <nome-kebab>"); process.exit(1); }
if (existsSync(`src/modules/${nome}`)) { console.error(`módulo "${nome}" já existe`); process.exit(1); }

const base = `src/modules/${nome}`;
const dirs = [
  "domain/aggregates", "domain/entities", "domain/builders", "domain/value-objects", "domain/services", "domain/errors",
  "application/ports/in", "application/ports/out", "application/use-cases", "application/dtos", "application/mappers",
  "infra/repositories", "infra/gateways", "infra/realtime", "infra/dtos", "infra/mappers",
  "presentation/view-models", "presentation/webhooks",
];
for (const d of dirs) { mkdirSync(`${base}/${d}`, { recursive: true }); writeFileSync(`${base}/${d}/.gitkeep`, ""); }
mkdirSync("src/main/client", { recursive: true });
writeFileSync(`src/main/${nome}.factory.ts`, `import "server-only";\n// Injeção de dependências do módulo ${nome}: instancia infra e injeta nos casos de uso.\nexport {};\n`);
console.log(`módulo "${nome}" criado em ${base} + src/main/${nome}.factory.ts`);
```

## Anexo D — Checklist de revisão de PR

- [ ] `npx depcruise`, o lint e `npm run check:naming` passam.
- [ ] Nenhuma entidade sai da `application`; Output DTO é objeto simples.
- [ ] Toda criação de entidade passa por Builder; nenhum `new` de entidade fora dela.
- [ ] Caso de uso só depende de portas; adaptadores só são criados em `main`.
- [ ] Server Action: valida input, exige sessão, devolve `ActionResult`.
- [ ] `'use client'` só onde a lista da seção 4.6 exige, no menor nível possível.
- [ ] View nova não usa hook, `next/*` nem conhece módulo; props declaradas na própria View.
- [ ] Todo `'use cache'` tem `cacheLife` explícito, `cacheTag`, dado público e um único dono de cache.
- [ ] Toda mutation invalida por prefixo (React Query) e por tag (`updateTag`) quando aplicável.
- [ ] Nenhuma tela dispara várias Server Actions de leitura em paralelo no cliente; a carga inicial vem do loader.
- [ ] Nenhuma cor crua do Tailwind; tema dark e light conferidos.
- [ ] A definição de pronto de `testes.md` (seção 1.2) foi cumprida.

## Anexo E — Verificador de nomenclatura (`scripts/check-naming.mjs`) **[testado]**

Confere os nomes de tudo sob `src/`: `kebab-case` em arquivos e diretórios, arquivos de convenção do Next.js em `app/`, e o sufixo obrigatório de cada pasta (por exemplo, `domain/entities/` só aceita `*.entity.ts`). Adicione ao `package.json` e rode no CI:

```json
"check:naming": "node scripts/check-naming.mjs"
```

```js
// npm run check:naming  →  falha se algum nome sob src/ violar as regras de nomenclatura
import { readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.argv[2] ?? "src";
const KEBAB = "[a-z0-9]+(?:-[a-z0-9]+)*";
const DIR = new RegExp(`^(?:${KEBAB}|\\[\\.{0,3}${KEBAB}\\]|\\(${KEBAB}\\)|@${KEBAB})$`);   // kebab, [param], (grupo), @slot
const FILE = new RegExp(`^${KEBAB}(?:\\.${KEBAB})*\\.(?:ts|tsx|css)$`);                     // nome[.papel][.spec|.test].ext
const NEXT = /^(layout|page|loading|error|global-error|not-found|template|default|route|globals|robots|sitemap)\.(tsx?|css)$/;
const NEXT_ROOT = /^(middleware|proxy)\.ts$/;
const VENDOR = /\/presentation\/(components\/ui|lib|hooks)\//;                                // gerado pelo shadcn: só kebab-case

// pasta → papéis permitidos no sufixo (`nome.<papel>.ts`)
const ROLES = [
  [/\/domain\/entities\//, ["entity"]],
  [/\/domain\/aggregates\//, ["aggregate"]],
  [/\/domain\/builders\//, ["builder"]],
  [/\/domain\/value-objects\//, ["vo"]],
  [/\/domain\/services\//, ["service"]],
  [/\/domain\/events\//, ["event"]],
  [/\/(domain|shared)\/errors\//, ["error"]],
  [/\/application\/ports\/(in|out)\//, ["provider", "repository"]],
  [/\/application\/use-cases\//, ["use-case"]],
  [/\/(application|infra|shared)\/dtos\//, ["dto"]],
  [/\/(application|infra)\/mappers\//, ["mapper"]],
  [/\/infra\/repositories\//, ["repository"]],
  [/\/infra\/(gateways|realtime)\//, ["gateway"]],
  [/\/presentation\/webhooks\//, ["webhook"]],
  [/\/presentation\/view-models\//, ["actions", "server", "queries", "realtime", "store", "schema", "presenter", "hook", "container"]],
  [/\/presentation\/stores\//, ["store"]],
  [/\/presentation\/providers\//, ["provider", "providers"]],
  [/\/presentation\/components\/(atoms|molecules|organisms|templates)\//, ["component"]],
  [/\/presentation\/components\/pages\//, ["page"]],
  [/\/presentation\/auth\//, ["factory", "provider"]],
  [/\/main\//, ["factory"]],
];

const erros = [];

function percorrer(dir) {
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const caminho = join(dir, entrada.name).replaceAll("\\", "/");
    if (entrada.isDirectory()) {
      if (!DIR.test(entrada.name)) erros.push(`${caminho}: diretório fora de kebab-case`);
      percorrer(caminho);
    } else if (/\.(ts|tsx|css)$/.test(entrada.name)) {
      verificar(caminho, entrada.name);
    }
  }
}

function verificar(caminho, arquivo) {
  const rel = `/${caminho}`;
  if (rel.includes("/src/app/")) {
    if (!NEXT.test(arquivo)) erros.push(`${caminho}: em app/ só são permitidos arquivos de convenção do Next.js`);
    return;
  }
  if (/^\/src\/[^/]+$/.test(rel) && NEXT_ROOT.test(arquivo)) return;
  if (!FILE.test(arquivo)) return void erros.push(`${caminho}: arquivo fora de kebab-case`);
  if (VENDOR.test(rel)) return;
  const regra = ROLES.find(([re]) => re.test(rel));
  if (!regra) return;
  const partes = arquivo.split(".").slice(0, -1);                     // sem extensão
  if (["spec", "test"].includes(partes.at(-1))) partes.pop();       // *.spec = unitário/componente; *.test = integração
  const papel = partes.length > 1 ? partes.at(-1) : undefined;
  if (!regra[1].includes(papel)) erros.push(`${caminho}: sufixo deve ser um de .${regra[1].join(", .")}`);
}

percorrer(ROOT);
erros.forEach((e) => console.error(e));
if (erros.length) process.exit(1);
console.log("nomenclatura ok");
```

Verificação feita: em uma árvore com 54 nomes válidos e 11 inválidos, o script acusou os 11 (arquivo em PascalCase, arquivo em snake_case, diretório em camelCase, sufixo fora do papel da pasta, sufixo ausente, os sufixos antigos `.port.ts`, `.view-model.ts` e `.int.spec.ts`, arquivo estranho em `app/` e componente sem `.component`) e nenhum dos válidos, inclusive `[id]`, `(auth)`, arquivos do shadcn e testes `.spec` e `.test`.
