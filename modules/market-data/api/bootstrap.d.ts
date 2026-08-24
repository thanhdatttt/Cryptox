import type { MarketDataModuleDependencies } from "../application/ports";
import type { MarketDataModulePublicApi } from "./index";
export declare function createMarketDataModule(deps: MarketDataModuleDependencies): MarketDataModulePublicApi;
export { createMarketDataSnapshotReader } from "./snapshot-reader";
