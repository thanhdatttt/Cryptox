exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable("strategy_definitions", {
    id: { type: "text", primaryKey: true },
    user_id: { type: "uuid", notNull: true, references: "users", onDelete: "CASCADE" },
    logical_family_key: { type: "text", notNull: true },
    family_name: { type: "text" },
    strategy_name: { type: "text", notNull: true },
    implementation_version: { type: "text", notNull: true },
    implementation_sha256: { type: "text", notNull: true },
    version: { type: "integer", notNull: true },
    parameters: { type: "jsonb", notNull: true },
    created_at: { type: "timestamptz", notNull: true },
  });
  pgm.addConstraint("strategy_definitions", "strategy_definitions_family_version_unique", { unique: ["user_id", "logical_family_key", "version"] });
  pgm.createTable("composite_strategy_definitions", {
    id: { type: "text", primaryKey: true },
    user_id: { type: "uuid", notNull: true, references: "users", onDelete: "CASCADE" },
    logical_family_key: { type: "text", notNull: true },
    version: { type: "integer", notNull: true },
    method: { type: "text", notNull: true },
    components: { type: "jsonb", notNull: true },
    thresholds: { type: "jsonb" },
    created_at: { type: "timestamptz", notNull: true },
  });
  pgm.addConstraint("composite_strategy_definitions", "composite_strategy_definitions_family_version_unique", { unique: ["user_id", "logical_family_key", "version"] });
};

exports.down = (pgm) => {
  pgm.dropTable("composite_strategy_definitions");
  pgm.dropTable("strategy_definitions");
};
