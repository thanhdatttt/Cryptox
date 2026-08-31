import type { AuthenticatedUserId } from "modules/auth/api";
import type {
  CompositeDefinitionRecord,
  CompositeDefinitionRepository,
  StrategyDefinitionRecord,
  StrategyDefinitionRepository,
} from "../application/ports";

export interface PostgresQueryResult<Row extends Record<string, unknown> = Record<string, unknown>> {
  readonly rows: Row[];
  readonly rowCount?: number | null;
}

export interface PostgresPool {
  query<Row extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: unknown[],
  ): Promise<PostgresQueryResult<Row>>;
  end(): Promise<void>;
}

export interface PostgresStrategyOptions {
  readonly connectionString: string;
  readonly pool?: PostgresPool;
  readonly maxConnections?: number;
}

export interface PostgresStrategyDependencies {
  readonly pool: PostgresPool;
  readonly definitionRepository: StrategyDefinitionRepository<StrategyDefinitionRecord>;
  readonly compositeRepository: CompositeDefinitionRepository<CompositeDefinitionRecord>;
  close(): Promise<void>;
}

type JsonRecord = Record<string, unknown>;
type PersistedStrategyDefinition = StrategyDefinitionRecord & {
  readonly authoringOrigin?: Readonly<JsonRecord>;
};

interface StrategyDefinitionRow extends Record<string, unknown> {
  id: string;
  owner_user_id: string;
  logical_family_key: string;
  strategy_name: string;
  implementation_version: string;
  behavior_profile_id: string;
  version: number | string;
  parameters: unknown;
  authoring_origin?: unknown;
  created_at: string;
}

interface CompositeDefinitionRow extends Record<string, unknown> {
  id: string;
  owner_user_id: string;
  logical_family_key: string;
  version: number | string;
  method: string;
  combination_profile_id: string;
  weighted_buy_threshold: number | string | null;
  weighted_sell_threshold: number | string | null;
  created_at: string;
  components?: unknown;
}

interface CompositeComponentRow extends Record<string, unknown> {
  composite_definition_id: string;
  component_position: number | string;
  strategy_definition_id: string;
  strategy_definition_version: number | string;
  enabled: boolean;
  weight: number | string;
}

const STRATEGY_VERSION_CONSTRAINT = "strategy_definitions_family_version_unique";
const COMPOSITE_VERSION_CONSTRAINT = "composite_strategy_definitions_family_version_unique";
const VERSION_INSERT_RETRIES = 8;

function poolFromOptions(options: PostgresStrategyOptions): PostgresPool {
  if (options.pool) return options.pool;
  const { Pool } = require("pg") as {
    Pool: new (config: { connectionString: string; max: number; application_name: string }) => PostgresPool;
  };
  return new Pool({
    connectionString: options.connectionString,
    max: options.maxConnections ?? 5,
    application_name: "cryptox-strategy",
  });
}

function requiredText(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`invalid strategy ${field} in persistence`);
  }
  return value;
}

function positiveInteger(value: unknown, field: string): number {
  const result = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isSafeInteger(result) || result < 1) {
    throw new Error(`invalid strategy ${field} in persistence`);
  }
  return result;
}

function finiteNumber(value: unknown, field: string): number {
  const result = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(result)) throw new Error(`invalid strategy ${field} in persistence`);
  return result;
}

function timestamp(value: unknown, field: string): string {
  const parsed = Date.parse(String(value));
  if (!Number.isFinite(parsed)) throw new Error(`invalid strategy ${field} in persistence`);
  return new Date(parsed).toISOString();
}

function parseJson(value: unknown, field: string): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new Error(`invalid strategy ${field} in persistence`);
  }
}

function cloneJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(cloneJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as JsonRecord).map(([key, nested]) => [key, cloneJson(nested)]),
    );
  }
  return value;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value as JsonRecord)) deepFreeze(nested);
    Object.freeze(value);
  }
  return value;
}

function jsonObject(value: unknown, field: string): JsonRecord {
  const parsed = parseJson(value, field);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`invalid strategy ${field} in persistence`);
  }
  return parsed as JsonRecord;
}

function parametersFromValue(value: unknown): Readonly<Record<string, number | string>> {
  const parsed = jsonObject(value, "parameters");
  const parameters: Record<string, number | string> = {};
  for (const key of Object.keys(parsed).sort()) {
    const parameter = parsed[key];
    if (
      (typeof parameter !== "number" && typeof parameter !== "string")
      || (typeof parameter === "number" && !Number.isFinite(parameter))
    ) {
      throw new Error("invalid strategy parameters in persistence");
    }
    parameters[key] = parameter;
  }
  return Object.freeze(parameters);
}

const FORBIDDEN_PROVENANCE_KEYS = new Set([
  "apikey",
  "api_key",
  "credential",
  "token",
  "password",
  "prompt",
  "completion",
]);

function assertSafeProvenance(value: unknown): void {
  if (Array.isArray(value)) {
    for (const nested of value) assertSafeProvenance(nested);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, nested] of Object.entries(value as JsonRecord)) {
    if (FORBIDDEN_PROVENANCE_KEYS.has(key.toLowerCase())) {
      throw new Error("invalid strategy authoring provenance in persistence");
    }
    assertSafeProvenance(nested);
  }
}

function authoringOriginFromValue(value: unknown): Readonly<JsonRecord> | undefined {
  if (value === undefined || value === null) return undefined;
  const parsed = jsonObject(value, "authoring_origin");
  assertSafeProvenance(parsed);
  return deepFreeze(cloneJson(parsed) as JsonRecord);
}

function definitionFromRow(row: StrategyDefinitionRow): PersistedStrategyDefinition {
  const authoringOrigin = authoringOriginFromValue(row.authoring_origin);
  return deepFreeze({
    id: requiredText(row.id, "id"),
    ownerUserId: requiredText(row.owner_user_id, "owner_user_id") as AuthenticatedUserId,
    logicalFamilyKey: requiredText(row.logical_family_key, "logical_family_key"),
    strategyName: requiredText(row.strategy_name, "strategy_name"),
    implementationVersion: requiredText(row.implementation_version, "implementation_version"),
    behaviorProfileId: requiredText(row.behavior_profile_id, "behavior_profile_id"),
    version: positiveInteger(row.version, "version"),
    parameters: parametersFromValue(row.parameters),
    ...(authoringOrigin === undefined ? {} : { authoringOrigin }),
    createdAt: timestamp(row.created_at, "created_at"),
  });
}

function componentFromRow(row: CompositeComponentRow): CompositeDefinitionRecord["components"][number] {
  const component = {
    strategyDefinitionId: requiredText(row.strategy_definition_id, "component strategy_definition_id"),
    strategyDefinitionVersion: positiveInteger(
      row.strategy_definition_version,
      "component strategy_definition_version",
    ),
  };
  return Object.freeze(component);
}

function componentFromJson(value: unknown): CompositeDefinitionRecord["components"][number] {
  const parsed = jsonObject(value, "components");
  const id = parsed.strategyDefinitionId ?? parsed.strategy_definition_id;
  const version = parsed.strategyDefinitionVersion ?? parsed.strategy_definition_version;
  const component = {
    strategyDefinitionId: requiredText(id, "component strategy_definition_id"),
    strategyDefinitionVersion: positiveInteger(version, "component strategy_definition_version"),
  };
  return Object.freeze(component);
}

function componentsFromJson(value: unknown): readonly CompositeDefinitionRecord["components"][number][] {
  const parsed = parseJson(value, "components");
  if (!Array.isArray(parsed)) throw new Error("invalid strategy components in persistence");
  return Object.freeze(parsed.map(componentFromJson));
}

function compositeMethod(value: unknown): CompositeDefinitionRecord["method"] {
  if (value === "MAJORITY_VOTE") return value;
  throw new Error("invalid strategy composite method in persistence");
}

function compositeFromRow(
  row: CompositeDefinitionRow,
  components: readonly CompositeDefinitionRecord["components"][number][],
): CompositeDefinitionRecord {
  const method = compositeMethod(row.method);
  if (row.combination_profile_id !== "MAJORITY_VOTE_V1") {
    throw new Error("invalid strategy composite profile in persistence");
  }
  const base = {
    id: requiredText(row.id, "id"),
    ownerUserId: requiredText(row.owner_user_id, "owner_user_id") as AuthenticatedUserId,
    logicalFamilyKey: requiredText(row.logical_family_key, "logical_family_key"),
    version: positiveInteger(row.version, "version"),
    method,
    combinationProfileId: "MAJORITY_VOTE_V1" as const,
    components: Object.freeze([...components]),
    createdAt: timestamp(row.created_at, "created_at"),
  };
  if (row.weighted_buy_threshold !== null || row.weighted_sell_threshold !== null) {
    throw new Error("invalid strategy weighted thresholds in persistence");
  }
  return deepFreeze({
    ...base,
    components: Object.freeze(
      components.map((component) => Object.freeze({
        strategyDefinitionId: component.strategyDefinitionId,
        strategyDefinitionVersion: component.strategyDefinitionVersion,
      })),
    ),
  });
}

function pageLimit(page: { limit: number; cursor?: string }): number {
  if (!page || !Number.isSafeInteger(page.limit) || page.limit < 1 || page.limit > 100) {
    throw new Error("INVALID_PAGE");
  }
  return page.limit;
}

function ownerValue(ownerUserId: AuthenticatedUserId): string {
  if (typeof ownerUserId !== "string" || !ownerUserId.trim()) throw new Error("OWNER_REQUIRED");
  return ownerUserId;
}

function familyValue(logicalFamilyKey: string): string {
  if (typeof logicalFamilyKey !== "string" || !logicalFamilyKey.trim()) {
    throw new Error("INVALID_LOGICAL_FAMILY_KEY");
  }
  return logicalFamilyKey;
}

function versionConflict(error: unknown, constraint: string): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; constraint?: unknown; message?: unknown };
  if (candidate.code !== "23505") return false;
  if (candidate.constraint === constraint) return true;
  return typeof candidate.constraint !== "string"
    && typeof candidate.message === "string"
    && candidate.message.includes(constraint);
}

async function withVersionRetry<T>(constraint: string, operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!versionConflict(error, constraint) || attempt >= VERSION_INSERT_RETRIES) throw error;
    }
  }
}

function validateDefinitionForInsert(
  ownerUserId: AuthenticatedUserId,
  definition: StrategyDefinitionRecord,
): void {
  ownerValue(ownerUserId);
  if (definition.ownerUserId !== ownerUserId) throw new Error("OWNER_MISMATCH");
  requiredText(definition.id, "id");
  familyValue(definition.logicalFamilyKey);
  requiredText(definition.strategyName, "strategy_name");
  requiredText(definition.implementationVersion, "implementation_version");
  requiredText(definition.behaviorProfileId, "behavior_profile_id");
  positiveInteger(definition.version, "version");
  parametersFromValue(definition.parameters);
  const origin = (definition as PersistedStrategyDefinition).authoringOrigin;
  if (origin !== undefined) {
    if (!origin || typeof origin !== "object" || Array.isArray(origin)) {
      throw new Error("INVALID_AUTHORING_ORIGIN");
    }
    assertSafeProvenance(origin);
  }
}

function validateCompositeForInsert(
  ownerUserId: AuthenticatedUserId,
  definition: CompositeDefinitionRecord,
): void {
  ownerValue(ownerUserId);
  if (definition.ownerUserId !== ownerUserId) throw new Error("OWNER_MISMATCH");
  requiredText(definition.id, "id");
  familyValue(definition.logicalFamilyKey);
  positiveInteger(definition.version, "version");
  if (definition.method !== "MAJORITY_VOTE" || definition.combinationProfileId !== "MAJORITY_VOTE_V1") {
    throw new Error("INVALID_COMPOSITE_PROFILE");
  }
  if (!Array.isArray(definition.components) || definition.components.length < 1) {
    throw new Error("INVALID_COMPOSITE_COMPONENTS");
  }
  const references = new Set<string>();
  for (const component of definition.components) {
    requiredText(component.strategyDefinitionId, "component strategy_definition_id");
    positiveInteger(component.strategyDefinitionVersion, "component strategy_definition_version");
    const reference = `${component.strategyDefinitionId}\u0000${component.strategyDefinitionVersion}`;
    if (references.has(reference)) throw new Error("INVALID_COMPOSITE_COMPONENTS");
    references.add(reference);
    if (component.enabled !== undefined && typeof component.enabled !== "boolean") {
      throw new Error("INVALID_COMPOSITE_COMPONENTS");
    }
    if (component.weight !== undefined && (!Number.isFinite(component.weight) || component.weight < 0)) {
      throw new Error("INVALID_COMPOSITE_COMPONENTS");
    }
  }
  if (definition.weightedVote !== undefined) throw new Error("INVALID_COMPOSITE_PROFILE");
}

function componentPayload(
  components: readonly CompositeDefinitionRecord["components"][number][],
): string {
  return JSON.stringify(
    components.map((component, componentPosition) => ({
      componentPosition,
      strategyDefinitionId: component.strategyDefinitionId,
      strategyDefinitionVersion: component.strategyDefinitionVersion,
      enabled: component.enabled ?? true,
      weight: component.weight ?? 1,
    })),
  );
}

export function createPostgresStrategyDependencies(
  options: PostgresStrategyOptions,
): PostgresStrategyDependencies {
  if (!options.connectionString.trim() && !options.pool) {
    throw new Error("Strategy PostgreSQL connection string is required");
  }
  const pool = poolFromOptions(options);
  let closed = false;

  const definitionRepository: StrategyDefinitionRepository<StrategyDefinitionRecord> = {
    allocateNextVersion: async (ownerUserId, logicalFamilyKey): Promise<number> => {
      const owner = ownerValue(ownerUserId);
      const family = familyValue(logicalFamilyKey);
      const result = await pool.query<{ next_version: number | string }>(
        `
          SELECT COALESCE(MAX(version), 0) + 1 AS next_version
          FROM strategy_definitions
          WHERE owner_user_id = $1::uuid AND logical_family_key = $2
        `,
        [owner, family],
      );
      const row = result.rows[0];
      if (!row) throw new Error("strategy version allocation returned no row");
      return positiveInteger(row.next_version, "next_version");
    },

    insert: async (ownerUserId, definition): Promise<StrategyDefinitionRecord> => {
      validateDefinitionForInsert(ownerUserId, definition);
      const owner = ownerValue(ownerUserId);
      const family = familyValue(definition.logicalFamilyKey);
      const persistedOrigin = (definition as PersistedStrategyDefinition).authoringOrigin;
      return withVersionRetry(STRATEGY_VERSION_CONSTRAINT, async () => {
        const result = await pool.query<StrategyDefinitionRow>(
          `
            WITH next_version AS (
              SELECT COALESCE(MAX(version), 0) + 1 AS version
              FROM strategy_definitions
              WHERE owner_user_id = $2::uuid AND logical_family_key = $3
            )
            INSERT INTO strategy_definitions
              (id, owner_user_id, logical_family_key, strategy_name,
               implementation_version, behavior_profile_id, version, parameters,
               authoring_origin, created_at)
            SELECT $1::uuid, $2::uuid, $3, $4, $5, $6, next_version.version,
              $7::jsonb, $8::jsonb, $9::timestamptz
            FROM next_version
            RETURNING id::text, owner_user_id::text, logical_family_key,
              strategy_name, implementation_version, behavior_profile_id, version,
              parameters, authoring_origin, created_at::text
          `,
          [
            definition.id,
            owner,
            family,
            definition.strategyName,
            definition.implementationVersion,
            definition.behaviorProfileId,
            JSON.stringify(definition.parameters),
            persistedOrigin === undefined ? null : JSON.stringify(persistedOrigin),
            definition.createdAt,
          ],
        );
        const row = result.rows[0];
        if (!row) throw new Error("strategy definition insert returned no row");
        return definitionFromRow(row);
      });
    },

    getByOwnerAndId: async (ownerUserId, id): Promise<StrategyDefinitionRecord | undefined> => {
      const result = await pool.query<StrategyDefinitionRow>(
        `
          SELECT id::text, owner_user_id::text, logical_family_key, strategy_name,
            implementation_version, behavior_profile_id, version, parameters,
            authoring_origin, created_at::text
          FROM strategy_definitions
          WHERE owner_user_id = $1::uuid AND id::text = $2
          LIMIT 1
        `,
        [ownerValue(ownerUserId), id],
      );
      return result.rows[0] ? definitionFromRow(result.rows[0]) : undefined;
    },

    listByOwner: async (ownerUserId, page): Promise<{ items: readonly StrategyDefinitionRecord[]; nextCursor?: string }> => {
      const limit = pageLimit(page);
      const result = await pool.query<StrategyDefinitionRow>(
        `
          WITH cursor_row AS (
            SELECT id, created_at
            FROM strategy_definitions
            WHERE owner_user_id = $1::uuid AND id::text = $2
          )
          SELECT d.id::text, d.owner_user_id::text, d.logical_family_key, d.strategy_name,
            d.implementation_version, d.behavior_profile_id, d.version, d.parameters,
            d.authoring_origin, d.created_at::text
          FROM strategy_definitions d
          WHERE d.owner_user_id = $1::uuid
            AND (
              $2 IS NULL
              OR NOT EXISTS (SELECT 1 FROM cursor_row)
              OR EXISTS (
                SELECT 1
                FROM cursor_row c
                WHERE d.created_at > c.created_at
                  OR (d.created_at = c.created_at AND d.id > c.id)
              )
            )
          ORDER BY d.created_at ASC, d.id ASC
          LIMIT $3
        `,
        [ownerValue(ownerUserId), page.cursor ?? null, limit + 1],
      );
      const hasMore = result.rows.length > limit;
      const rows = hasMore ? result.rows.slice(0, limit) : result.rows;
      return {
        items: Object.freeze(rows.map(definitionFromRow)),
        ...(hasMore && rows.at(-1) ? { nextCursor: rows.at(-1)!.id } : {}),
      };
    },
  };

  const readCompositeComponents = async (
    ids: readonly string[],
  ): Promise<ReadonlyMap<string, readonly CompositeDefinitionRecord["components"][number][]>> => {
    if (ids.length === 0) return new Map();
    const result = await pool.query<CompositeComponentRow>(
      `
        SELECT composite_definition_id::text, component_position,
          strategy_definition_id::text, strategy_definition_version, enabled, weight
        FROM composite_components
        WHERE composite_definition_id = ANY($1::uuid[])
        ORDER BY composite_definition_id, component_position ASC
      `,
      [ids],
    );
    const grouped = new Map<string, Array<CompositeDefinitionRecord["components"][number]>>();
    for (const row of result.rows) {
      const id = requiredText(row.composite_definition_id, "composite_definition_id");
      const components = grouped.get(id) ?? [];
      components.push(componentFromRow(row));
      grouped.set(id, components);
    }
    return new Map([...grouped.entries()].map(([id, components]) => [id, Object.freeze(components)]));
  };

  const compositeRepository: CompositeDefinitionRepository<CompositeDefinitionRecord> = {
    allocateNextVersion: async (ownerUserId, logicalFamilyKey): Promise<number> => {
      const result = await pool.query<{ next_version: number | string }>(
        `
          SELECT COALESCE(MAX(version), 0) + 1 AS next_version
          FROM composite_strategy_definitions
          WHERE owner_user_id = $1::uuid AND logical_family_key = $2
        `,
        [ownerValue(ownerUserId), familyValue(logicalFamilyKey)],
      );
      const row = result.rows[0];
      if (!row) throw new Error("composite version allocation returned no row");
      return positiveInteger(row.next_version, "next_version");
    },

    insert: async (ownerUserId, definition): Promise<CompositeDefinitionRecord> => {
      validateCompositeForInsert(ownerUserId, definition);
      const owner = ownerValue(ownerUserId);
      const family = familyValue(definition.logicalFamilyKey);
      return withVersionRetry(COMPOSITE_VERSION_CONSTRAINT, async () => {
        const result = await pool.query<CompositeDefinitionRow>(
          `
            WITH input_components AS (
              SELECT "componentPosition" AS component_position,
                "strategyDefinitionId" AS strategy_definition_id,
                "strategyDefinitionVersion" AS strategy_definition_version,
                enabled, weight
              FROM jsonb_to_recordset($9::jsonb) AS input(
                "componentPosition" integer,
                "strategyDefinitionId" uuid,
                "strategyDefinitionVersion" integer,
                enabled boolean,
                weight numeric
              )
            ), valid_components AS (
              SELECT input.*
              FROM input_components input
              INNER JOIN strategy_definitions strategy
                ON strategy.id = input.strategy_definition_id
                AND strategy.version = input.strategy_definition_version
                AND strategy.owner_user_id = $2::uuid
            ), next_version AS (
              SELECT COALESCE(MAX(version), 0) + 1 AS version
              FROM composite_strategy_definitions
              WHERE owner_user_id = $2::uuid AND logical_family_key = $3
            ), inserted AS (
              INSERT INTO composite_strategy_definitions
                (id, owner_user_id, logical_family_key, version, method,
                 combination_profile_id, weighted_buy_threshold,
                 weighted_sell_threshold, created_at)
              SELECT $1::uuid, $2::uuid, $3, next_version.version, $4, $5,
                $6::numeric, $7::numeric, $8::timestamptz
              FROM next_version
              WHERE (SELECT COUNT(*) FROM input_components) > 0
                AND (SELECT COUNT(*) FROM valid_components) =
                  (SELECT COUNT(*) FROM input_components)
              RETURNING id, owner_user_id, logical_family_key, version, method,
                combination_profile_id, weighted_buy_threshold,
                weighted_sell_threshold, created_at
            ), inserted_components AS (
              INSERT INTO composite_components
                (composite_definition_id, component_position,
                 strategy_definition_id, strategy_definition_version, enabled, weight)
              SELECT inserted.id, valid_components.component_position,
                valid_components.strategy_definition_id,
                valid_components.strategy_definition_version,
                valid_components.enabled, valid_components.weight
              FROM inserted
              CROSS JOIN valid_components
              RETURNING composite_definition_id, component_position,
                strategy_definition_id, strategy_definition_version, enabled, weight
            )
            SELECT inserted.id::text, inserted.owner_user_id::text,
              inserted.logical_family_key, inserted.version, inserted.method,
              inserted.combination_profile_id, inserted.weighted_buy_threshold,
              inserted.weighted_sell_threshold, inserted.created_at::text,
              COALESCE(
                (
                  SELECT jsonb_agg(
                    jsonb_build_object(
                      'strategyDefinitionId', components.strategy_definition_id::text,
                      'strategyDefinitionVersion', components.strategy_definition_version,
                      'enabled', components.enabled,
                      'weight', components.weight
                    ) ORDER BY components.component_position
                  )
                  FROM inserted_components components
                  WHERE components.composite_definition_id = inserted.id
                ),
                '[]'::jsonb
              ) AS components
            FROM inserted
          `,
          [
            definition.id,
            owner,
            family,
            definition.method,
            definition.combinationProfileId,
            null,
            null,
            definition.createdAt,
            componentPayload(definition.components),
          ],
        );
        const row = result.rows[0];
        if (!row) throw new Error("NOT_FOUND");
        const components = componentsFromJson(row.components);
        return compositeFromRow(row, components);
      });
    },

    getByOwnerAndId: async (ownerUserId, id): Promise<CompositeDefinitionRecord | undefined> => {
      const parentResult = await pool.query<CompositeDefinitionRow>(
        `
          SELECT id::text, owner_user_id::text, logical_family_key, version, method,
            combination_profile_id, weighted_buy_threshold, weighted_sell_threshold,
            created_at::text
          FROM composite_strategy_definitions
          WHERE owner_user_id = $1::uuid AND id::text = $2
          LIMIT 1
        `,
        [ownerValue(ownerUserId), id],
      );
      const row = parentResult.rows[0];
      if (!row) return undefined;
      const components = await readCompositeComponents([row.id]);
      return compositeFromRow(row, components.get(row.id) ?? []);
    },

    listByOwner: async (ownerUserId, page): Promise<{ items: readonly CompositeDefinitionRecord[]; nextCursor?: string }> => {
      const limit = pageLimit(page);
      const parentResult = await pool.query<CompositeDefinitionRow>(
        `
          WITH cursor_row AS (
            SELECT id, created_at
            FROM composite_strategy_definitions
            WHERE owner_user_id = $1::uuid AND id::text = $2
          )
          SELECT d.id::text, d.owner_user_id::text, d.logical_family_key, d.version,
            d.method, d.combination_profile_id, d.weighted_buy_threshold,
            d.weighted_sell_threshold, d.created_at::text
          FROM composite_strategy_definitions d
          WHERE d.owner_user_id = $1::uuid
            AND (
              $2 IS NULL
              OR NOT EXISTS (SELECT 1 FROM cursor_row)
              OR EXISTS (
                SELECT 1
                FROM cursor_row c
                WHERE d.created_at > c.created_at
                  OR (d.created_at = c.created_at AND d.id > c.id)
              )
            )
          ORDER BY d.created_at ASC, d.id ASC
          LIMIT $3
        `,
        [ownerValue(ownerUserId), page.cursor ?? null, limit + 1],
      );
      const hasMore = parentResult.rows.length > limit;
      const rows = hasMore ? parentResult.rows.slice(0, limit) : parentResult.rows;
      const components = await readCompositeComponents(rows.map((row) => row.id));
      return {
        items: Object.freeze(rows.map((row) => compositeFromRow(row, components.get(row.id) ?? []))),
        ...(hasMore && rows.at(-1) ? { nextCursor: rows.at(-1)!.id } : {}),
      };
    },
  };

  return {
    pool,
    definitionRepository,
    compositeRepository,
    close: async () => {
      if (closed) return;
      closed = true;
      await pool.end();
    },
  };
}
