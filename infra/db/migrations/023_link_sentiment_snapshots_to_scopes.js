exports.shorthands = undefined;

exports.up = async (pgm) => {
  const { rows } = await pgm.db.query(`
    SELECT
      s.id AS scope_id,
      sn.id AS snapshot_id,
      sn.related_coin,
      sn.dataset_from,
      sn.dataset_to,
      sn.aggregation_window_seconds,
      sn.model_name,
      sn.model_version,
      sn.model_sha256,
      sn.point_count,
      sn.sha256,
      sn.created_at
    FROM backtest_benchmark_scopes s
    JOIN backtest_input_snapshots bis ON bis.id = s.dataset_snapshot_id
    JOIN sentiment_dataset_snapshots sn ON sn.related_coin = (bis.pair_metadata->>'baseAsset')
      AND sn.dataset_from = bis.dataset_from
      AND sn.dataset_to = bis.dataset_to
      AND sn.aggregation_window_seconds = (
        CASE bis.timeframe
          WHEN '1m' THEN 60
          WHEN '5m' THEN 300
          WHEN '15m' THEN 900
          WHEN '1h' THEN 3600
          WHEN '4h' THEN 14400
          WHEN '1d' THEN 86400
          ELSE 900
        END
      )
    WHERE s.sentiment_dataset_snapshot IS NULL
  `);

  for (const row of rows) {
    const sentimentDatasetSnapshot = {
      id: row.snapshot_id,
      relatedCoin: row.related_coin,
      range: {
        from: new Date(row.dataset_from).toISOString(),
        to: new Date(row.dataset_to).toISOString(),
      },
      aggregationWindowSeconds: row.aggregation_window_seconds,
      modelName: row.model_name,
      modelVersion: row.model_version,
      modelSha256: row.model_sha256,
      pointCount: row.point_count,
      sha256: row.sha256,
      createdAt: new Date(row.created_at).toISOString(),
    };

    await pgm.db.query(
      `UPDATE backtest_benchmark_scopes SET sentiment_dataset_snapshot = $1 WHERE id = $2`,
      [JSON.stringify(sentimentDatasetSnapshot), row.scope_id]
    );
  }
};

exports.down = () => {};
