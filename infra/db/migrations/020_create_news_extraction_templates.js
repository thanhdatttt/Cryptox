exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable("news_extraction_templates", {
    id: { type: "text", primaryKey: true },
    domain: { type: "text", notNull: true },
    version: { type: "text", notNull: true },
    selectors: { type: "jsonb", notNull: true },
    sample_html_snippet: { type: "text" },
    confidence: { type: "numeric", notNull: true, default: 0.85 },
    defect_rate: { type: "numeric", notNull: true, default: 0.0 },
    is_active: { type: "boolean", notNull: true, default: true },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
  });

  pgm.addConstraint("news_extraction_templates", "news_extraction_templates_domain_version_unique", {
    unique: ["domain", "version"],
  });

  pgm.createIndex("news_extraction_templates", ["domain", "is_active"]);
};

exports.down = (pgm) => {
  pgm.dropTable("news_extraction_templates");
};
