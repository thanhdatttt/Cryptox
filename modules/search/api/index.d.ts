import type { SearchRun, StopCondition, GeneratorType, LoopStatus, SearchRunRankingEntry } from "../domain/contracts";
import type { AuthContext } from "modules/auth/api";
export { createSearchModule, createInMemorySearchDependencies } from "../application/service";
export type { SearchModuleRuntime } from "../application/service";
export type { GeneratorType, StrategyCategory, GeneratedCandidate, StrategyGenerator, SearchSpaceConfig, StopCondition, CandidateProgress, SearchRunRankingEntry, LoopStatus } from "../domain/contracts";
export type { AuthContext } from "modules/auth/api";
export interface SearchModulePublicApi {
    start(auth: AuthContext, config: {
        searchSpace: SearchRun["searchSpace"];
        stopCondition: StopCondition;
        generatorType: GeneratorType;
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
    reconcileRunningRuns(): Promise<number>;
}
export declare const start: SearchModulePublicApi["start"];
export declare const pause: SearchModulePublicApi["pause"];
export declare const resume: SearchModulePublicApi["resume"];
export declare const cancel: SearchModulePublicApi["cancel"];
export declare const status: SearchModulePublicApi["status"];
export declare const leaderboard: SearchModulePublicApi["leaderboard"];
export declare const reconcileRunningRuns: SearchModulePublicApi["reconcileRunningRuns"];
