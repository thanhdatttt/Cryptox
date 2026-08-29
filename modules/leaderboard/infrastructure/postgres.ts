import { randomUUID } from "node:crypto";
import type { AuthenticatedUserId } from "modules/auth/api";
import {
  type CreateLeaderboardScopeCommand,
  type LeaderboardEntry,
  type LeaderboardScope,
  type RankingConfiguration,
} from "../api/contracts";
import type { LeaderboardApplicationDependencies, LeaderboardExperimentRepository } from "../application/ports";
import { LINEAR_REQUIRED_V1 } from "../api/contracts";

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

export interface PostgresLeaderboardOptions {
  readonly connectionString: string;
  readonly pool?: PostgresPool;
  readonly maxConnections?: number;
  readonly experimentRepository?: LeaderboardExperimentRepository;
}

export interface PostgresLeaderboardDependencies
  extends LeaderboardApplicationDependencies<
    LeaderboardScope,
    CreateLeaderboardScopeCommand,
    LeaderboardEntry,
    RankingConfiguration
  > {
  readonly pool: PostgresPool;
  initialize(): Promise<void>;
  close(): Promise<void>;
}

export const DEFAULT_LINEAR_REQUIRED_RANKING_CONFIGURATION: RankingConfiguration = {
  id: "ranking-v1",
  profileId: LINEAR_REQUIRED_V1.id,
  version: LINEAR_REQUIRED_V1.version,
  name: "Required MVP ranking",
  description: "LINEAR_REQUIRED_V1",
  formula: LINEAR_REQUIRED_V1.formula,
  minimumNumberOfTrades: LINEAR_REQUIRED_V1.eligibility.minimumNumberOfTrades,
  tieBreakers: LINEAR_REQUIRED_V1.tieBreakers,
  createdAt: "2026-08-27T00:00:00.000Z",
};

interface ConfigurationRow extends Record<string, unknown> {
  id: string;
  profile_id: string;
  version: number | string;
  name: string;
  description: string | null;
  formula: RankingConfiguration["formula"];
  minimum_number_of_trades: number | string;
  tie_breakers: RankingConfiguration["tieBreakers"];
  created_at: string;
}

interface ScopeRow extends Record<string, unknown> {
  id: string;
  owner_user_id: string;
  name: string;
  k: number | string;
  ranking_configuration_id: string;
  comparison_key: string;
  created_at: string;
}

interface EntryRow extends Record<string, unknown> {
  id: string;
  rank: number | string;
  candidate_id: string;
  search_run_id: string | null;
  experiment_id: string;
  leaderboard_scope_id: string;
  ranking_configuration_id: string;
  score: number | string;
  added_at: string;
}

function integerColumn(value: unknown, field: string): number {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isInteger(number)) throw new Error(`invalid leaderboard ${field} in persistence`);
  return number;
}

function finiteColumn(value: unknown, field: string): number {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(number)) throw new Error(`invalid leaderboard ${field} in persistence`);
  return number;
}

function timestampColumn(value: unknown, field: string): string {
  const timestamp = Date.parse(String(value));
  if (!Number.isFinite(timestamp)) throw new Error(`invalid leaderboard ${field} in persistence`);
  return new Date(timestamp).toISOString();
}

function configurationFromRow(row: ConfigurationRow): RankingConfiguration {
  return {
    id: row.id,
    profileId: row.profile_id as RankingConfiguration["profileId"],
    version: integerColumn(row.version, "version") as RankingConfiguration["version"],
    name: row.name,
    ...(row.description === null ? {} : { description: row.description }),
    formula: row.formula,
    minimumNumberOfTrades: integerColumn(
      row.minimum_number_of_trades,
      "minimum_number_of_trades",
    ) as RankingConfiguration["minimumNumberOfTrades"],
    tieBreakers: row.tie_breakers,
    createdAt: timestampColumn(row.created_at, "created_at"),
  };
}

function scopeFromRow(row: ScopeRow): LeaderboardScope {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id as AuthenticatedUserId,
    name: row.name,
    k: integerColumn(row.k, "k"),
    rankingConfigurationId: row.ranking_configuration_id,
    comparisonKey: row.comparison_key,
    createdAt: timestampColumn(row.created_at, "created_at"),
  };
}

function entryFromRow(row: EntryRow): LeaderboardEntry {
  return {
    id: row.id,
    rank: integerColumn(row.rank, "rank"),
    candidateId: row.candidate_id,
    ...(row.search_run_id === null ? {} : { searchRunId: row.search_run_id }),
    experimentId: row.experiment_id,
    leaderboardScopeId: row.leaderboard_scope_id,
    rankingConfigurationId: row.ranking_configuration_id,
    score: finiteColumn(row.score, "score"),
    addedAt: timestampColumn(row.added_at, "added_at"),
  };
}

function poolFromOptions(options: PostgresLeaderboardOptions): PostgresPool {
  if (options.pool) return options.pool;
  const { Pool } = require("pg") as {
    Pool: new (config: { connectionString: string; max: number; application_name: string }) => PostgresPool;
  };
  return new Pool({
    connectionString: options.connectionString,
    max: options.maxConnections ?? 5,
    application_name: "cryptox-leaderboard",
  });
}

export function createPostgresLeaderboardDependencies(
  options: PostgresLeaderboardOptions,
): PostgresLeaderboardDependencies {
  if (!options.connectionString.trim() && !options.pool) {
    throw new Error("Leaderboard PostgreSQL connection string is required");
  }
  const pool = poolFromOptions(options);
  let closed = false;

  const initialize = async (): Promise<void> => {
    await pool.query(
      `
        INSERT INTO ranking_configurations
          (id, profile_id, version, name, description, formula,
           minimum_number_of_trades, tie_breakers, created_at)
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8::jsonb, $9::timestamptz)
        ON CONFLICT (id) DO NOTHING
      `,
      [
        DEFAULT_LINEAR_REQUIRED_RANKING_CONFIGURATION.id,
        DEFAULT_LINEAR_REQUIRED_RANKING_CONFIGURATION.profileId,
        DEFAULT_LINEAR_REQUIRED_RANKING_CONFIGURATION.version,
        DEFAULT_LINEAR_REQUIRED_RANKING_CONFIGURATION.name,
        DEFAULT_LINEAR_REQUIRED_RANKING_CONFIGURATION.description ?? null,
        JSON.stringify(DEFAULT_LINEAR_REQUIRED_RANKING_CONFIGURATION.formula),
        DEFAULT_LINEAR_REQUIRED_RANKING_CONFIGURATION.minimumNumberOfTrades,
        JSON.stringify(DEFAULT_LINEAR_REQUIRED_RANKING_CONFIGURATION.tieBreakers),
        DEFAULT_LINEAR_REQUIRED_RANKING_CONFIGURATION.createdAt,
      ],
    );
  };

  const configurationRepository = {
    getById: async (id: string): Promise<RankingConfiguration | undefined> => {
      const result = await pool.query<ConfigurationRow>(
        `
          SELECT id, profile_id, version, name, description, formula,
            minimum_number_of_trades, tie_breakers, created_at::text
          FROM ranking_configurations
          WHERE id = $1
        `,
        [id],
      );
      return result.rows[0] ? configurationFromRow(result.rows[0]) : undefined;
    },
    listAll: async (): Promise<readonly RankingConfiguration[]> => {
      const result = await pool.query<ConfigurationRow>(
        `
          SELECT id, profile_id, version, name, description, formula,
            minimum_number_of_trades, tie_breakers, created_at::text
          FROM ranking_configurations
          ORDER BY version ASC, id ASC
        `,
      );
      return result.rows.map(configurationFromRow);
    },
  };

  const scopeRepository = {
    insert: async (
      ownerUserId: AuthenticatedUserId,
      command: CreateLeaderboardScopeCommand,
    ): Promise<LeaderboardScope> => {
      const result = await pool.query<ScopeRow>(
        `
          INSERT INTO leaderboard_scopes
            (id, owner_user_id, name, k, ranking_configuration_id, comparison_key, created_at)
          VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7::timestamptz)
          RETURNING id::text, owner_user_id::text, name, k,
            ranking_configuration_id, comparison_key, created_at::text
        `,
        [
          randomUUID(),
          ownerUserId,
          command.name,
          command.k,
          command.rankingConfigurationId,
          command.comparisonKey,
          new Date().toISOString(),
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error("leaderboard scope insert returned no row");
      return scopeFromRow(row);
    },
    getByOwnerAndId: async (
      ownerUserId: AuthenticatedUserId,
      id: string,
    ): Promise<LeaderboardScope | undefined> => {
      const result = await pool.query<ScopeRow>(
        `
          SELECT id::text, owner_user_id::text, name, k,
            ranking_configuration_id, comparison_key, created_at::text
          FROM leaderboard_scopes
          WHERE owner_user_id = $1::uuid AND id = $2::uuid
        `,
        [ownerUserId, id],
      );
      return result.rows[0] ? scopeFromRow(result.rows[0]) : undefined;
    },
  };

  const entryRepository = {
    getActiveTopK: async (
      ownerUserId: AuthenticatedUserId,
      scopeId: string,
      k: number,
    ): Promise<readonly LeaderboardEntry[]> => {
      const result = await pool.query<EntryRow>(
        `
          SELECT e.id::text, e.rank, e.candidate_id::text,
            e.search_run_id::text, e.experiment_id::text,
            e.leaderboard_scope_id::text, e.ranking_configuration_id,
            e.score, e.added_at::text
          FROM leaderboard_entries e
          INNER JOIN leaderboard_scopes s ON s.id = e.leaderboard_scope_id
          WHERE s.owner_user_id = $1::uuid AND e.leaderboard_scope_id = $2::uuid
          ORDER BY e.rank ASC, e.experiment_id ASC
          LIMIT $3
        `,
        [ownerUserId, scopeId, k],
      );
      return result.rows.map(entryFromRow);
    },
    listByOwnerAndSearchRun: async (
      ownerUserId: AuthenticatedUserId,
      searchRunId: string,
    ): Promise<readonly LeaderboardEntry[]> => {
      const result = await pool.query<EntryRow>(
        `
          SELECT e.id::text, e.rank, e.candidate_id::text,
            e.search_run_id::text, e.experiment_id::text,
            e.leaderboard_scope_id::text, e.ranking_configuration_id,
            e.score, e.added_at::text
          FROM leaderboard_entries e
          INNER JOIN leaderboard_scopes s ON s.id = e.leaderboard_scope_id
          WHERE s.owner_user_id = $1::uuid AND e.search_run_id = $2::uuid
          ORDER BY e.rank ASC, e.experiment_id ASC
        `,
        [ownerUserId, searchRunId],
      );
      return result.rows.map(entryFromRow);
    },
    insertForScopeOwner: async (
      ownerUserId: AuthenticatedUserId,
      entry: Omit<LeaderboardEntry, "id" | "rank">,
    ): Promise<LeaderboardEntry> => {
      const result = await pool.query<EntryRow>(
        `
          INSERT INTO leaderboard_entries
            (id, rank, candidate_id, search_run_id, experiment_id,
             leaderboard_scope_id, ranking_configuration_id, score, added_at)
          SELECT $1::uuid, COALESCE(MAX(e.rank), 0) + 1, $3::uuid, $4::uuid,
            $5::uuid, s.id, $6, $7, $8::timestamptz
          FROM leaderboard_scopes s
          LEFT JOIN leaderboard_entries e ON e.leaderboard_scope_id = s.id
          WHERE s.owner_user_id = $2::uuid AND s.id = $9::uuid
          GROUP BY s.id
          RETURNING id::text, rank, candidate_id::text, search_run_id::text,
            experiment_id::text, leaderboard_scope_id::text,
            ranking_configuration_id, score, added_at::text
        `,
        [
          randomUUID(),
          ownerUserId,
          entry.candidateId,
          entry.searchRunId ?? null,
          entry.experimentId,
          entry.rankingConfigurationId,
          entry.score,
          entry.addedAt,
          entry.leaderboardScopeId,
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error("leaderboard entry insert returned no row");
      return entryFromRow(row);
    },
    deactivateForScopeOwner: async (
      ownerUserId: AuthenticatedUserId,
      entryId: string,
    ): Promise<void> => {
      await pool.query(
        `
          DELETE FROM leaderboard_entries e
          USING leaderboard_scopes s
          WHERE e.id = $1::uuid AND e.leaderboard_scope_id = s.id
            AND s.owner_user_id = $2::uuid
        `,
        [entryId, ownerUserId],
      );
    },
    findByScopeOwnerAndExperiment: async (
      ownerUserId: AuthenticatedUserId,
      scopeId: string,
      experimentId: string,
    ): Promise<LeaderboardEntry | undefined> => {
      const result = await pool.query<EntryRow>(
        `
          SELECT e.id::text, e.rank, e.candidate_id::text,
            e.search_run_id::text, e.experiment_id::text,
            e.leaderboard_scope_id::text, e.ranking_configuration_id,
            e.score, e.added_at::text
          FROM leaderboard_entries e
          INNER JOIN leaderboard_scopes s ON s.id = e.leaderboard_scope_id
          WHERE s.owner_user_id = $1::uuid AND s.id = $2::uuid
            AND e.experiment_id = $3::uuid
          LIMIT 1
        `,
        [ownerUserId, scopeId, experimentId],
      );
      return result.rows[0] ? entryFromRow(result.rows[0]) : undefined;
    },
  };

  return {
    scopeRepository,
    entryRepository,
    configurationRepository,
    experimentRepository: options.experimentRepository,
    clock: { now: () => new Date().toISOString() },
    initialize,
    pool,
    close: async () => {
      if (closed) return;
      closed = true;
      await pool.end();
    },
  };
}
