const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { scanDeferredScope } = require("./check-deferred-scope.cjs");

function withFixture(files, callback) {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "cryptox-scope-check-"));
  try {
    for (const [relativePath, content] of Object.entries(files)) {
      const target = path.join(fixture, relativePath);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, content);
    }
    callback(fixture);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}

test("permits approved DEC-007 profiles only in named contract boundaries", () => {
  withFixture({
    "modules/search/api/contracts.ts": "export const profiles = ['DOMAIN_GUIDED_V1', 'GENETIC_V1'];",
    "packages/contracts/rest/search.ts": "export const profiles = ['DOMAIN_GUIDED_V1', 'GENETIC_V1'];",
    "modules/backtesting/api/contracts.ts": "export const profile = { id: 'SYNTHETIC_SHORT_PAPER_V1', positionPolicy: { leverage: 'PROHIBITED' }, excluded: ['MARGIN', 'FUNDING', 'LIQUIDATION', 'GENERALIZED_RISK_MANAGEMENT'] }; export const exit = 'STOP_LOSS_WINS_V1'; export const direction = 'LONG'; export const stopLoss = true;",
    "modules/strategy/api/contracts.ts": "export const authoring = 'LLM_AUTHORING_V1'; export const vote = 'WEIGHTED_VOTE_V1'; export const lite = ['SMC_LITE_V1', 'WYCKOFF_LITE_V1'];",
    "modules/strategy/application/ports.ts": "export const extensions = ['WEIGHTED_VOTE_V1', 'SMC_LITE_V1', 'WYCKOFF_LITE_V1'];",
    "modules/market-data/api/contracts.ts": "export const observability = 'MARKET_OBSERVABILITY_V1';",
  }, (fixture) => assert.deepEqual(scanDeferredScope(fixture), []));
});

test("rejects approved Search profiles outside the exact canonical REST file", () => {
  const files = {
    "packages/contracts/rest/search/legacy.ts": "export const profiles = ['DOMAIN_GUIDED_V1', 'GENETIC_V1'];",
    "packages/contracts/rest/search-legacy.ts": "export const profiles = ['DOMAIN_GUIDED_V1', 'GENETIC_V1'];",
    "packages/contracts/rest/search.tsx": "export const profiles = ['DOMAIN_GUIDED_V1', 'GENETIC_V1'];",
  };
  withFixture(files, (fixture) => {
    const findings = scanDeferredScope(fixture).join("\n");
    for (const relativePath of Object.keys(files)) {
      const escapedPath = relativePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      assert.match(findings, new RegExp(`${escapedPath}: approved profile DOMAIN_GUIDED_V1 is outside its supported boundary`));
      assert.match(findings, new RegExp(`${escapedPath}: approved profile GENETIC_V1 is outside its supported boundary`));
    }
  });
});

test("permits Q-02 profiles in every exact Search boundary", () => {
  withFixture({
    "modules/search/api/contracts.ts": "export const profiles = ['DOMAIN_GUIDED_V1', 'GENETIC_V1'];",
    "modules/search/api/registry.ts": "export const profiles = ['DOMAIN_GUIDED_V1', 'GENETIC_V1'];",
    "modules/search/application/ports.ts": "export const profiles = ['DOMAIN_GUIDED_V1', 'GENETIC_V1'];",
    "packages/contracts/rest/search.ts": "export const profiles = ['DOMAIN_GUIDED_V1', 'GENETIC_V1'];",
    "infra/db/migrations/003_search_profiles.js": "export const profiles = ['DOMAIN_GUIDED_V1', 'GENETIC_V1'];",
    "modules/search/application/service.ts": "export const profiles = ['DOMAIN_GUIDED_V1', 'GENETIC_V1'];",
    "modules/search/domain/generators/domain-guided/index.ts": "export const profile = 'DOMAIN_GUIDED_V1';",
    "modules/search/domain/generators/genetic/index.ts": "export const profile = 'GENETIC_V1';",
  }, (fixture) => assert.deepEqual(scanDeferredScope(fixture), []));
});

test("rejects Q-02 profiles in broad, near-match, and unrelated Search paths", () => {
  const files = {
    "modules/search/application/other.ts": "export const profiles = ['DOMAIN_GUIDED_V1', 'GENETIC_V1'];",
    "modules/search/api/registry.tsx": "export const profiles = ['DOMAIN_GUIDED_V1', 'GENETIC_V1'];",
    "modules/search/api/registry-legacy.ts": "export const profiles = ['DOMAIN_GUIDED_V1', 'GENETIC_V1'];",
    "modules/search/application/service.tsx": "export const profiles = ['DOMAIN_GUIDED_V1', 'GENETIC_V1'];",
    "modules/search/application/service-legacy.ts": "export const profiles = ['DOMAIN_GUIDED_V1', 'GENETIC_V1'];",
    "modules/search/domain/generators/other.ts": "export const profiles = ['DOMAIN_GUIDED_V1', 'GENETIC_V1'];",
    "modules/search/domain/generators/domain-guided.ts": "export const profile = 'DOMAIN_GUIDED_V1';",
    "modules/search/domain/generators/domain-guided-legacy/index.ts": "export const profile = 'DOMAIN_GUIDED_V1';",
    "modules/search/domain/generators/genetic.ts": "export const profile = 'GENETIC_V1';",
    "modules/search/domain/generators/genetic-legacy/index.ts": "export const profile = 'GENETIC_V1';",
    "modules/search/infrastructure/profiles.ts": "export const profiles = ['DOMAIN_GUIDED_V1', 'GENETIC_V1'];",
  };
  withFixture(files, (fixture) => {
    const findings = scanDeferredScope(fixture).join("\n");
    for (const relativePath of Object.keys(files)) {
      const escapedPath = relativePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const profiles = files[relativePath].includes("DOMAIN_GUIDED_V1") ? ["DOMAIN_GUIDED_V1"] : [];
      if (files[relativePath].includes("GENETIC_V1")) profiles.push("GENETIC_V1");
      for (const profile of profiles) {
        assert.match(findings, new RegExp(`${escapedPath}: approved profile ${profile} is outside its supported boundary`));
      }
    }
  });
});

test("permits approved Strategy extension profiles in their exact implementation directories", () => {
  withFixture({
    "modules/strategy/application/composite/weighted-vote.ts": "export const profile = 'WEIGHTED_VOTE_V1';",
    "modules/strategy/domain/composite/weighted-vote.ts": "export const profile = 'WEIGHTED_VOTE_V1';",
    "modules/strategy/domain/plugins/smc-lite/index.ts": "export const profile = 'SMC_LITE_V1';",
    "modules/strategy/domain/plugins/wyckoff-lite/index.ts": "export const profile = 'WYCKOFF_LITE_V1';",
  }, (fixture) => assert.deepEqual(scanDeferredScope(fixture), []));
});

test("rejects approved Strategy extension profiles outside their exact implementation directories", () => {
  withFixture({
    "modules/strategy/api/contracts.tsx": "export const profile = 'WEIGHTED_VOTE_V1';",
    "modules/strategy/application/composite-legacy/weighted-vote.ts": "export const profile = 'WEIGHTED_VOTE_V1';",
    "modules/strategy/domain/composite-legacy/weighted-vote.ts": "export const profile = 'WEIGHTED_VOTE_V1';",
    "modules/strategy/domain/plugins/smc-lite-legacy/index.ts": "export const profile = 'SMC_LITE_V1';",
    "modules/strategy/domain/plugins/wyckoff-lite-legacy/index.ts": "export const profile = 'WYCKOFF_LITE_V1';",
  }, (fixture) => {
    const findings = scanDeferredScope(fixture).join("\n");
    assert.match(findings, /modules\/strategy\/api\/contracts\.tsx: approved profile WEIGHTED_VOTE_V1 is outside its supported boundary/);
    assert.match(findings, /modules\/strategy\/application\/composite-legacy\/weighted-vote\.ts: approved profile WEIGHTED_VOTE_V1 is outside its supported boundary/);
    assert.match(findings, /modules\/strategy\/domain\/composite-legacy\/weighted-vote\.ts: approved profile WEIGHTED_VOTE_V1 is outside its supported boundary/);
    assert.match(findings, /modules\/strategy\/domain\/plugins\/smc-lite-legacy\/index\.ts: approved profile SMC_LITE_V1 is outside its supported boundary/);
    assert.match(findings, /modules\/strategy\/domain\/plugins\/wyckoff-lite-legacy\/index\.ts: approved profile WYCKOFF_LITE_V1 is outside its supported boundary/);
  });
});

test("permits B-03 paper profiles and vocabulary in exact Backtesting implementation directories", () => {
  withFixture({
    "modules/backtesting/domain/simulator.ts": "const profiles = ['SYNTHETIC_SHORT_PAPER_V1', 'STOP_LOSS_WINS_V1']; const directions = ['LONG', 'SHORT']; const stopLoss = true; const takeProfit = true;",
    "modules/backtesting/application/service.ts": "const profiles = ['SYNTHETIC_SHORT_PAPER_V1', 'STOP_LOSS_WINS_V1']; const directions = ['LONG', 'SHORT']; const stopLoss = true; const takeProfit = true;",
    "modules/backtesting/infrastructure/postgres.ts": "const profiles = ['SYNTHETIC_SHORT_PAPER_V1', 'STOP_LOSS_WINS_V1']; const directions = ['LONG', 'SHORT']; const stopLoss = true; const takeProfit = true;",
  }, (fixture) => assert.deepEqual(scanDeferredScope(fixture), []));
});

test("rejects B-03 paper profiles and vocabulary outside exact Backtesting implementation directories", () => {
  const files = {
    "modules/backtesting/domain-legacy/simulator.ts": "const profiles = ['SYNTHETIC_SHORT_PAPER_V1', 'STOP_LOSS_WINS_V1']; const directions = ['LONG', 'SHORT']; const stopLoss = true; const takeProfit = true;",
    "modules/backtesting/application-old/service.ts": "const profiles = ['SYNTHETIC_SHORT_PAPER_V1', 'STOP_LOSS_WINS_V1']; const directions = ['LONG', 'SHORT']; const stopLoss = true; const takeProfit = true;",
    "modules/backtesting/infrastructure-legacy/postgres.ts": "const profiles = ['SYNTHETIC_SHORT_PAPER_V1', 'STOP_LOSS_WINS_V1']; const directions = ['LONG', 'SHORT']; const stopLoss = true; const takeProfit = true;",
    "modules/backtesting/paper.ts": "const profiles = ['SYNTHETIC_SHORT_PAPER_V1', 'STOP_LOSS_WINS_V1']; const directions = ['LONG', 'SHORT']; const stopLoss = true; const takeProfit = true;",
    "modules/evaluation/backtesting.ts": "const profiles = ['SYNTHETIC_SHORT_PAPER_V1', 'STOP_LOSS_WINS_V1']; const directions = ['LONG', 'SHORT']; const stopLoss = true; const takeProfit = true;",
  };
  withFixture(files, (fixture) => {
    const findings = scanDeferredScope(fixture).join("\n");
    for (const relativePath of Object.keys(files)) {
      const escapedPath = relativePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      assert.match(findings, new RegExp(`${escapedPath}: approved profile SYNTHETIC_SHORT_PAPER_V1 is outside its supported boundary`));
      assert.match(findings, new RegExp(`${escapedPath}: approved profile STOP_LOSS_WINS_V1 is outside its supported boundary`));
      assert.match(findings, new RegExp(`${escapedPath}: directional paper profile vocabulary is outside its supported boundary`));
    }
  });
});

test("rejects an otherwise approved profile outside its named boundary", () => {
  withFixture({
    "modules/strategy/api/contracts.ts": "export const profile = 'DOMAIN_GUIDED_V1';",
  }, (fixture) => assert.match(scanDeferredScope(fixture).join("\n"), /outside its supported boundary/));
});

test("rejects market observability outside its ephemeral market-WebSocket boundary", () => {
  withFixture({
    "packages/contracts/rest/market-data/contracts.ts": "export const profile = 'MARKET_OBSERVABILITY_V1';",
    "infra/db/migrations/003_market_observability.js": "const profile = 'MARKET_OBSERVABILITY_V1';",
  }, (fixture) => {
    const findings = scanDeferredScope(fixture).join("\n");
    assert.match(findings, /packages\/contracts\/rest\/market-data\/contracts\.ts: approved profile MARKET_OBSERVABILITY_V1 is outside its supported boundary/);
    assert.match(findings, /infra\/db\/migrations\/003_market_observability\.js: approved profile MARKET_OBSERVABILITY_V1 is outside its supported boundary/);
  });
});

test("rejects operational risk even inside the synthetic-paper contract boundary", () => {
  withFixture({
    "modules/backtesting/api/contracts.ts": "export const policy = { leverage: 'PROHIBITED', excluded: ['LEVERAGE'] }; const leverage = 5;",
  }, (fixture) => assert.match(scanDeferredScope(fixture).join("\n"), /deferred risk vocabulary lacks an approved synthetic-paper prohibition context/));
});

test("continues rejecting every deferred-scope family", () => {
  withFixture({
    "modules/strategy/api/contracts.ts": "const rbac = 'RBAC'; const oauth = 'OAuth'; const sso = 'SSO'; const organizationId = 'forbidden'; const tenantId = 'forbidden'; const workspaceId = 'forbidden'; const passwordReset = true; const twoFactor = true;",
    "modules/strategy/application/authoring.ts": "const autonomous = true; const unconfiguredLlm = true;",
    "modules/search/application/unsafe.ts": "const invalid = undefined as never;",
    "modules/search/api/contracts.ts": "const queue = 'BullMQ'; const redis = 'Redis'; const kafka = 'Kafka'; const rabbit = 'RabbitMQ'; const queueJobId = 'forbidden'; const completionClaimToken = 'forbidden'; const fencingGeneration = 1; const terminal = 'TERMINAL_FAILURE_PENDING'; const retry = 'RETRY_WAIT';",
    "modules/backtesting/api/contracts.ts": "const trailingStop = true; const riskPolicy = true; const portfolioRisk = true; const positionSizing = true; const placeExchangeOrder = true; const exchangeOrder = true;",
    "modules/evaluation/api/contracts.ts": "const liveTrading = true; const leverage = true; const generalizedRisk = true; const live_trading = true;",
    "modules/news/api/contracts.ts": "const strict = 'SentimentDatasetSnapshotRef'; const snapshot = 'SentimentSnapshotPoint'; const model = 'modelSha256'; const worker = 'workerRuntimeSha256'; const evaluation = 'evaluationRuntimeSha256'; const dataset = 'datasetSnapshotSha256';",
  }, (fixture) => {
    const findings = scanDeferredScope(fixture).join("\n");
    const findingsFor = (relativePath) => findings.split("\n").filter((finding) => finding.startsWith(`${relativePath}:`));
    assert.equal(findingsFor("modules/strategy/api/contracts.ts").length, 1);
    assert.equal(findingsFor("modules/strategy/application/authoring.ts").length, 1);
    assert.equal(findingsFor("modules/search/application/unsafe.ts").length, 1);
    assert.equal(findingsFor("modules/search/api/contracts.ts").length, 2);
    assert.equal(findingsFor("modules/backtesting/api/contracts.ts").length, 1);
    assert.ok(findingsFor("modules/evaluation/api/contracts.ts").length >= 2);
    assert.equal(findingsFor("modules/news/api/contracts.ts").length, 1);
    assert.match(findings, /RBAC/);
    assert.match(findings, /OAuth/);
    assert.match(findings, /SSO/);
    assert.match(findings, /organizationId/);
    assert.match(findings, /tenantId/);
    assert.match(findings, /workspaceId/);
    assert.match(findings, /passwordReset/);
    assert.match(findings, /twoFactor/);
    assert.match(findings, /BullMQ/);
    assert.match(findings, /Redis/);
    assert.match(findings, /Kafka/);
    assert.match(findings, /RabbitMQ/);
    assert.match(findings, /queueJobId/);
    assert.match(findings, /completionClaimToken/);
    assert.match(findings, /fencingGeneration/);
    assert.match(findings, /TERMINAL_FAILURE_PENDING/);
    assert.match(findings, /RETRY_WAIT/);
    assert.match(findings, /trailingStop/);
    assert.match(findings, /riskPolicy/);
    assert.match(findings, /portfolioRisk/);
    assert.match(findings, /positionSizing/);
    assert.match(findings, /placeExchangeOrder/);
    assert.match(findings, /exchangeOrder/);
    assert.match(findings, /deferred risk vocabulary lacks an approved synthetic-paper prohibition context/);
    assert.match(findings, /unconfigured/);
    assert.match(findings, /SentimentDatasetSnapshotRef/);
    assert.match(findings, /SentimentSnapshotPoint/);
    assert.match(findings, /modelSha256/);
    assert.match(findings, /workerRuntimeSha256/);
    assert.match(findings, /evaluationRuntimeSha256/);
    assert.match(findings, /datasetSnapshotSha256/);
  });
});

test("rejects every configured forbidden active path", () => {
  withFixture({
    "apps/backtest-worker/index.ts": "export const forbidden = true;",
    "packages/contracts/queue/index.ts": "export const forbidden = true;",
    "infra/docker/worker.Dockerfile": "FROM node:22",
  }, (fixture) => {
    const findings = scanDeferredScope(fixture).join("\n");
    assert.match(findings, /apps\/backtest-worker: forbidden active path exists/);
    assert.match(findings, /packages\/contracts\/queue: forbidden active path exists/);
    assert.match(findings, /infra\/docker\/worker\.Dockerfile: forbidden active path exists/);
  });
});
