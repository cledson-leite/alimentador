module.exports = {
  testEnvironment: "node",
  // unpdf é só ESM: rode com NODE_OPTIONS=--experimental-vm-modules (script `yarn test`).
  transform: { "^.+\.ts$": ["ts-jest", { tsconfig: "tsconfig.json", diagnostics: false }] },
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  testMatch: ["**/*.spec.ts", "**/*.test.ts"],
};
