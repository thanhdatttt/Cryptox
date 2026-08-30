import { describe, expect, it } from "vitest";
import type {
  CandidateGenerationRequest,
  SearchRunStatus,
  StartSearchCommand,
} from "./contracts";
import { createSearchGeneratorRegistry } from "./registry";
import { createSearchModule } from "./bootstrap";

const searchSpace = {
  availableStrategyDefinitionIds: [
    "momentum-a",
    "momentum-b",
    "trend-a",
    "trend-b",
  ],
  componentCount: { minimum: 2, maximum: 2 },
  requireDistinctComponents: true as const,
};

const domainGuided = {
  categories: ["Trend", "Momentum"],
  categoryMembers: {
    Momentum: ["momentum-b", "momentum-a"],
    Trend: ["trend-b", "trend-a"],
  },
} as const;

function request(
  iterationNumber: number,
  previouslyGeneratedCandidateKeys: readonly string[] = [],
): CandidateGenerationRequest {
  return {
    searchSpace,
    randomSeed: "public-search-seed",
    iterationNumber,
    previouslyGeneratedCandidateKeys,
  };
}

describe("Search public generator composition", () => {
  it("exposes every approved profile with explicit deterministic configuration", () => {
    const registry = createSearchGeneratorRegistry({ domainGuided });

    expect(registry.registrations.map((entry) => entry.profileId)).toEqual([
      "RANDOM_V1",
      "DOMAIN_GUIDED_V1",
      "GENETIC_V1",
    ]);
    expect(registry.registrations.map((entry) => entry.generatorType)).toEqual([
      "RANDOM",
      "DOMAIN_GUIDED",
      "GENETIC",
    ]);
    expect(registry.registrations.map((entry) => entry.generator)).toEqual([
      registry.RANDOM,
      registry.DOMAIN_GUIDED,
      registry.GENETIC,
    ]);
    expect(registry.registrations.map((entry) => entry.algorithmConfiguration)).toEqual([
      {},
      {
        categories: ["Momentum", "Trend"],
        categoryMembers: [
          "Momentum=momentum-a",
          "Momentum=momentum-b",
          "Trend=trend-a",
          "Trend=trend-b",
        ],
      },
      {
        population: 50,
        maximumGenerations: 10,
        elitePercent: 0.1,
        mutationPercent: 0.2,
      },
    ]);
  });

  it("freezes the registry, registrations, metadata, and generator instances", () => {
    const registry = createSearchGeneratorRegistry({ domainGuided });

    expect(Object.isFrozen(registry)).toBe(true);
    expect(Object.isFrozen(registry.registrations)).toBe(true);
    for (const entry of registry.registrations) {
      expect(Object.isFrozen(entry)).toBe(true);
      expect(Object.isFrozen(entry.generator)).toBe(true);
      expect(Object.isFrozen(entry.algorithmConfiguration)).toBe(true);
    }
    expect(() => {
      (registry.registrations as unknown as Array<unknown>).push(registry.registrations[0]);
    }).toThrow(TypeError);
    expect(() => {
      (registry as unknown as { RANDOM: unknown }).RANDOM = registry.GENETIC;
    }).toThrow(TypeError);
  });

  it("replays the same generator behavior and composes directly with createSearchModule", async () => {
    const first = createSearchGeneratorRegistry({ domainGuided });
    const second = createSearchGeneratorRegistry({ domainGuided });

    for (const profile of ["RANDOM", "DOMAIN_GUIDED", "GENETIC"] as const) {
      const firstKeys: string[] = [];
      const secondKeys: string[] = [];
      for (let iteration = 1; iteration <= 3; iteration += 1) {
        const firstCandidate = first[profile].generate(request(iteration, firstKeys));
        const secondCandidate = second[profile].generate(request(iteration, secondKeys));
        expect(secondCandidate).toEqual(firstCandidate);
        firstKeys.push(firstCandidate.candidateKey);
        secondKeys.push(secondCandidate.candidateKey);
      }
    }

    const profileRuns = [
      ["RANDOM", first.RANDOM, undefined],
      ["DOMAIN_GUIDED", first.DOMAIN_GUIDED, "DOMAIN_GUIDED_V1"],
      ["GENETIC", first.GENETIC, "GENETIC_V1"],
    ] as const;
    for (const [generatorType, generator, profileId] of profileRuns) {
      let savedStatus: SearchRunStatus | undefined;
      let submitted = false;
      let compositeCall = 0;
      const module = createSearchModule({
        searchRunRepository: {
          getByOwnerAndId: async () => savedStatus,
          save: async (_ownerUserId, status) => {
            savedStatus = status;
            return status;
          },
          listByOwner: async () => ({ items: savedStatus ? [savedStatus] : [] }),
        },
        generators: first,
        strategy: {
          defineComposite: async (context, command) => ({
            id: `composition-composite-${compositeCall++}`,
            ownerUserId: context.authenticatedUserId,
            logicalFamilyKey: command.logicalFamilyKey,
            version: 1,
            method: "MAJORITY_VOTE",
            combinationProfileId: "MAJORITY_VOTE_V1",
            components: command.strategyDefinitionIds.map((strategyDefinitionId) => ({
              strategyDefinitionId,
              strategyDefinitionVersion: 1,
            })),
            createdAt: "2026-08-31T00:00:00.000Z",
          }),
        },
        backtesting: {
          submitSearchCandidate: async () => {
            submitted = true;
            return { candidateId: `composition-candidate-${generatorType}`, status: "ACCEPTED" };
          },
          status: async () => undefined as never,
          summarizeSearchCandidates: async (context, searchRunId) => ({
            searchRunId,
            activeCandidateIds: [],
            submittedCandidateCount: submitted ? 1 : 0,
            completedCandidateCount: submitted ? 1 : 0,
            failedCandidateCount: 0,
            averageBacktestDurationMs: submitted ? 1 : null,
          }),
          cancelSearchCandidates: async () => ({ candidateIds: [] }),
        },
        leaderboard: {
          getLeaderboardScope: async (context, id) => ({
            id,
            ownerUserId: context.authenticatedUserId,
            name: "composition-scope",
            k: 10,
            rankingConfigurationId: "LINEAR_REQUIRED_V1",
            comparisonKey: "COMPOSITION",
            createdAt: "2026-08-31T00:00:00.000Z",
          }),
          rankSearchRun: async () => [],
        },
      }, {
        idGenerator: () => `composition-run-${generatorType}`,
        pollIntervalMs: 0,
      });

      const command: StartSearchCommand = {
        searchSpace,
        stopCondition: { maxCandidates: 1 },
        generatorType,
        randomSeed: "public-search-seed",
        leaderboardScopeId: "composition-scope",
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
        ...(profileId
          ? {
              seededDiscovery: {
                profileId,
                algorithmConfiguration: generator.algorithmConfiguration,
                datasetIdentity: { provider: "fixture" },
                code: { applicationVersion: "composition-test" },
                seed: "public-search-seed",
                defaultBudget: { maxCandidates: 500, maxDurationSeconds: 300 },
              },
            }
          : {}),
      };
      await module.start({ authenticatedUserId: "composition-owner" as never }, command);

      const deadline = Date.now() + 1_000;
      while (savedStatus?.state !== "COMPLETED" && Date.now() < deadline) {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
      expect(savedStatus?.state).toBe("COMPLETED");
      expect(compositeCall).toBe(1);
      expect(savedStatus?.submittedCandidateCount).toBe(1);
    }
  });
});
