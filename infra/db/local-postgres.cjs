const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repositoryRoot = path.resolve(__dirname, "..", "..");
const composeFile = path.join(repositoryRoot, "infra", "docker-compose.yml");
const localEnvironmentFile = path.join(__dirname, "local.env");
const rootEnvironmentFile = path.join(repositoryRoot, ".env");
const databases = {
  development: { service: "postgres-dev", name: "cryptox_development" },
  test: { service: "postgres-test", name: "cryptox_test" },
};

function redact(value) {
  return String(value)
    .replace(/postgres(?:ql)?:\/\/[^\s'"`]+/gi, "postgresql://[REDACTED]")
    .replace(/(password|DATABASE_URL)\s*[=:]\s*[^\s]+/gi, "$1=[REDACTED]");
}

function fail(message) {
  throw new Error(message);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: options.env ?? process.env,
    stdio: "pipe",
  });

  if (result.error) {
    fail(`${options.label ?? command} is unavailable: ${redact(result.error.message)}`);
  }
  if (result.status !== 0 && !options.allowFailure) {
    const diagnostic = redact(`${result.stdout ?? ""}\n${result.stderr ?? ""}`).trim().slice(0, 2000);
    fail(`${options.label ?? command} failed with exit code ${result.status ?? "unknown"}${diagnostic ? `: ${diagnostic}` : ""}`);
  }
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function compose(args, options) {
  const environmentFiles = fs.existsSync(rootEnvironmentFile)
    ? ["--env-file", rootEnvironmentFile, "--env-file", localEnvironmentFile]
    : ["--env-file", localEnvironmentFile];
  return run(
    "docker",
    ["compose", "--project-name", "cryptox-local", ...environmentFiles, "-f", composeFile, ...args],
    { ...options, label: "Docker Compose" },
  );
}

function ensureLocalEnvironment() {
  if (fs.existsSync(localEnvironmentFile)) return;
  const password = crypto.randomBytes(24).toString("base64url");
  fs.writeFileSync(localEnvironmentFile, `CRYPTOX_LOCAL_POSTGRES_PASSWORD=${password}\n`, { encoding: "utf8", mode: 0o600 });
}

function localPassword() {
  const line = fs.readFileSync(localEnvironmentFile, "utf8")
    .split(/\r?\n/)
    .find((value) => value.startsWith("CRYPTOX_LOCAL_POSTGRES_PASSWORD="));
  if (!line) fail("local PostgreSQL environment is invalid; run db:local:prepare again");
  return line.slice("CRYPTOX_LOCAL_POSTGRES_PASSWORD=".length);
}

function databaseUrl(database) {
  return `postgresql://cryptox:${encodeURIComponent(localPassword())}@${database.service}:5432/${database.name}`;
}

function ensureComposeAvailable() {
  run("docker", ["compose", "version"], { label: "Docker Compose" });
}

function ensureDatabases() {
  ensureLocalEnvironment();
  ensureComposeAvailable();
  compose(["up", "--detach", "--wait", databases.development.service, databases.test.service]);
}

function runMigrationValidation(command) {
  ensureDatabases();
  compose([
    "run", "--rm", "-T",
    "-e", `CRYPTOX_LOCAL_DEV_DATABASE_URL=${databaseUrl(databases.development)}`,
    "-e", `CRYPTOX_LOCAL_TEST_DATABASE_URL=${databaseUrl(databases.test)}`,
    "migration-runner", "infra/db/local-migration-validation.cjs", command,
  ], { label: `local migration ${command}` });
  if (command === "validate") {
    console.log("Local test migration validation passed: up, constraints, down, and remigrate.");
  } else {
    console.log("Local test database reset passed; development data was preserved.");
  }
}

function main() {
  const command = process.argv[2];
  if (command === "prepare") {
    runMigrationValidation("validate");
    return;
  }
  if (command === "validate") {
    runMigrationValidation("validate");
    return;
  }
  if (command === "reset-test") {
    runMigrationValidation("reset-test");
    return;
  }
  fail("usage: node infra/db/local-postgres.cjs <prepare|validate|reset-test>");
}

try {
  main();
} catch (error) {
  console.error(`BLOCKED: ${redact(error.message)}`);
  process.exitCode = 1;
}
