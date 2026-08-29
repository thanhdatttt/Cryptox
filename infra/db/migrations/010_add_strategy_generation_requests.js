exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addConstraint("strategy_definitions", "strategy_definitions_id_user_unique", { unique: ["id", "user_id"] });
  pgm.addConstraint("composite_strategy_definitions", "composite_strategy_definitions_id_user_unique", { unique: ["id", "user_id"] });
  pgm.createTable("strategy_generation_requests", {
    id: { type: "text", primaryKey: true },
    user_id: { type: "uuid", notNull: true, references: "users", onDelete: "CASCADE" },
    source_type: { type: "text", notNull: true },
    source_text: { type: "text" },
    source_url: { type: "text" },
    model_name: { type: "text", notNull: true },
    model_version: { type: "text", notNull: true },
    prompt_version: { type: "text", notNull: true },
    output_kind: { type: "text", notNull: true },
    strategy_definition_id: { type: "text" },
    composite_definition_id: { type: "text" },
    created_at: { type: "timestamptz", notNull: true },
  });
  pgm.addConstraint("strategy_generation_requests", "strategy_generation_source_check", { check: "(source_type = 'TEXT' AND source_text IS NOT NULL AND source_url IS NULL) OR (source_type = 'URL' AND source_text IS NULL AND source_url IS NOT NULL)" });
  pgm.addConstraint("strategy_generation_requests", "strategy_generation_source_content_check", { check: "(source_text IS NULL OR btrim(source_text) <> '') AND (source_url IS NULL OR btrim(source_url) <> '')" });
  pgm.addConstraint("strategy_generation_requests", "strategy_generation_result_check", { check: "(output_kind = 'SINGLE' AND strategy_definition_id IS NOT NULL AND composite_definition_id IS NULL) OR (output_kind = 'COMPOSITE' AND strategy_definition_id IS NULL AND composite_definition_id IS NOT NULL)" });
  pgm.addConstraint("strategy_generation_requests", "strategy_generation_strategy_owner_fk", { foreignKeys: { columns: ["strategy_definition_id", "user_id"], references: "strategy_definitions(id, user_id)", onDelete: "RESTRICT" } });
  pgm.addConstraint("strategy_generation_requests", "strategy_generation_composite_owner_fk", { foreignKeys: { columns: ["composite_definition_id", "user_id"], references: "composite_strategy_definitions(id, user_id)", onDelete: "RESTRICT" } });
  pgm.addConstraint("strategy_generation_requests", "strategy_generation_source_type_check", { check: "source_type IN ('TEXT', 'URL')" });
  pgm.addConstraint("strategy_generation_requests", "strategy_generation_output_kind_check", { check: "output_kind IN ('SINGLE', 'COMPOSITE')" });
  pgm.createIndex("strategy_generation_requests", ["user_id", "created_at"]);
};

exports.down = (pgm) => {
  pgm.dropTable("strategy_generation_requests");
  pgm.dropConstraint("composite_strategy_definitions", "composite_strategy_definitions_id_user_unique");
  pgm.dropConstraint("strategy_definitions", "strategy_definitions_id_user_unique");
};
