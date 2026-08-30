import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { validateDependency } from "../node_modules/dependency-cruiser/src/validate/index.mjs";

const require = createRequire(import.meta.url);
const configuration = require("../.dependency-cruiser.js");
const ruleSet = { forbidden: configuration.forbidden };

function dependency(resolved, overrides = {}) {
  return {
    resolved,
    module: resolved,
    dependencyTypes: ["import"],
    circular: false,
    couldNotResolve: false,
    dynamic: false,
    exoticallyRequired: false,
    ...overrides,
  };
}

function matchedRules(from, to, overrides) {
  const validation = validateDependency(ruleSet, { source: from }, dependency(to, overrides));
  return validation.rules?.map(({ name }) => name) ?? [];
}

const forbiddenCases = [
  {
    rule: "no-circular-dependencies",
    from: "modules/search/application/loop.ts",
    to: "modules/backtesting/api/index.ts",
    overrides: { circular: true },
  },
  {
    rule: "domain-does-not-import-other-modules",
    from: "modules/news/domain/item.ts",
    to: "modules/sentiment/api/index.ts",
  },
  {
    rule: "no-cross-module-internals",
    from: "modules/search/application/loop.ts",
    to: "modules/backtesting/application/ports.ts",
  },
  {
    rule: "apps-use-public-module-apis",
    from: "apps/backend/src/compose.ts",
    to: "modules/market-data/application/ports.ts",
  },
  {
    rule: "packages-do-not-import-modules",
    from: "packages/contracts/websocket/market-data.ts",
    to: "modules/market-data/api/index.ts",
  },
  {
    rule: "application-does-not-import-own-api",
    from: "modules/backtesting/application/service.ts",
    to: "modules/backtesting/api/index.ts",
  },
  {
    rule: "api-does-not-import-infrastructure",
    from: "modules/backtesting/api/index.ts",
    to: "modules/backtesting/infrastructure/local/executor.ts",
  },
  {
    rule: "search-does-not-import-concrete-backtest-executor",
    from: "modules/search/application/loop.ts",
    to: "modules/backtesting/infrastructure/local/executor.ts",
  },
  {
    rule: "pure-domain-does-not-depend-on-auth",
    from: "modules/strategy/domain/strategy.ts",
    to: "modules/auth/api/index.ts",
  },
];

for (const testCase of forbiddenCases) {
  assert.ok(
    matchedRules(testCase.from, testCase.to, testCase.overrides).includes(testCase.rule),
    `${testCase.rule} did not detect ${testCase.from} -> ${testCase.to}`,
  );
}

const allowedCases = [
  ["modules/news/application/collector.ts", "modules/sentiment/api/index.ts"],
  [
    "modules/backtesting/infrastructure/local/executor.ts",
    "modules/backtesting/application/ports.ts",
  ],
  ["apps/backend/src/compose.ts", "modules/backtesting/api/bootstrap.ts"],
  ["apps/backend/src/compose.ts", "modules/auth/api/bootstrap.ts"],
  ["modules/backtesting/api/bootstrap.ts", "modules/backtesting/infrastructure/local/executor.ts"],
  ["modules/backtesting/api/composition.ts", "modules/backtesting/infrastructure/local/executor.ts"],
  ["modules/strategy/api/contracts.ts", "modules/auth/api/index.ts"],
  ["modules/search/application/service.ts", "modules/auth/api/index.ts"],
  ["packages/contracts/websocket/index.ts", "packages/contracts/websocket/market-data.ts"],
];

for (const [from, to] of allowedCases) {
  assert.deepEqual(matchedRules(from, to), [], `allowed dependency was rejected: ${from} -> ${to}`);
}

console.log(`Architecture rules detected ${forbiddenCases.length} forbidden dependency fixtures.`);
