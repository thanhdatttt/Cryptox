import type { MarketDataModuleDependencies } from "./ports";
import type { MarketDataModulePublicApi } from "../api";
type InternalDeps = Partial<MarketDataModuleDependencies>;
export declare function createMarketDataService(deps?: InternalDeps): MarketDataModulePublicApi;
export {};
