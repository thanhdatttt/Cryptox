import { describe, expect, it } from "vitest";
import {
  parseStartSearchRequest,
  type SeededDiscoveryProvenanceDto,
  type StartSearchRequestDto,
} from "./search";

function validRequest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 1,
    searchSpace: {
      availableStrategyDefinitionIds: ["strategy-1", "strategy-2"],
      componentCount: { minimum: 2, maximum: 2 },
      requireDistinctComponents: true,
    },
    stopCondition: { maxCandidates: 10 },
    generatorType: "RANDOM",
    randomSeed: "seed-1",
    leaderboardScopeId: "scope-1",
    candidateTemplate: {
      marketInput: {
        pair: "BTCUSDT",
        timeframe: "5m",
        range: { from: "2026-01-01T00:00:00Z", to: "2026-01-02T00:00:00Z" },
      },
      configuration: {
        executionProfileId: "BACKTEST_EXECUTION_V1",
        initialCapital: 10_000,
        feeRatePercent: 0.1,
        slippageBps: 0,
      },
    },
    maxInFlight: 2,
    ...overrides,
  };
}

const domainProvenance: SeededDiscoveryProvenanceDto = {
  profileId: "DOMAIN_GUIDED_V1",
  algorithmConfiguration: {
    categories: ["Trend", "Momentum"],
    categoryLimit: 2,
  },
  datasetIdentity: {
    datasetId: "dataset-1",
    datasetVersion: "v1",
    provider: "binance",
  },
  code: { applicationVersion: "demo", gitCommit: "abc123" },
  seed: "seed-1",
  defaultBudget: { maxCandidates: 500, maxDurationSeconds: 300 },
};

describe("Search REST contracts", () => {
  it("accepts exactly the three approved generator modes", () => {
    for (const generatorType of ["RANDOM", "DOMAIN_GUIDED", "GENETIC"] as const) {
      const parsed = parseStartSearchRequest(validRequest({ generatorType }));
      expect(parsed.generatorType).toBe(generatorType);
    }

    expect(() => parseStartSearchRequest(validRequest({ generatorType: "BAYESIAN" }))).toThrow(
      "Unsupported search generator",
    );
  });

  it("accepts bounded approved provenance and rejects unsupported or mismatched profiles", () => {
    const parsed = parseStartSearchRequest(
      validRequest({ generatorType: "DOMAIN_GUIDED", seededDiscovery: domainProvenance }),
    );
    expect(parsed.seededDiscovery).toEqual(domainProvenance);

    expect(() =>
      parseStartSearchRequest(
        validRequest({
          generatorType: "DOMAIN_GUIDED",
          seededDiscovery: { ...domainProvenance, profileId: "UNKNOWN_V1" },
        }),
      ),
    ).toThrow("Unsupported seeded discovery profile");
    expect(() =>
      parseStartSearchRequest(
        validRequest({
          generatorType: "GENETIC",
          seededDiscovery: domainProvenance,
        }),
      ),
    ).toThrow("does not match the selected generator");
    expect(() =>
      parseStartSearchRequest(
        validRequest({
          generatorType: "DOMAIN_GUIDED",
          seededDiscovery: {
            ...domainProvenance,
            defaultBudget: { maxCandidates: 501, maxDurationSeconds: 300 },
          },
        }),
      ),
    ).toThrow("Unsupported seeded discovery budget");
    expect(() =>
      parseStartSearchRequest(
        validRequest({
          generatorType: "DOMAIN_GUIDED",
          seededDiscovery: {
            ...domainProvenance,
            algorithmConfiguration: { categories: { nested: true } },
          },
        }),
      ),
    ).toThrow("has an unsupported value");
  });

  it("keeps SearchRun REST status and command types owner-free at the client boundary", () => {
    const request: StartSearchRequestDto = parseStartSearchRequest(
      validRequest({ generatorType: "GENETIC" }),
    );
    expect(request).not.toHaveProperty("userId");
    expect(request).not.toHaveProperty("ownerUserId");
    expect(request.stopCondition.maxCandidates).toBe(10);
  });

  it("preserves the existing RANDOM validation and identity rejection", () => {
    expect(() => parseStartSearchRequest(validRequest({ stopCondition: {} }))).toThrow(
      "At least one finite stop condition is required",
    );
    expect(() =>
      parseStartSearchRequest(
        validRequest({
          searchSpace: {
            availableStrategyDefinitionIds: ["strategy-1", "strategy-1"],
            componentCount: { minimum: 2, maximum: 2 },
            requireDistinctComponents: true,
          },
        }),
      ),
    ).toThrow("Search components must be distinct");
    expect(() => parseStartSearchRequest(validRequest({ maxInFlight: 0 }))).toThrow(
      "must be a positive integer",
    );

    for (const field of ["userId", "ownerUserId"]) {
      expect(() => parseStartSearchRequest(validRequest({ [field]: "attacker-selected" }))).toThrow(
        /identity comes from authenticated context/,
      );
    }
  });
});
