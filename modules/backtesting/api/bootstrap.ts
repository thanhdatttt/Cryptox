export type { BacktestingModuleDependencies } from "../application/ports";
import { createBacktestingService, createInMemoryBacktestingDependencies } from "../application/service";
import type { BacktestingModuleDependencies } from "../application/ports";
import type { BacktestLogApi } from "./index";
export function createBacktestingModule(deps?: BacktestingModuleDependencies): BacktestLogApi { return createBacktestingService(deps ?? createInMemoryBacktestingDependencies()); }
export { createInMemoryBacktestingDependencies, createBacktestingService, BACKTEST_RUNTIME_SHA256, BACKTEST_RUNTIME_VERSION } from "../application/service";
export { PostgresBacktestingRepository, createPostgresBacktestingDependencies } from "../infrastructure/postgres-repository";
export type { BacktestingSqlClient } from "../infrastructure/postgres-repository";
