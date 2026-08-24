import type { SearchModuleDependencies } from "./ports";
import type { LoopStatus, SearchRun, SearchRunRankingEntry, StopCondition } from "../domain/contracts";
export interface SearchModuleRuntime {
    start(config: {
        searchSpace: SearchRun["searchSpace"];
        stopCondition: StopCondition;
        generatorType: SearchRun["generatorType"];
        leaderboardScopeId: string;
        maxInFlight: number;
    }): Promise<{
        searchRunId: string;
    }>;
    pause(searchRunId: string): Promise<void>;
    resume(searchRunId: string): Promise<void>;
    cancel(searchRunId: string): Promise<void>;
    status(searchRunId: string): Promise<LoopStatus>;
    leaderboard(searchRunId: string): Promise<SearchRunRankingEntry[]>;
    onCandidateFinished(searchRunId: string): Promise<void>;
    fillAvailableSlots(searchRunId: string): Promise<void>;
}
export declare function createInMemorySearchDependencies(): SearchModuleDependencies;
export declare function createSearchModule(dependencies?: SearchModuleDependencies): SearchModuleRuntime;
