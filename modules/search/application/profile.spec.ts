import { describe, expect, it } from "vitest";
import type {
  BacktestSubmissionAccepted,
  BacktestingModulePublicApi,
  CandidateProgress,
  SearchCandidateSummary,
  SubmitSearchCandidateCommand,
} from "@cryptox/backtesting";
import type {
  CompositeStrategyDefinition,
  DefineCompositeCommand,
  StrategyModulePublicApi,
} from "@cryptox/strategy";
import type { LeaderboardModulePublicApi } from "@cryptox/leaderboard";
import type { AuthenticatedUserId } from "modules/auth/api";
import type {
  CandidateGenerationRequest,
  GeneratedCandidate,
  SearchCandidateTemplate,
  SearchRunStatus,
} from "../api/contracts";
import { DomainGuidedStrategyGenerator } from "../domain/generators/domain-guided";
import { GeneticStrategyGenerator } from "../domain/generators/genetic";
import { SeededRandomStrategyGenerator } from "../domain/random-generator";
import { InMemorySearchRunRepository } from "./memory";
import type { SearchApplicationDependencies } from "./ports";
import { createSearchApplication } from "./service";

const owner = "q02-owner" as AuthenticatedUserId;
const template: SearchCandidateTemplate = {
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
};

interface StoredCandidate {
  readonly id: string;
  readonly ownerUserId: AuthenticatedUserId;
  readonly command: SubmitSearchCandidateCommand;
}

function makeDependencies() {
  const repository = new InMemorySearchRunRepository();
  const candidates = new Map<string, StoredCandidate>();
  const submissions: SubmitSearchCandidateCommand[] = [];
  let nextCandidateId = 1;
  let nextCompositeId = 1;

  const strategy: Pick<StrategyModulePublicApi, "defineComposite"> = {
    defineComposite: async (
      context,
      command: DefineCompositeCommand,
    ): Promise<CompositeStrategyDefinition> => ({
      id: `q02-composite-${nextCompositeId++}`,
      ownerUserId: context.authenticatedUserId,
      logicalFamilyKey: command.logicalFamilyKey,
      version: 1,
      method: "MAJORITY_VOTE",
      combinationProfileId: "MAJORITY_VOTE_V1",
      components: command.strategyDefinitionIds.map((strategyDefinitionId) => ({
        strategyDefinitionId,
        strategyDefinitionVersion: 1,
      })),
      createdAt: "2026-08-30T00:00:00.000Z",
    }),
  };

  const backtesting: Pick<
    BacktestingModulePublicApi,
    "submitSearchCandidate" | "status" | "summarizeSearchCandidates" | "cancelSearchCandidates"
  > = {
    submitSearchCandidate: async (
      context,
      command,
    ): Promise<BacktestSubmissionAccepted> => {
      const id = `q02-candidate-${nextCandidateId++}`;
      candidates.set(id, { id, ownerUserId: context.authenticatedUserId, command });
      submissions.push(command);
      return { candidateId: id, status: "ACCEPTED" };
    },
    status: async (): Promise<CandidateProgress> => undefined as never,
    summarizeSearchCandidates: async (
      context,
      searchRunId,
    ): Promise<SearchCandidateSummary> => {
      const owned = [...candidates.values()].filter(
        (candidate) =>
          candidate.ownerUserId === context.authenticatedUserId &&
          candidate.command.searchRunId === searchRunId,
      );
      return {
        searchRunId,
        activeCandidateIds: [],
        submittedCandidateCount: owned.length,
        completedCandidateCount: owned.length,
        failedCandidateCount: 0,
        averageBacktestDurationMs: owned.length > 0 ? 1 : null,
      };
    },
    cancelSearchCandidates: async (context, searchRunId) => ({
      candidateIds: [...candidates.values()]
        .filter(
          (candidate) =>
            candidate.ownerUserId === context.authenticatedUserId &&
            candidate.command.searchRunId === searchRunId,
        )
        .map((candidate) => candidate.id),
    }),
  };

  const leaderboard: Pick<LeaderboardModulePublicApi, "getLeaderboardScope" | "rankSearchRun"> = {
    getLeaderboardScope: async (context, id) => ({
      id,
      ownerUserId: context.authenticatedUserId,
      name: "Q-02 scope",
      k: 10,
      rankingConfigurationId: "LINEAR_REQUIRED_V1",
      comparisonKey: "Q02",
      createdAt: "2026-08-30T00:00:00.000Z",
    }),
    rankSearchRun: async (context, searchRunId) =>
      [...candidates.values()]
        .filter(
          (candidate) =>
            candidate.ownerUserId === context.authenticatedUserId &&
            candidate.command.searchRunId === searchRunId,
        )
        .map((candidate, index) => ({
          rank: index + 1,
          searchRunId,
          leaderboardScopeId: candidate.command.leaderboardScopeId,
          candidateId: candidate.id,
          experimentId: `${candidate.id}-experiment`,
          rankingConfigurationId: "LINEAR_REQUIRED_V1",
          score: 100 - index,
        })),
  };

  const dependencies: SearchApplicationDependencies<
    SearchRunStatus,
    CandidateGenerationRequest,
    GeneratedCandidate
  > = {
    searchRunRepository: repository,
    generators: {
      RANDOM: new SeededRandomStrategyGenerator(),
      DOMAIN_GUIDED: new DomainGuidedStrategyGenerator({
        categories: ["Trend", "Momentum"],
        categoryMembers: { Trend: ["trend-a"], Momentum: ["momentum-a"] },
      }),
      GENETIC: new GeneticStrategyGenerator(),
    },
    strategy,
    backtesting,
    leaderboard,
  };
  const ids = ["q02-domain-run", "q02-genetic-run"];
  const app = createSearchApplication(dependencies, {
    idGenerator: () => ids.shift() ?? "q02-extra-run",
    pollIntervalMs: 0,
  });
  return { app, repository, submissions };
}

async function waitForCompleted(
  repository: InMemorySearchRunRepository,
  searchRunId: string,
): Promise<void> {
  const deadline = Date.now() + 1_000;
  while (Date.now() < deadline) {
    if (repository.runs.get(searchRunId)?.state === "COMPLETED") return;
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("timed out waiting for Q-02 SearchRun");
}

describe("Q-02 seeded Search profile wiring", () => {
  it("selects Domain-guided, persists provenance, and applies the bounded budget", async () => {
    const harness = makeDependencies();
    const started = await harness.app.start({ authenticatedUserId: owner }, {
      searchSpace: {
        availableStrategyDefinitionIds: ["momentum-a", "trend-a", "unclassified"],
        componentCount: { minimum: 2, maximum: 2 },
        requireDistinctComponents: true,
      },
      stopCondition: { maxCandidates: 900 },
      generatorType: "DOMAIN_GUIDED",
      randomSeed: "q02-domain-seed",
      leaderboardScopeId: "scope-q02",
      candidateTemplate: template,
      maxInFlight: 1,
      seededDiscovery: {
        profileId: "DOMAIN_GUIDED_V1",
        algorithmConfiguration: {
          categories: ["Trend", "Momentum"],
          categoryMembers: ["Trend=trend-a", "Momentum=momentum-a"],
        },
        datasetIdentity: { datasetId: "dataset-q02", datasetVersion: "v1" },
        code: { applicationVersion: "q02-test" },
        seed: "q02-domain-seed",
        defaultBudget: { maxCandidates: 500, maxDurationSeconds: 300 },
      },
    });
    await waitForCompleted(harness.repository, started.searchRunId);

    const status = await harness.app.status({ authenticatedUserId: owner }, started.searchRunId);
    expect(status.generatorType).toBe("DOMAIN_GUIDED");
    expect(status.stopCondition).toMatchObject({ maxCandidates: 500, maxDurationSeconds: 300 });
    expect(status.seededDiscovery).toMatchObject({
      profileId: "DOMAIN_GUIDED_V1",
      seed: "q02-domain-seed",
      datasetIdentity: { datasetId: "dataset-q02", datasetVersion: "v1" },
      code: { applicationVersion: "q02-test" },
    });
    expect(harness.submissions[0]?.strategySelection.kind).toBe("COMPOSITE");
    expect(harness.submissions[0]?.searchRunId).toBe(started.searchRunId);
  });

  it("selects Genetic through the same lifecycle and retains its configuration", async () => {
    const harness = makeDependencies();
    const started = await harness.app.start({ authenticatedUserId: owner }, {
      searchSpace: {
        availableStrategyDefinitionIds: ["strategy-a", "strategy-b"],
        componentCount: { minimum: 2, maximum: 2 },
        requireDistinctComponents: true,
      },
      stopCondition: { maxCandidates: 1 },
      generatorType: "GENETIC",
      randomSeed: "q02-genetic-seed",
      leaderboardScopeId: "scope-q02",
      candidateTemplate: template,
      maxInFlight: 1,
      seededDiscovery: {
        profileId: "GENETIC_V1",
        algorithmConfiguration: {
          population: 50,
          maximumGenerations: 10,
          elitePercent: 0.1,
          mutationPercent: 0.2,
        },
        datasetIdentity: { provider: "fixture" },
        code: { gitCommit: "q02-test-commit" },
        seed: "q02-genetic-seed",
        defaultBudget: { maxCandidates: 500, maxDurationSeconds: 300 },
      },
    });
    await waitForCompleted(harness.repository, started.searchRunId);

    const status = await harness.app.status({ authenticatedUserId: owner }, started.searchRunId);
    expect(status.generatorType).toBe("GENETIC");
    expect(status.stopReason).toBe("MAX_CANDIDATES");
    expect(status.seededDiscovery?.profileId).toBe("GENETIC_V1");
    expect(status.seededDiscovery?.algorithmConfiguration).toMatchObject({
      population: 50,
      maximumGenerations: 10,
      elitePercent: 0.1,
      mutationPercent: 0.2,
    });
  });
});
