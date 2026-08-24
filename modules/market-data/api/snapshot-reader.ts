import type { MarketDataModuleDependencies } from "../application/ports";
import { createMarketDataService } from "../application/service";
import type { DatasetSnapshotPage, DatasetSnapshotReadQuery } from "./index";

interface MarketDataSnapshotReader { readDatasetSnapshot(query: DatasetSnapshotReadQuery): Promise<DatasetSnapshotPage>; }

export function createMarketDataSnapshotReader(deps: Pick<MarketDataModuleDependencies, "snapshotRepository" | "clock" | "observability">): MarketDataSnapshotReader {
  return { readDatasetSnapshot: createMarketDataService(deps).readDatasetSnapshot };
}
