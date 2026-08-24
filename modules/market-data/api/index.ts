export type {
  Candle,
  DatasetSnapshotRef,
  MarketDataConnectionStatus,
  MarketTick,
  Pair,
  ProviderId,
  Timeframe,
} from "../domain/contracts";
export interface HistoricalCandleQuery {
  pair: import("../domain/contracts").Pair;
  timeframe: import("../domain/contracts").Timeframe;
  range?: { from: string; to: string };
  limit?: number;
  cursor?: string;
  includeForming?: boolean;
  completeness?: "ALLOW_PARTIAL" | "REQUIRE_COMPLETE";
}
export interface HistoricalCandlePage {
  pair: string;
  timeframe: import("../domain/contracts").Timeframe;
  range: { from: string; to: string };
  candles: import("../domain/contracts").Candle[];
  complete: boolean;
  missingRanges: Array<{ from: string; to: string }>;
  formingIncluded: boolean;
  asOf: string;
  nextCursor?: string;
}
export interface DatasetSnapshotCreateCommand {
  pair: string;
  timeframe: import("../domain/contracts").Timeframe;
  range: { from: string; to: string };
}
export interface DatasetSnapshotPage {
  snapshot: import("../domain/contracts").DatasetSnapshotRef;
  candles: import("../domain/contracts").Candle[];
  nextCursor?: string;
}
export interface DatasetSnapshotReadQuery {
  snapshotId: string;
  cursor?: string;
  limit?: number;
}
export interface MarketSubscription {
  pair: string;
  timeframe: import("../domain/contracts").Timeframe;
}
export type MarketDataUpdate =
  | { kind: "TICK"; payload: import("../domain/contracts").MarketTick }
  | { kind: "CANDLE"; payload: import("../domain/contracts").Candle }
  | {
      kind: "CONNECTION_STATUS";
      payload: import("../domain/contracts").MarketDataConnectionStatus;
    };
export interface MarketDataError {
  code: "INVALID_PAIR" | "INVALID_TIMEFRAME" | "RANGE_TOO_LARGE" | "INVALID_CURSOR";
  message: string;
}
export interface MarketDataModulePublicApi {
  readCandles(query: HistoricalCandleQuery): Promise<HistoricalCandlePage>;
  createDatasetSnapshot(
    command: DatasetSnapshotCreateCommand,
  ): Promise<import("../domain/contracts").DatasetSnapshotRef>;
  readDatasetSnapshot(query: DatasetSnapshotReadQuery): Promise<DatasetSnapshotPage>;
  subscribeMarketData(
    subscriptions: MarketSubscription[],
    sink: (update: MarketDataUpdate) => void,
  ): Promise<() => Promise<void>>;
  shutdown(): Promise<void>;
}
export type MarketDataSnapshotReader = Pick<MarketDataModulePublicApi, "readDatasetSnapshot">;
const notImplemented = (): never => {
  throw new Error("NOT_IMPLEMENTED");
};
export const readCandles: MarketDataModulePublicApi["readCandles"] = async () => notImplemented();
export const createDatasetSnapshot: MarketDataModulePublicApi["createDatasetSnapshot"] = async () =>
  notImplemented();
export const readDatasetSnapshot: MarketDataModulePublicApi["readDatasetSnapshot"] = async () =>
  notImplemented();
export const subscribeMarketData: MarketDataModulePublicApi["subscribeMarketData"] = async () =>
  notImplemented();
export const shutdown: MarketDataModulePublicApi["shutdown"] = async () => notImplemented();
export { createMarketDataSnapshotReader } from "./snapshot-reader";
