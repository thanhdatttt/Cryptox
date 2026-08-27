import type { BacktestingModulePublicApi } from "@cryptox/backtesting";
import type { LeaderboardModulePublicApi } from "@cryptox/leaderboard";
import type { StrategyModulePublicApi } from "@cryptox/strategy";

export interface SearchRunRepository<TSearchRun> {
  get(id: string): Promise<TSearchRun | undefined>;
  save(searchRun: TSearchRun): Promise<TSearchRun>;
}

export interface StrategyGeneratorPort<TGenerationRequest, TCandidate> {
  generate(request: TGenerationRequest): TCandidate;
}

export interface SearchApplicationDependencies<TSearchRun, TGenerationRequest, TCandidate> {
  searchRunRepository: SearchRunRepository<TSearchRun>;
  generators: { readonly RANDOM: StrategyGeneratorPort<TGenerationRequest, TCandidate> };
  strategy: Pick<StrategyModulePublicApi, "defineComposite">;
  backtesting: Pick<
    BacktestingModulePublicApi,
    | "submitSearchCandidate"
    | "status"
    | "summarizeSearchCandidates"
    | "cancelSearchCandidates"
  >;
  leaderboard: Pick<LeaderboardModulePublicApi, "rankSearchRun">;
}
