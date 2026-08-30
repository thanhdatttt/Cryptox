import type { AuthenticatedUserId } from "modules/auth/api";
import type {
  SearchCandidateTemplate,
  SearchRunStatus,
  SearchSpaceConfig,
  SeededDiscoveryProvenance,
  StopCondition,
} from "../api/contracts";
import type { SearchRunRepository } from "../application/ports";

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

export interface PostgresSearchRunOptions {
  readonly connectionString: string;
  readonly pool?: PostgresPool;
  readonly maxConnections?: number;
}

interface SearchRunRow extends Record<string, unknown> {
  id: string;
  owner_user_id: string;
  generator_type: SearchRunStatus["generatorType"];
  random_seed: string;
  search_space: unknown;
  stop_condition: unknown;
  leaderboard_scope_id: string;
  max_in_flight: number | string;
  state: SearchRunStatus["state"];
  submitted_candidate_count: number | string;
  completed_candidate_count: number | string;
  failed_candidate_count: number | string;
  created_at: string | Date;
  started_at: string | Date | null;
  updated_at: string | Date;
  ended_at: string | Date | null;
  stop_reason: SearchRunStatus["stopReason"] | null;
  last_error: string | null;
}

interface SearchRunStorageMetadata {
  readonly version: 1;
  readonly candidateTemplate: SearchCandidateTemplate;
  readonly activeCandidateIds: readonly string[];
  readonly averageBacktestDurationMs: number | null;
  readonly seededDiscovery?: SeededDiscoveryProvenance;
}

type StoredSearchSpace = SearchSpaceConfig & {
  readonly __cryptoxSearchRun?: SearchRunStorageMetadata;
};

const STORAGE_METADATA_KEY = "__cryptoxSearchRun";

function parseJson(value: unknown, field: string): Record<string, unknown> {
  const parsed = typeof value === "string" ? JSON.parse(value) as unknown : value;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`invalid SearchRun ${field} in persistence`);
  }
  return parsed as Record<string, unknown>;
}

function integerColumn(value: unknown, field: string): number {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isInteger(number)) throw new Error(`invalid SearchRun ${field} in persistence`);
  return number;
}

function timestampColumn(value: unknown, field: string): string {
  const timestamp = Date.parse(String(value));
  if (!Number.isFinite(timestamp)) throw new Error(`invalid SearchRun ${field} in persistence`);
  return new Date(timestamp).toISOString();
}

function optionalTimestampColumn(value: unknown, field: string): string | undefined {
  return value === null || value === undefined ? undefined : timestampColumn(value, field);
}

function cloneTemplate(template: SearchCandidateTemplate): SearchCandidateTemplate {
  return structuredClone(template);
}

function storageMetadata(status: SearchRunStatus): SearchRunStorageMetadata {
  return {
    version: 1,
    candidateTemplate: cloneTemplate(status.candidateTemplate),
    activeCandidateIds: [...status.activeCandidateIds],
    averageBacktestDurationMs: status.averageBacktestDurationMs,
    ...(status.seededDiscovery
      ? { seededDiscovery: structuredClone(status.seededDiscovery) }
      : {}),
  };
}

function searchSpaceForStorage(status: SearchRunStatus): StoredSearchSpace {
  return {
    ...structuredClone(status.searchSpace),
    [STORAGE_METADATA_KEY]: storageMetadata(status),
  };
}

function searchSpaceFromStorage(value: unknown): {
  searchSpace: SearchSpaceConfig;
  candidateTemplate: SearchCandidateTemplate;
  activeCandidateIds: readonly string[];
  averageBacktestDurationMs: number | null;
  seededDiscovery?: SeededDiscoveryProvenance;
} {
  const stored = parseJson(value, "search_space") as unknown as StoredSearchSpace;
  const metadata = stored[STORAGE_METADATA_KEY];
  if (!metadata || metadata.version !== 1 || !metadata.candidateTemplate) {
    throw new Error("invalid SearchRun candidate template in persistence");
  }

  const {
    [STORAGE_METADATA_KEY]: _metadata,
    ...searchSpace
  } = stored;
  const activeCandidateIds = Array.isArray(metadata.activeCandidateIds)
    ? metadata.activeCandidateIds.filter((id): id is string => typeof id === "string")
    : [];
  const averageBacktestDurationMs = metadata.averageBacktestDurationMs;
  if (
    averageBacktestDurationMs !== null &&
    (typeof averageBacktestDurationMs !== "number" || !Number.isFinite(averageBacktestDurationMs))
  ) {
    throw new Error("invalid SearchRun average duration in persistence");
  }

  return {
    searchSpace: structuredClone(searchSpace) as SearchSpaceConfig,
    candidateTemplate: cloneTemplate(metadata.candidateTemplate),
    activeCandidateIds,
    averageBacktestDurationMs,
    ...(metadata.seededDiscovery
      ? { seededDiscovery: structuredClone(metadata.seededDiscovery) }
      : {}),
  };
}

function statusFromRow(row: SearchRunRow): SearchRunStatus {
  const stored = searchSpaceFromStorage(row.search_space);
  const startedAt = optionalTimestampColumn(row.started_at, "started_at");
  const endedAt = optionalTimestampColumn(row.ended_at, "ended_at");
  return {
    searchRunId: row.id,
    ownerUserId: row.owner_user_id as AuthenticatedUserId,
    generatorType: row.generator_type,
    randomSeed: row.random_seed,
    searchSpace: stored.searchSpace,
    stopCondition: parseJson(row.stop_condition, "stop_condition") as StopCondition,
    leaderboardScopeId: row.leaderboard_scope_id,
    candidateTemplate: stored.candidateTemplate,
    maxInFlight: integerColumn(row.max_in_flight, "max_in_flight"),
    state: row.state,
    activeCandidateIds: stored.activeCandidateIds,
    submittedCandidateCount: integerColumn(row.submitted_candidate_count, "submitted_candidate_count"),
    completedCandidateCount: integerColumn(row.completed_candidate_count, "completed_candidate_count"),
    failedCandidateCount: integerColumn(row.failed_candidate_count, "failed_candidate_count"),
    averageBacktestDurationMs: stored.averageBacktestDurationMs,
    ...(stored.seededDiscovery ? { seededDiscovery: stored.seededDiscovery } : {}),
    createdAt: timestampColumn(row.created_at, "created_at"),
    ...(startedAt ? { startedAt } : {}),
    updatedAt: timestampColumn(row.updated_at, "updated_at"),
    ...(endedAt ? { endedAt } : {}),
    ...(row.stop_reason === null ? {} : { stopReason: row.stop_reason }),
    ...(row.last_error === null ? {} : { lastError: row.last_error }),
  };
}

function cloneStatus(status: SearchRunStatus): SearchRunStatus {
  return structuredClone(status);
}

function poolFromOptions(options: PostgresSearchRunOptions): PostgresPool {
  if (options.pool) return options.pool;
  const { Pool } = require("pg") as {
    Pool: new (config: { connectionString: string; max: number; application_name: string }) => PostgresPool;
  };
  return new Pool({
    connectionString: options.connectionString,
    max: options.maxConnections ?? 5,
    application_name: "cryptox-search",
  });
}

/** PostgreSQL adapter for the D-01 SearchRun root. */
export class PostgresSearchRunRepository implements SearchRunRepository<SearchRunStatus> {
  private readonly pool: PostgresPool;

  public constructor(options: PostgresSearchRunOptions | PostgresPool) {
    this.pool = "query" in options ? options : poolFromOptions(options);
    if (!("query" in options) && !options.connectionString.trim()) {
      throw new Error("Search PostgreSQL connection string is required");
    }
  }

  public async getByOwnerAndId(
    ownerUserId: AuthenticatedUserId,
    id: string,
  ): Promise<SearchRunStatus | undefined> {
    const result = await this.pool.query<SearchRunRow>(
      `
        SELECT id::text, owner_user_id::text, generator_type, random_seed,
          search_space, stop_condition, leaderboard_scope_id::text, max_in_flight,
          state, submitted_candidate_count, completed_candidate_count,
          failed_candidate_count, created_at::text, started_at::text,
          updated_at::text, ended_at::text, stop_reason, last_error
        FROM search_runs
        WHERE owner_user_id = $1::uuid AND id = $2::uuid
      `,
      [ownerUserId, id],
    );
    return result.rows[0] ? statusFromRow(result.rows[0]) : undefined;
  }

  public async save(
    ownerUserId: AuthenticatedUserId,
    searchRun: SearchRunStatus,
  ): Promise<SearchRunStatus> {
    if (searchRun.ownerUserId !== ownerUserId) throw new Error("OWNER_MISMATCH");
    const result = await this.pool.query(
      `
        INSERT INTO search_runs
          (id, owner_user_id, generator_type, random_seed, search_space,
           stop_condition, leaderboard_scope_id, max_in_flight, state,
           submitted_candidate_count, completed_candidate_count,
           failed_candidate_count, created_at, started_at, updated_at,
           ended_at, stop_reason, last_error)
        VALUES ($1::uuid, $2::uuid, $3, $4, $5::jsonb, $6::jsonb,
          $7::uuid, $8, $9, $10, $11, $12, $13::timestamptz,
          $14::timestamptz, $15::timestamptz, $16::timestamptz, $17, $18)
        ON CONFLICT (id) DO UPDATE SET
          generator_type = EXCLUDED.generator_type,
          random_seed = EXCLUDED.random_seed,
          search_space = EXCLUDED.search_space,
          stop_condition = EXCLUDED.stop_condition,
          leaderboard_scope_id = EXCLUDED.leaderboard_scope_id,
          max_in_flight = EXCLUDED.max_in_flight,
          state = EXCLUDED.state,
          submitted_candidate_count = EXCLUDED.submitted_candidate_count,
          completed_candidate_count = EXCLUDED.completed_candidate_count,
          failed_candidate_count = EXCLUDED.failed_candidate_count,
          started_at = EXCLUDED.started_at,
          updated_at = EXCLUDED.updated_at,
          ended_at = EXCLUDED.ended_at,
          stop_reason = EXCLUDED.stop_reason,
          last_error = EXCLUDED.last_error
        WHERE search_runs.owner_user_id = EXCLUDED.owner_user_id
        RETURNING id
      `,
      [
        searchRun.searchRunId,
        ownerUserId,
        searchRun.generatorType,
        searchRun.randomSeed,
        JSON.stringify(searchSpaceForStorage(searchRun)),
        JSON.stringify(searchRun.stopCondition),
        searchRun.leaderboardScopeId,
        searchRun.maxInFlight,
        searchRun.state,
        searchRun.submittedCandidateCount,
        searchRun.completedCandidateCount,
        searchRun.failedCandidateCount,
        searchRun.createdAt,
        searchRun.startedAt ?? null,
        searchRun.updatedAt,
        searchRun.endedAt ?? null,
        searchRun.stopReason ?? null,
        searchRun.lastError ?? null,
      ],
    );
    if (result.rowCount === 0) throw new Error("NOT_FOUND");
    return cloneStatus(searchRun);
  }

  public async listByOwner(
    ownerUserId: AuthenticatedUserId,
    page: { limit: number; cursor?: string },
  ): Promise<{ items: readonly SearchRunStatus[]; nextCursor?: string }> {
    if (!Number.isInteger(page.limit) || page.limit < 1 || page.limit > 100) {
      throw new Error("INVALID_PAGE");
    }
    const result = await this.pool.query<SearchRunRow>(
      `
        SELECT id::text, owner_user_id::text, generator_type, random_seed,
          search_space, stop_condition, leaderboard_scope_id::text, max_in_flight,
          state, submitted_candidate_count, completed_candidate_count,
          failed_candidate_count, created_at::text, started_at::text,
          updated_at::text, ended_at::text, stop_reason, last_error
        FROM search_runs
        WHERE owner_user_id = $1::uuid
          AND (
            $2::uuid IS NULL
            OR NOT EXISTS (
              SELECT 1 FROM search_runs cursor_run
              WHERE cursor_run.owner_user_id = $1::uuid AND cursor_run.id = $2::uuid
            )
            OR (created_at, id) > (
              SELECT cursor_run.created_at, cursor_run.id
              FROM search_runs cursor_run
              WHERE cursor_run.owner_user_id = $1::uuid AND cursor_run.id = $2::uuid
            )
          )
        ORDER BY created_at ASC, id ASC
        LIMIT $3
      `,
      [ownerUserId, page.cursor ?? null, page.limit + 1],
    );
    const all = result.rows.map(statusFromRow);
    const items = all.slice(0, page.limit).map(cloneStatus);
    return {
      items,
      ...(all.length > page.limit && items.length > 0
        ? { nextCursor: items[items.length - 1]!.searchRunId }
        : {}),
    };
  }

  public close(): Promise<void> {
    return this.pool.end();
  }
}

export function createPostgresSearchRunRepository(
  options: PostgresSearchRunOptions,
): PostgresSearchRunRepository {
  return new PostgresSearchRunRepository(options);
}
