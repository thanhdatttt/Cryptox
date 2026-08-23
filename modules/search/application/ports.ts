import type { GeneratorType, LoopStatus } from "../domain/contracts";
export interface SearchRunRepository { get(id: string): Promise<LoopStatus | undefined>; }
export interface SearchModuleDependencies { searchRunRepository: SearchRunRepository; generators: Record<GeneratorType, import("../domain/contracts").StrategyGenerator>; backtestCoordinator: import("modules/backtesting/api").BacktestLogApi; leaderboardService: Pick<import("modules/leaderboard/api").LeaderboardModulePublicApi, "rankSearchRun">; }
