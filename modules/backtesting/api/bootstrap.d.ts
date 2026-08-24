export type { BacktestingModuleDependencies } from "../application/ports";
import type { BacktestingModuleDependencies } from "../application/ports";
import type { BacktestLogApi } from "./index";
export declare function createBacktestingModule(deps?: BacktestingModuleDependencies): BacktestLogApi;
export { createInMemoryBacktestingDependencies, createBacktestingService, BACKTEST_RUNTIME_SHA256, BACKTEST_RUNTIME_VERSION } from "../application/service";
export { PostgresBacktestingRepository, createPostgresBacktestingDependencies } from "../infrastructure/postgres-repository";
export type { BacktestingSqlClient } from "../infrastructure/postgres-repository";
