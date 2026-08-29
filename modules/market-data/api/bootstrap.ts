export type {
  CandleRepository,
  Clock,
  DatasetSnapshotCreateInput,
  DatasetSnapshotPage,
  DatasetSnapshotRecord,
  DatasetSnapshotReadInput,
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
import type { MarketDataModulePublicApi } from "./contracts";
export function createMarketDataModule(
  deps: MarketDataModuleDependencies,
  options?: MarketDataApplicationOptions,
): MarketDataModulePublicApi {
  return new MarketDataApplicationService(deps, options);
}
export { createMarketDataSnapshotReader } from "./snapshot-reader";
export { createBinanceHistoricalProvider } from "../infrastructure/binance";
export type { BinanceHistoricalProviderOptions } from "../infrastructure/binance";
export { createPostgresMarketDataDependencies } from "../infrastructure/postgres";
export type {
  PostgresMarketDataDependencies,
  PostgresMarketDataOptions,
  PostgresPool,
  PostgresQueryResult,
} from "../infrastructure/postgres";
