import type { CompositeStrategyDefinition, StrategyDefinition } from "../domain/contracts";
import { builtInFactories } from "../domain/plugins";
import type { CompositeDefinitionRepository, StrategyDefinitionRepository } from "../application/ports";
import type { StrategyModuleDependencies } from "../application/service";

export interface StrategySqlQueryClient { query<Row>(text: string, values: unknown[]): Promise<{ rows: Row[] }>; }

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

const object = <T>(value: T | string): T => typeof value === "string" ? JSON.parse(value) as T : value;
const definition = (row: DefinitionRow): StrategyDefinition => ({ id: row.id, logicalFamilyKey: row.logical_family_key, familyName: row.family_name ?? undefined, strategyName: row.strategy_name, implementationVersion: row.implementation_version, implementationSha256: row.implementation_sha256, version: row.version, parameters: object<Record<string, number | string>>(row.parameters), createdAt: new Date(row.created_at).toISOString() });
const composite = (row: CompositeRow): CompositeStrategyDefinition => ({ id: row.id, logicalFamilyKey: row.logical_family_key, version: row.version, method: row.method, components: object<CompositeStrategyDefinition["components"]>(row.components), thresholds: row.thresholds === null ? undefined : object<NonNullable<CompositeStrategyDefinition["thresholds"]>>(row.thresholds), createdAt: new Date(row.created_at).toISOString() });

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
});
