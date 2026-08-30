/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular-dependencies",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "no-unresolved-dependencies",
      severity: "error",
      from: {},
      to: { couldNotResolve: true },
    },
    {
      name: "domain-does-not-import-other-modules",
      severity: "error",
      from: { path: "^modules/([^/]+)/domain/" },
      to: { path: "^modules/", pathNot: "^modules/$1/" },
    },
    {
      name: "no-cross-module-internals",
      severity: "error",
      from: { path: "^modules/([^/]+)/" },
      to: {
        path: "^modules/[^/]+/(application|domain|infrastructure)/",
        pathNot: "^modules/$1/",
      },
    },
    {
      name: "apps-use-public-module-apis",
      severity: "error",
      from: { path: "^apps/" },
      to: { path: "^modules/", pathNot: "^modules/[^/]+/api/" },
    },
    {
      name: "packages-do-not-import-modules",
      severity: "error",
      from: { path: "^packages/" },
      to: { path: "^modules/" },
    },
    {
      name: "application-does-not-import-own-api",
      severity: "error",
      from: { path: "^modules/([^/]+)/application/" },
      to: { path: "^modules/$1/api/" },
    },
    {
      name: "domain-depends-inward-only",
      severity: "error",
      from: { path: "^modules/([^/]+)/domain/" },
      to: { path: "^modules/$1/(api|application|infrastructure)/" },
    },
    {
      name: "application-depends-inward-only",
      severity: "error",
      from: { path: "^modules/([^/]+)/application/" },
      to: { path: "^modules/$1/(api|infrastructure)/" },
    },
    {
      name: "api-does-not-import-infrastructure",
      severity: "error",
      from: {
        path: "^modules/([^/]+)/api/",
        pathNot:
          "^(?:modules/[^/]+/api/bootstrap\\.ts|modules/backtesting/api/composition\\.ts)$",
      },
      to: { path: "^modules/$1/infrastructure/" },
    },
    {
      name: "search-does-not-import-concrete-backtest-executor",
      severity: "error",
      from: { path: "^modules/search/" },
      to: { path: "^modules/backtesting/infrastructure/" },
    },
    {
      name: "pure-domain-does-not-depend-on-auth",
      severity: "error",
      from: {
        path: "^modules/(strategy|search|backtesting|evaluation|leaderboard|market-data|news|sentiment)/domain/",
      },
      to: { path: "^modules/auth/" },
    },
  ],
  options: {
    tsConfig: { fileName: "tsconfig.base.json" },
    doNotFollow: { path: "node_modules/(?!@cryptox(?:/|$))" },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["types", "import", "require", "node", "default"],
      extensions: [".ts", ".tsx", ".js", ".jsx"],
    },
    preserveSymlinks: false,
  },
};
