import type { BacktestingModulePublicApi } from "@cryptox/backtesting";
import type { LeaderboardModulePublicApi } from "@cryptox/leaderboard";
import type { StrategyModulePublicApi } from "@cryptox/strategy";
import type { AuthenticatedUserId } from "modules/auth/api";

export interface SearchRunRepository<TSearchRun> {
  getByOwnerAndId(
    ownerUserId: AuthenticatedUserId,
    id: string,
  ): Promise<TSearchRun | undefined>;
  save(ownerUserId: AuthenticatedUserId, searchRun: TSearchRun): Promise<TSearchRun>;
  listByOwner(
    ownerUserId: AuthenticatedUserId,
    page: { limit: number; cursor?: string },
  ): Promise<{ items: readonly TSearchRun[]; nextCursor?: string }>;
}

export interface StrategyGeneratorPort<TGenerationRequest, TCandidate> {
  generate(request: TGenerationRequest): TCandidate;
}

export interface SeededDiscoveryGeneratorPort<TGenerationRequest, TCandidate> extends StrategyGeneratorPort<TGenerationRequest, TCandidate> {
  readonly profileId: "RANDOM_V1" | "DOMAIN_GUIDED_V1" | "GENETIC_V1";
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
  leaderboard: Pick<LeaderboardModulePublicApi, "getLeaderboardScope" | "rankSearchRun">;
}
