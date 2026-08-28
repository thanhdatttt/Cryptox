const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required; refusing an implicit migration database");
}

// node-pg-migrate 7.9.1 reads these direct config-file keys as CLI options.
module.exports = {
  url: databaseUrl,
  "migrations-dir": "infra/db/migrations",
  "migrations-table": "pgmigrations",
};
