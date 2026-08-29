exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE strategy_definitions
      ADD COLUMN authoring_origin jsonb,
      ADD CONSTRAINT strategy_definitions_authoring_origin_object
        CHECK (authoring_origin IS NULL OR jsonb_typeof(authoring_origin) = 'object'),
      ADD CONSTRAINT strategy_definitions_authoring_origin_no_secrets
        CHECK (
          authoring_origin IS NULL OR (
            NOT jsonb_path_exists(authoring_origin, '$.**.apiKey')
            AND NOT jsonb_path_exists(authoring_origin, '$.**.api_key')
            AND NOT jsonb_path_exists(authoring_origin, '$.**.credential')
            AND NOT jsonb_path_exists(authoring_origin, '$.**.token')
            AND NOT jsonb_path_exists(authoring_origin, '$.**.password')
            AND NOT jsonb_path_exists(authoring_origin, '$.**.prompt')
            AND NOT jsonb_path_exists(authoring_origin, '$.**.completion')
          )
        );

    ALTER TABLE composite_strategy_definitions
      ADD COLUMN weighted_buy_threshold numeric,
      ADD COLUMN weighted_sell_threshold numeric,
      ADD CONSTRAINT composite_strategy_definitions_weighted_thresholds
        CHECK (
          (method <> 'WEIGHTED_VOTE' AND weighted_buy_threshold IS NULL AND weighted_sell_threshold IS NULL)
          OR
          (method = 'WEIGHTED_VOTE' AND weighted_buy_threshold IS NOT NULL AND weighted_sell_threshold IS NOT NULL AND weighted_buy_threshold NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric) AND weighted_sell_threshold NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric) AND weighted_buy_threshold >= 0 AND weighted_sell_threshold <= 0 AND weighted_sell_threshold < weighted_buy_threshold)
        );
    ALTER TABLE composite_components
      ADD COLUMN enabled boolean NOT NULL DEFAULT true,
      ADD COLUMN weight numeric NOT NULL DEFAULT 1,
      ADD CONSTRAINT composite_components_weight_non_negative CHECK (weight >= 0 AND weight NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric));

    CREATE TABLE strategy_authoring_drafts (
      id uuid PRIMARY KEY,
      owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      profile_id text NOT NULL CHECK (profile_id = 'LLM_AUTHORING_V1'),
      source_kind text NOT NULL CHECK (source_kind IN ('PROMPT', 'APPROVED_NEWS_ITEM')),
      source_news_item_id uuid REFERENCES news_items(id) ON DELETE RESTRICT,
      provider_id text NOT NULL,
      model_id text NOT NULL,
      status text NOT NULL CHECK (status IN ('DRAFT', 'VALIDATED', 'REJECTED', 'APPROVED')),
      structured_draft jsonb,
      validation_result jsonb,
      approved_definition_id uuid REFERENCES strategy_definitions(id) ON DELETE RESTRICT,
      created_at timestamptz NOT NULL,
      updated_at timestamptz NOT NULL,
      CONSTRAINT strategy_authoring_drafts_source_shape CHECK (
        (source_kind = 'PROMPT' AND source_news_item_id IS NULL)
        OR (source_kind = 'APPROVED_NEWS_ITEM' AND source_news_item_id IS NOT NULL)
      ),
      CONSTRAINT strategy_authoring_drafts_structured_shape CHECK (structured_draft IS NULL OR jsonb_typeof(structured_draft) = 'object'),
      CONSTRAINT strategy_authoring_drafts_validation_shape CHECK (validation_result IS NULL OR jsonb_typeof(validation_result) = 'object'),
      CONSTRAINT strategy_authoring_drafts_no_secrets CHECK (
        NOT jsonb_path_exists(coalesce(structured_draft, '{}'::jsonb), '$.**.apiKey')
        AND NOT jsonb_path_exists(coalesce(structured_draft, '{}'::jsonb), '$.**.api_key')
        AND NOT jsonb_path_exists(coalesce(structured_draft, '{}'::jsonb), '$.**.credential')
        AND NOT jsonb_path_exists(coalesce(structured_draft, '{}'::jsonb), '$.**.token')
        AND NOT jsonb_path_exists(coalesce(structured_draft, '{}'::jsonb), '$.**.password')
        AND NOT jsonb_path_exists(coalesce(structured_draft, '{}'::jsonb), '$.**.prompt')
        AND NOT jsonb_path_exists(coalesce(structured_draft, '{}'::jsonb), '$.**.completion')
        AND NOT jsonb_path_exists(coalesce(validation_result, '{}'::jsonb), '$.**.apiKey')
        AND NOT jsonb_path_exists(coalesce(validation_result, '{}'::jsonb), '$.**.api_key')
        AND NOT jsonb_path_exists(coalesce(validation_result, '{}'::jsonb), '$.**.credential')
        AND NOT jsonb_path_exists(coalesce(validation_result, '{}'::jsonb), '$.**.token')
        AND NOT jsonb_path_exists(coalesce(validation_result, '{}'::jsonb), '$.**.password')
        AND NOT jsonb_path_exists(coalesce(validation_result, '{}'::jsonb), '$.**.prompt')
        AND NOT jsonb_path_exists(coalesce(validation_result, '{}'::jsonb), '$.**.completion')
      ),
      CONSTRAINT strategy_authoring_drafts_approval_shape CHECK (
        (status = 'APPROVED' AND approved_definition_id IS NOT NULL)
        OR (status <> 'APPROVED' AND approved_definition_id IS NULL)
      )
    );
    CREATE INDEX strategy_authoring_drafts_owner_created_idx ON strategy_authoring_drafts(owner_user_id, created_at, id);

    ALTER TABLE search_runs
      ADD COLUMN discovery_profile_id text,
      ADD COLUMN algorithm_configuration jsonb,
      ADD COLUMN dataset_identity jsonb,
      ADD COLUMN code_provenance jsonb,
      ADD CONSTRAINT search_runs_discovery_profile_valid
        CHECK (discovery_profile_id IS NULL OR discovery_profile_id IN ('RANDOM_V1', 'DOMAIN_GUIDED_V1', 'GENETIC_V1')),
      ADD CONSTRAINT search_runs_extension_provenance_shape CHECK (
        (discovery_profile_id IS NULL AND algorithm_configuration IS NULL AND dataset_identity IS NULL AND code_provenance IS NULL)
        OR
        (discovery_profile_id IS NOT NULL AND algorithm_configuration IS NOT NULL AND dataset_identity IS NOT NULL AND code_provenance IS NOT NULL AND jsonb_typeof(algorithm_configuration) = 'object' AND jsonb_typeof(dataset_identity) = 'object' AND jsonb_typeof(code_provenance) = 'object')
      );

    ALTER TABLE candidates
      ALTER COLUMN initial_capital TYPE numeric(38, 8) USING initial_capital::numeric(38, 8),
      ALTER COLUMN fee_rate_percent TYPE numeric(20, 8) USING fee_rate_percent::numeric(20, 8),
      ADD COLUMN paper_execution_provenance jsonb,
      ADD CONSTRAINT candidates_paper_execution_provenance_object
        CHECK (paper_execution_provenance IS NULL OR jsonb_typeof(paper_execution_provenance) = 'object'),
      ADD CONSTRAINT candidates_paper_numeric_finite
        CHECK (
          initial_capital NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)
          AND fee_rate_percent NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)
        );
    ALTER TABLE experiments
      ALTER COLUMN initial_capital TYPE numeric(38, 8) USING initial_capital::numeric(38, 8),
      ALTER COLUMN ending_capital TYPE numeric(38, 8) USING ending_capital::numeric(38, 8),
      ADD COLUMN paper_execution_provenance jsonb,
      ADD CONSTRAINT experiments_paper_execution_provenance_object
        CHECK (paper_execution_provenance IS NULL OR jsonb_typeof(paper_execution_provenance) = 'object'),
      ADD CONSTRAINT experiments_paper_numeric_finite
        CHECK (
          initial_capital NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)
          AND ending_capital NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)
        );
    ALTER TABLE trades
      ALTER COLUMN entry_price TYPE numeric(38, 8) USING entry_price::numeric(38, 8),
      ALTER COLUMN exit_price TYPE numeric(38, 8) USING exit_price::numeric(38, 8),
      ALTER COLUMN quantity TYPE numeric(38, 8) USING quantity::numeric(38, 8),
      ALTER COLUMN notional_entry_value TYPE numeric(38, 8) USING notional_entry_value::numeric(38, 8),
      ALTER COLUMN gross_profit TYPE numeric(38, 8) USING gross_profit::numeric(38, 8),
      ALTER COLUMN fee_amount TYPE numeric(38, 8) USING fee_amount::numeric(38, 8),
      ALTER COLUMN profit TYPE numeric(38, 8) USING profit::numeric(38, 8),
      ALTER COLUMN result_percent TYPE numeric(38, 8) USING result_percent::numeric(38, 8),
      ADD COLUMN position_mode text,
      ADD CONSTRAINT trades_position_mode_valid CHECK (position_mode IS NULL OR position_mode IN ('LONG', 'SYNTHETIC_SHORT')),
      ADD CONSTRAINT trades_paper_numeric_finite CHECK (
        entry_price NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)
        AND exit_price NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)
        AND quantity NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)
        AND notional_entry_value NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)
        AND gross_profit NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)
        AND fee_amount NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)
        AND profit NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)
        AND result_percent NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)
      );

    ALTER TABLE news_items
      ADD COLUMN canonical_url text,
      ADD COLUMN normalized_content_hash text,
      ADD COLUMN normalized_retain_until timestamptz,
      ADD CONSTRAINT news_items_normalized_retention_window CHECK (normalized_retain_until IS NULL OR normalized_retain_until = crawled_at + interval '90 days');
    CREATE UNIQUE INDEX news_items_canonical_url_unique_idx ON news_items(canonical_url) WHERE canonical_url IS NOT NULL;
    CREATE UNIQUE INDEX news_items_normalized_content_hash_unique_idx ON news_items(normalized_content_hash) WHERE normalized_content_hash IS NOT NULL;

    CREATE TABLE extraction_templates (
      id uuid PRIMARY KEY,
      source_id text NOT NULL,
      version integer NOT NULL,
      status text NOT NULL CHECK (status IN ('DRAFT', 'APPROVED', 'RETIRED')),
      configuration jsonb NOT NULL CHECK (jsonb_typeof(configuration) = 'object'),
      supersedes_template_id uuid REFERENCES extraction_templates(id) ON DELETE RESTRICT,
      refinement_diff jsonb,
      quality_metrics jsonb,
      created_at timestamptz NOT NULL,
      approved_at timestamptz,
      retain_until timestamptz NOT NULL,
      CONSTRAINT extraction_templates_source_version_unique UNIQUE (source_id, version),
      CONSTRAINT extraction_templates_diff_object CHECK (refinement_diff IS NULL OR jsonb_typeof(refinement_diff) = 'object'),
      CONSTRAINT extraction_templates_metrics_object CHECK (quality_metrics IS NULL OR jsonb_typeof(quality_metrics) = 'object'),
      CONSTRAINT extraction_templates_approval_shape CHECK (
        (status = 'APPROVED' AND approved_at IS NOT NULL) OR (status <> 'APPROVED' AND approved_at IS NULL)
      ),
      CONSTRAINT extraction_templates_retention_window CHECK (retain_until = created_at + interval '90 days')
    );
    CREATE UNIQUE INDEX extraction_templates_one_approved_per_source_idx ON extraction_templates(source_id) WHERE status = 'APPROVED';

    CREATE TABLE news_extraction_provenance (
      id uuid PRIMARY KEY,
      news_id uuid NOT NULL REFERENCES news_items(id) ON DELETE RESTRICT,
      source_kind text NOT NULL CHECK (source_kind IN ('CONFIGURED_WEBSITE', 'RSS', 'HTML', 'ALLOWLISTED_URL_IMPORT')),
      canonical_url text NOT NULL,
      normalized_content_hash text NOT NULL,
      template_id uuid REFERENCES extraction_templates(id) ON DELETE RESTRICT,
      extracted_at timestamptz NOT NULL,
      retain_until timestamptz NOT NULL,
      CONSTRAINT news_extraction_provenance_retention_window CHECK (retain_until = extracted_at + interval '90 days'),
      CONSTRAINT news_extraction_provenance_news_unique UNIQUE (news_id)
    );
    CREATE INDEX news_extraction_provenance_retention_idx ON news_extraction_provenance(retain_until);

    CREATE TABLE news_raw_html_artifacts (
      id uuid PRIMARY KEY,
      news_id uuid NOT NULL REFERENCES news_items(id) ON DELETE CASCADE,
      body text NOT NULL,
      collected_at timestamptz NOT NULL,
      purge_after timestamptz NOT NULL,
      CONSTRAINT news_raw_html_artifacts_purge_window CHECK (purge_after = collected_at + interval '7 days'),
      CONSTRAINT news_raw_html_artifacts_news_unique UNIQUE (news_id)
    );
    CREATE INDEX news_raw_html_artifacts_purge_idx ON news_raw_html_artifacts(purge_after);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE news_raw_html_artifacts;
    DROP TABLE news_extraction_provenance;
    DROP TABLE extraction_templates;
    DROP INDEX news_items_normalized_content_hash_unique_idx;
    DROP INDEX news_items_canonical_url_unique_idx;
    ALTER TABLE news_items
      DROP CONSTRAINT news_items_normalized_retention_window,
      DROP COLUMN normalized_retain_until,
      DROP COLUMN normalized_content_hash,
      DROP COLUMN canonical_url;
    ALTER TABLE trades
      DROP CONSTRAINT trades_position_mode_valid,
      DROP CONSTRAINT trades_paper_numeric_finite,
      DROP COLUMN position_mode,
      ALTER COLUMN result_percent TYPE numeric,
      ALTER COLUMN profit TYPE numeric,
      ALTER COLUMN fee_amount TYPE numeric,
      ALTER COLUMN gross_profit TYPE numeric,
      ALTER COLUMN notional_entry_value TYPE numeric,
      ALTER COLUMN quantity TYPE numeric,
      ALTER COLUMN exit_price TYPE numeric,
      ALTER COLUMN entry_price TYPE numeric;
    ALTER TABLE experiments
      DROP CONSTRAINT experiments_paper_execution_provenance_object,
      DROP CONSTRAINT experiments_paper_numeric_finite,
      DROP COLUMN paper_execution_provenance,
      ALTER COLUMN ending_capital TYPE numeric,
      ALTER COLUMN initial_capital TYPE numeric;
    ALTER TABLE candidates
      DROP CONSTRAINT candidates_paper_execution_provenance_object,
      DROP CONSTRAINT candidates_paper_numeric_finite,
      DROP COLUMN paper_execution_provenance,
      ALTER COLUMN fee_rate_percent TYPE numeric,
      ALTER COLUMN initial_capital TYPE numeric;
    ALTER TABLE search_runs
      DROP CONSTRAINT search_runs_extension_provenance_shape,
      DROP CONSTRAINT search_runs_discovery_profile_valid,
      DROP COLUMN code_provenance,
      DROP COLUMN dataset_identity,
      DROP COLUMN algorithm_configuration,
      DROP COLUMN discovery_profile_id;
    DROP TABLE strategy_authoring_drafts;
    ALTER TABLE composite_components
      DROP CONSTRAINT composite_components_weight_non_negative,
      DROP COLUMN weight,
      DROP COLUMN enabled;
    ALTER TABLE composite_strategy_definitions
      DROP CONSTRAINT composite_strategy_definitions_weighted_thresholds,
      DROP COLUMN weighted_sell_threshold,
      DROP COLUMN weighted_buy_threshold;
    ALTER TABLE strategy_definitions
      DROP CONSTRAINT strategy_definitions_authoring_origin_no_secrets,
      DROP CONSTRAINT strategy_definitions_authoring_origin_object,
      DROP COLUMN authoring_origin;
  `);
};
