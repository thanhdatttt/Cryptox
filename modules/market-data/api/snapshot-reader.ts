import type { MarketDataModuleDependencies } from "../application/ports";
import type { MarketDataSnapshotReader } from "./contracts";

export function createMarketDataSnapshotReader(
  _deps: Pick<MarketDataModuleDependencies, "snapshotRepository" | "clock" | "observability">,
): MarketDataSnapshotReader {
  return {
    readDatasetSnapshot: async (_query) => {
      throw new Error("NOT_IMPLEMENTED");
    },
  };
}
