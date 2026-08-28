const fs = require("node:fs");
const path = require("node:path");

const repositoryRoot = path.resolve(__dirname, "..");
const forbiddenPaths = [
  "apps/backtest-worker",
  "packages/contracts/queue",
  "infra/docker/worker.Dockerfile",
];
const forbiddenPatterns = [
  /\b(?:RBAC|OAuth|SSO)\b|organizationId|tenantId|workspaceId|passwordReset|twoFactor/i,
  /\bBullMQ\b|\bRedis\b|backtest-worker/i,
  /queueJobId|completionClaimToken|fencingGeneration|TERMINAL_FAILURE_PENDING|RETRY_WAIT/i,
  /stopLoss|takeProfit|trailingStop|riskPolicy|["'](?:LONG|SHORT)["']/i,
  /DOMAIN_GUIDED|GENETIC/i,
  /SentimentDatasetSnapshotRef|SentimentSnapshotPoint|modelSha256|workerRuntimeSha256|evaluationRuntimeSha256|datasetSnapshotSha256/i,
  /undefined\s+as\s+never/i,
];
const roots = ["modules", "apps", "packages", "infra"];
const findings = [];

function containsActiveFile(target) {
  if (!fs.existsSync(target)) return false;
  const stat = fs.statSync(target);
  if (stat.isFile()) return true;
  return fs.readdirSync(target, { withFileTypes: true }).some((entry) => {
    if (entry.name === "dist" || entry.name === "node_modules") return false;
    return containsActiveFile(path.join(target, entry.name));
  });
}

for (const relativePath of forbiddenPaths) {
  if (containsActiveFile(path.join(repositoryRoot, relativePath))) {
    findings.push(`${relativePath}: forbidden active path exists`);
  }
}

function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === "dist" || entry.name === "node_modules") continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      visit(absolutePath);
      continue;
    }
    if (entry.name.endsWith(".spec.ts")) continue;
    if (!/\.(?:ts|tsx|js|cjs|json|ya?ml)$/.test(entry.name) && !entry.name.endsWith("Dockerfile")) {
      continue;
    }

    const relativePath = path.relative(repositoryRoot, absolutePath).replaceAll("\\", "/");
    if (relativePath === "infra/db/migrations/001_enable_pgcrypto.js") continue;
    const content = fs.readFileSync(absolutePath, "utf8");
    for (const pattern of forbiddenPatterns) {
      if (pattern.test(content)) findings.push(`${relativePath}: matched ${pattern}`);
    }
  }
}

for (const root of roots) visit(path.join(repositoryRoot, root));

if (findings.length > 0) {
  console.error("Deferred-scope leakage found:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exitCode = 1;
} else {
  console.log("No deferred enterprise-Auth, queue/distributed, risk, or strict-replay leakage found.");
}
