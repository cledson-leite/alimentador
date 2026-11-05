import { existsSync, mkdirSync, writeFileSync } from "node:fs";

const nome = process.argv[2];
if (!/^[a-z][a-z0-9-]*$/.test(nome ?? "")) {
  console.error("uso: yarn new:module <nome-kebab>");
  process.exit(1);
}
if (existsSync(`src/modules/${nome}`)) {
  console.error(`módulo "${nome}" já existe`);
  process.exit(1);
}

const base = `src/modules/${nome}`;
const dirs = [
  "domain/aggregates",
  "domain/entities",
  "domain/builders",
  "domain/value-objects",
  "domain/services",
  "domain/errors",
  "application/ports/in",
  "application/ports/out",
  "application/use-cases",
  "application/dtos",
  "application/mappers",
  "infra/repositories",
  "infra/gateways",
  "infra/realtime",
  "infra/dtos",
  "infra/mappers",
  "presentation/view-models",
  "presentation/webhooks",
];
for (const d of dirs) {
  mkdirSync(`${base}/${d}`, { recursive: true });
  writeFileSync(`${base}/${d}/.gitkeep`, "");
}
mkdirSync("src/main/client", { recursive: true });
writeFileSync(
  `src/main/${nome}.factory.ts`,
  `import "server-only";\n// Injeção de dependências do módulo ${nome}: instancia infra e injeta nos casos de uso.\nexport {};\n`,
);
console.log(`módulo "${nome}" criado em ${base} + src/main/${nome}.factory.ts`);
