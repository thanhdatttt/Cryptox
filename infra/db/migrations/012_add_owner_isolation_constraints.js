exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE INDEX strategy_definitions_owner_created_idx
      ON strategy_definitions (user_id, created_at, id);
    CREATE INDEX composite_strategy_definitions_owner_created_idx
      ON composite_strategy_definitions (user_id, created_at, id);

    ALTER TABLE backtest_benchmark_scopes
      ADD CONSTRAINT backtest_scopes_id_owner_unique UNIQUE (id, owner_user_id),
      ADD CONSTRAINT backtest_scopes_owner_name_version_unique UNIQUE (owner_user_id, name, version);
    CREATE INDEX backtest_scopes_owner_created_idx
      ON backtest_benchmark_scopes (owner_user_id, created_at, id);

    ALTER TABLE search_runs
      ADD CONSTRAINT search_runs_id_owner_unique UNIQUE (id, owner_user_id),
      ADD CONSTRAINT search_runs_scope_owner_fk
        FOREIGN KEY (leaderboard_scope_id, owner_user_id)
        REFERENCES backtest_benchmark_scopes (id, owner_user_id)
        ON DELETE RESTRICT;
    CREATE INDEX search_runs_owner_scope_idx
      ON search_runs (owner_user_id, leaderboard_scope_id, created_at, id);

    ALTER TABLE backtest_candidates
      ADD CONSTRAINT backtest_candidates_id_scope_unique UNIQUE (id, leaderboard_scope_id),
      ADD CONSTRAINT backtest_candidates_scope_owner_fk
        FOREIGN KEY (leaderboard_scope_id, owner_user_id)
        REFERENCES backtest_benchmark_scopes (id, owner_user_id)
        ON DELETE RESTRICT,
      ADD CONSTRAINT backtest_candidates_search_owner_fk
        FOREIGN KEY (search_run_id, owner_user_id)
        REFERENCES search_runs (id, owner_user_id)
        ON DELETE RESTRICT;
    CREATE INDEX backtest_candidates_owner_search_idx
      ON backtest_candidates (owner_user_id, search_run_id, created_at, id);

    ALTER TABLE backtest_attempts
      ADD CONSTRAINT backtest_attempts_id_candidate_unique UNIQUE (id, candidate_id);

    ALTER TABLE backtest_experiment_results
      ADD CONSTRAINT backtest_experiments_id_scope_unique UNIQUE (id, leaderboard_scope_id),
      ADD CONSTRAINT backtest_experiments_candidate_scope_fk
        FOREIGN KEY (candidate_id, leaderboard_scope_id)
        REFERENCES backtest_candidates (id, leaderboard_scope_id)
        ON DELETE RESTRICT,
      ADD CONSTRAINT backtest_experiments_attempt_candidate_fk
        FOREIGN KEY (backtest_attempt_id, candidate_id)
        REFERENCES backtest_attempts (id, candidate_id)
        ON DELETE RESTRICT;

    ALTER TABLE leaderboard_entries
      ADD CONSTRAINT leaderboard_entries_experiment_scope_fk
        FOREIGN KEY (experiment_result_id, leaderboard_scope_id)
        REFERENCES backtest_experiment_results (id, leaderboard_scope_id)
        ON DELETE RESTRICT;
    CREATE INDEX leaderboard_entries_topk_owner_partition_idx
      ON leaderboard_entries (leaderboard_scope_id, active, score DESC, added_at ASC, id ASC);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS leaderboard_entries_topk_owner_partition_idx;
    ALTER TABLE leaderboard_entries DROP CONSTRAINT IF EXISTS leaderboard_entries_experiment_scope_fk;
    ALTER TABLE backtest_experiment_results
      DROP CONSTRAINT IF EXISTS backtest_experiments_attempt_candidate_fk,
      DROP CONSTRAINT IF EXISTS backtest_experiments_candidate_scope_fk,
      DROP CONSTRAINT IF EXISTS backtest_experiments_id_scope_unique;
    ALTER TABLE backtest_attempts DROP CONSTRAINT IF EXISTS backtest_attempts_id_candidate_unique;
    DROP INDEX IF EXISTS backtest_candidates_owner_search_idx;
    ALTER TABLE backtest_candidates
      DROP CONSTRAINT IF EXISTS backtest_candidates_search_owner_fk,
      DROP CONSTRAINT IF EXISTS backtest_candidates_scope_owner_fk,
      DROP CONSTRAINT IF EXISTS backtest_candidates_id_scope_unique;
    DROP INDEX IF EXISTS search_runs_owner_scope_idx;
    ALTER TABLE search_runs
      DROP CONSTRAINT IF EXISTS search_runs_scope_owner_fk,
      DROP CONSTRAINT IF EXISTS search_runs_id_owner_unique;
    DROP INDEX IF EXISTS backtest_scopes_owner_created_idx;
    ALTER TABLE backtest_benchmark_scopes
      DROP CONSTRAINT IF EXISTS backtest_scopes_owner_name_version_unique,
      DROP CONSTRAINT IF EXISTS backtest_scopes_id_owner_unique;
    DROP INDEX IF EXISTS composite_strategy_definitions_owner_created_idx;
    DROP INDEX IF EXISTS strategy_definitions_owner_created_idx;
  `);
};
