import type { MarketDataModuleDependencies } from "../application/ports";
import type { DatasetSnapshotPage, DatasetSnapshotReadQuery } from "./index";
interface MarketDataSnapshotReader {
    readDatasetSnapshot(query: DatasetSnapshotReadQuery): Promise<DatasetSnapshotPage>;
}
export declare function createMarketDataSnapshotReader(deps: Pick<MarketDataModuleDependencies, "snapshotRepository" | "clock" | "observability">): MarketDataSnapshotReader;
export {};
