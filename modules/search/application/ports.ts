import type { BacktestingModulePublicApi } from "@cryptox/backtesting";
import type { LeaderboardModulePublicApi } from "@cryptox/leaderboard";

export interface SearchRunRepository<TSearchRun> {
  get(id: string): Promise<TSearchRun | undefined>;
  save(searchRun: TSearchRun): Promise<TSearchRun>;
}

export interface StrategyGeneratorPort<TSearchSpace, TCandidate> {
  generate(searchSpace: TSearchSpace): TCandidate;
}

export interface SearchApplicationDependencies<TSearchRun, TSearchSpace, TCandidate> {
  searchRunRepository: SearchRunRepository<TSearchRun>;
  generators: { readonly RANDOM: StrategyGeneratorPort<TSearchSpace, TCandidate> };
  backtesting: Pick<
    BacktestingModulePublicApi,
    "submitSearchCandidate" | "summarizeSearchCandidates" | "cancelSearchCandidates"
  >;
  leaderboard: Pick<LeaderboardModulePublicApi, "rankSearchRun">;
}
