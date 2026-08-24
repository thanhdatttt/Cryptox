import type { SearchSpaceConfig, StopCondition, GeneratorType, LoopStatus, SearchRunRankingEntry } from "../domain/contracts";
export { createSearchModule, createInMemorySearchDependencies } from "../application/service";
export type { SearchModuleRuntime } from "../application/service";
export type { GeneratorType, StrategyCategory, GeneratedCandidate, StrategyGenerator, SearchSpaceConfig, StopCondition, CandidateProgress, SearchRunRankingEntry, LoopStatus } from "../domain/contracts";
export interface SearchReadOptions { ownerUserId?: string; }
export interface SearchModulePublicApi { start(config: { searchSpace: SearchSpaceConfig; stopCondition: StopCondition; generatorType: GeneratorType; leaderboardScopeId: string; maxInFlight: number }, options: { ownerUserId: string }): Promise<{ searchRunId: string }>; pause(searchRunId: string, options?: SearchReadOptions): Promise<void>; resume(searchRunId: string, options?: SearchReadOptions): Promise<void>; cancel(searchRunId: string, options?: SearchReadOptions): Promise<void>; status(searchRunId: string, options?: SearchReadOptions): Promise<LoopStatus>; leaderboard(searchRunId: string, options?: SearchReadOptions): Promise<SearchRunRankingEntry[]>; }
import { createSearchModule, createInMemorySearchDependencies } from "../application/service";
const defaultService = createSearchModule(createInMemorySearchDependencies());
export const start: SearchModulePublicApi["start"] = (config, options) => defaultService.start(config, options);
export const pause: SearchModulePublicApi["pause"] = (searchRunId, options) => defaultService.pause(searchRunId, options);
export const resume: SearchModulePublicApi["resume"] = (searchRunId, options) => defaultService.resume(searchRunId, options);
export const cancel: SearchModulePublicApi["cancel"] = (searchRunId, options) => defaultService.cancel(searchRunId, options);
export const status: SearchModulePublicApi["status"] = (searchRunId, options) => defaultService.status(searchRunId, options);
export const leaderboard: SearchModulePublicApi["leaderboard"] = (searchRunId, options) => defaultService.leaderboard(searchRunId, options);
