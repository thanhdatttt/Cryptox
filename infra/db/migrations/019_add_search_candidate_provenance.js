exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumn("backtest_candidates", {
    generated_by: { type: "text" },
    fingerprint: { type: "text" },
    lineage: { type: "jsonb" },
  });
  pgm.addConstraint("backtest_candidates", "backtest_candidate_generated_by_valid", {
    check: "generated_by IS NULL OR generated_by IN ('RANDOM', 'DOMAIN_GUIDED', 'GENETIC')",
  });
  pgm.addConstraint("backtest_candidates", "backtest_candidate_fingerprint_format", {
    check: "fingerprint IS NULL OR fingerprint ~ '^[0-9a-f]{64}$'",
  });
  pgm.addConstraint("backtest_candidates", "backtest_candidate_lineage_object", {
    check: "lineage IS NULL OR jsonb_typeof(lineage) = 'object'",
  });
};

exports.down = (pgm) => {
  pgm.dropConstraint("backtest_candidates", "backtest_candidate_lineage_object");
  pgm.dropConstraint("backtest_candidates", "backtest_candidate_fingerprint_format");
  pgm.dropConstraint("backtest_candidates", "backtest_candidate_generated_by_valid");
  pgm.dropColumn("backtest_candidates", "lineage");
  pgm.dropColumn("backtest_candidates", "fingerprint");
  pgm.dropColumn("backtest_candidates", "generated_by");
};
