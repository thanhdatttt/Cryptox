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
import type { MarketDataModulePublicApi } from "./index";
import {
  createDatasetSnapshot,
  readCandles,
  readDatasetSnapshot,
  shutdown,
  subscribeMarketData,
} from "./index";
export function createMarketDataModule(
  _deps: MarketDataModuleDependencies,
): MarketDataModulePublicApi {
  return { readCandles, createDatasetSnapshot, readDatasetSnapshot, subscribeMarketData, shutdown };
}
export { createMarketDataSnapshotReader } from "./snapshot-reader";
