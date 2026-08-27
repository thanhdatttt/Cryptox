import type {
  DatasetSnapshotCreateCommand,
  DatasetSnapshotPage,
  DatasetSnapshotReadQuery,
  DatasetSnapshotRef,
  HistoricalCandlePage,
  HistoricalCandleQuery,
  MarketDataModulePublicApi,
  MarketDataUpdate,
  MarketSubscription,
} from "./contracts";

export * from "./contracts";

const notImplemented = (): never => {
  throw new Error("NOT_IMPLEMENTED");
};

export const readCandles = async (_query: HistoricalCandleQuery): Promise<HistoricalCandlePage> =>
  notImplemented();
export const createDatasetSnapshot = async (
  _command: DatasetSnapshotCreateCommand,
): Promise<DatasetSnapshotRef> => notImplemented();
export const readDatasetSnapshot = async (
  _query: DatasetSnapshotReadQuery,
): Promise<DatasetSnapshotPage> => notImplemented();
export const subscribeMarketData = async (
  _subscriptions: readonly MarketSubscription[],
  _sink: (update: MarketDataUpdate) => void,
): Promise<() => Promise<void>> => notImplemented();
export const shutdown: MarketDataModulePublicApi["shutdown"] = async () => notImplemented();
