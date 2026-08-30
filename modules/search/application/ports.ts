import type { BacktestingModulePublicApi } from "@cryptox/backtesting";
import type { LeaderboardModulePublicApi } from "@cryptox/leaderboard";
import type { StrategyModulePublicApi } from "@cryptox/strategy";
import type { AuthenticatedUserId } from "modules/auth/api";
import type { SeededDiscoveryProfileId } from "../api/contracts";

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

export interface SeededDiscoveryGeneratorPort<
  TGenerationRequest,
  TCandidate,
  TProfile extends SeededDiscoveryProfileId = SeededDiscoveryProfileId,
> extends StrategyGeneratorPort<TGenerationRequest, TCandidate> {
  readonly profileId: TProfile;
}

export interface StrategyGeneratorRegistry<TGenerationRequest, TCandidate> {
  readonly RANDOM: StrategyGeneratorPort<TGenerationRequest, TCandidate>;
  /** Reserved typed seam; Q-02 supplies the implementation. */
  readonly DOMAIN_GUIDED?: SeededDiscoveryGeneratorPort<
    TGenerationRequest,
    TCandidate,
    "DOMAIN_GUIDED_V1"
  >;
  /** Reserved typed seam; Q-02 supplies the implementation. */
  readonly GENETIC?: SeededDiscoveryGeneratorPort<
    TGenerationRequest,
    TCandidate,
    "GENETIC_V1"
  >;
}

export interface SearchApplicationDependencies<TSearchRun, TGenerationRequest, TCandidate> {
  searchRunRepository: SearchRunRepository<TSearchRun>;
  generators: StrategyGeneratorRegistry<TGenerationRequest, TCandidate>;
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
