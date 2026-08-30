exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE backtest_input_snapshots
      ADD CONSTRAINT backtest_input_snapshots_positive_count CHECK (candle_count > 0),
      ADD CONSTRAINT backtest_input_snapshots_valid_range CHECK (dataset_to > dataset_from),
      ADD CONSTRAINT backtest_input_snapshots_valid_hash CHECK (sha256 ~ '^[0-9A-Fa-f]{64}$');
    ALTER TABLE backtest_input_candles
      ADD CONSTRAINT backtest_input_candles_closed CHECK (is_closed = true);

    CREATE TRIGGER backtest_input_snapshots_append_only
      BEFORE UPDATE OR DELETE ON backtest_input_snapshots
      FOR EACH ROW EXECUTE FUNCTION cryptox_reject_sealed_snapshot_mutation();
    CREATE TRIGGER backtest_input_candles_append_only
      BEFORE UPDATE OR DELETE ON backtest_input_candles
      FOR EACH ROW EXECUTE FUNCTION cryptox_reject_sealed_snapshot_mutation();
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TRIGGER IF EXISTS backtest_input_snapshots_append_only ON backtest_input_snapshots;
    DROP TRIGGER IF EXISTS backtest_input_candles_append_only ON backtest_input_candles;
  `);
  pgm.dropConstraint("backtest_input_candles", "backtest_input_candles_closed");
  pgm.dropConstraint("backtest_input_snapshots", "backtest_input_snapshots_valid_hash");
  pgm.dropConstraint("backtest_input_snapshots", "backtest_input_snapshots_valid_range");
  pgm.dropConstraint("backtest_input_snapshots", "backtest_input_snapshots_positive_count");
};
