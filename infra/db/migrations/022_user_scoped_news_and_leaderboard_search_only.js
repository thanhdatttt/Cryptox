exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE news_items
      ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users (id) ON DELETE CASCADE;

    ALTER TABLE news_items
      DROP CONSTRAINT IF EXISTS news_items_url_key;

    ALTER TABLE news_items
      ADD CONSTRAINT news_items_user_url_unique UNIQUE (user_id, url);

    CREATE INDEX IF NOT EXISTS news_items_owner_published_idx
      ON news_items (user_id, published_at DESC, id ASC);

    -- Deactivate any existing leaderboard entries that were produced by manual backtests
    UPDATE leaderboard_entries le
    SET active = FALSE
    FROM backtest_experiment_results er
    JOIN backtest_candidates c ON c.id = er.candidate_id
    WHERE le.experiment_result_id = er.id
      AND (c.origin = 'MANUAL' OR c.search_run_id IS NULL);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS news_items_owner_published_idx;
    ALTER TABLE news_items
      DROP CONSTRAINT IF EXISTS news_items_user_url_unique;
    ALTER TABLE news_items
      ADD CONSTRAINT news_items_url_key UNIQUE (url);
    ALTER TABLE news_items
      DROP COLUMN IF EXISTS user_id;
  `);
};
