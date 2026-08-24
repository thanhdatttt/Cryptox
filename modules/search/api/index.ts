import type { SearchSpaceConfig, StopCondition, GeneratorType, LoopStatus, SearchRunRankingEntry } from "../domain/contracts";
export type { GeneratorType, StrategyCategory, GeneratedCandidate, StrategyGenerator, SearchSpaceConfig, StopCondition, CandidateProgress, SearchRunRankingEntry, LoopStatus } from "../domain/contracts";
export interface SearchModulePublicApi { start(config: { searchSpace: SearchSpaceConfig; stopCondition: StopCondition; generatorType: GeneratorType; leaderboardScopeId: string; maxInFlight: number }): Promise<{ searchRunId: string }>; pause(searchRunId: string): Promise<void>; resume(searchRunId: string): Promise<void>; cancel(searchRunId: string): Promise<void>; status(searchRunId: string): Promise<LoopStatus>; leaderboard(searchRunId: string): Promise<SearchRunRankingEntry[]>; }
const notImplemented = (): never => { throw new Error("NOT_IMPLEMENTED"); };
export const start: SearchModulePublicApi["start"] = async () => notImplemented();
export const pause: SearchModulePublicApi["pause"] = async () => notImplemented();
export const resume: SearchModulePublicApi["resume"] = async () => notImplemented();
export const cancel: SearchModulePublicApi["cancel"] = async () => notImplemented();
export const status: SearchModulePublicApi["status"] = async () => notImplemented();
export const leaderboard: SearchModulePublicApi["leaderboard"] = async () => notImplemented();
