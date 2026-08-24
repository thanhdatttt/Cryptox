exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable("search_runs", {
    id: { type: "text", primaryKey: true },
    owner_user_id: { type: "uuid", notNull: true, references: "users", onDelete: "CASCADE" },
    leaderboard_scope_id: { type: "text", notNull: true, references: "backtest_benchmark_scopes", onDelete: "RESTRICT" },
    generator_type: { type: "text", notNull: true },
    search_space: { type: "jsonb", notNull: true },
    stop_condition: { type: "jsonb", notNull: true },
    max_in_flight: { type: "integer", notNull: true },
    state: { type: "text", notNull: true },
    next_iteration: { type: "integer", notNull: true },
    active_duration_ms: { type: "bigint", notNull: true },
    active_since: { type: "timestamptz" },
    best_score: { type: "numeric" },
    last_improvement_at_candidates: { type: "integer" },
    created_at: { type: "timestamptz", notNull: true },
    started_at: { type: "timestamptz" },
    updated_at: { type: "timestamptz", notNull: true },
    ended_at: { type: "timestamptz" },
    stop_reason: { type: "text" },
    last_error: { type: "text" },
  });
  pgm.createIndex("search_runs", ["owner_user_id", "created_at"]);
  pgm.createIndex("search_runs", ["state"]);

  pgm.createTable("leaderboard_entries", {
    id: { type: "text", primaryKey: true },
    experiment_result_id: { type: "text", notNull: true, unique: true, references: "backtest_experiment_results", onDelete: "RESTRICT" },
    leaderboard_scope_id: { type: "text", notNull: true, references: "backtest_benchmark_scopes", onDelete: "RESTRICT" },
    score_formula_id: { type: "text", notNull: true },
    score: { type: "numeric", notNull: true },
    added_at: { type: "timestamptz", notNull: true },
    active: { type: "boolean", notNull: true, default: true },
  });
  pgm.createIndex("leaderboard_entries", ["leaderboard_scope_id", "active", "score"]);
};

exports.down = (pgm) => {
  pgm.dropTable("leaderboard_entries");
  pgm.dropTable("search_runs");
};
