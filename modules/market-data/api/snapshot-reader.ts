import type { MarketDataModuleDependencies } from "../application/ports";
import type { Candle, DatasetSnapshotRef } from "../domain/contracts";

interface DatasetSnapshotReadQuery {
  snapshotId: string;
  cursor?: string;
  limit?: number;
}
interface DatasetSnapshotPage {
  snapshot: DatasetSnapshotRef;
  candles: Candle[];
  nextCursor?: string;
}
interface MarketDataSnapshotReader {
  readDatasetSnapshot(query: DatasetSnapshotReadQuery): Promise<DatasetSnapshotPage>;
}

export function createMarketDataSnapshotReader(
  _deps: Pick<MarketDataModuleDependencies, "snapshotRepository" | "clock" | "observability">,
): MarketDataSnapshotReader {
  return {
    readDatasetSnapshot: async (_query) => {
      throw new Error("NOT_IMPLEMENTED");
    },
  };
}
