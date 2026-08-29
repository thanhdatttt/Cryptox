const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");
const { Client } = require("pg");

function redact(value) {
  return String(value)
    .replace(/postgres(?:ql)?:\/\/[^\s'"`]+/gi, "postgresql://[REDACTED]")
    .replace(/(password|DATABASE_URL)\s*[=:]\s*[^\s]+/gi, "$1=[REDACTED]");
}

function fail(message) {
  throw new Error(message);
}

function migrate(databaseUrl, direction, count) {
  const args = ["node_modules/node-pg-migrate/bin/node-pg-migrate.js", direction, "--config-file", "infra/db/migrate.config.js", "--verbose", "false"];
  if (count) args.push("--count", String(count));
  const result = spawnSync(process.execPath, args, {
    cwd: "/workspace",
    encoding: "utf8",
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
  if (result.error || result.status !== 0) {
    fail(`migration ${direction} failed${result.stderr ? `: ${redact(result.stderr).trim().slice(0, 800)}` : ""}`);
  }
}

async function withDatabase(databaseUrl, callback) {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    return await callback(client);
  } finally {
    await client.end();
  }
}

async function resetTestDatabase(testDatabaseUrl) {
  await withDatabase(testDatabaseUrl, (client) => client.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;"));
  migrate(testDatabaseUrl, "up");
}

async function assertConstraintProbes(testDatabaseUrl) {
  const userId = crypto.randomUUID();
  const normalizedEmail = `migration-probe-${crypto.randomUUID()}@local.invalid`;
  await withDatabase(testDatabaseUrl, async (client) => {
    await client.query(
      "INSERT INTO users (id, normalized_email, password_hash, created_at, updated_at) VALUES ($1, $2, $3, now(), now())",
      [userId, normalizedEmail, "not-a-secret"],
    );
    await assertRejected(client, "INSERT INTO users (id, normalized_email, password_hash, created_at, updated_at) VALUES ($1, $2, $3, now(), now())", [crypto.randomUUID(), normalizedEmail, "not-a-secret"]);
    await assertRejected(client, "INSERT INTO users (id, normalized_email, password_hash, created_at, updated_at) VALUES ($1, $2, $3, now(), now())", [crypto.randomUUID(), "   ", "not-a-secret"]);
  });
}

async function assertRejected(client, query, values) {
  try {
    await client.query(query, values);
  } catch {
    return;
  }
  fail("a required migration constraint did not reject its invalid probe");
}

async function validate(devDatabaseUrl, testDatabaseUrl) {
  migrate(devDatabaseUrl, "up");
  await resetTestDatabase(testDatabaseUrl);
  await assertConstraintProbes(testDatabaseUrl);
  migrate(testDatabaseUrl, "down", 2);
  const usersTableAfterDown = await withDatabase(testDatabaseUrl, async (client) => (await client.query("SELECT to_regclass('public.users') IS NULL AS users_absent")).rows[0].users_absent);
  if (usersTableAfterDown !== true) fail("migration down did not remove the users table");
  migrate(testDatabaseUrl, "up");
  const migrationCount = await withDatabase(testDatabaseUrl, async (client) => Number((await client.query("SELECT count(*) AS count FROM pgmigrations")).rows[0].count));
  if (migrationCount !== 2) fail("remigrate did not record both migrations");
  console.log("Local test migration validation passed: up, constraints, down, and remigrate.");
}

async function resetTestWithDevelopmentIsolationProof(devDatabaseUrl, testDatabaseUrl) {
  migrate(devDatabaseUrl, "up");
  const sentinelId = crypto.randomUUID();
  try {
    await withDatabase(devDatabaseUrl, (client) => client.query(
      "INSERT INTO users (id, normalized_email, password_hash, created_at, updated_at) VALUES ($1, $2, $3, now(), now())",
      [sentinelId, `reset-proof-${crypto.randomUUID()}@local.invalid`, "not-a-secret"],
    ));
    await resetTestDatabase(testDatabaseUrl);
    const preserved = await withDatabase(devDatabaseUrl, async (client) => Number((await client.query("SELECT count(*) AS count FROM users WHERE id = $1", [sentinelId])).rows[0].count));
    if (preserved !== 1) fail("test reset altered development database data");
  } finally {
    await withDatabase(devDatabaseUrl, (client) => client.query("DELETE FROM users WHERE id = $1", [sentinelId])).catch(() => undefined);
  }
  console.log("Local test database reset passed; development data was preserved.");
}

async function main() {
  const [command] = process.argv.slice(2);
  const { CRYPTOX_LOCAL_DEV_DATABASE_URL: devDatabaseUrl, CRYPTOX_LOCAL_TEST_DATABASE_URL: testDatabaseUrl } = process.env;
  if (!devDatabaseUrl || !testDatabaseUrl) fail("local migration validator requires its internal database configuration");
  if (command === "validate") return validate(devDatabaseUrl, testDatabaseUrl);
  if (command === "reset-test") return resetTestWithDevelopmentIsolationProof(devDatabaseUrl, testDatabaseUrl);
  fail("usage: local-migration-validation.cjs <validate|reset-test>");
}

main().catch((error) => {
  console.error(`BLOCKED: ${redact(error.message)}`);
  process.exitCode = 1;
});
