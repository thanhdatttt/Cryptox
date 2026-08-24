/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "domain-must-be-pure",
      severity: "error",
      from: { path: "^modules/[^/]+/domain" },
      to: {
        pathNot: "^modules/[^/]+/domain",
        path: "(^|/)(http|pg|knex|ioredis|bullmq|ws)(/|$)|@nestjs|exchange|ui|react|vite",
      },
    },
    {
      name: "no-cross-module-internals",
      severity: "error",
      from: { path: "^modules/([^/]+)/" },
      to: { path: "^modules/([^/]+)/(domain|infrastructure)", pathNot: "^modules/$1/" },
    },
    {
      name: "apps-use-public-module-apis",
      severity: "error",
      from: { path: "^apps/(backend|backtest-worker)/" },
      to: { path: "^modules/[^/]+/(domain|infrastructure)" },
    },
    {
      name: "worker-market-data-split",
      severity: "error",
      from: { path: "^apps/backtest-worker/" },
      to: { path: "^modules/market-data/api/index", pathNot: "createMarketDataSnapshotReader" },
    },
    {
      name: "worker-no-backend-only-modules",
      severity: "error",
      from: { path: "^apps/backtest-worker/" },
      to: { path: "^modules/(leaderboard|search|news|evaluation)" },
    },
    {
      name: "search-no-backtest-queue-or-internals",
      severity: "error",
      from: { path: "^modules/search/" },
      to: { path: "^modules/backtesting/(infrastructure/queue|domain)" },
    },
    {
      name: "leaderboard-no-search-or-backtest-internals",
      severity: "error",
      from: { path: "^modules/leaderboard/" },
      to: { path: "^modules/(search/domain|backtesting/infrastructure)" },
    },
    {
      name: "news-sentiment-isolation",
      severity: "error",
      from: { path: "^modules/(news|sentiment)/domain" },
      to: { path: "^modules/(news|sentiment)/domain" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: { extensions: [".ts", ".tsx", ".js", ".jsx"] },
    preserveSymlinks: false,
  },
};
