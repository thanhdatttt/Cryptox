exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumn("backtest_benchmark_scopes", "warmup_capacity_candles", {
    type: "integer",
    notNull: true,
    default: 500,
  });
  pgm.addColumn("backtest_candidates", "warmup_candles", {
    type: "integer",
    notNull: true,
    default: 0,
  });
  pgm.addConstraint("backtest_benchmark_scopes", "backtest_scopes_warmup_capacity_check", {
    check: "warmup_capacity_candles BETWEEN 0 AND 10000",
  });
  pgm.addConstraint("backtest_candidates", "backtest_candidates_warmup_check", {
    check: "warmup_candles BETWEEN 0 AND 10000",
  });
};

exports.down = (pgm) => {
  pgm.dropConstraint("backtest_candidates", "backtest_candidates_warmup_check");
  pgm.dropConstraint("backtest_benchmark_scopes", "backtest_scopes_warmup_capacity_check");
  pgm.dropColumn("backtest_candidates", "warmup_candles");
  pgm.dropColumn("backtest_benchmark_scopes", "warmup_capacity_candles");
};
