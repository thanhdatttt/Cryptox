import type { BacktestLogApi } from "modules/backtesting/api";
import type { ExperimentResultReader, LeaderboardEntryRepository, LeaderboardModuleDependencies, LeaderboardScopeRepository, SearchRunOwnerReader } from "../application/ports";
import type { LeaderboardEntry } from "../domain/contracts";
export interface LeaderboardSqlClient {
    query<Row>(text: string, values: unknown[]): Promise<{
        rows: Row[];
    }>;
}
export declare class PostgresLeaderboardEntryRepository implements LeaderboardEntryRepository {
    private readonly pool;
    constructor(pool: LeaderboardSqlClient);
    getActiveTopK(scopeId: string, limit: number): Promise<LeaderboardEntry[]>;
    getByExperimentResultId(experimentResultId: string): Promise<LeaderboardEntry | undefined>;
    insert(input: Omit<LeaderboardEntry, "id" | "rank">): Promise<LeaderboardEntry>;
    deactivate(entryId: string): Promise<void>;
}
export declare const createBacktestingScopeRepository: (backtesting: Pick<BacktestLogApi, "readBenchmarkScope">) => LeaderboardScopeRepository;
export declare const createBacktestingExperimentReader: (backtesting: Pick<BacktestLogApi, "listSearchExperimentSummaries">) => ExperimentResultReader;
export declare const createPostgresLeaderboardDependencies: (pool: LeaderboardSqlClient, input: {
    scopeRepository: LeaderboardScopeRepository;
    experimentReader: ExperimentResultReader;
    searchRunReader?: SearchRunOwnerReader;
    clock: {
        now(): string;
    };
}) => LeaderboardModuleDependencies;
