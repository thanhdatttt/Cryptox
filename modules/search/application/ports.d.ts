import type { GeneratorType, SearchRun } from "../domain/contracts";
export interface SearchRunRepository {
    get(id: string): Promise<SearchRun | undefined>;
    insert(run: SearchRun): Promise<SearchRun>;
    save(run: SearchRun): Promise<SearchRun>;
    listRunning?(): Promise<SearchRun[]>;
}
export interface SearchModuleDependencies {
    searchRunRepository: SearchRunRepository;
    generators: Record<GeneratorType, import("../domain/contracts").StrategyGenerator>;
    backtestCoordinator: Pick<import("modules/backtesting/api").BacktestLogApi, "submitSearchCandidate" | "summarizeSearchCandidates" | "cancelSearchCandidates" | "removePendingJobs">;
    leaderboardService: Pick<import("modules/leaderboard/api").LeaderboardModulePublicApi, "rankSearchRun">;
    clock: {
        now(): string;
    };
    idGenerator?: () => string;
}
