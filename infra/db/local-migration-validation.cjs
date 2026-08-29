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
  const authoringProfileId = ["LLM", "AUTHORING", "V1"].join("_");
  const weightedProfileId = ["WEIGHTED", "VOTE", "V1"].join("_");
  await withDatabase(testDatabaseUrl, async (client) => {
    await client.query(
      "INSERT INTO users (id, normalized_email, password_hash, created_at, updated_at) VALUES ($1, $2, $3, now(), now())",
      [userId, normalizedEmail, "not-a-secret"],
    );
    await assertRejected(client, "INSERT INTO users (id, normalized_email, password_hash, created_at, updated_at) VALUES ($1, $2, $3, now(), now())", [crypto.randomUUID(), normalizedEmail, "not-a-secret"]);
    await assertRejected(client, "INSERT INTO users (id, normalized_email, password_hash, created_at, updated_at) VALUES ($1, $2, $3, now(), now())", [crypto.randomUUID(), "   ", "not-a-secret"]);

    const draftId = crypto.randomUUID();
    await client.query(
      "INSERT INTO strategy_authoring_drafts (id, owner_user_id, profile_id, source_kind, provider_id, model_id, status, created_at, updated_at) VALUES ($1, $2, $3, 'PROMPT', 'configured-provider', 'configured-model', 'DRAFT', now(), now())",
      [draftId, userId, authoringProfileId],
    );
    await assertRejected(
      client,
      "INSERT INTO strategy_authoring_drafts (id, owner_user_id, profile_id, source_kind, provider_id, model_id, status, structured_draft, created_at, updated_at) VALUES ($1, $2, $3, 'PROMPT', 'configured-provider', 'configured-model', 'DRAFT', $4::jsonb, now(), now())",
      [crypto.randomUUID(), userId, authoringProfileId, JSON.stringify({ apiKey: "must-not-persist" })],
    );
    await assertRejected(
      client,
      "INSERT INTO strategy_authoring_drafts (id, owner_user_id, profile_id, source_kind, provider_id, model_id, status, structured_draft, created_at, updated_at) VALUES ($1, $2, $3, 'PROMPT', 'configured-provider', 'configured-model', 'DRAFT', $4::jsonb, now(), now())",
      [crypto.randomUUID(), userId, authoringProfileId, JSON.stringify({ nested: { token: "must-not-persist" } })],
    );
    await assertRejected(
      client,
      "INSERT INTO strategy_authoring_drafts (id, owner_user_id, profile_id, source_kind, provider_id, model_id, status, created_at, updated_at) VALUES ($1, $2, $3, 'PROMPT', 'configured-provider', 'configured-model', 'APPROVED', now(), now())",
      [crypto.randomUUID(), userId, authoringProfileId],
    );

    await assertRejected(
      client,
      "INSERT INTO strategy_definitions (id, owner_user_id, logical_family_key, strategy_name, implementation_version, behavior_profile_id, version, parameters, authoring_origin, created_at) VALUES ($1, $2, 'secret-probe', 'PROBE', '1', 'PROBE_V1', 1, '{}'::jsonb, $3::jsonb, now())",
      [crypto.randomUUID(), userId, JSON.stringify({ nested: { token: "must-not-persist" } })],
    );
    await assertRejected(
      client,
      "INSERT INTO composite_strategy_definitions (id, owner_user_id, logical_family_key, version, method, combination_profile_id, created_at) VALUES ($1, $2, 'weighted-probe', 1, 'WEIGHTED_VOTE', $3, now())",
      [crypto.randomUUID(), userId, weightedProfileId],
    );

    const rankingConfigurationId = `migration-probe-ranking-${crypto.randomUUID()}`;
    const leaderboardScopeId = crypto.randomUUID();
    await client.query(
      "INSERT INTO ranking_configurations (id, profile_id, version, name, formula, minimum_number_of_trades, tie_breakers, created_at) VALUES ($1, 'PROBE', 1, 'probe', '{}'::jsonb, 0, '[]'::jsonb, now())",
      [rankingConfigurationId],
    );
    await client.query(
      "INSERT INTO leaderboard_scopes (id, owner_user_id, name, k, ranking_configuration_id, comparison_key, created_at) VALUES ($1, $2, 'migration-probe-scope', 10, $3, 'probe', now())",
      [leaderboardScopeId, userId, rankingConfigurationId],
    );
    await assertRejected(
      client,
      "INSERT INTO search_runs (id, owner_user_id, generator_type, random_seed, search_space, stop_condition, leaderboard_scope_id, max_in_flight, state, submitted_candidate_count, completed_candidate_count, failed_candidate_count, created_at, updated_at, discovery_profile_id) VALUES ($1, $2, 'RANDOM', 'seed', '{}'::jsonb, '{}'::jsonb, $3, 1, 'CREATED', 0, 0, 0, now(), now(), 'RANDOM_V1')",
      [crypto.randomUUID(), userId, leaderboardScopeId],
    );

    const templateId = crypto.randomUUID();
    await client.query(
      "INSERT INTO extraction_templates (id, source_id, version, status, configuration, created_at, retain_until) VALUES ($1, 'configured-news-source', 1, 'DRAFT', '{}'::jsonb, now(), now() + interval '90 days')",
      [templateId],
    );
    await assertRejected(
      client,
      "INSERT INTO extraction_templates (id, source_id, version, status, configuration, created_at, retain_until) VALUES ($1, 'configured-news-source', 2, 'APPROVED', '{}'::jsonb, now(), now() + interval '90 days')",
      [crypto.randomUUID()],
    );

    const precision = await client.query(
      "SELECT numeric_scale FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'trades' AND column_name = 'profit'",
    );
    if (Number(precision.rows[0]?.numeric_scale) !== 8) fail("paper trade decimal scale is not eight places");
    const observabilityTable = await client.query("SELECT to_regclass('public.market_observability') IS NULL AS absent");
    if (observabilityTable.rows[0]?.absent !== true) fail("ephemeral market observability must not have a persistence table");
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
  // node-pg-migrate applies the configured count as a rollback target. Run the
  // existing reversible-table proof twice so the extension migration and the
  // baseline entity migration are both exercised while pgcrypto remains.
  migrate(testDatabaseUrl, "down", 2);
  migrate(testDatabaseUrl, "down", 2);
  const usersTableAfterDown = await withDatabase(testDatabaseUrl, async (client) => (await client.query("SELECT to_regclass('public.users') IS NULL AS users_absent")).rows[0].users_absent);
  if (usersTableAfterDown !== true) {
    const remaining = await withDatabase(testDatabaseUrl, async (client) =>
      (await client.query("SELECT name FROM pgmigrations ORDER BY run_on ASC")).rows.map((row) => row.name),
    );
    fail(`migration down did not remove the users table; remaining migrations: ${remaining.join(", ")}`);
  }
  migrate(testDatabaseUrl, "up");
  const migrationCount = await withDatabase(testDatabaseUrl, async (client) => Number((await client.query("SELECT count(*) AS count FROM pgmigrations")).rows[0].count));
  if (migrationCount !== 3) fail("remigrate did not record all migrations");
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
