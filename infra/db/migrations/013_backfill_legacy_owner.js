exports.shorthands = undefined;

/**
 * Ownership is created as NOT NULL on fresh installations by migrations
 * 003-005. This follow-up is intentionally idempotent for deployments that
 * already contain rows from an earlier nullable ownership rollout: it creates
 * the explicit migration owner and backfills only missing owners. It never
 * makes a runtime request share an implicit account.
 */
exports.up = (pgm) => {
  pgm.sql(`
    INSERT INTO users (email, password_hash, created_at)
    VALUES ('legacy@local.invalid', '!disabled-legacy-migration-account!', now())
    ON CONFLICT (email) DO NOTHING;

    DO $migration$
    DECLARE
      legacy_user UUID;
    BEGIN
      SELECT id INTO legacy_user
      FROM users
      WHERE email = 'legacy@local.invalid';

      UPDATE strategy_definitions
      SET user_id = legacy_user
      WHERE user_id IS NULL;

      UPDATE composite_strategy_definitions
      SET user_id = legacy_user
      WHERE user_id IS NULL;

      UPDATE backtest_benchmark_scopes
      SET owner_user_id = legacy_user
      WHERE owner_user_id IS NULL;

      UPDATE search_runs
      SET owner_user_id = legacy_user
      WHERE owner_user_id IS NULL;

      UPDATE backtest_candidates
      SET owner_user_id = legacy_user
      WHERE owner_user_id IS NULL;
    END
    $migration$;
  `);
};

exports.down = () => {
  // The migration owner may own backfilled audit rows; never delete it during
  // rollback and risk cascading or orphaning those rows.
};

