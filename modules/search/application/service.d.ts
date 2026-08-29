import type { AuthContext } from "modules/auth/api";
import type { SearchModuleDependencies } from "./ports";
import type { LoopStatus, SearchRun, SearchRunRankingEntry, StopCondition } from "../domain/contracts";
export interface SearchModuleRuntime {
    start(auth: AuthContext, config: {
        searchSpace: SearchRun["searchSpace"];
        stopCondition: StopCondition;
        generatorType: SearchRun["generatorType"];
        leaderboardScopeId: string;
        maxInFlight: number;
    }): Promise<{
        searchRunId: string;
    }>;
    pause(auth: AuthContext, searchRunId: string): Promise<void>;
    resume(auth: AuthContext, searchRunId: string): Promise<void>;
    cancel(auth: AuthContext, searchRunId: string): Promise<void>;
    status(auth: AuthContext, searchRunId: string): Promise<LoopStatus>;
    leaderboard(auth: AuthContext, searchRunId: string): Promise<SearchRunRankingEntry[]>;
    onCandidateFinished(searchRunId: string): Promise<void>;
    fillAvailableSlots(searchRunId: string): Promise<void>;
    reconcileRunningRuns(): Promise<number>;
}
export declare function createInMemorySearchDependencies(): SearchModuleDependencies;
export declare function createSearchModule(dependencies?: SearchModuleDependencies): SearchModuleRuntime;
