import { createBacktestingModule } from "modules/backtesting/api/bootstrap";
import { createMarketDataSnapshotReader } from "modules/market-data/api/snapshot-reader";
import { createSentimentModule } from "modules/sentiment/api/bootstrap";
import { createStrategyModule } from "modules/strategy/api/bootstrap";

export function composeWorkerModules(): Record<string, unknown> {
  const marketData = createMarketDataSnapshotReader({ snapshotRepository: { read: async () => undefined, create: async () => { throw new Error("NOT_IMPLEMENTED"); } }, clock: { now: () => new Date().toISOString() }, observability: { record: () => undefined } });
  const sentiment = createSentimentModule({
    analysis: { analyze: async () => { throw new Error("NOT_IMPLEMENTED"); } },
    resultRepository: { insert: async (result) => result, readLatestForNews: async () => undefined },
    snapshotRepository: { insertSealed: async (ref) => ref, readAt: () => undefined },
    clock: { now: () => new Date().toISOString() },
  });
  const modules = {
    backtesting: createBacktestingModule({ marketData, strategy: createStrategyModule(undefined as never), sentiment }),
    strategy: createStrategyModule(undefined as never),
    marketDataSnapshotReader: marketData,
    sentimentRead: sentiment,
  };
  return modules;
}
