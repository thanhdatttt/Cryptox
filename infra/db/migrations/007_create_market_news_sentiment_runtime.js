exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable("market_candles", {
    pair: { type: "text", notNull: true },
    timeframe: { type: "text", notNull: true },
    timestamp: { type: "timestamptz", notNull: true },
    open: { type: "numeric", notNull: true }, high: { type: "numeric", notNull: true }, low: { type: "numeric", notNull: true }, close: { type: "numeric", notNull: true }, volume: { type: "numeric", notNull: true }, is_closed: { type: "boolean", notNull: true },
    updated_at: { type: "timestamptz", notNull: true },
  });
  pgm.addConstraint("market_candles", "market_candles_pair_timeframe_timestamp_unique", { unique: ["pair", "timeframe", "timestamp"] });
  pgm.createIndex("market_candles", ["pair", "timeframe", "timestamp"]);

  pgm.createTable("market_dataset_snapshots", {
    id: { type: "text", primaryKey: true }, pair: { type: "text", notNull: true }, pair_metadata: { type: "jsonb", notNull: true }, timeframe: { type: "text", notNull: true }, dataset_from: { type: "timestamptz", notNull: true }, dataset_to: { type: "timestamptz", notNull: true }, candle_count: { type: "integer", notNull: true }, sha256: { type: "text", notNull: true, unique: true }, created_at: { type: "timestamptz", notNull: true },
  });
  pgm.createTable("market_dataset_snapshot_candles", {
    snapshot_id: { type: "text", notNull: true, references: "market_dataset_snapshots", onDelete: "RESTRICT" }, timestamp: { type: "timestamptz", notNull: true }, open: { type: "numeric", notNull: true }, high: { type: "numeric", notNull: true }, low: { type: "numeric", notNull: true }, close: { type: "numeric", notNull: true }, volume: { type: "numeric", notNull: true }, is_closed: { type: "boolean", notNull: true },
  });
  pgm.addConstraint("market_dataset_snapshot_candles", "market_snapshot_candles_snapshot_timestamp_unique", { unique: ["snapshot_id", "timestamp"] });

  pgm.createTable("news_items", {
    id: { type: "text", primaryKey: true }, title: { type: "text", notNull: true }, content: { type: "text", notNull: true }, source: { type: "text", notNull: true }, published_at: { type: "timestamptz", notNull: true }, crawled_at: { type: "timestamptz", notNull: true }, related_coins: { type: "jsonb", notNull: true }, url: { type: "text", notNull: true, unique: true },
  });
  pgm.createIndex("news_items", ["published_at"]);

  pgm.createTable("sentiment_results", {
    id: { type: "bigserial", primaryKey: true }, news_id: { type: "text", notNull: true, references: "news_items", onDelete: "RESTRICT" }, label: { type: "text", notNull: true }, score: { type: "numeric", notNull: true }, model_name: { type: "text", notNull: true }, model_version: { type: "text", notNull: true }, analyzed_at: { type: "timestamptz", notNull: true },
  });
  pgm.addConstraint("sentiment_results", "sentiment_results_news_model_version_unique", { unique: ["news_id", "model_name", "model_version"] });
  pgm.createIndex("sentiment_results", ["news_id", "analyzed_at"]);
  pgm.createTable("sentiment_dataset_snapshots", {
    id: { type: "text", primaryKey: true }, related_coin: { type: "text", notNull: true }, dataset_from: { type: "timestamptz", notNull: true }, dataset_to: { type: "timestamptz", notNull: true }, aggregation_window_seconds: { type: "integer", notNull: true }, model_name: { type: "text", notNull: true }, model_version: { type: "text", notNull: true }, model_sha256: { type: "text", notNull: true }, point_count: { type: "integer", notNull: true }, sha256: { type: "text", notNull: true, unique: true }, created_at: { type: "timestamptz", notNull: true },
  });
  pgm.createTable("sentiment_dataset_snapshot_points", {
    snapshot_id: { type: "text", notNull: true, references: "sentiment_dataset_snapshots", onDelete: "RESTRICT" }, timestamp: { type: "timestamptz", notNull: true }, label: { type: "text", notNull: true }, average_score: { type: "numeric", notNull: true },
  });
  pgm.addConstraint("sentiment_dataset_snapshot_points", "sentiment_snapshot_points_snapshot_timestamp_unique", { unique: ["snapshot_id", "timestamp"] });
};

exports.down = (pgm) => {
  pgm.dropTable("sentiment_dataset_snapshot_points"); pgm.dropTable("sentiment_dataset_snapshots"); pgm.dropTable("sentiment_results"); pgm.dropTable("news_items"); pgm.dropTable("market_dataset_snapshot_candles"); pgm.dropTable("market_dataset_snapshots"); pgm.dropTable("market_candles");
};
