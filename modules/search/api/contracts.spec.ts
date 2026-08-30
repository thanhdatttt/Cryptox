import { describe, expect, it } from "vitest";
import {
  SEARCH_GENERATOR_TYPES,
  SEARCH_CANDIDATE_IDENTITY_V1,
  type GeneratorType,
  type GeneratedCandidate,
  type SearchRunStatus,
  type StartSearchCommand,
} from "./contracts";
import type { AuthenticatedUserId } from "modules/auth/api";

describe("search public contracts", () => {
  it("represents all approved generator modes without changing the candidate form", () => {
    const generated: GeneratedCandidate = {
      candidateKey: '["MAJORITY_VOTE_V1","strategy-1","strategy-2"]',
      compositeLogicalFamilyKey: '["MAJORITY_VOTE_V1","strategy-1","strategy-2"]',
      strategyDefinitionIds: ["strategy-1", "strategy-2"],
      combinationProfileId: "MAJORITY_VOTE_V1",
      generatedBy: "RANDOM",
    };
    expect(SEARCH_GENERATOR_TYPES).toEqual(["RANDOM", "DOMAIN_GUIDED", "GENETIC"]);
    expect(generated.combinationProfileId).toBe("MAJORITY_VOTE_V1");
    expect(generated.candidateKey).toBe(
      '["MAJORITY_VOTE_V1","strategy-1","strategy-2"]',
    );
    expect(generated.compositeLogicalFamilyKey).toBe(generated.candidateKey);
    expect(SEARCH_CANDIDATE_IDENTITY_V1.compositeLogicalFamilyKey).toBe(
      "EQUAL_TO_CANDIDATE_KEY",
    );

    const approvedModes: readonly GeneratorType[] = [
      "RANDOM",
      "DOMAIN_GUIDED",
      "GENETIC",
    ];
    for (const generatedBy of approvedModes) {
      const candidate: GeneratedCandidate = { ...generated, generatedBy };
      expect(candidate.strategyDefinitionIds).toEqual(["strategy-1", "strategy-2"]);
      expect(candidate.candidateKey).toBe(generated.candidateKey);
    }
  });

  it("owns bounded observable SearchRun state including space exhaustion", () => {
    const status: SearchRunStatus = {
      searchRunId: "run-1",
      ownerUserId: "user-1" as AuthenticatedUserId,
      generatorType: "GENETIC",
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
      seededDiscovery: {
        profileId: "GENETIC_V1",
        algorithmConfiguration: {
          population: 50,
          mutationPercent: 0.2,
        },
        datasetIdentity: { datasetId: "dataset-1", datasetVersion: "v1" },
        code: { gitCommit: "abc123" },
        seed: "seed-1",
        defaultBudget: { maxCandidates: 500, maxDurationSeconds: 300 },
      },
    };
    expect(status.stopReason).toBe("SEARCH_SPACE_EXHAUSTED");
    expect(status.ownerUserId).toBe("user-1");
    expect(status.generatorType).toBe("GENETIC");
    expect(status.seededDiscovery?.profileId).toBe("GENETIC_V1");
    expect(status.seededDiscovery?.defaultBudget.maxCandidates).toBe(500);
  });

  it("keeps client commands free of owner identity", () => {
    const command: StartSearchCommand = {
      searchSpace: {
        availableStrategyDefinitionIds: ["strategy-1", "strategy-2"],
        componentCount: { minimum: 2, maximum: 2 },
        requireDistinctComponents: true as const,
      },
      stopCondition: { maxCandidates: 1 },
      generatorType: "DOMAIN_GUIDED",
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
      seededDiscovery: {
        profileId: "DOMAIN_GUIDED_V1",
        algorithmConfiguration: { categories: ["Trend", "Momentum"] },
        datasetIdentity: { provider: "binance" },
        code: { applicationVersion: "demo" },
        seed: "seed",
        defaultBudget: { maxCandidates: 500, maxDurationSeconds: 300 },
      },
    };
    expect(command).not.toHaveProperty("userId");
    expect(command).not.toHaveProperty("ownerUserId");
  });
});
