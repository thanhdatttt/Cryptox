import type {
  DatasetSnapshotCreateCommand,
  DatasetSnapshotPage,
  DatasetSnapshotReadQuery,
  DatasetSnapshotRef,
  HistoricalCandlePage,
  HistoricalCandleQuery,
  MarketDataModulePublicApi,
  MarketObservabilityReader,
  MarketDataUpdate,
  MarketSubscription,
} from "./contracts";
import {
  MarketDataApplicationError,
  MarketDataApplicationService,
} from "../application/service";

export * from "./contracts";

const unconfiguredDependencies = {
  providers: [],
  candleRepository: {
    upsertMany: async () => undefined,
    read: async () => [],
  },
  snapshotRepository: {
    read: async () => undefined,
    create: async () => {
      throw new MarketDataApplicationError("PERSISTENCE_UNAVAILABLE", "no market data persistence is configured");
    },
  },
  clock: { now: () => new Date().toISOString() },
  observability: { record: () => undefined },
} as const;

const defaultService = new MarketDataApplicationService(unconfiguredDependencies);

export const readCandles = async (query: HistoricalCandleQuery): Promise<HistoricalCandlePage> =>
  defaultService.readCandles(query);
export const createDatasetSnapshot = async (
  command: DatasetSnapshotCreateCommand,
): Promise<DatasetSnapshotRef> => defaultService.createDatasetSnapshot(command);
export const readDatasetSnapshot = async (
  query: DatasetSnapshotReadQuery,
): Promise<DatasetSnapshotPage> => defaultService.readDatasetSnapshot(query);
export const subscribeMarketData = async (
  subscriptions: readonly MarketSubscription[],
  sink: (update: MarketDataUpdate) => void,
): Promise<() => Promise<void>> => defaultService.subscribeMarketData(subscriptions, sink);
export const readObservability: MarketObservabilityReader["readObservability"] = async (pair) =>
  defaultService.readObservability(pair);
export const shutdown: MarketDataModulePublicApi["shutdown"] = async () => defaultService.shutdown();
