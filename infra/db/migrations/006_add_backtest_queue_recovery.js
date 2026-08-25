exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns("backtest_candidates", {
    execution_generation: { type: "integer", notNull: true, default: 0 },
    active_fence_token: { type: "text" },
    active_lease_expires_at: { type: "timestamptz" },
  });
  pgm.addColumns("backtest_attempts", {
    delivery_attempt_count: { type: "integer", notNull: true, default: 0 },
    fence_token: { type: "text" },
    lease_expires_at: { type: "timestamptz" },
  });
  pgm.createTable("backtest_queue_dispatches", {
    job_id: { type: "text", primaryKey: true },
    candidate_id: { type: "text", notNull: true, unique: true, references: "backtest_candidates", onDelete: "RESTRICT" },
    payload: { type: "jsonb", notNull: true },
    state: { type: "text", notNull: true },
    dispatch_attempts: { type: "integer", notNull: true, default: 0 },
    last_error: { type: "text" },
    dispatched_at: { type: "timestamptz" },
    created_at: { type: "timestamptz", notNull: true },
    updated_at: { type: "timestamptz", notNull: true },
  });
  pgm.createIndex("backtest_queue_dispatches", ["state", "created_at"]);
};

exports.down = (pgm) => {
  pgm.dropTable("backtest_queue_dispatches");
  pgm.dropColumns("backtest_attempts", ["delivery_attempt_count", "fence_token", "lease_expires_at"]);
  pgm.dropColumns("backtest_candidates", ["execution_generation", "active_fence_token", "active_lease_expires_at"]);
};
