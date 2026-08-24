import type { MarketDataModuleDependencies } from "../application/ports";
import type { MarketDataModulePublicApi } from "./index";
import { createMarketDataService } from "../application/service";
export function createMarketDataModule(deps: MarketDataModuleDependencies): MarketDataModulePublicApi { return createMarketDataService(deps); }
export { createMarketDataSnapshotReader } from "./snapshot-reader";
