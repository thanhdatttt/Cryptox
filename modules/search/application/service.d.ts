import type { SearchReadOptions } from "../api";
import type { SearchModuleDependencies } from "./ports";
import type { LoopStatus, SearchRun, SearchRunRankingEntry, StopCondition } from "../domain/contracts";
export interface SearchModuleRuntime {
    start(config: {
        searchSpace: SearchRun["searchSpace"];
        stopCondition: StopCondition;
        generatorType: SearchRun["generatorType"];
        leaderboardScopeId: string;
        maxInFlight: number;
    }, options: {
        ownerUserId: string;
    }): Promise<{
        searchRunId: string;
    }>;
    pause(searchRunId: string, options?: SearchReadOptions): Promise<void>;
    resume(searchRunId: string, options?: SearchReadOptions): Promise<void>;
    cancel(searchRunId: string, options?: SearchReadOptions): Promise<void>;
    status(searchRunId: string, options?: SearchReadOptions): Promise<LoopStatus>;
    leaderboard(searchRunId: string, options?: SearchReadOptions): Promise<SearchRunRankingEntry[]>;
    onCandidateFinished(searchRunId: string): Promise<void>;
    fillAvailableSlots(searchRunId: string): Promise<void>;
}
export declare function createInMemorySearchDependencies(): SearchModuleDependencies;
export declare function createSearchModule(dependencies?: SearchModuleDependencies): SearchModuleRuntime;
