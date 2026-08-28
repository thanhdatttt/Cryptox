import { describe, expect, it } from "vitest";
import {
  SEARCH_GENERATOR_TYPES,
  SEARCH_CANDIDATE_IDENTITY_V1,
  type GeneratedCandidate,
  type SearchRunStatus,
} from "./contracts";
import type { AuthenticatedUserId } from "modules/auth/api";

describe("search public contracts", () => {
  it("freezes seeded RANDOM-only generation over distinct majority components", () => {
    const generated: GeneratedCandidate = {
      candidateKey: '["MAJORITY_VOTE_V1","strategy-1","strategy-2"]',
      compositeLogicalFamilyKey: '["MAJORITY_VOTE_V1","strategy-1","strategy-2"]',
      strategyDefinitionIds: ["strategy-1", "strategy-2"],
      combinationProfileId: "MAJORITY_VOTE_V1",
      generatedBy: "RANDOM",
    };
    expect(SEARCH_GENERATOR_TYPES).toEqual(["RANDOM"]);
    expect(generated.combinationProfileId).toBe("MAJORITY_VOTE_V1");
    expect(generated.candidateKey).toBe(
      '["MAJORITY_VOTE_V1","strategy-1","strategy-2"]',
    );
    expect(generated.compositeLogicalFamilyKey).toBe(generated.candidateKey);
    expect(SEARCH_CANDIDATE_IDENTITY_V1.compositeLogicalFamilyKey).toBe(
      "EQUAL_TO_CANDIDATE_KEY",
    );
  });

  it("owns bounded observable SearchRun state including space exhaustion", () => {
    const status: SearchRunStatus = {
      searchRunId: "run-1",
      ownerUserId: "user-1" as AuthenticatedUserId,
      generatorType: "RANDOM",
      randomSeed: "seed-1",
      searchSpace: {
        availableStrategyDefinitionIds: ["strategy-1", "strategy-2"],
        componentCount: { minimum: 2, maximum: 2 },
        requireDistinctComponents: true,
      },
      stopCondition: { maxCandidates: 10 },
      leaderboardScopeId: "scope-1",
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
      maxInFlight: 2,
      state: "COMPLETED",
      activeCandidateIds: [],
      submittedCandidateCount: 1,
      completedCandidateCount: 1,
      failedCandidateCount: 0,
      averageBacktestDurationMs: 10,
      createdAt: "2026-08-27T00:00:00.000Z",
      updatedAt: "2026-08-27T00:00:00.000Z",
      endedAt: "2026-08-27T00:00:01.000Z",
      stopReason: "SEARCH_SPACE_EXHAUSTED",
    };
    expect(status.stopReason).toBe("SEARCH_SPACE_EXHAUSTED");
    expect(status.ownerUserId).toBe("user-1");
  });

  it("keeps client commands free of owner identity", () => {
    const command = {
      searchSpace: {
        availableStrategyDefinitionIds: ["strategy-1", "strategy-2"],
        componentCount: { minimum: 2, maximum: 2 },
        requireDistinctComponents: true as const,
      },
      stopCondition: { maxCandidates: 1 },
      generatorType: "RANDOM" as const,
      randomSeed: "seed",
      leaderboardScopeId: "scope-1",
      candidateTemplate: {
        marketInput: {
          pair: "BTCUSDT",
          timeframe: "1h",
          range: { from: "2026-01-01T00:00:00Z", to: "2026-02-01T00:00:00Z" },
        },
        configuration: {
          executionProfileId: "BACKTEST_EXECUTION_V1" as const,
          initialCapital: 10_000,
          feeRatePercent: 0.1,
          slippageBps: 0,
        },
      },
      maxInFlight: 1,
    };
    expect(command).not.toHaveProperty("userId");
    expect(command).not.toHaveProperty("ownerUserId");
  });
});
