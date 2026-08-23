module.exports = {
  databaseUrl: process.env.DATABASE_URL || "postgres://cryptox:cryptox@localhost:5432/cryptox",
  dir: "infra/db/migrations",
  direction: "up",
  count: Infinity,
  migrationsTable: "pgmigrations",
};
