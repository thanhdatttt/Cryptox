exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns("backtest_candidates", {
    completion_generation: { type: "integer", notNull: true, default: 0 },
    active_completion_claim_token: { type: "text" },
    active_completion_lease_expires_at: { type: "timestamptz" },
  });
  pgm.createIndex("backtest_candidates", ["status", "completion_next_retry_at"]);
};

exports.down = (pgm) => {
  pgm.dropIndex("backtest_candidates", ["status", "completion_next_retry_at"]);
  pgm.dropColumns("backtest_candidates", ["completion_generation", "active_completion_claim_token", "active_completion_lease_expires_at"]);
};
