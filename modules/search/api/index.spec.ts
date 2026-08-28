import { describe, expect, it } from "vitest";
import * as searchApi from "./index";

describe("search public entrypoint", () => {
  it("allowlists the bounded SearchRun facade", async () => {
    expect(Object.keys(searchApi).sort()).toEqual(
      [
        "SEARCH_CANDIDATE_IDENTITY_V1",
        "SEARCH_GENERATOR_TYPES",
        "cancel",
        "leaderboard",
        "list",
        "pause",
        "resume",
        "start",
        "status",
      ].sort(),
    );
    await expect(
      searchApi.start({ authenticatedUserId: "user-1" as never }, {
        searchSpace: {
          availableStrategyDefinitionIds: ["one", "two"],
          componentCount: { minimum: 2, maximum: 2 },
          requireDistinctComponents: true,
        },
        stopCondition: { maxCandidates: 1 },
        generatorType: "RANDOM",
        randomSeed: "seed",
        leaderboardScopeId: "scope",
        candidateTemplate: {
          marketInput: {
            pair: "BTCUSDT",
            timeframe: "1h",
            range: { from: "2026-01-01T00:00:00Z", to: "2026-02-01T00:00:00Z" },
          },
          configuration: {
            executionProfileId: "BACKTEST_EXECUTION_V1",
            initialCapital: 10_000,
            feeRatePercent: 0.1,
            slippageBps: 0,
          },
        },
        maxInFlight: 1,
      }),
    ).rejects.toThrow("NOT_IMPLEMENTED");
  });
});
