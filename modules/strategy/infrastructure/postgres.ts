import type { AuthenticatedUserId } from "modules/auth/api";
import type {
  StrategyAuthoringDraftRecord,
  StrategyAuthoringOriginRecord,
} from "../application/authoring";
import type {
  CompositeDefinitionRecord,
  CompositeDefinitionRepository,
  StrategyDefinitionRecord,
  StrategyDefinitionRepository,
  StrategyAuthoringDraftRepository,
  StrategyParameterValue,
} from "../application/ports";
import { AUTHORING_PROFILE_ID } from "../application/authoring";

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
  readonly draftRepository: StrategyAuthoringDraftRepository<StrategyAuthoringDraftRecord>;
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

interface StrategyAuthoringDraftRow extends Record<string, unknown> {
  id: string;
  owner_user_id: string;
  profile_id: string;
  source_kind: string;
  source_news_item_id?: string | null;
  provider_id: string;
  model_id: string;
  status: string;
  structured_draft?: unknown;
  validation_result?: unknown;
  approved_definition_id?: string | null;
  created_at: string;
  updated_at: string;
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
const AUTHORING_DRAFT_RETURNING_COLUMNS = `
  id::text, owner_user_id::text, profile_id, source_kind,
  source_news_item_id::text, provider_id, model_id, status,
  structured_draft, validation_result, approved_definition_id::text,
  created_at::text, updated_at::text
`;

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

const AUTHORING_STATUS_VALUES = new Set<StrategyAuthoringDraftRecord["status"]>([
  "DRAFT",
  "VALIDATED",
  "REJECTED",
  "APPROVED",
]);
const AUTHORING_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/;
const AUTHORING_PARAMETER_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/;

function authoringIdentifier(value: unknown, field: string): string {
  const result = requiredText(value, field).trim();
  if (!AUTHORING_IDENTIFIER_PATTERN.test(result)) {
    throw new Error(`invalid strategy ${field} in persistence`);
  }
  return result;
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

function exactObjectKeys(value: JsonRecord, keys: readonly string[], error: string): void {
  const expected = [...keys].sort();
  const actual = Object.keys(value).sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new Error(error);
  }
}

function authoringOriginFromValue(value: unknown): Readonly<JsonRecord> | undefined {
  if (value === undefined || value === null) return undefined;
  const parsed = jsonObject(value, "authoring_origin");
  assertSafeProvenance(parsed);
  const error = "invalid strategy authoring provenance in persistence";
  let origin: StrategyAuthoringOriginRecord;
  if (parsed.kind === "MANUAL") {
    exactObjectKeys(parsed, ["kind"], error);
    origin = { kind: "MANUAL" };
  } else if (parsed.kind === "LLM_DRAFT") {
    exactObjectKeys(parsed, ["kind", "draftId", "providerId", "modelId"], error);
    origin = {
      kind: "LLM_DRAFT",
      draftId: authoringIdentifier(parsed.draftId, "authoring origin draftId"),
      providerId: authoringIdentifier(parsed.providerId, "authoring origin providerId"),
      modelId: authoringIdentifier(parsed.modelId, "authoring origin modelId"),
    };
  } else if (parsed.kind === "APPROVED_NEWS_ITEM") {
    if (Object.keys(parsed).some((key) => !["kind", "newsItemId", "extractionTemplateVersion"].includes(key))) {
      throw new Error(error);
    }
    if (!Object.prototype.hasOwnProperty.call(parsed, "kind") || !Object.prototype.hasOwnProperty.call(parsed, "newsItemId")) {
      throw new Error(error);
    }
    const extractionTemplateVersion = parsed.extractionTemplateVersion === undefined
      ? undefined
      : positiveInteger(parsed.extractionTemplateVersion, "authoring origin extractionTemplateVersion");
    origin = {
      kind: "APPROVED_NEWS_ITEM",
      newsItemId: requiredText(parsed.newsItemId, "authoring origin newsItemId").trim(),
      ...(extractionTemplateVersion === undefined ? {} : { extractionTemplateVersion }),
    };
  } else {
    throw new Error(error);
  }
  return deepFreeze(cloneJson(origin) as JsonRecord);
}

function authoringParametersFromValue(
  value: unknown,
): Readonly<Record<string, StrategyParameterValue>> {
  const parsed = jsonObject(value, "structured_draft");
  assertSafeProvenance(parsed);
  const parameters: Record<string, StrategyParameterValue> = {};
  for (const key of Object.keys(parsed).sort()) {
    if (!AUTHORING_PARAMETER_KEY_PATTERN.test(key)) {
      throw new Error("invalid strategy structured_draft in persistence");
    }
    const parameter = parsed[key];
    if (
      (typeof parameter !== "number" && typeof parameter !== "string")
      || (typeof parameter === "number" && !Number.isFinite(parameter))
      || (typeof parameter === "string" && !parameter.trim())
    ) {
      throw new Error("invalid strategy structured_draft in persistence");
    }
    parameters[key] = parameter;
  }
  return deepFreeze(parameters);
}

function validationResultFromValue(
  value: unknown,
): StrategyAuthoringDraftRecord["validation"] | undefined {
  if (value === undefined || value === null) return undefined;
  const parsed = jsonObject(value, "validation_result");
  assertSafeProvenance(parsed);
  exactObjectKeys(parsed, ["valid", "reasons", "validatedAt"], "invalid strategy validation_result in persistence");
  if (
    typeof parsed.valid !== "boolean"
    || !Array.isArray(parsed.reasons)
    || parsed.reasons.some((reason) => typeof reason !== "string" || !reason.trim())
  ) {
    throw new Error("invalid strategy validation_result in persistence");
  }
  return deepFreeze({
    valid: parsed.valid,
    reasons: Object.freeze(parsed.reasons.map((reason) => reason as string)),
    validatedAt: timestamp(parsed.validatedAt, "validation_result validatedAt"),
  });
}

function authoringSourcePayload(source: unknown): {
  kind: "PROMPT" | "APPROVED_NEWS_ITEM";
  newsItemId: string | null;
} {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new Error("invalid strategy draft source in persistence");
  }
  const record = source as JsonRecord;
  if (record.kind === "PROMPT") {
    exactObjectKeys(record, ["kind"], "invalid strategy draft source in persistence");
    return { kind: "PROMPT", newsItemId: null };
  }
  if (record.kind === "APPROVED_NEWS_ITEM") {
    exactObjectKeys(record, ["kind", "newsItemId"], "invalid strategy draft source in persistence");
    return {
      kind: "APPROVED_NEWS_ITEM",
      newsItemId: requiredText(record.newsItemId, "draft source newsItemId").trim(),
    };
  }
  throw new Error("invalid strategy draft source in persistence");
}

function authoringSourceFromRow(row: StrategyAuthoringDraftRow): StrategyAuthoringDraftRecord["source"] {
  const sourceKind = requiredText(row.source_kind, "source_kind");
  if (sourceKind === "PROMPT") {
    if (row.source_news_item_id !== undefined && row.source_news_item_id !== null) {
      throw new Error("invalid strategy source shape in persistence");
    }
    return { kind: "PROMPT" };
  }
  if (sourceKind === "APPROVED_NEWS_ITEM") {
    return {
      kind: "APPROVED_NEWS_ITEM",
      newsItemId: requiredText(row.source_news_item_id, "source_news_item_id"),
    };
  }
  throw new Error("invalid strategy source_kind in persistence");
}

function draftFromRow(row: StrategyAuthoringDraftRow): StrategyAuthoringDraftRecord {
  const status = requiredText(row.status, "status");
  if (!AUTHORING_STATUS_VALUES.has(status as StrategyAuthoringDraftRecord["status"])) {
    throw new Error("invalid strategy status in persistence");
  }
  const approvedDefinitionId = row.approved_definition_id === undefined || row.approved_definition_id === null
    ? undefined
    : requiredText(row.approved_definition_id, "approved_definition_id");
  if ((status === "APPROVED") !== (approvedDefinitionId !== undefined)) {
    throw new Error("invalid strategy approval shape in persistence");
  }
  const structuredDraft = row.structured_draft === undefined || row.structured_draft === null
    ? undefined
    : authoringParametersFromValue(row.structured_draft);
  const validation = validationResultFromValue(row.validation_result);
  return deepFreeze({
    id: requiredText(row.id, "id"),
    ownerUserId: requiredText(row.owner_user_id, "owner_user_id") as AuthenticatedUserId,
    profileId: AUTHORING_PROFILE_ID,
    source: authoringSourceFromRow(row),
    provider: {
      id: authoringIdentifier(row.provider_id, "provider_id"),
      modelId: authoringIdentifier(row.model_id, "model_id"),
      // The migration stores only successful authoring records; configuration is
      // deliberately never persisted as a credential or provider secret.
      configured: true,
    },
    status: status as StrategyAuthoringDraftRecord["status"],
    ...(structuredDraft === undefined ? {} : { structuredDraft }),
    ...(validation === undefined ? {} : { validation }),
    ...(approvedDefinitionId === undefined ? {} : { approvedDefinitionId }),
    createdAt: timestamp(row.created_at, "created_at"),
    updatedAt: timestamp(row.updated_at, "updated_at"),
  });
}

interface AuthoringDraftPersistencePayload {
  readonly sourceKind: "PROMPT" | "APPROVED_NEWS_ITEM";
  readonly sourceNewsItemId: string | null;
  readonly providerId: string;
  readonly modelId: string;
  readonly status: StrategyAuthoringDraftRecord["status"];
  readonly structuredDraft: Readonly<Record<string, StrategyParameterValue>> | null;
  readonly validationResult: StrategyAuthoringDraftRecord["validation"];
  readonly approvedDefinitionId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

function validateAuthoringDraftForPersistence(
  ownerUserId: AuthenticatedUserId,
  draft: StrategyAuthoringDraftRecord,
): AuthoringDraftPersistencePayload {
  ownerValue(ownerUserId);
  if (!draft || typeof draft !== "object" || draft.ownerUserId !== ownerUserId) {
    throw new Error("OWNER_MISMATCH");
  }
  requiredText(draft.id, "draft id");
  if (draft.profileId !== AUTHORING_PROFILE_ID) throw new Error("INVALID_AUTHORING_PROFILE");
  const source = authoringSourcePayload(draft.source);
  if (!draft.provider || typeof draft.provider !== "object") throw new Error("INVALID_PROVIDER");
  if (draft.provider.configured !== true) throw new Error("INVALID_PROVIDER_CONFIGURATION");
  const providerId = authoringIdentifier(draft.provider.id, "provider_id");
  const modelId = authoringIdentifier(draft.provider.modelId, "model_id");
  const status = draft.status;
  if (!AUTHORING_STATUS_VALUES.has(status)) throw new Error("invalid strategy status in persistence");
  const structuredDraft = draft.structuredDraft === undefined
    ? null
    : authoringParametersFromValue(draft.structuredDraft);
  const validationResult = validationResultFromValue(draft.validation);
  const approvedDefinitionId = draft.approvedDefinitionId === undefined
    ? null
    : requiredText(draft.approvedDefinitionId, "approved_definition_id");
  if ((status === "APPROVED") !== (approvedDefinitionId !== null)) {
    throw new Error("invalid strategy approval shape in persistence");
  }
  return {
    sourceKind: source.kind,
    sourceNewsItemId: source.newsItemId,
    providerId,
    modelId,
    status,
    structuredDraft,
    validationResult,
    approvedDefinitionId,
    createdAt: timestamp(draft.createdAt, "created_at"),
    updatedAt: timestamp(draft.updatedAt, "updated_at"),
  };
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
    try {
      authoringOriginFromValue(origin);
    } catch {
      throw new Error("INVALID_AUTHORING_ORIGIN");
    }
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

  const draftRepository: StrategyAuthoringDraftRepository<StrategyAuthoringDraftRecord> = {
    insert: async (ownerUserId, draft): Promise<StrategyAuthoringDraftRecord> => {
      const owner = ownerValue(ownerUserId);
      const payload = validateAuthoringDraftForPersistence(ownerUserId, draft);
      const result = await pool.query<StrategyAuthoringDraftRow>(
        `
          INSERT INTO strategy_authoring_drafts
            (id, owner_user_id, profile_id, source_kind, source_news_item_id,
             provider_id, model_id, status, structured_draft, validation_result,
             approved_definition_id, created_at, updated_at)
          VALUES ($1::uuid, $2::uuid, $3, $4, $5::uuid,
                  $6, $7, $8, $9::jsonb, $10::jsonb,
                  $11::uuid, $12::timestamptz, $13::timestamptz)
          RETURNING ${AUTHORING_DRAFT_RETURNING_COLUMNS}
        `,
        [
          draft.id,
          owner,
          AUTHORING_PROFILE_ID,
          payload.sourceKind,
          payload.sourceNewsItemId,
          payload.providerId,
          payload.modelId,
          payload.status,
          payload.structuredDraft === null ? null : JSON.stringify(payload.structuredDraft),
          payload.validationResult === undefined ? null : JSON.stringify(payload.validationResult),
          payload.approvedDefinitionId,
          payload.createdAt,
          payload.updatedAt,
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error("strategy authoring draft insert returned no row");
      return draftFromRow(row);
    },

    getByOwnerAndId: async (ownerUserId, draftId): Promise<StrategyAuthoringDraftRecord | undefined> => {
      const result = await pool.query<StrategyAuthoringDraftRow>(
        `
          SELECT ${AUTHORING_DRAFT_RETURNING_COLUMNS}
          FROM strategy_authoring_drafts
          WHERE owner_user_id = $1::uuid AND id = $2::uuid
          LIMIT 1
        `,
        [ownerValue(ownerUserId), draftId],
      );
      return result.rows[0] ? draftFromRow(result.rows[0]) : undefined;
    },

    save: async (ownerUserId, draft): Promise<StrategyAuthoringDraftRecord> => {
      const owner = ownerValue(ownerUserId);
      const payload = validateAuthoringDraftForPersistence(ownerUserId, draft);
      const result = await pool.query<StrategyAuthoringDraftRow>(
        `
          UPDATE strategy_authoring_drafts
          SET status = $3,
              structured_draft = $4::jsonb,
              validation_result = $5::jsonb,
              approved_definition_id = $6::uuid,
              updated_at = $7::timestamptz
          WHERE owner_user_id = $1::uuid AND id = $2::uuid
          RETURNING ${AUTHORING_DRAFT_RETURNING_COLUMNS}
        `,
        [
          owner,
          draft.id,
          payload.status,
          payload.structuredDraft === null ? null : JSON.stringify(payload.structuredDraft),
          payload.validationResult === undefined ? null : JSON.stringify(payload.validationResult),
          payload.approvedDefinitionId,
          payload.updatedAt,
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error("DRAFT_NOT_FOUND");
      return draftFromRow(row);
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
    draftRepository,
    close: async () => {
      if (closed) return;
      closed = true;
      await pool.end();
    },
  };
}
