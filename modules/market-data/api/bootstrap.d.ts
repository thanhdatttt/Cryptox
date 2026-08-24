import type { MarketDataModuleDependencies } from "../application/ports";
import type { MarketDataModulePublicApi } from "./index";
export declare function createMarketDataModule(deps?: Partial<MarketDataModuleDependencies>): MarketDataModulePublicApi;
export { createMarketDataSnapshotReader } from "./snapshot-reader";
export { createBinanceMarketDataAdapter } from "../infrastructure/binance-adapter";
export type { BinanceAdapterOptions } from "../infrastructure/binance-adapter";
