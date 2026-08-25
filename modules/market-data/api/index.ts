import { createMarketDataService } from "../application/service";
import type { MarketPairMetadata, Pair, ProviderId, Timeframe } from "../domain/contracts";
export type { Candle, DatasetSnapshotRef, MarketDataConnectionStatus, MarketTick, Pair, ProviderId, Timeframe, MarketPairMetadata } from "../domain/contracts";
export interface HistoricalCandleQuery { pair: import("../domain/contracts").Pair; timeframe: import("../domain/contracts").Timeframe; range?: { from: string; to: string }; limit?: number; cursor?: string; includeForming?: boolean; completeness?: "ALLOW_PARTIAL" | "REQUIRE_COMPLETE"; }
export interface HistoricalCandlePage { pair: string; timeframe: import("../domain/contracts").Timeframe; range: { from: string; to: string }; candles: import("../domain/contracts").Candle[]; complete: boolean; missingRanges: Array<{ from: string; to: string }>; formingIncluded: boolean; asOf: string; nextCursor?: string; }
export interface DatasetSnapshotCreateCommand { pair: string; timeframe: import("../domain/contracts").Timeframe; range: { from: string; to: string }; }
export interface DatasetSnapshotPage { snapshot: import("../domain/contracts").DatasetSnapshotRef; candles: import("../domain/contracts").Candle[]; nextCursor?: string; }
export interface DatasetSnapshotReadQuery { snapshotId: string; cursor?: string; limit?: number; }
export interface MarketSubscription { pair: string; timeframe: import("../domain/contracts").Timeframe; }
export interface MarketCapabilities { provider: ProviderId; pairs: Pair[]; timeframes: Timeframe[]; }
export type MarketDataUpdate = { kind: "TICK"; payload: import("../domain/contracts").MarketTick } | { kind: "CANDLE"; payload: import("../domain/contracts").Candle } | { kind: "CONNECTION_STATUS"; payload: import("../domain/contracts").MarketDataConnectionStatus };
export interface MarketDataError { code: string; message: string; retryable: boolean; details?: Record<string, unknown>; }
export interface MarketDataModulePublicApi { readCapabilities(): Promise<MarketCapabilities>; readPairMetadata(pair: Pair): Promise<MarketPairMetadata>; readCandles(query: HistoricalCandleQuery): Promise<HistoricalCandlePage>; createDatasetSnapshot(command: DatasetSnapshotCreateCommand): Promise<import("../domain/contracts").DatasetSnapshotRef>; readDatasetSnapshot(query: DatasetSnapshotReadQuery): Promise<DatasetSnapshotPage>; subscribeMarketData(subscriptions: MarketSubscription[], sink: (update: MarketDataUpdate) => void): Promise<() => Promise<void>>; shutdown(): Promise<void>; }
export type MarketDataSnapshotReader = Pick<MarketDataModulePublicApi, "readDatasetSnapshot">;
const defaultService = createMarketDataService();
export const readCapabilities: MarketDataModulePublicApi["readCapabilities"] = () => defaultService.readCapabilities();
export const readPairMetadata: MarketDataModulePublicApi["readPairMetadata"] = (pair) => defaultService.readPairMetadata(pair);
export const readCandles: MarketDataModulePublicApi["readCandles"] = (query) => defaultService.readCandles(query);
export const createDatasetSnapshot: MarketDataModulePublicApi["createDatasetSnapshot"] = (command) => defaultService.createDatasetSnapshot(command);
export const readDatasetSnapshot: MarketDataModulePublicApi["readDatasetSnapshot"] = (query) => defaultService.readDatasetSnapshot(query);
export const subscribeMarketData: MarketDataModulePublicApi["subscribeMarketData"] = (subscriptions, sink) => defaultService.subscribeMarketData(subscriptions, sink);
export const shutdown: MarketDataModulePublicApi["shutdown"] = () => defaultService.shutdown();
export { createMarketDataService } from "../application/service";
export { createMarketDataSnapshotReader } from "./snapshot-reader";
