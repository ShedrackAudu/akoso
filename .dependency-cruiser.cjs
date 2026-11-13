// Import boundaries for the modular monolith (brief section 3.1).
// Dependencies point one way: apps -> core -> domain and db. A violation fails CI.

const NOT_TESTS = "\\.test\\.tsx?$"

/** @type {import("dependency-cruiser").IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      comment: "Circular dependencies fail the build.",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "schemas-is-a-leaf",
      comment: "@akoso/schemas imports no other Akoso package or app.",
      severity: "error",
      from: { path: "^packages/schemas/" },
      to: { path: "^(apps|packages)/", pathNot: "^packages/schemas/" },
    },
    {
      name: "domain-is-pure",
      comment:
        "@akoso/domain never imports the database, use cases, providers, UI or apps. It may use @akoso/schemas.",
      severity: "error",
      from: { path: "^packages/domain/" },
      to: {
        path: "^(apps|packages)/",
        pathNot: "^packages/(domain|schemas)/",
      },
    },
    {
      name: "domain-no-framework",
      comment: "@akoso/domain never imports a framework or database library.",
      severity: "error",
      from: { path: "^packages/domain/" },
      to: {
        path: "node_modules/(next|react|react-dom|drizzle-orm|pg|postgres|better-auth)/",
      },
    },
    {
      name: "shared-code-runs-in-react-native",
      comment:
        "@akoso/domain and @akoso/schemas use no Node built-ins, so they also run in the Expo app (brief section 5.1).",
      severity: "error",
      from: { path: "^packages/(domain|schemas)/", pathNot: NOT_TESTS },
      to: { dependencyTypes: ["core"] },
    },
    {
      name: "db-depends-only-on-schemas",
      severity: "error",
      from: { path: "^packages/db/" },
      to: { path: "^(apps|packages)/", pathNot: "^packages/(db|schemas)/" },
    },
    {
      name: "providers-know-no-business-logic",
      comment:
        "@akoso/providers may use @akoso/schemas and @akoso/domain types, nothing else.",
      severity: "error",
      from: { path: "^packages/providers/" },
      to: {
        path: "^(apps|packages)/",
        pathNot: "^packages/(providers|schemas|domain)/",
      },
    },
    {
      name: "core-no-ui-or-apps",
      comment: "@akoso/core never imports UI, the API client or an app.",
      severity: "error",
      from: { path: "^packages/core/" },
      to: { path: "^(apps/|packages/(ui|api-client)/)" },
    },
    {
      name: "core-no-framework",
      comment:
        "Use cases are framework-free so the web app, the worker and /api/v1 can all call them.",
      severity: "error",
      from: { path: "^packages/core/" },
      to: { path: "node_modules/(next|react|react-dom)/" },
    },
    {
      name: "core-modules-use-public-interfaces",
      comment:
        "A module imports another module only through its index.ts, never its internals.",
      severity: "error",
      from: { path: "^packages/core/src/([^/]+)/" },
      to: {
        path: "^packages/core/src/[^/]+/",
        pathNot: [
          "^packages/core/src/$1/",
          "^packages/core/src/[^/]+/index\\.ts$",
        ],
      },
    },
    {
      name: "testing-helpers-only-in-tests",
      comment:
        "packages/core/src/testing builds signed-in contexts without sign-in: tests only.",
      severity: "error",
      from: { path: "^(apps|packages)/", pathNot: NOT_TESTS },
      to: { path: "^packages/core/src/testing/" },
    },
    {
      name: "core-modules-own-their-tables",
      comment:
        "A module uses only its own schema file. Reach another module's data through its services.",
      severity: "error",
      from: { path: "^packages/core/src/([^/]+)/" },
      to: {
        path: "^packages/db/src/schema/",
        pathNot: "^packages/db/src/schema/$1\\.ts$",
      },
    },
    {
      name: "ui-is-presentational",
      comment:
        "@akoso/ui holds no business logic and never touches data. It may use @akoso/schemas types.",
      severity: "error",
      from: { path: "^packages/ui/" },
      to: { path: "^(apps|packages)/", pathNot: "^packages/(ui|schemas)/" },
    },
    {
      name: "api-client-depends-only-on-schemas",
      severity: "error",
      from: { path: "^packages/api-client/" },
      to: {
        path: "^(apps|packages)/",
        pathNot: "^packages/(api-client|schemas)/",
      },
    },
    {
      name: "apps-never-touch-the-database",
      comment:
        "No raw database calls from UI code, route handlers or jobs. Call @akoso/core.",
      severity: "error",
      from: { path: "^apps/" },
      to: { path: "^packages/db/" },
    },
    {
      name: "apps-do-not-import-each-other",
      severity: "error",
      from: { path: "^apps/([^/]+)/" },
      to: { path: "^apps/", pathNot: "^apps/$1/" },
    },
    {
      name: "packages-do-not-import-apps",
      severity: "error",
      from: { path: "^packages/" },
      to: { path: "^apps/" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: "(^|/)(\\.next|dist|coverage|node_modules/\\.cache)/" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
      extensions: [".ts", ".tsx", ".mts", ".js", ".mjs", ".cjs", ".json"],
    },
  },
}
