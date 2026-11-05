const MOD = "^src/modules/([^/]+)"; // $1 = nome do módulo
const VIEWS = "^src/presentation/components/(atoms|molecules|organisms|templates|pages)/";

module.exports = {
  forbidden: [
    {
      name: "shared-puro",
      severity: "error",
      from: { path: "^src/shared/" },
      to: { pathNot: "^src/shared/" },
    },
    {
      name: "domain-so-shared",
      severity: "error",
      from: { path: `${MOD}/domain/` },
      to: { pathNot: ["^src/shared/", "^src/modules/$1/domain/"] },
    },
    {
      name: "application-so-domain-e-shared",
      severity: "error",
      from: { path: `${MOD}/application/` },
      to: { pathNot: ["^src/shared/", "^src/modules/$1/(domain|application)/"] },
    },
    {
      name: "infra-so-dentro-do-modulo",
      severity: "error",
      from: { path: `${MOD}/infra/` },
      to: {
        pathNot: [
          "^src/shared/",
          "^src/modules/$1/(domain|application|infra)/",
          "node_modules/",
          // crypto: assinatura e verificação de webhook (HMAC).
          "^(node:)?crypto$",
        ],
      },
    },
    {
      name: "so-main-importa-infra",
      severity: "error",
      from: { pathNot: ["^src/main/", "/infra/"] },
      to: { path: "^src/modules/[^/]+/infra/" },
    },
    {
      name: "main-sem-domain",
      severity: "error",
      from: { path: "^src/main/" },
      to: { path: "^src/modules/[^/]+/domain/" },
    },
    {
      name: "so-actions-importam-main",
      severity: "error",
      from: {
        path: "^src/(modules|presentation|app)/",
        pathNot: "\\.(actions|server|webhook)\\.tsx?$",
      },
      to: { path: "^src/main/(?!client/)" },
    },
    {
      name: "so-realtime-importa-main-client",
      severity: "error",
      from: { pathNot: ["\\.realtime\\.tsx?$", "^src/main/"] },
      to: { path: "^src/main/client/" },
    },
    {
      name: "main-client-sem-servidor",
      severity: "error",
      from: { path: "^src/main/client/" },
      to: { path: ["^src/main/(?!client/)", "node_modules/server-only/"] },
    },
    {
      name: "supabase-so-em-infra-main-e-auth",
      severity: "error",
      from: { pathNot: ["^src/modules/[^/]+/infra/", "^src/main/", "^src/presentation/auth/"] },
      to: { path: "@supabase/" },
    },
    {
      name: "webhook-route-so-importa-handler",
      severity: "error",
      from: { path: "^src/app/api/webhooks/" },
      to: { pathNot: ["^src/modules/[^/]+/presentation/webhooks/", "node_modules/"] },
    },
    {
      name: "modulos-isolados",
      severity: "error",
      from: { path: `${MOD}/` },
      to: { path: "^src/modules/[^/]+/", pathNot: "^src/modules/$1/" },
    },
    {
      name: "app-so-presentation",
      severity: "error",
      from: { path: "^src/app/" },
      to: { path: "^src/modules/[^/]+/(domain|application|infra)/" },
    },
    {
      name: "presentation-global-sem-modulos",
      severity: "error",
      from: { path: "^src/presentation/" },
      to: { path: "^src/modules/" },
    },

    {
      name: "view-burra",
      severity: "error",
      from: { path: VIEWS },
      to: {
        path: ["^src/main/", "^src/modules/[^/]+/(domain|application|infra)/", "/view-models/"],
      },
    },
    {
      name: "view-sem-next",
      severity: "error",
      from: { path: VIEWS },
      to: { path: "node_modules/next/(?!(link|image)\\.js)" },
    },
    {
      name: "so-container-e-presenter-importam-view",
      severity: "error",
      from: { path: "^src/modules/", pathNot: "\\.(container|presenter)\\.tsx?$" },
      to: { path: "^src/presentation/components/" },
    },
    {
      name: "viewmodel-sem-domain-nem-infra",
      severity: "error",
      from: { path: "^src/modules/[^/]+/presentation/view-models/" },
      to: { path: "^src/modules/[^/]+/(domain|infra)/" },
    },
    {
      name: "container-so-atom-molecule-organism",
      severity: "error",
      from: { path: "\\.container\\.tsx$" },
      to: { path: "^src/presentation/components/(templates|pages)/" },
    },

    {
      name: "ad-atom",
      severity: "error",
      from: { path: "/atoms/" },
      to: { path: "/(molecules|organisms|templates|pages)/" },
    },
    {
      name: "ad-molecule",
      severity: "error",
      from: { path: "/molecules/" },
      to: { path: "/(organisms|templates|pages)/" },
    },
    {
      name: "ad-organism",
      severity: "error",
      from: { path: "/organisms/" },
      to: { path: "/(templates|pages)/" },
    },
    {
      name: "ad-template",
      severity: "error",
      from: { path: "/templates/" },
      to: { path: "/pages/" },
    },
  ],
  options: {
    tsConfig: { fileName: "tsconfig.json" },
    tsPreCompilationDeps: true, // enxerga `import type`
    doNotFollow: { path: "node_modules" },
    exclude: { path: "\\.(spec|test)\\.tsx?$" }, // testes unitários (*.spec) e de integração (*.test)
  },
};
