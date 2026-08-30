exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable("backtest_replay_verifications", {
    id: { type: "text", primaryKey: true },
    owner_user_id: { type: "uuid", notNull: true, references: "users", onDelete: "CASCADE" },
    experiment_result_id: { type: "text", notNull: true, references: "backtest_experiment_results", onDelete: "RESTRICT" },
    status: { type: "text", notNull: true, default: "QUEUED" },
    mismatch_sample_limit: { type: "integer", notNull: true },
    compared_trade_count: { type: "integer" },
    mismatch_sample: { type: "jsonb" },
    total_mismatch_count: { type: "integer" },
    truncated: { type: "boolean" },
    failure_code: { type: "text" },
    claim_token: { type: "text" },
    lease_expires_at: { type: "timestamptz" },
    created_at: { type: "timestamptz", notNull: true },
    started_at: { type: "timestamptz" },
    completed_at: { type: "timestamptz" },
  });
  pgm.addConstraint("backtest_replay_verifications", "backtest_replay_status_valid", { check: "status IN ('QUEUED','RUNNING','MATCH','MISMATCH','NON_REPLAYABLE')" });
  pgm.addConstraint("backtest_replay_verifications", "backtest_replay_sample_limit_valid", { check: "mismatch_sample_limit BETWEEN 1 AND 500" });
  pgm.addConstraint("backtest_replay_counts_valid", "backtest_replay_counts_valid", { check: "(compared_trade_count IS NULL OR compared_trade_count >= 0) AND (total_mismatch_count IS NULL OR total_mismatch_count >= 0)" });
  pgm.addConstraint("backtest_replay_failure_valid", "backtest_replay_failure_valid", { check: "failure_code IS NULL OR failure_code IN ('MISSING_SNAPSHOT','IMPLEMENTATION_ARTIFACT_UNAVAILABLE','REPLAY_ARTIFACT_EXPIRED')" });
  pgm.addConstraint("backtest_replay_terminal_shape", "backtest_replay_terminal_shape", { check: "(status IN ('QUEUED','RUNNING') AND completed_at IS NULL AND failure_code IS NULL) OR (status = 'NON_REPLAYABLE' AND failure_code IS NOT NULL AND completed_at IS NOT NULL) OR (status IN ('MATCH','MISMATCH') AND compared_trade_count IS NOT NULL AND total_mismatch_count IS NOT NULL AND truncated IS NOT NULL AND completed_at IS NOT NULL)" });
  pgm.createIndex("backtest_replay_verifications", ["status", "lease_expires_at"]);
};

exports.down = (pgm) => {
  pgm.dropTable("backtest_replay_verifications");
};
