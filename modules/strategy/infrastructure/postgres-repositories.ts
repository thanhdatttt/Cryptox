import type { CompositeStrategyDefinition, StrategyDefinition } from "../domain/contracts";
import { builtInFactories } from "../domain/plugins";
import type { CompositeDefinitionRepository, StrategyDefinitionRepository, StrategyGenerationRequest, StrategyGenerationRepository, StrategyGenerationUnitOfWork } from "../application/ports";
import type { StrategyModuleDependencies } from "../application/service";

export interface StrategySqlTransactionClient {
  query<Row>(text: string, values: unknown[]): Promise<{ rows: Row[] }>;
  release(): void;
}
export interface StrategySqlQueryClient {
  query<Row>(text: string, values: unknown[]): Promise<{ rows: Row[] }>;
  connect?(): Promise<StrategySqlTransactionClient>;
}

interface DefinitionRow {
  id: string;
  logical_family_key: string;
  family_name: string | null;
  strategy_name: string;
  implementation_version: string;
  implementation_sha256: string;
  version: number;
  parameters: Record<string, number | string> | string;
  created_at: Date | string;
}
interface CompositeRow {
  id: string;
  logical_family_key: string;
  version: number;
  method: CompositeStrategyDefinition["method"];
  components: CompositeStrategyDefinition["components"] | string;
  thresholds: NonNullable<CompositeStrategyDefinition["thresholds"]> | string | null;
  created_at: Date | string;
}

interface GenerationRow {
  id: string;
  user_id: string;
  source_type: StrategyGenerationRequest["sourceType"];
  source_text: string | null;
  source_url: string | null;
  model_name: string;
  model_version: string;
  prompt_version: string;
  output_kind: StrategyGenerationRequest["outputKind"];
  strategy_definition_id: string | null;
  composite_definition_id: string | null;
  created_at: Date | string;
}

const object = <T>(value: T | string): T => typeof value === "string" ? JSON.parse(value) as T : value;
const definition = (row: DefinitionRow): StrategyDefinition => ({ id: row.id, logicalFamilyKey: row.logical_family_key, familyName: row.family_name ?? undefined, strategyName: row.strategy_name, implementationVersion: row.implementation_version, implementationSha256: row.implementation_sha256, version: row.version, parameters: object<Record<string, number | string>>(row.parameters), createdAt: new Date(row.created_at).toISOString() });
const composite = (row: CompositeRow): CompositeStrategyDefinition => ({ id: row.id, logicalFamilyKey: row.logical_family_key, version: row.version, method: row.method, components: object<CompositeStrategyDefinition["components"]>(row.components), thresholds: row.thresholds === null ? undefined : object<NonNullable<CompositeStrategyDefinition["thresholds"]>>(row.thresholds), createdAt: new Date(row.created_at).toISOString() });
const generation = (row: GenerationRow): StrategyGenerationRequest => ({ id: row.id, ownerUserId: row.user_id, sourceType: row.source_type, ...(row.source_text === null ? { sourceUrl: row.source_url! } : { sourceText: row.source_text }), modelName: row.model_name, modelVersion: row.model_version, promptVersion: row.prompt_version, outputKind: row.output_kind, ...(row.strategy_definition_id === null ? { compositeDefinitionId: row.composite_definition_id! } : { strategyDefinitionId: row.strategy_definition_id }), createdAt: new Date(row.created_at).toISOString() });

const generationColumns = "id, user_id, source_type, source_text, source_url, model_name, model_version, prompt_version, output_kind, strategy_definition_id, composite_definition_id, created_at";

export class PostgresStrategyDefinitionRepository implements StrategyDefinitionRepository {
  constructor(private readonly pool: StrategySqlQueryClient) {}

  async insert(ownerUserId: string, value: StrategyDefinition): Promise<StrategyDefinition> {
    const result = await this.pool.query<DefinitionRow>(
      "INSERT INTO strategy_definitions (id, user_id, logical_family_key, family_name, strategy_name, implementation_version, implementation_sha256, version, parameters, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10) RETURNING id, logical_family_key, family_name, strategy_name, implementation_version, implementation_sha256, version, parameters, created_at",
      [value.id, ownerUserId, value.logicalFamilyKey, value.familyName ?? null, value.strategyName, value.implementationVersion, value.implementationSha256, value.version, JSON.stringify(value.parameters), value.createdAt],
    );
    return definition(result.rows[0]!);
  }

  async list(ownerUserId: string): Promise<StrategyDefinition[]> {
    const result = await this.pool.query<DefinitionRow>(
      "SELECT id, logical_family_key, family_name, strategy_name, implementation_version, implementation_sha256, version, parameters, created_at FROM strategy_definitions WHERE user_id = $1 ORDER BY created_at ASC, id ASC",
      [ownerUserId],
    );
    return result.rows.map(definition);
  }

  async listByIds(ownerUserId: string, ids: string[]): Promise<StrategyDefinition[]> {
    if (ids.length === 0) return [];
    const result = await this.pool.query<DefinitionRow>(
      "SELECT id, logical_family_key, family_name, strategy_name, implementation_version, implementation_sha256, version, parameters, created_at FROM strategy_definitions WHERE user_id = $1 AND id = ANY($2::text[])",
      [ownerUserId, ids],
    );
    const rows = new Map(result.rows.map((row) => [row.id, definition(row)]));
    return ids.flatMap((id) => { const item = rows.get(id); return item ? [item] : []; });
  }

  async listByLogicalFamily(ownerUserId: string, logicalFamilyKey: string): Promise<StrategyDefinition[]> {
    const result = await this.pool.query<DefinitionRow>(
      "SELECT id, logical_family_key, family_name, strategy_name, implementation_version, implementation_sha256, version, parameters, created_at FROM strategy_definitions WHERE user_id = $1 AND logical_family_key = $2 ORDER BY version ASC",
      [ownerUserId, logicalFamilyKey],
    );
    return result.rows.map(definition);
  }

  async exists(id: string): Promise<boolean> {
    const result = await this.pool.query<{ exists: boolean }>("SELECT EXISTS (SELECT 1 FROM strategy_definitions WHERE id = $1) AS exists", [id]);
    return result.rows[0]?.exists === true;
  }
}

export class PostgresCompositeDefinitionRepository implements CompositeDefinitionRepository {
  constructor(private readonly pool: StrategySqlQueryClient) {}

  async insert(ownerUserId: string, value: CompositeStrategyDefinition): Promise<CompositeStrategyDefinition> {
    const result = await this.pool.query<CompositeRow>(
      "INSERT INTO composite_strategy_definitions (id, user_id, logical_family_key, version, method, components, thresholds, created_at) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8) RETURNING id, logical_family_key, version, method, components, thresholds, created_at",
      [value.id, ownerUserId, value.logicalFamilyKey, value.version, value.method, JSON.stringify(value.components), JSON.stringify(value.thresholds ?? null), value.createdAt],
    );
    return composite(result.rows[0]!);
  }

  async list(ownerUserId: string): Promise<CompositeStrategyDefinition[]> {
    const result = await this.pool.query<CompositeRow>(
      "SELECT id, logical_family_key, version, method, components, thresholds, created_at FROM composite_strategy_definitions WHERE user_id = $1 ORDER BY created_at ASC, id ASC",
      [ownerUserId],
    );
    return result.rows.map(composite);
  }

  async get(ownerUserId: string, id: string): Promise<CompositeStrategyDefinition | undefined> {
    const result = await this.pool.query<CompositeRow>(
      "SELECT id, logical_family_key, version, method, components, thresholds, created_at FROM composite_strategy_definitions WHERE user_id = $1 AND id = $2 LIMIT 1",
      [ownerUserId, id],
    );
    return result.rows[0] ? composite(result.rows[0]) : undefined;
  }

  async listByLogicalFamily(ownerUserId: string, logicalFamilyKey: string): Promise<CompositeStrategyDefinition[]> {
    const result = await this.pool.query<CompositeRow>(
      "SELECT id, logical_family_key, version, method, components, thresholds, created_at FROM composite_strategy_definitions WHERE user_id = $1 AND logical_family_key = $2 ORDER BY version ASC",
      [ownerUserId, logicalFamilyKey],
    );
    return result.rows.map(composite);
  }
}

export class PostgresStrategyGenerationRepository implements StrategyGenerationRepository {
  constructor(private readonly client: StrategySqlQueryClient) {}

  async insert(value: StrategyGenerationRequest): Promise<StrategyGenerationRequest> {
    const result = await this.client.query<GenerationRow>(
      `INSERT INTO strategy_generation_requests (${generationColumns}) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING ${generationColumns}`,
      [value.id, value.ownerUserId, value.sourceType, value.sourceText ?? null, value.sourceUrl ?? null, value.modelName, value.modelVersion, value.promptVersion, value.outputKind, value.strategyDefinitionId ?? null, value.compositeDefinitionId ?? null, value.createdAt],
    );
    if (!result.rows[0]) throw new Error("STRATEGY_GENERATION_PERSISTENCE_INTEGRITY_ERROR");
    return generation(result.rows[0]);
  }
}

export class PostgresStrategyGenerationUnitOfWork implements StrategyGenerationUnitOfWork {
  constructor(private readonly client: StrategySqlQueryClient) {}

  async commit(input: Parameters<StrategyGenerationUnitOfWork["commit"]>[0]): Promise<void> {
    if (!this.client.connect) throw new Error("STRATEGY_GENERATION_PERSISTENCE_UNAVAILABLE");
    const client = await this.client.connect();
    try {
      await client.query("BEGIN", []);
      for (const value of input.definitions) {
        await client.query(
          "INSERT INTO strategy_definitions (id, user_id, logical_family_key, family_name, strategy_name, implementation_version, implementation_sha256, version, parameters, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)",
          [value.id, input.ownerUserId, value.logicalFamilyKey, value.familyName ?? null, value.strategyName, value.implementationVersion, value.implementationSha256, value.version, JSON.stringify(value.parameters), value.createdAt],
        );
      }
      if (input.composite) {
        const value = input.composite;
        await client.query(
          "INSERT INTO composite_strategy_definitions (id, user_id, logical_family_key, version, method, components, thresholds, created_at) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8)",
          [value.id, input.ownerUserId, value.logicalFamilyKey, value.version, value.method, JSON.stringify(value.components), JSON.stringify(value.thresholds ?? null), value.createdAt],
        );
      }
      const audit = input.audit;
      await client.query(
        `INSERT INTO strategy_generation_requests (${generationColumns}) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [audit.id, audit.ownerUserId, audit.sourceType, audit.sourceText ?? null, audit.sourceUrl ?? null, audit.modelName, audit.modelVersion, audit.promptVersion, audit.outputKind, audit.strategyDefinitionId ?? null, audit.compositeDefinitionId ?? null, audit.createdAt],
      );
      await client.query("COMMIT", []);
    } catch (error) {
      try { await client.query("ROLLBACK", []); } catch { /* preserve original failure */ }
      throw error;
    } finally { client.release(); }
  }
}

export const createPostgresStrategyDependencies = (pool: StrategySqlQueryClient): StrategyModuleDependencies => ({
  artifactResolver: {
    resolve: async (strategyName, implementationSha256) => {
      const factory = builtInFactories.find((item) => item.descriptor.name === strategyName && item.descriptor.implementationSha256 === implementationSha256);
      if (!factory) throw new Error("STRATEGY_ARTIFACT_NOT_FOUND");
      return factory;
    },
  },
  definitionRepository: new PostgresStrategyDefinitionRepository(pool),
  compositeRepository: new PostgresCompositeDefinitionRepository(pool),
  generationUnitOfWork: new PostgresStrategyGenerationUnitOfWork(pool),
  modelName: process.env.STRATEGY_MODEL_NAME ?? "UNCONFIGURED",
  modelVersion: process.env.STRATEGY_MODEL_VERSION ?? "0",
  promptVersion: process.env.STRATEGY_PROMPT_VERSION ?? "1",
});
