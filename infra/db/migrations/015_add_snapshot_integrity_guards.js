exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE market_dataset_snapshots
      ADD CONSTRAINT market_dataset_snapshots_positive_count CHECK (candle_count > 0),
      ADD CONSTRAINT market_dataset_snapshots_valid_range CHECK (dataset_to > dataset_from),
      ADD CONSTRAINT market_dataset_snapshots_valid_hash CHECK (sha256 ~ '^[0-9A-Fa-f]{64}$');
    ALTER TABLE market_dataset_snapshot_candles
      ADD CONSTRAINT market_dataset_snapshot_candles_closed CHECK (is_closed = true);
    ALTER TABLE sentiment_results
      ADD CONSTRAINT sentiment_results_valid_score CHECK (score BETWEEN -1 AND 1);
    ALTER TABLE sentiment_dataset_snapshots
      ADD CONSTRAINT sentiment_dataset_snapshots_positive_count CHECK (point_count > 0),
      ADD CONSTRAINT sentiment_dataset_snapshots_valid_range CHECK (dataset_to > dataset_from),
      ADD CONSTRAINT sentiment_dataset_snapshots_valid_model_hash CHECK (model_sha256 ~ '^[0-9A-Fa-f]{64}$'),
      ADD CONSTRAINT sentiment_dataset_snapshots_valid_hash CHECK (sha256 ~ '^[0-9A-Fa-f]{64}$');
    ALTER TABLE sentiment_dataset_snapshot_points
      ADD CONSTRAINT sentiment_dataset_snapshot_points_valid_score CHECK (average_score BETWEEN -1 AND 1);

    CREATE OR REPLACE FUNCTION cryptox_reject_sealed_snapshot_mutation()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      RAISE EXCEPTION 'sealed snapshot rows are append-only';
    END;
    $$;

    CREATE TRIGGER market_dataset_snapshots_append_only
      BEFORE UPDATE OR DELETE ON market_dataset_snapshots
      FOR EACH ROW EXECUTE FUNCTION cryptox_reject_sealed_snapshot_mutation();
    CREATE TRIGGER market_dataset_snapshot_candles_append_only
      BEFORE UPDATE OR DELETE ON market_dataset_snapshot_candles
      FOR EACH ROW EXECUTE FUNCTION cryptox_reject_sealed_snapshot_mutation();
    CREATE TRIGGER sentiment_dataset_snapshots_append_only
      BEFORE UPDATE OR DELETE ON sentiment_dataset_snapshots
      FOR EACH ROW EXECUTE FUNCTION cryptox_reject_sealed_snapshot_mutation();
    CREATE TRIGGER sentiment_dataset_snapshot_points_append_only
      BEFORE UPDATE OR DELETE ON sentiment_dataset_snapshot_points
      FOR EACH ROW EXECUTE FUNCTION cryptox_reject_sealed_snapshot_mutation();
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TRIGGER IF EXISTS market_dataset_snapshots_append_only ON market_dataset_snapshots;
    DROP TRIGGER IF EXISTS market_dataset_snapshot_candles_append_only ON market_dataset_snapshot_candles;
    DROP TRIGGER IF EXISTS sentiment_dataset_snapshots_append_only ON sentiment_dataset_snapshots;
    DROP TRIGGER IF EXISTS sentiment_dataset_snapshot_points_append_only ON sentiment_dataset_snapshot_points;
    DROP FUNCTION IF EXISTS cryptox_reject_sealed_snapshot_mutation();
  `);
  pgm.dropConstraint("market_dataset_snapshots", "market_dataset_snapshots_positive_count");
  pgm.dropConstraint("market_dataset_snapshots", "market_dataset_snapshots_valid_range");
  pgm.dropConstraint("market_dataset_snapshots", "market_dataset_snapshots_valid_hash");
  pgm.dropConstraint("market_dataset_snapshot_candles", "market_dataset_snapshot_candles_closed");
  pgm.dropConstraint("sentiment_results", "sentiment_results_valid_score");
  pgm.dropConstraint("sentiment_dataset_snapshots", "sentiment_dataset_snapshots_positive_count");
  pgm.dropConstraint("sentiment_dataset_snapshots", "sentiment_dataset_snapshots_valid_range");
  pgm.dropConstraint("sentiment_dataset_snapshots", "sentiment_dataset_snapshots_valid_model_hash");
  pgm.dropConstraint("sentiment_dataset_snapshots", "sentiment_dataset_snapshots_valid_hash");
  pgm.dropConstraint("sentiment_dataset_snapshot_points", "sentiment_dataset_snapshot_points_valid_score");
};
