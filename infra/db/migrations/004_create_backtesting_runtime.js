exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable("backtest_input_snapshots", {
    id: { type: "text", primaryKey: true },
    pair: { type: "text", notNull: true },
    pair_metadata: { type: "jsonb", notNull: true },
    timeframe: { type: "text", notNull: true },
    dataset_from: { type: "timestamptz", notNull: true },
    dataset_to: { type: "timestamptz", notNull: true },
    candle_count: { type: "integer", notNull: true },
    sha256: { type: "text", notNull: true, unique: true },
    created_at: { type: "timestamptz", notNull: true },
  });
  pgm.createTable("backtest_input_candles", {
    snapshot_id: { type: "text", notNull: true, references: "backtest_input_snapshots", onDelete: "RESTRICT" },
    timestamp: { type: "timestamptz", notNull: true },
    open: { type: "numeric", notNull: true }, high: { type: "numeric", notNull: true }, low: { type: "numeric", notNull: true }, close: { type: "numeric", notNull: true }, volume: { type: "numeric", notNull: true }, is_closed: { type: "boolean", notNull: true },
  });
  pgm.addConstraint("backtest_input_candles", "backtest_input_candles_snapshot_timestamp_unique", { unique: ["snapshot_id", "timestamp"] });

  pgm.createTable("backtest_benchmark_scopes", {
    id: { type: "text", primaryKey: true },
    owner_user_id: { type: "uuid", notNull: true, references: "users", onDelete: "CASCADE" },
    idempotency_key: { type: "text", notNull: true }, name: { type: "text", notNull: true }, version: { type: "integer", notNull: true }, dataset_snapshot_id: { type: "text", notNull: true, references: "backtest_input_snapshots", onDelete: "RESTRICT" },
    sentiment_dataset_snapshot: { type: "jsonb" }, worker_runtime_version: { type: "text", notNull: true }, worker_runtime_sha256: { type: "text", notNull: true }, evaluation_runtime_version: { type: "text", notNull: true }, evaluation_runtime_sha256: { type: "text", notNull: true },
    initial_capital: { type: "numeric", notNull: true }, fee_rate_percent: { type: "numeric", notNull: true }, slippage_bps: { type: "integer", notNull: true }, risk_policy: { type: "jsonb" }, decimal_policy_id: { type: "text", notNull: true }, evaluation_policy_id: { type: "text", notNull: true }, score_formula_id: { type: "text", notNull: true }, created_at: { type: "timestamptz", notNull: true },
  });
  pgm.addConstraint("backtest_benchmark_scopes", "backtest_scopes_owner_idempotency_unique", { unique: ["owner_user_id", "idempotency_key"] });

  pgm.createTable("backtest_candidates", {
    id: { type: "text", primaryKey: true }, owner_user_id: { type: "uuid", notNull: true, references: "users", onDelete: "CASCADE" }, leaderboard_scope_id: { type: "text", notNull: true, references: "backtest_benchmark_scopes", onDelete: "RESTRICT" }, search_run_id: { type: "text" }, iteration_number: { type: "integer" }, origin: { type: "text", notNull: true }, selection_mode: { type: "text", notNull: true }, status: { type: "text", notNull: true }, max_attempts: { type: "integer", notNull: true }, active_attempt_number: { type: "integer" }, completion_attempt_count: { type: "integer", notNull: true }, completion_max_attempts: { type: "integer", notNull: true }, completion_next_retry_at: { type: "timestamptz" }, experiment_result_id: { type: "text" }, failure_kind: { type: "text" }, failure_code: { type: "text" }, last_error: { type: "text" }, queue_job_id: { type: "text", notNull: true }, submission_idempotency_key: { type: "text" }, strategy_definitions: { type: "jsonb", notNull: true }, composite_definition: { type: "jsonb", notNull: true }, created_at: { type: "timestamptz", notNull: true }, updated_at: { type: "timestamptz", notNull: true },
  });
  pgm.addConstraint("backtest_candidates", "backtest_candidates_owner_submission_unique", { unique: ["owner_user_id", "submission_idempotency_key"] });
  pgm.addConstraint("backtest_candidates", "backtest_candidates_search_iteration_unique", { unique: ["search_run_id", "iteration_number"] });

  pgm.createTable("backtest_attempts", {
    id: { type: "text", primaryKey: true }, candidate_id: { type: "text", notNull: true, references: "backtest_candidates", onDelete: "RESTRICT" }, queue_job_id: { type: "text", notNull: true }, attempt_number: { type: "integer", notNull: true }, worker_runtime_version: { type: "text", notNull: true }, worker_runtime_sha256: { type: "text", notNull: true }, status: { type: "text", notNull: true }, trade_count: { type: "integer", notNull: true }, audit_only: { type: "boolean", notNull: true }, failure_category: { type: "text" }, failure_code: { type: "text" }, error_message: { type: "text" }, started_at: { type: "timestamptz", notNull: true }, completed_at: { type: "timestamptz" },
  });
  pgm.addConstraint("backtest_attempts", "backtest_attempts_candidate_number_unique", { unique: ["candidate_id", "attempt_number"] });

  pgm.createTable("backtest_trades", {
    id: { type: "text", primaryKey: true }, backtest_attempt_id: { type: "text", notNull: true, references: "backtest_attempts", onDelete: "RESTRICT" }, sequence: { type: "integer", notNull: true }, pair: { type: "text", notNull: true }, settlement_asset: { type: "text", notNull: true }, signal: { type: "text", notNull: true }, entry_time: { type: "timestamptz", notNull: true }, market_entry_price: { type: "numeric", notNull: true }, entry_price: { type: "numeric", notNull: true }, stop_loss: { type: "numeric" }, take_profit: { type: "numeric" }, exit_time: { type: "timestamptz", notNull: true }, market_exit_price: { type: "numeric", notNull: true }, exit_price: { type: "numeric", notNull: true }, exit_reason: { type: "text", notNull: true }, quantity: { type: "numeric", notNull: true }, notional_entry_value: { type: "numeric", notNull: true }, equity_before_trade: { type: "numeric", notNull: true }, equity_after_trade: { type: "numeric", notNull: true }, gross_profit: { type: "numeric", notNull: true }, fee_amount: { type: "numeric", notNull: true }, slippage_bps: { type: "integer", notNull: true }, slippage_amount: { type: "numeric", notNull: true }, profit: { type: "numeric", notNull: true }, result_percent: { type: "numeric", notNull: true }, result: { type: "text", notNull: true },
  });
  pgm.addConstraint("backtest_trades", "backtest_trades_attempt_sequence_unique", { unique: ["backtest_attempt_id", "sequence"] });

  pgm.createTable("backtest_experiment_results", {
    id: { type: "text", primaryKey: true }, candidate_id: { type: "text", notNull: true, unique: true, references: "backtest_candidates", onDelete: "RESTRICT" }, backtest_attempt_id: { type: "text", notNull: true, unique: true, references: "backtest_attempts", onDelete: "RESTRICT" }, leaderboard_scope_id: { type: "text", notNull: true, references: "backtest_benchmark_scopes", onDelete: "RESTRICT" }, score_formula_id: { type: "text", notNull: true }, overall_score: { type: "numeric", notNull: true }, rank_eligible: { type: "boolean", notNull: true }, metrics: { type: "jsonb", notNull: true }, created_at: { type: "timestamptz", notNull: true },
  });
};

exports.down = (pgm) => {
  pgm.dropTable("backtest_experiment_results"); pgm.dropTable("backtest_trades"); pgm.dropTable("backtest_attempts"); pgm.dropTable("backtest_candidates"); pgm.dropTable("backtest_benchmark_scopes"); pgm.dropTable("backtest_input_candles"); pgm.dropTable("backtest_input_snapshots");
};
