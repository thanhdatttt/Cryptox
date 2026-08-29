export type {
  CandleRepository,
  Clock,
  DatasetSnapshotCreateInput,
  DatasetSnapshotPage,
  DatasetSnapshotRecord,
  DatasetSnapshotReadInput,
  EphemeralMarketObservabilityStore,
  MarketDataHistoryRequest,
  MarketDataHistoryResult,
  MarketDataModuleDependencies,
  MarketDataObservability,
  MarketDataProvider,
  MarketDataProviderSubscription,
  MarketDataProviderUpdate,
  SnapshotRepository,
} from "../application/ports";
import type { MarketDataModuleDependencies } from "../application/ports";
import { MarketDataApplicationService, type MarketDataApplicationOptions } from "../application/service";
import type { MarketDataModulePublicApi, MarketObservabilityReader } from "./contracts";

export type MarketDataModuleRuntime = MarketDataModulePublicApi & MarketObservabilityReader;

export function createMarketDataModule(
  deps: MarketDataModuleDependencies,
  options?: MarketDataApplicationOptions,
): MarketDataModuleRuntime {
  return new MarketDataApplicationService(deps, options);
}
export { createMarketDataSnapshotReader } from "./snapshot-reader";
export { createBinanceHistoricalProvider } from "../infrastructure/binance";
export type { BinanceHistoricalProviderOptions } from "../infrastructure/binance";
export { createBinanceRealtimeProvider } from "../infrastructure/binance-realtime";
export type {
  BinanceRealtimeProviderOptions,
  BinanceSleep,
  BinanceWebSocketFactory,
} from "../infrastructure/binance-realtime";
export { createPostgresMarketDataDependencies } from "../infrastructure/postgres";
export type {
  PostgresMarketDataDependencies,
  PostgresMarketDataOptions,
  PostgresPool,
  PostgresQueryResult,
} from "../infrastructure/postgres";
