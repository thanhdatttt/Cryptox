import type { MarketDataModuleDependencies } from "../application/ports";
import type { MarketDataSnapshotReader } from "./contracts";
import { MarketDataApplicationService } from "../application/service";

export function createMarketDataSnapshotReader(
  deps: Pick<MarketDataModuleDependencies, "snapshotRepository" | "clock" | "observability">,
): MarketDataSnapshotReader {
  const service = new MarketDataApplicationService({
    providers: [],
    candleRepository: { upsertMany: async () => undefined, read: async () => [] },
    snapshotRepository: deps.snapshotRepository,
    clock: deps.clock,
    observability: deps.observability,
  });
  return {
    readDatasetSnapshot: (query) => service.readDatasetSnapshot(query),
  };
}
