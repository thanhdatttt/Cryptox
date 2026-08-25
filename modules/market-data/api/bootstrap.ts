import type { MarketDataModuleDependencies } from "../application/ports";
import type { MarketDataModulePublicApi } from "./index";
import { createMarketDataService } from "../application/service";
export function createMarketDataModule(deps?: Partial<MarketDataModuleDependencies>): MarketDataModulePublicApi { return createMarketDataService(deps); }
export { createMarketDataSnapshotReader } from "./snapshot-reader";
export { createBinanceMarketDataAdapter } from "../infrastructure/binance-adapter";
export type { BinanceAdapterOptions } from "../infrastructure/binance-adapter";
export { PostgresCandleRepository, PostgresSnapshotRepository } from "../infrastructure/postgres-repositories";
export type { MarketDataSqlClient } from "../infrastructure/postgres-repositories";
