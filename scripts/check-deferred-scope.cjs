const fs = require("node:fs");
const path = require("node:path");

const forbiddenPaths = [
  "apps/backtest-worker",
  "packages/contracts/queue",
  "infra/docker/worker.Dockerfile",
];
const roots = ["modules", "apps", "packages", "infra"];
const approvedProfileBoundaries = {
  "DOMAIN_GUIDED_V1": [
    "modules/search/api/contracts.ts",
    "modules/search/application/ports.ts",
    "packages/contracts/rest/search.ts",
    "infra/db/migrations/",
    "modules/search/application/service.ts",
    "modules/search/domain/generators/domain-guided/",
  ],
  "GENETIC_V1": [
    "modules/search/api/contracts.ts",
    "modules/search/application/ports.ts",
    "packages/contracts/rest/search.ts",
    "infra/db/migrations/",
    "modules/search/application/service.ts",
    "modules/search/domain/generators/genetic/",
  ],
  "SYNTHETIC_SHORT_PAPER_V1": [
    "modules/backtesting/api/contracts.ts",
    "modules/backtesting/application/ports.ts",
    "packages/contracts/rest/backtesting/",
    "infra/db/migrations/",
    "modules/backtesting/domain/",
    "modules/backtesting/application/",
    "modules/backtesting/infrastructure/",
  ],
  "STOP_LOSS_WINS_V1": [
    "modules/backtesting/api/contracts.ts",
    "modules/backtesting/application/ports.ts",
    "packages/contracts/rest/backtesting/",
    "infra/db/migrations/",
    "modules/backtesting/domain/",
    "modules/backtesting/application/",
    "modules/backtesting/infrastructure/",
  ],
  "LLM_AUTHORING_V1": ["modules/strategy/api/contracts.ts", "modules/strategy/application/ports.ts", "packages/contracts/rest/strategy/", "infra/db/migrations/"],
  "WEIGHTED_VOTE_V1": [
    "modules/strategy/api/contracts.ts",
    "modules/strategy/application/ports.ts",
    "packages/contracts/rest/strategy/",
    "infra/db/migrations/",
    "modules/strategy/application/composite/",
    "modules/strategy/domain/composite/",
  ],
  "SMC_LITE_V1": [
    "modules/strategy/api/contracts.ts",
    "modules/strategy/application/ports.ts",
    "packages/contracts/rest/strategy/",
    "infra/db/migrations/",
    "modules/strategy/domain/plugins/smc-lite/",
  ],
  "WYCKOFF_LITE_V1": [
    "modules/strategy/api/contracts.ts",
    "modules/strategy/application/ports.ts",
    "packages/contracts/rest/strategy/",
    "infra/db/migrations/",
    "modules/strategy/domain/plugins/wyckoff-lite/",
  ],
  "MARKET_OBSERVABILITY_V1": ["modules/market-data/api/contracts.ts", "modules/market-data/application/ports.ts", "packages/contracts/websocket/"],
};
const genericForbiddenPatterns = [
  /\b(?:RBAC|OAuth|SSO)\b|organizationId|tenantId|workspaceId|passwordReset|twoFactor/i,
  /\bBullMQ\b|\bRedis\b|backtest-worker|\b(?:Kafka|RabbitMQ)\b/i,
  /queueJobId|completionClaimToken|fencingGeneration|TERMINAL_FAILURE_PENDING|RETRY_WAIT/i,
  /trailingStop|riskPolicy|portfolioRisk|positionSizing|placeExchangeOrder|exchangeOrder/i,
  /\b(?:autonomous(?:ly)?|auto(?:matic)?(?:Approve|Promotion)|automatic\s+(?:approval|promotion)|unconfigured(?:\s+|[-_])?llm)\b/i,
  /SentimentDatasetSnapshotRef|SentimentSnapshotPoint|modelSha256|workerRuntimeSha256|evaluationRuntimeSha256|datasetSnapshotSha256/i,
  /undefined\s+as\s+never/i,
];
const directionalProfilePattern = /["'](?:LONG|SHORT)["']|\b(?:stopLoss|takeProfit)\b/;
const directionalProfileBoundaries = [
  "modules/backtesting/api/contracts.ts",
  "modules/backtesting/application/ports.ts",
  "packages/contracts/rest/backtesting/",
  "infra/db/migrations/",
  "modules/backtesting/domain/",
  "modules/backtesting/application/",
  "modules/backtesting/infrastructure/",
];
const deferredRiskPattern = /\b(?:leverage|margin|funding|liquidation)\b|generalized[_\s-]?risk|live(?:\s|_|-)*trading|liveTrading/gi;
const syntheticPaperContractPath = "modules/backtesting/api/contracts.ts";
const approvedSyntheticPaperExclusions = new Set([
  "SHORT_POSITIONS",
  "STOP_LOSS",
  "TAKE_PROFIT",
  "TRAILING_STOP",
  "PARTIAL_FILL",
  "SCALE_IN",
  "SCALE_OUT",
  "STRATEGY_POSITION_SIZING",
  "LEVERAGE",
  "MARGIN",
  "FUNDING",
  "LIQUIDATION",
  "EXCHANGE_LOT_SIZE_RULES",
  "GENERALIZED_RISK_MANAGEMENT",
]);

function containsActiveFile(target) {
  if (!fs.existsSync(target)) return false;
  const stat = fs.statSync(target);
  if (stat.isFile()) return true;
  return fs.readdirSync(target, { withFileTypes: true }).some((entry) => {
    if (entry.name === "dist" || entry.name === "node_modules") return false;
    return containsActiveFile(path.join(target, entry.name));
  });
}

function isWithinBoundary(relativePath, boundaries) {
  return boundaries.some((boundary) => {
    if (boundary.endsWith("/")) return relativePath.startsWith(boundary);
    return relativePath === boundary;
  });
}

function approvedRiskProhibitionRanges(relativePath, content) {
  if (relativePath !== syntheticPaperContractPath) return [];
  const ranges = [];
  for (const match of content.matchAll(/\bleverage\s*:\s*["']PROHIBITED["']/gi)) {
    ranges.push({ start: match.index, end: match.index + match[0].length });
  }
  for (const match of content.matchAll(/\bexcluded\s*:\s*\[([\s\S]*?)\]/gi)) {
    const values = [...match[1].matchAll(/["']([A-Z_]+)["']/g)].map((value) => value[1]);
    const remaining = match[1].replace(/["']([A-Z_]+)["']\s*,?/g, "").trim();
    if (values.length > 0 && remaining === "" && values.every((value) => approvedSyntheticPaperExclusions.has(value))) {
      ranges.push({ start: match.index, end: match.index + match[0].length });
    }
  }
  return ranges;
}

function hasApprovedRiskProhibitionContext(relativePath, content, start, end) {
  return approvedRiskProhibitionRanges(relativePath, content)
    .some((range) => start >= range.start && end <= range.end);
}

function profileFindings(relativePath, content) {
  const findings = [];
  for (const [profile, boundaries] of Object.entries(approvedProfileBoundaries)) {
    if (content.includes(profile) && !isWithinBoundary(relativePath, boundaries)) {
      findings.push(`${relativePath}: approved profile ${profile} is outside its supported boundary`);
    }
  }
  if (directionalProfilePattern.test(content) && !isWithinBoundary(relativePath, directionalProfileBoundaries)) {
    findings.push(`${relativePath}: directional paper profile vocabulary is outside its supported boundary`);
  }
  for (const occurrence of content.matchAll(deferredRiskPattern)) {
    const start = occurrence.index;
    const end = start + occurrence[0].length;
    if (!hasApprovedRiskProhibitionContext(relativePath, content, start, end)) {
      findings.push(`${relativePath}: deferred risk vocabulary lacks an approved synthetic-paper prohibition context`);
    }
  }
  return findings;
}

function scanDeferredScope(repositoryRoot) {
  const findings = [];
  for (const relativePath of forbiddenPaths) {
    if (containsActiveFile(path.join(repositoryRoot, relativePath))) {
      findings.push(`${relativePath}: forbidden active path exists`);
    }
  }

  function visit(directory) {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === "dist" || entry.name === "node_modules") continue;
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(absolutePath);
        continue;
      }
      if (entry.name.endsWith(".spec.ts")) continue;
      if (!/\.(?:ts|tsx|js|cjs|json|ya?ml)$/.test(entry.name) && !entry.name.endsWith("Dockerfile")) continue;

      const relativePath = path.relative(repositoryRoot, absolutePath).replaceAll("\\", "/");
      if (relativePath === "infra/db/migrations/001_enable_pgcrypto.js") continue;
      const content = fs.readFileSync(absolutePath, "utf8");
      for (const pattern of genericForbiddenPatterns) {
        if (pattern.test(content)) findings.push(`${relativePath}: matched ${pattern}`);
      }
      findings.push(...profileFindings(relativePath, content));
    }
  }

  for (const root of roots) visit(path.join(repositoryRoot, root));
  return findings;
}

function runCheck(repositoryRoot = path.resolve(__dirname, "..")) {
  const findings = scanDeferredScope(repositoryRoot);
  if (findings.length > 0) {
    console.error("Deferred-scope leakage found:");
    for (const finding of findings) console.error(`- ${finding}`);
    return false;
  }
  console.log("No deferred enterprise-Auth, queue/distributed, risk, autonomous LLM, or strict-replay leakage found.");
  return true;
}

if (require.main === module) {
  if (!runCheck()) process.exitCode = 1;
}

module.exports = { scanDeferredScope, runCheck };
