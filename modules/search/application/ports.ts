import type { CancellationUnitOfWork } from "modules/backtesting/api";
import type { StrategyModulePublicApi } from "modules/strategy/api";
import type { GeneratorType, SearchRun } from "../domain/contracts";
export interface SearchRunRepository {
  get(id: string): Promise<SearchRun | undefined>;
  getByOwner(ownerUserId: string, id: string): Promise<SearchRun | undefined>;
  getByOwnerForUpdate(ownerUserId: string, id: string, unitOfWork: CancellationUnitOfWork): Promise<SearchRun | undefined>;
  insert(run: SearchRun): Promise<SearchRun>;
  save(run: SearchRun, unitOfWork?: CancellationUnitOfWork): Promise<SearchRun>;
  listRunning?(): Promise<SearchRun[]>;
  listByOwner?(ownerUserId: string, limit?: number): Promise<SearchRun[]>;
  withRunLock?<T>(ownerUserId: string, id: string, operation: (run: SearchRun | undefined, unitOfWork?: CancellationUnitOfWork) => Promise<T>): Promise<T>;
}
export interface SearchModuleDependencies {
  searchRunRepository: SearchRunRepository;
  generators: Record<GeneratorType, import("../domain/contracts").StrategyGenerator>;
  strategyService?: Pick<StrategyModulePublicApi, "readDefinitions" | "defineComposite" | "readComposite"> & Partial<Pick<StrategyModulePublicApi, "defineStrategy">>;
  backtestCoordinator: Pick<import("modules/backtesting/api").BacktestLogApi, "readBenchmarkScope" | "submitSearchCandidate" | "summarizeSearchCandidates" | "cancelSearchCandidates" | "removePendingJobs">;
  leaderboardService: Pick<import("modules/leaderboard/api").LeaderboardModulePublicApi, "rankSearchRun">;
  beginCancellation(): Promise<CancellationUnitOfWork>;
  clock: { now(): string };
  idGenerator?: () => string;
}
