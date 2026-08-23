import type { SearchModuleDependencies } from "./bootstrap";
import type { SearchSpaceConfig, StopCondition, GeneratorType, LoopStatus, SearchRunRankingEntry } from "../domain/contracts";
export type { GeneratorType, StrategyCategory, GeneratedCandidate, StrategyGenerator, SearchSpaceConfig, StopCondition, CandidateProgress, SearchRunRankingEntry, LoopStatus } from "../domain/contracts";
export interface SearchModulePublicApi {
    start(config: {
        searchSpace: SearchSpaceConfig;
        stopCondition: StopCondition;
        generatorType: GeneratorType;
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
}
export declare const start: SearchModulePublicApi["start"];
export declare const pause: SearchModulePublicApi["pause"];
export declare const resume: SearchModulePublicApi["resume"];
export declare const cancel: SearchModulePublicApi["cancel"];
export declare const status: SearchModulePublicApi["status"];
export declare const leaderboard: SearchModulePublicApi["leaderboard"];
export declare function createSearchModule(_deps: SearchModuleDependencies): SearchModulePublicApi & {
    onCandidateFinished(searchRunId: string): Promise<void>;
    fillAvailableSlots(searchRunId: string): Promise<void>;
};
