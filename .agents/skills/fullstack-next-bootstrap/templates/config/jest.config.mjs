import nextJest from "next/jest.js";

const criarConfig = nextJest({ dir: "./" });

const ignorar = ["/node_modules/", "/e2e/"]; // e2e/ é do Playwright

const comum = {
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  testPathIgnorePatterns: ignorar,
};

export default async () => ({
  projects: [
    await criarConfig({
      ...comum,
      displayName: "unit", // unitário e componente
      testMatch: ["**/*.spec.{ts,tsx}"],
      testEnvironment: "jsdom",
      setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
    })(),
    await criarConfig({
      ...comum,
      displayName: "integration", // integração (inclui os de webhook com Supertest)
      testMatch: ["**/*.test.ts"],
      testEnvironment: "node",
    })(),
  ],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/*.{spec,test}.{ts,tsx}",
    "!src/presentation/components/ui/**", // shadcn: não é testado (testes.md, seção 3)
    "!src/app/**",
    "!src/main/**",
  ],
  coverageThreshold: {
    global: { statements: 90, lines: 90, functions: 90, branches: 85 }, // testes.md, seção 6
  },
});
