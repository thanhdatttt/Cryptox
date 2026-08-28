exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE users (
      id uuid PRIMARY KEY,
      normalized_email text NOT NULL,
      password_hash text NOT NULL,
      created_at timestamptz NOT NULL,
      updated_at timestamptz NOT NULL,
      CONSTRAINT users_normalized_email_unique UNIQUE (normalized_email),
      CONSTRAINT users_normalized_email_non_empty CHECK (length(btrim(normalized_email)) > 0),
      CONSTRAINT users_password_hash_non_empty CHECK (length(password_hash) > 0)
    );

    CREATE TABLE auth_sessions (
      id uuid PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_digest text NOT NULL,
      created_at timestamptz NOT NULL,
      expires_at timestamptz NOT NULL,
      revoked_at timestamptz,
      CONSTRAINT auth_sessions_token_digest_unique UNIQUE (token_digest),
      CONSTRAINT auth_sessions_expiry_after_creation CHECK (expires_at > created_at),
      CONSTRAINT auth_sessions_revocation_after_creation CHECK (revoked_at IS NULL OR revoked_at >= created_at)
    );
    CREATE INDEX auth_sessions_user_id_idx ON auth_sessions(user_id);
    CREATE INDEX auth_sessions_active_lookup_idx ON auth_sessions(token_digest, expires_at)
      WHERE revoked_at IS NULL;

    CREATE TABLE strategy_definitions (
      id uuid PRIMARY KEY,
      owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      logical_family_key text NOT NULL,
      strategy_name text NOT NULL,
      implementation_version text NOT NULL,
      behavior_profile_id text NOT NULL,
      version integer NOT NULL,
      parameters jsonb NOT NULL,
      created_at timestamptz NOT NULL,
      CONSTRAINT strategy_definitions_version_positive CHECK (version > 0),
      CONSTRAINT strategy_definitions_parameters_object CHECK (jsonb_typeof(parameters) = 'object'),
      CONSTRAINT strategy_definitions_family_version_unique
        UNIQUE (owner_user_id, logical_family_key, version),
      CONSTRAINT strategy_definitions_id_version_unique UNIQUE (id, version)
    );
    CREATE INDEX strategy_definitions_owner_created_idx
      ON strategy_definitions(owner_user_id, created_at, id);

    CREATE TABLE composite_strategy_definitions (
      id uuid PRIMARY KEY,
      owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      logical_family_key text NOT NULL,
      version integer NOT NULL,
      method text NOT NULL,
      combination_profile_id text NOT NULL,
      created_at timestamptz NOT NULL,
      CONSTRAINT composite_strategy_definitions_version_positive CHECK (version > 0),
      CONSTRAINT composite_strategy_definitions_family_version_unique
        UNIQUE (owner_user_id, logical_family_key, version),
      CONSTRAINT composite_strategy_definitions_id_version_unique UNIQUE (id, version)
    );
    CREATE INDEX composite_strategy_definitions_owner_created_idx
      ON composite_strategy_definitions(owner_user_id, created_at, id);

    CREATE TABLE composite_components (
      composite_definition_id uuid NOT NULL
        REFERENCES composite_strategy_definitions(id) ON DELETE CASCADE,
      component_position integer NOT NULL,
      strategy_definition_id uuid NOT NULL,
      strategy_definition_version integer NOT NULL,
      PRIMARY KEY (composite_definition_id, component_position),
      CONSTRAINT composite_components_position_non_negative CHECK (component_position >= 0),
      CONSTRAINT composite_components_version_positive CHECK (strategy_definition_version > 0),
      CONSTRAINT composite_components_strategy_fk
        FOREIGN KEY (strategy_definition_id, strategy_definition_version)
        REFERENCES strategy_definitions(id, version) ON DELETE RESTRICT,
      CONSTRAINT composite_components_identity_unique
        UNIQUE (composite_definition_id, strategy_definition_id, strategy_definition_version)
    );

    CREATE TABLE market_candles (
      pair text NOT NULL,
      timeframe text NOT NULL,
      timestamp timestamptz NOT NULL,
      open numeric NOT NULL,
      high numeric NOT NULL,
      low numeric NOT NULL,
      close numeric NOT NULL,
      volume numeric NOT NULL,
      is_closed boolean NOT NULL,
      PRIMARY KEY (pair, timeframe, timestamp),
      CONSTRAINT market_candles_prices_finite CHECK (
        open = open AND high = high AND low = low AND close = close AND volume = volume
      ),
      CONSTRAINT market_candles_high_low_order CHECK (high >= low),
      CONSTRAINT market_candles_volume_non_negative CHECK (volume >= 0)
    );

    CREATE TABLE market_dataset_snapshots (
      id uuid PRIMARY KEY,
      provider_id text NOT NULL,
      pair text NOT NULL,
      timeframe text NOT NULL,
      range_from timestamptz NOT NULL,
      range_to timestamptz NOT NULL,
      candle_count integer NOT NULL,
      replay_guarantee text NOT NULL,
      dataset_version text,
      replay_limitation text,
      created_at timestamptz NOT NULL,
      CONSTRAINT market_dataset_snapshots_range_order CHECK (range_to > range_from),
      CONSTRAINT market_dataset_snapshots_count_non_negative CHECK (candle_count >= 0),
      CONSTRAINT market_dataset_snapshots_replay_shape CHECK (
        (replay_guarantee = 'EXACT_REPLAY_AVAILABLE' AND dataset_version IS NOT NULL AND replay_limitation IS NULL)
        OR
        (replay_guarantee = 'TRACEABLE' AND replay_limitation IS NOT NULL)
      )
    );

    CREATE TABLE market_dataset_snapshot_candles (
      snapshot_id uuid NOT NULL REFERENCES market_dataset_snapshots(id) ON DELETE RESTRICT,
      timestamp timestamptz NOT NULL,
      open numeric NOT NULL,
      high numeric NOT NULL,
      low numeric NOT NULL,
      close numeric NOT NULL,
      volume numeric NOT NULL,
      is_closed boolean NOT NULL,
      PRIMARY KEY (snapshot_id, timestamp),
      CONSTRAINT market_snapshot_candles_prices_finite CHECK (
        open = open AND high = high AND low = low AND close = close AND volume = volume
      ),
      CONSTRAINT market_snapshot_candles_high_low_order CHECK (high >= low),
      CONSTRAINT market_snapshot_candles_volume_non_negative CHECK (volume >= 0)
    );

    CREATE TABLE ranking_configurations (
      id text PRIMARY KEY,
      profile_id text NOT NULL,
      version integer NOT NULL,
      name text NOT NULL,
      description text,
      formula jsonb NOT NULL,
      minimum_number_of_trades integer NOT NULL,
      tie_breakers jsonb NOT NULL,
      created_at timestamptz NOT NULL,
      CONSTRAINT ranking_configurations_version_positive CHECK (version > 0),
      CONSTRAINT ranking_configurations_min_trades_non_negative CHECK (minimum_number_of_trades >= 0),
      CONSTRAINT ranking_configurations_formula_object CHECK (jsonb_typeof(formula) = 'object'),
      CONSTRAINT ranking_configurations_tie_breakers_array CHECK (jsonb_typeof(tie_breakers) = 'array')
    );

    CREATE TABLE leaderboard_scopes (
      id uuid PRIMARY KEY,
      owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name text NOT NULL,
      k integer NOT NULL,
      ranking_configuration_id text NOT NULL REFERENCES ranking_configurations(id) ON DELETE RESTRICT,
      comparison_key text NOT NULL,
      created_at timestamptz NOT NULL,
      CONSTRAINT leaderboard_scopes_k_positive CHECK (k > 0),
      CONSTRAINT leaderboard_scopes_name_non_empty CHECK (length(btrim(name)) > 0),
      CONSTRAINT leaderboard_scopes_owner_name_unique UNIQUE (owner_user_id, name)
    );
    CREATE INDEX leaderboard_scopes_owner_created_idx
      ON leaderboard_scopes(owner_user_id, created_at, id);

    CREATE TABLE search_runs (
      id uuid PRIMARY KEY,
      owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      generator_type text NOT NULL,
      random_seed text NOT NULL,
      search_space jsonb NOT NULL,
      stop_condition jsonb NOT NULL,
      leaderboard_scope_id uuid NOT NULL REFERENCES leaderboard_scopes(id) ON DELETE RESTRICT,
      max_in_flight integer NOT NULL,
      state text NOT NULL,
      submitted_candidate_count integer NOT NULL,
      completed_candidate_count integer NOT NULL,
      failed_candidate_count integer NOT NULL,
      created_at timestamptz NOT NULL,
      started_at timestamptz,
      updated_at timestamptz NOT NULL,
      ended_at timestamptz,
      stop_reason text,
      last_error text,
      CONSTRAINT search_runs_max_in_flight_positive CHECK (max_in_flight > 0),
      CONSTRAINT search_runs_search_space_object CHECK (jsonb_typeof(search_space) = 'object'),
      CONSTRAINT search_runs_stop_condition_object CHECK (jsonb_typeof(stop_condition) = 'object'),
      CONSTRAINT search_runs_counts_non_negative CHECK (
        submitted_candidate_count >= 0 AND completed_candidate_count >= 0 AND failed_candidate_count >= 0
      )
    );
    CREATE INDEX search_runs_owner_created_idx ON search_runs(owner_user_id, created_at, id);
    CREATE INDEX search_runs_state_idx ON search_runs(state);

    CREATE TABLE candidates (
      id uuid PRIMARY KEY,
      owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      leaderboard_scope_id uuid NOT NULL REFERENCES leaderboard_scopes(id) ON DELETE RESTRICT,
      search_run_id uuid REFERENCES search_runs(id) ON DELETE RESTRICT,
      iteration_number integer,
      origin text NOT NULL,
      strategy_selection_kind text NOT NULL,
      strategy_definition_id uuid REFERENCES strategy_definitions(id) ON DELETE RESTRICT,
      composite_definition_id uuid REFERENCES composite_strategy_definitions(id) ON DELETE RESTRICT,
      pair text NOT NULL,
      timeframe text NOT NULL,
      range_from timestamptz NOT NULL,
      range_to timestamptz NOT NULL,
      dataset_id uuid REFERENCES market_dataset_snapshots(id) ON DELETE RESTRICT,
      dataset_version text,
      execution_profile_id text NOT NULL,
      initial_capital numeric NOT NULL,
      fee_rate_percent numeric NOT NULL,
      slippage_bps integer NOT NULL,
      status text NOT NULL,
      started_at timestamptz,
      completed_at timestamptz,
      duration_ms bigint,
      failure_code text,
      failure_message text,
      created_at timestamptz NOT NULL,
      updated_at timestamptz NOT NULL,
      CONSTRAINT candidates_origin_shape CHECK (
        (origin = 'MANUAL' AND search_run_id IS NULL AND iteration_number IS NULL)
        OR
        (origin = 'SEARCH' AND search_run_id IS NOT NULL AND iteration_number IS NOT NULL AND iteration_number > 0)
      ),
      CONSTRAINT candidates_selection_shape CHECK (
        (strategy_selection_kind = 'STRATEGY' AND strategy_definition_id IS NOT NULL AND composite_definition_id IS NULL)
        OR
        (strategy_selection_kind = 'COMPOSITE' AND strategy_definition_id IS NULL AND composite_definition_id IS NOT NULL)
      ),
      CONSTRAINT candidates_range_order CHECK (range_to > range_from),
      CONSTRAINT candidates_initial_capital_positive CHECK (initial_capital > 0),
      CONSTRAINT candidates_fee_non_negative CHECK (fee_rate_percent >= 0),
      CONSTRAINT candidates_slippage_non_negative CHECK (slippage_bps >= 0),
      CONSTRAINT candidates_duration_non_negative CHECK (duration_ms IS NULL OR duration_ms >= 0),
      CONSTRAINT candidates_search_iteration_unique UNIQUE (search_run_id, iteration_number)
    );
    CREATE INDEX candidates_owner_created_idx ON candidates(owner_user_id, created_at, id);
    CREATE INDEX candidates_owner_search_idx ON candidates(owner_user_id, search_run_id, created_at, id);

    CREATE TABLE experiments (
      id uuid PRIMARY KEY,
      candidate_id uuid NOT NULL UNIQUE REFERENCES candidates(id) ON DELETE RESTRICT,
      search_run_id uuid REFERENCES search_runs(id) ON DELETE RESTRICT,
      strategy_selection_kind text NOT NULL,
      strategy_definition_id uuid REFERENCES strategy_definitions(id) ON DELETE RESTRICT,
      composite_definition_id uuid REFERENCES composite_strategy_definitions(id) ON DELETE RESTRICT,
      market_dataset_snapshot_id uuid REFERENCES market_dataset_snapshots(id) ON DELETE RESTRICT,
      pair text NOT NULL,
      timeframe text NOT NULL,
      range_from timestamptz NOT NULL,
      range_to timestamptz NOT NULL,
      execution_profile_id text NOT NULL,
      initial_capital numeric NOT NULL,
      ending_capital numeric NOT NULL,
      equity_curve jsonb NOT NULL,
      ranking_configuration_id text NOT NULL REFERENCES ranking_configurations(id) ON DELETE RESTRICT,
      code_provenance jsonb NOT NULL,
      replay_guarantee text NOT NULL,
      replay_limitation text,
      created_at timestamptz NOT NULL,
      CONSTRAINT experiments_selection_shape CHECK (
        (strategy_selection_kind = 'STRATEGY' AND strategy_definition_id IS NOT NULL AND composite_definition_id IS NULL)
        OR
        (strategy_selection_kind = 'COMPOSITE' AND strategy_definition_id IS NULL AND composite_definition_id IS NOT NULL)
      ),
      CONSTRAINT experiments_range_order CHECK (range_to > range_from),
      CONSTRAINT experiments_equity_curve_array CHECK (jsonb_typeof(equity_curve) = 'array'),
      CONSTRAINT experiments_code_provenance_object CHECK (jsonb_typeof(code_provenance) = 'object'),
      CONSTRAINT experiments_replay_shape CHECK (
        (replay_guarantee = 'EXACT_REPLAY_AVAILABLE' AND replay_limitation IS NULL)
        OR
        (replay_guarantee = 'TRACEABLE' AND replay_limitation IS NOT NULL)
      )
    );

    CREATE TABLE trades (
      id uuid PRIMARY KEY,
      experiment_id uuid NOT NULL REFERENCES experiments(id) ON DELETE RESTRICT,
      sequence integer NOT NULL,
      pair text NOT NULL,
      entry_signal_at timestamptz NOT NULL,
      entry_time timestamptz NOT NULL,
      entry_price numeric NOT NULL,
      exit_signal_at timestamptz,
      exit_time timestamptz NOT NULL,
      exit_price numeric NOT NULL,
      exit_reason text NOT NULL,
      quantity numeric NOT NULL,
      notional_entry_value numeric NOT NULL,
      gross_profit numeric NOT NULL,
      fee_amount numeric NOT NULL,
      slippage_bps integer NOT NULL,
      profit numeric NOT NULL,
      result_percent numeric NOT NULL,
      result text NOT NULL,
      CONSTRAINT trades_sequence_positive CHECK (sequence > 0),
      CONSTRAINT trades_times_order CHECK (exit_time >= entry_time),
      CONSTRAINT trades_prices_positive CHECK (entry_price > 0 AND exit_price > 0),
      CONSTRAINT trades_quantity_positive CHECK (quantity > 0),
      CONSTRAINT trades_fee_non_negative CHECK (fee_amount >= 0),
      CONSTRAINT trades_slippage_non_negative CHECK (slippage_bps >= 0),
      CONSTRAINT trades_experiment_sequence_unique UNIQUE (experiment_id, sequence)
    );

    CREATE TABLE evaluation_results (
      id uuid PRIMARY KEY,
      experiment_id uuid NOT NULL UNIQUE REFERENCES experiments(id) ON DELETE RESTRICT,
      total_return_percent numeric NOT NULL,
      win_rate_percent numeric NOT NULL,
      number_of_trades integer NOT NULL,
      max_drawdown_magnitude_percent numeric NOT NULL,
      evaluation_profile_id text NOT NULL,
      CONSTRAINT evaluation_results_trade_count_non_negative CHECK (number_of_trades >= 0),
      CONSTRAINT evaluation_results_percentages_finite CHECK (
        total_return_percent = total_return_percent
        AND win_rate_percent = win_rate_percent
        AND max_drawdown_magnitude_percent = max_drawdown_magnitude_percent
      )
    );

    CREATE TABLE leaderboard_entries (
      id uuid PRIMARY KEY,
      rank integer NOT NULL,
      candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE RESTRICT,
      search_run_id uuid REFERENCES search_runs(id) ON DELETE RESTRICT,
      experiment_id uuid NOT NULL REFERENCES experiments(id) ON DELETE RESTRICT,
      leaderboard_scope_id uuid NOT NULL REFERENCES leaderboard_scopes(id) ON DELETE RESTRICT,
      ranking_configuration_id text NOT NULL REFERENCES ranking_configurations(id) ON DELETE RESTRICT,
      score numeric NOT NULL,
      added_at timestamptz NOT NULL,
      CONSTRAINT leaderboard_entries_rank_positive CHECK (rank > 0),
      CONSTRAINT leaderboard_entries_score_finite CHECK (score = score),
      CONSTRAINT leaderboard_entries_scope_experiment_unique UNIQUE (leaderboard_scope_id, experiment_id),
      CONSTRAINT leaderboard_entries_scope_rank_unique UNIQUE (leaderboard_scope_id, rank)
    );
    CREATE INDEX leaderboard_entries_scope_rank_idx ON leaderboard_entries(leaderboard_scope_id, rank);

    CREATE TABLE news_items (
      id uuid PRIMARY KEY,
      provider_id text NOT NULL,
      provider_item_id text NOT NULL,
      title text NOT NULL,
      content text NOT NULL,
      source text NOT NULL,
      published_at timestamptz NOT NULL,
      crawled_at timestamptz NOT NULL,
      related_coins jsonb NOT NULL,
      url text NOT NULL,
      CONSTRAINT news_items_related_coins_array CHECK (jsonb_typeof(related_coins) = 'array'),
      CONSTRAINT news_items_provider_identity_unique UNIQUE (provider_id, provider_item_id)
    );
    CREATE INDEX news_items_published_idx ON news_items(published_at DESC, id);

    CREATE TABLE sentiment_results (
      id uuid PRIMARY KEY,
      news_id uuid NOT NULL REFERENCES news_items(id) ON DELETE RESTRICT,
      label text NOT NULL,
      score numeric NOT NULL,
      provider_id text NOT NULL,
      analysis_profile_id text NOT NULL,
      model_name text NOT NULL,
      model_version text NOT NULL,
      analyzed_at timestamptz NOT NULL,
      CONSTRAINT sentiment_results_label_valid CHECK (label IN ('POSITIVE', 'NEUTRAL', 'NEGATIVE')),
      CONSTRAINT sentiment_results_score_range CHECK (score >= -1 AND score <= 1),
      CONSTRAINT sentiment_results_news_model_unique UNIQUE (news_id, model_name, model_version)
    );
    CREATE INDEX sentiment_results_news_analyzed_idx ON sentiment_results(news_id, analyzed_at DESC, id);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE sentiment_results;
    DROP TABLE news_items;
    DROP TABLE leaderboard_entries;
    DROP TABLE evaluation_results;
    DROP TABLE trades;
    DROP TABLE experiments;
    DROP TABLE candidates;
    DROP TABLE search_runs;
    DROP TABLE leaderboard_scopes;
    DROP TABLE ranking_configurations;
    DROP TABLE market_dataset_snapshot_candles;
    DROP TABLE market_dataset_snapshots;
    DROP TABLE market_candles;
    DROP TABLE composite_components;
    DROP TABLE composite_strategy_definitions;
    DROP TABLE strategy_definitions;
    DROP TABLE auth_sessions;
    DROP TABLE users;
  `);
};
