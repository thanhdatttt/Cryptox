import { createBacktestingModule } from "@cryptox/backtesting/bootstrap";
import { createMarketDataSnapshotReader } from "@cryptox/market-data";
import { createStrategyModule } from "@cryptox/strategy/bootstrap";

export function composeWorkerModules(): Record<string, unknown> {
  const marketData = createMarketDataSnapshotReader({
    snapshotRepository: {
      read: async () => undefined,
      create: async () => {
        throw new Error("NOT_IMPLEMENTED");
      },
    },
    clock: { now: () => new Date().toISOString() },
    observability: { record: () => undefined },
  });
  const modules = {
    backtesting: createBacktestingModule({
      marketData,
      strategy: createStrategyModule(undefined as never),
    }),
    strategy: createStrategyModule(undefined as never),
    marketDataSnapshotReader: marketData,
  };
  return modules;
}
