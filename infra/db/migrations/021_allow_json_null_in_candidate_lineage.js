exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.dropConstraint("backtest_candidates", "backtest_candidate_lineage_object");
  pgm.addConstraint("backtest_candidates", "backtest_candidate_lineage_object", {
    check: "lineage IS NULL OR jsonb_typeof(lineage) IN ('null', 'object')",
  });
};

exports.down = (pgm) => {
  pgm.dropConstraint("backtest_candidates", "backtest_candidate_lineage_object");
  pgm.addConstraint("backtest_candidates", "backtest_candidate_lineage_object", {
    check: "lineage IS NULL OR jsonb_typeof(lineage) = 'object'",
  });
};
