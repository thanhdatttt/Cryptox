import type { SearchRun, SearchSpaceConfig, StopCondition, GeneratorType, LoopStatus, SearchRunRankingEntry } from "../domain/contracts";
import type { AuthContext } from "modules/auth/api";
export { createSearchModule, createInMemorySearchDependencies } from "../application/service";
export type { SearchModuleRuntime } from "../application/service";
export type { GeneratorType, StrategyCategory, GeneratedCandidate, StrategyGenerator, SearchSpaceConfig, StopCondition, CandidateProgress, SearchRunRankingEntry, LoopStatus } from "../domain/contracts";
export type { AuthContext } from "modules/auth/api";
export interface SearchModulePublicApi { start(auth: AuthContext, config: { searchSpace: SearchRun["searchSpace"]; stopCondition: StopCondition; generatorType: GeneratorType; leaderboardScopeId: string; maxInFlight: number }): Promise<{ searchRunId: string }>; pause(auth: AuthContext, searchRunId: string): Promise<void>; resume(auth: AuthContext, searchRunId: string): Promise<void>; cancel(auth: AuthContext, searchRunId: string): Promise<void>; status(auth: AuthContext, searchRunId: string): Promise<LoopStatus>; leaderboard(auth: AuthContext, searchRunId: string): Promise<SearchRunRankingEntry[]>; reconcileRunningRuns(): Promise<number>; }
import { createSearchModule, createInMemorySearchDependencies } from "../application/service";
const defaultService = createSearchModule(createInMemorySearchDependencies());
export const start: SearchModulePublicApi["start"] = (auth, config) => defaultService.start(auth, config);
export const pause: SearchModulePublicApi["pause"] = (auth, searchRunId) => defaultService.pause(auth, searchRunId);
export const resume: SearchModulePublicApi["resume"] = (auth, searchRunId) => defaultService.resume(auth, searchRunId);
export const cancel: SearchModulePublicApi["cancel"] = (auth, searchRunId) => defaultService.cancel(auth, searchRunId);
export const status: SearchModulePublicApi["status"] = (auth, searchRunId) => defaultService.status(auth, searchRunId);
export const leaderboard: SearchModulePublicApi["leaderboard"] = (auth, searchRunId) => defaultService.leaderboard(auth, searchRunId);
export const reconcileRunningRuns: SearchModulePublicApi["reconcileRunningRuns"] = () => defaultService.reconcileRunningRuns();
