exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumn("backtest_benchmark_scopes", {
    simulator_version: { type: "text", notNull: true, default: "1.0.0" },
    simulator_sha256: { type: "text", notNull: true, default: "2ed4a4326ba78169d9432c10f05272b01c53a5518ead8ab873be35bd2f1305bf" },
    benchmark_timezone: { type: "text", notNull: true, default: "UTC" },
    fill_policy_id: { type: "text", notNull: true, default: "NEXT_OPEN_OHLC_STOP_FIRST_V2" },
    opposite_signal_policy_id: { type: "text", notNull: true, default: "CLOSE_AND_REVERSE_NEXT_OPEN_V1" },
    same_candle_ordering_policy_id: { type: "text", notNull: true, default: "ENTRY_THEN_PROTECTIVE_EXIT_THEN_CLOSE_V1" },
    deterministic_guarantee: { type: "text", notNull: true, default: "SEALED_INPUTS_AND_RETAINED_ARTIFACTS" },
  });
  pgm.addColumn("backtest_candidates", {
    execution_policy: { type: "jsonb" },
  });
  pgm.addConstraint("backtest_benchmark_scopes", "backtest_scope_simulator_sha256_format", { check: "simulator_sha256 ~ '^[0-9a-f]{64}$'" });
  pgm.addConstraint("backtest_candidates", "backtest_candidate_execution_policy_object", { check: "execution_policy IS NULL OR jsonb_typeof(execution_policy) = 'object'" });
};

exports.down = (pgm) => {
  pgm.dropConstraint("backtest_candidates", "backtest_candidate_execution_policy_object");
  pgm.dropConstraint("backtest_benchmark_scopes", "backtest_scope_simulator_sha256_format");
  pgm.dropColumn("backtest_candidates", "execution_policy");
  pgm.dropColumn("backtest_benchmark_scopes", "deterministic_guarantee");
  pgm.dropColumn("backtest_benchmark_scopes", "same_candle_ordering_policy_id");
  pgm.dropColumn("backtest_benchmark_scopes", "opposite_signal_policy_id");
  pgm.dropColumn("backtest_benchmark_scopes", "fill_policy_id");
  pgm.dropColumn("backtest_benchmark_scopes", "benchmark_timezone");
  pgm.dropColumn("backtest_benchmark_scopes", "simulator_sha256");
  pgm.dropColumn("backtest_benchmark_scopes", "simulator_version");
};
