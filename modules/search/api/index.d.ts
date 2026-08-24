import type { SearchSpaceConfig, StopCondition, GeneratorType, LoopStatus, SearchRunRankingEntry } from "../domain/contracts";
export { createSearchModule, createInMemorySearchDependencies } from "../application/service";
export type { SearchModuleRuntime } from "../application/service";
export type { GeneratorType, StrategyCategory, GeneratedCandidate, StrategyGenerator, SearchSpaceConfig, StopCondition, CandidateProgress, SearchRunRankingEntry, LoopStatus } from "../domain/contracts";
export interface SearchReadOptions {
    ownerUserId?: string;
}
export interface SearchModulePublicApi {
    start(config: {
        searchSpace: SearchSpaceConfig;
        stopCondition: StopCondition;
        generatorType: GeneratorType;
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
}
export declare const start: SearchModulePublicApi["start"];
export declare const pause: SearchModulePublicApi["pause"];
export declare const resume: SearchModulePublicApi["resume"];
export declare const cancel: SearchModulePublicApi["cancel"];
export declare const status: SearchModulePublicApi["status"];
export declare const leaderboard: SearchModulePublicApi["leaderboard"];
