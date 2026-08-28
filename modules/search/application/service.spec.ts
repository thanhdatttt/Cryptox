import { describe, expect, it } from "vitest";
import type {
  BacktestingModulePublicApi,
  CandidateProgress,
  CandidateStatus,
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
import { InMemorySearchRunRepository } from "./memory";
import type { SearchApplicationDependencies } from "./ports";
import { createSearchApplication, SearchApplicationError } from "./service";
import { SeededRandomStrategyGenerator } from "../domain/random-generator";

const ownerA = "user-a" as AuthenticatedUserId;
const ownerB = "user-b" as AuthenticatedUserId;

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

interface FakeCandidate {
  id: string;
  ownerUserId: AuthenticatedUserId;
  command: SubmitSearchCandidateCommand;
  status: CandidateStatus;
}

interface HarnessOptions {
  candidateStatus?: CandidateStatus;
  score?: number;
  idPrefix?: string;
  scopeOwnerUserId?: AuthenticatedUserId;
  compositeDelayMs?: number;
  submissionDelayMs?: number;
}

function makeHarness(options: HarnessOptions = {}) {
  const repository = new InMemorySearchRunRepository();
  const candidates = new Map<string, FakeCandidate>();
  const submitted: Array<{
    ownerUserId: AuthenticatedUserId;
    command: SubmitSearchCandidateCommand;
  }> = [];
  const compositeCalls: Array<{
    ownerUserId: AuthenticatedUserId;
    command: DefineCompositeCommand;
  }> = [];
  const cancelled: Array<{ ownerUserId: AuthenticatedUserId; searchRunId: string }> = [];
  let nextCandidateId = 1;
  let nextCompositeId = 1;
  const candidateStatus = options.candidateStatus ?? "SUCCEEDED";
  const score = options.score ?? 10;
  const idPrefix = options.idPrefix ?? "run";
  const scopeOwnerUserId = options.scopeOwnerUserId;
  const compositeDelayMs = options.compositeDelayMs ?? 0;
  const submissionDelayMs = options.submissionDelayMs ?? 0;
  let submissionStarted = 0;

  const delay = async (milliseconds: number): Promise<void> => {
    if (milliseconds > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
    }
  };

  const strategy: Pick<StrategyModulePublicApi, "defineComposite"> = {
    defineComposite: async (
      context,
      command,
    ): Promise<CompositeStrategyDefinition> => {
      await delay(compositeDelayMs);
      compositeCalls.push({ ownerUserId: context.authenticatedUserId, command });
      return {
        id: `composite-${nextCompositeId++}`,
        ownerUserId: context.authenticatedUserId,
        logicalFamilyKey: command.logicalFamilyKey,
        version: 1,
        method: "MAJORITY_VOTE",
        combinationProfileId: "MAJORITY_VOTE_V1",
        components: command.strategyDefinitionIds.map((strategyDefinitionId) => ({
          strategyDefinitionId,
          strategyDefinitionVersion: 1,
        })),
        createdAt: "2026-08-28T00:00:00.000Z",
      };
    },
  };

  const progress = (candidate: FakeCandidate): CandidateProgress => ({
    candidateId: candidate.id,
    ownerUserId: candidate.ownerUserId,
    origin: {
      kind: "SEARCH",
      searchRunId: candidate.command.searchRunId,
      leaderboardScopeId: candidate.command.leaderboardScopeId,
      iterationNumber: candidate.command.iterationNumber,
    },
    strategySelection: candidate.command.strategySelection,
    marketInput: candidate.command.marketInput,
    status: candidate.status,
    ...(candidate.status === "FAILED"
      ? { failure: { code: "SIMULATION_FAILED" as const, message: "fixture failure" } }
      : {}),
    createdAt: "2026-08-28T00:00:00.000Z",
    ...(candidate.status === "SUCCEEDED" || candidate.status === "FAILED"
      ? { startedAt: "2026-08-28T00:00:00.000Z", completedAt: "2026-08-28T00:00:00.005Z", durationMs: 5 }
      : {}),
    updatedAt: "2026-08-28T00:00:00.005Z",
  });

  const backtesting: Pick<
    BacktestingModulePublicApi,
    "submitSearchCandidate" | "status" | "summarizeSearchCandidates" | "cancelSearchCandidates"
  > = {
    submitSearchCandidate: async (context, command) => {
      submissionStarted += 1;
      await delay(submissionDelayMs);
      const id = `${idPrefix}-candidate-${nextCandidateId++}`;
      candidates.set(id, { id, ownerUserId: context.authenticatedUserId, command, status: candidateStatus });
      submitted.push({ ownerUserId: context.authenticatedUserId, command });
      return { candidateId: id, status: "ACCEPTED" };
    },
    status: async (context, candidateId) => {
      const candidate = candidates.get(candidateId);
      if (!candidate || candidate.ownerUserId !== context.authenticatedUserId) {
        throw new Error("NOT_FOUND");
      }
      return progress(candidate);
    },
    summarizeSearchCandidates: async (context, searchRunId) => {
      const runCandidates = [...candidates.values()].filter(
        (candidate) =>
          candidate.ownerUserId === context.authenticatedUserId &&
          candidate.command.searchRunId === searchRunId,
      );
      const activeCandidateIds = runCandidates
        .filter((candidate) => candidate.status === "ACCEPTED" || candidate.status === "RUNNING")
        .map((candidate) => candidate.id);
      const completedCandidateCount = runCandidates.filter((candidate) => candidate.status === "SUCCEEDED").length;
      const failedCandidateCount = runCandidates.filter((candidate) => candidate.status === "FAILED").length;
      return {
        searchRunId,
        activeCandidateIds,
        submittedCandidateCount: runCandidates.length,
        completedCandidateCount,
        failedCandidateCount,
        averageBacktestDurationMs: completedCandidateCount + failedCandidateCount > 0 ? 5 : null,
      };
    },
    cancelSearchCandidates: async (context, searchRunId) => {
      const candidateIds: string[] = [];
      for (const candidate of candidates.values()) {
        if (
          candidate.ownerUserId === context.authenticatedUserId &&
          candidate.command.searchRunId === searchRunId &&
          (candidate.status === "ACCEPTED" || candidate.status === "RUNNING")
        ) {
          candidate.status = "CANCELLED";
          candidateIds.push(candidate.id);
        }
      }
      cancelled.push({ ownerUserId: context.authenticatedUserId, searchRunId });
      return { candidateIds };
    },
  };

  const leaderboard: Pick<LeaderboardModulePublicApi, "getLeaderboardScope" | "rankSearchRun"> = {
    getLeaderboardScope: async (context, id) => {
      if (scopeOwnerUserId !== undefined) {
        return {
          id,
          ownerUserId: scopeOwnerUserId,
          name: "Fixture scope",
          k: 10,
          rankingConfigurationId: "LINEAR_REQUIRED_V1",
          comparisonKey: "fixture",
          createdAt: "2026-08-28T00:00:00.000Z",
        };
      }
      return {
        id,
        ownerUserId: context.authenticatedUserId,
        name: "Fixture scope",
        k: 10,
        rankingConfigurationId: "LINEAR_REQUIRED_V1",
        comparisonKey: "fixture",
        createdAt: "2026-08-28T00:00:00.000Z",
      };
    },
    rankSearchRun: async (context: { authenticatedUserId: AuthenticatedUserId }, searchRunId: string) =>
      [...candidates.values()]
        .filter(
          (candidate) =>
            candidate.ownerUserId === context.authenticatedUserId &&
            candidate.command.searchRunId === searchRunId &&
            candidate.status === "SUCCEEDED",
        )
        .map((candidate, index) => ({
          rank: index + 1,
          searchRunId,
          leaderboardScopeId: candidate.command.leaderboardScopeId,
          candidateId: candidate.id,
          experimentId: `${candidate.id}-experiment`,
          rankingConfigurationId: "LINEAR_REQUIRED_V1",
          score,
        })),
  };

  const dependencies: SearchApplicationDependencies<
    SearchRunStatus,
    CandidateGenerationRequest,
    GeneratedCandidate
  > = {
    searchRunRepository: repository,
    generators: { RANDOM: new SeededRandomStrategyGenerator() },
    strategy,
    backtesting,
    leaderboard,
  };
  const runIds = [`${idPrefix}-1`, `${idPrefix}-2`, `${idPrefix}-3`, `${idPrefix}-4`];
  const app = createSearchApplication(dependencies, {
    idGenerator: () => runIds.shift() ?? `${idPrefix}-generated`,
    pollIntervalMs: 1,
  });

  return { app, repository, candidates, submitted, compositeCalls, cancelled, get submissionStarted() { return submissionStarted; } };
}

function command(overrides: Partial<Parameters<ReturnType<typeof makeHarness>["app"]["start"]>[1]> = {}) {
  return {
    searchSpace: {
      availableStrategyDefinitionIds: ["strategy-a", "strategy-b", "strategy-c"],
      componentCount: { minimum: 2, maximum: 2 },
      requireDistinctComponents: true as const,
    },
    stopCondition: { maxCandidates: 1 },
    generatorType: "RANDOM" as const,
    randomSeed: "q-01-seed",
    leaderboardScopeId: "scope-a",
    candidateTemplate: template,
    maxInFlight: 1,
    ...overrides,
  };
}

async function waitFor(check: () => boolean, timeoutMs = 1_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (check()) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("timed out waiting for SearchRun fake-port state");
}

describe("Search application fake-port phase", () => {
  it("propagates trusted ownership through definitions and candidate submission", async () => {
    const harness = makeHarness();
    const started = await harness.app.start({ authenticatedUserId: ownerA }, command());
    await waitFor(() => harness.repository.runs.get(started.searchRunId)?.state === "COMPLETED");

    const status = await harness.app.status({ authenticatedUserId: ownerA }, started.searchRunId);
    expect(status.ownerUserId).toBe(ownerA);
    expect(harness.compositeCalls[0]?.ownerUserId).toBe(ownerA);
    expect(harness.submitted[0]?.ownerUserId).toBe(ownerA);
    expect(harness.submitted[0]?.command).not.toHaveProperty("ownerUserId");
  });

  it("stops at finite maxCandidates and preserves distinct generated candidates", async () => {
    const harness = makeHarness();
    const started = await harness.app.start(
      { authenticatedUserId: ownerA },
      command({ stopCondition: { maxCandidates: 2 }, maxInFlight: 2 }),
    );
    await waitFor(() => harness.repository.runs.get(started.searchRunId)?.state === "COMPLETED");

    const status = await harness.app.status({ authenticatedUserId: ownerA }, started.searchRunId);
    expect(status.stopReason).toBe("MAX_CANDIDATES");
    expect(status.submittedCandidateCount).toBe(2);
    expect(status.completedCandidateCount).toBe(2);
    expect(new Set(harness.compositeCalls.map((call) => call.command.strategyDefinitionIds.join(","))).size).toBe(2);
  });

  it("enforces positive maxInFlight capacity while candidates remain running", async () => {
    const harness = makeHarness({ candidateStatus: "RUNNING" });
    const started = await harness.app.start(
      { authenticatedUserId: ownerA },
      command({ stopCondition: { maxCandidates: 4 }, maxInFlight: 2 }),
    );
    await waitFor(() => harness.submitted.length === 2);
    expect((await harness.app.status({ authenticatedUserId: ownerA }, started.searchRunId)).activeCandidateIds).toHaveLength(2);

    const first = [...harness.candidates.values()][0]!;
    first.status = "SUCCEEDED";
    await waitFor(() => harness.submitted.length === 3);
    expect(harness.submitted.length).toBe(3);

    await harness.app.cancel({ authenticatedUserId: ownerA }, started.searchRunId);
  });

  it("cancels active candidates, prevents further submissions, and guards terminal mutations", async () => {
    const harness = makeHarness({ candidateStatus: "RUNNING" });
    const started = await harness.app.start(
      { authenticatedUserId: ownerA },
      command({ stopCondition: { maxCandidates: 5 } }),
    );
    await waitFor(() => harness.submitted.length === 1);

    await harness.app.cancel({ authenticatedUserId: ownerA }, started.searchRunId);
    const status = await harness.app.status({ authenticatedUserId: ownerA }, started.searchRunId);
    expect(status.state).toBe("CANCELLED");
    expect(status.stopReason).toBe("USER_CANCELLED");
    expect(status.activeCandidateIds).toEqual([]);
    expect(harness.cancelled).toEqual([{ ownerUserId: ownerA, searchRunId: started.searchRunId }]);

    await new Promise<void>((resolve) => setTimeout(resolve, 5));
    expect(harness.submitted).toHaveLength(1);
    await expect(harness.app.cancel({ authenticatedUserId: ownerA }, started.searchRunId)).rejects.toMatchObject({
      code: "TERMINAL_STATE",
    });
    await expect(harness.app.pause({ authenticatedUserId: ownerA }, started.searchRunId)).rejects.toMatchObject({
      code: "TERMINAL_STATE",
    });
    await expect(harness.app.resume({ authenticatedUserId: ownerA }, started.searchRunId)).rejects.toMatchObject({
      code: "TERMINAL_STATE",
    });
  });

  it("counts failed candidates, exposes duration, and reports space exhaustion", async () => {
    const failedHarness = makeHarness({ candidateStatus: "FAILED" });
    const failedStart = await failedHarness.app.start(
      { authenticatedUserId: ownerA },
      command({ stopCondition: { maxCandidates: 2 } }),
    );
    await waitFor(() => failedHarness.repository.runs.get(failedStart.searchRunId)?.state === "COMPLETED");
    const failedStatus = await failedHarness.app.status({ authenticatedUserId: ownerA }, failedStart.searchRunId);
    expect(failedStatus.failedCandidateCount).toBe(2);
    expect(failedStatus.completedCandidateCount).toBe(0);
    expect(failedStatus.averageBacktestDurationMs).toBe(5);

    const exhaustedHarness = makeHarness();
    const exhaustedStart = await exhaustedHarness.app.start(
      { authenticatedUserId: ownerA },
      command({
        searchSpace: {
          availableStrategyDefinitionIds: ["strategy-a", "strategy-b"],
          componentCount: { minimum: 2, maximum: 2 },
          requireDistinctComponents: true,
        },
        stopCondition: { maxCandidates: 10 },
      }),
    );
    await waitFor(() => exhaustedHarness.repository.runs.get(exhaustedStart.searchRunId)?.state === "COMPLETED");
    expect((await exhaustedHarness.app.status({ authenticatedUserId: ownerA }, exhaustedStart.searchRunId)).stopReason).toBe(
      "SEARCH_SPACE_EXHAUSTED",
    );
  });

  it("enforces the duration deadline during a delayed port and cancels late acceptance", async () => {
    const harness = makeHarness({ candidateStatus: "RUNNING", submissionDelayMs: 30 });
    const started = await harness.app.start(
      { authenticatedUserId: ownerA },
      command({ stopCondition: { maxDurationSeconds: 0.01 }, maxInFlight: 1 }),
    );

    await waitFor(() => harness.repository.runs.get(started.searchRunId)?.state === "COMPLETED");
    await new Promise<void>((resolve) => setTimeout(resolve, 40));

    const status = await harness.app.status({ authenticatedUserId: ownerA }, started.searchRunId);
    expect(status.stopReason).toBe("MAX_DURATION");
    expect(status.submittedCandidateCount).toBe(0);
    expect(status.activeCandidateIds).toEqual([]);
    expect(harness.candidates.size).toBe(1);
    expect([...harness.candidates.values()][0]?.status).toBe("CANCELLED");
    expect(harness.cancelled).toEqual([
      { ownerUserId: ownerA, searchRunId: started.searchRunId },
    ]);
  });

  it("closes the cancellation race when Backtesting accepts after cancellation", async () => {
    const harness = makeHarness({ candidateStatus: "RUNNING", submissionDelayMs: 30 });
    const started = await harness.app.start(
      { authenticatedUserId: ownerA },
      command({ stopCondition: { maxCandidates: 5 } }),
    );
    await waitFor(() => harness.submissionStarted === 1);

    await harness.app.cancel({ authenticatedUserId: ownerA }, started.searchRunId);
    await waitFor(() => harness.candidates.size === 1);

    const status = await harness.app.status({ authenticatedUserId: ownerA }, started.searchRunId);
    expect(status.state).toBe("CANCELLED");
    expect(status.submittedCandidateCount).toBe(0);
    expect(status.activeCandidateIds).toEqual([]);
    expect([...harness.candidates.values()][0]?.status).toBe("CANCELLED");
    expect(harness.cancelled).toHaveLength(2);
  });

  it("rejects a cross-owner leaderboard scope before creating or saving a SearchRun", async () => {
    const harness = makeHarness({ scopeOwnerUserId: ownerB });

    await expect(harness.app.start({ authenticatedUserId: ownerA }, command())).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    expect(harness.repository.runs.size).toBe(0);
    expect(harness.submitted).toEqual([]);
  });

  it("stops after the configured number of iterations without leaderboard improvement", async () => {
    const harness = makeHarness({ score: 10 });
    const started = await harness.app.start(
      { authenticatedUserId: ownerA },
      command({
        stopCondition: { maxCandidates: 10, noImprovementAfterIterations: 2 },
        maxInFlight: 1,
      }),
    );
    await waitFor(() => harness.repository.runs.get(started.searchRunId)?.state === "COMPLETED");

    const status = await harness.app.status({ authenticatedUserId: ownerA }, started.searchRunId);
    expect(status.stopReason).toBe("NO_IMPROVEMENT");
    expect(status.submittedCandidateCount).toBe(3);
    expect(status.completedCandidateCount).toBe(3);
  });

  it("pauses generation and resumes only after an explicit resume", async () => {
    const harness = makeHarness({ candidateStatus: "RUNNING" });
    const started = await harness.app.start(
      { authenticatedUserId: ownerA },
      command({ stopCondition: { maxCandidates: 3 } }),
    );
    await waitFor(() => harness.submitted.length === 1);

    await harness.app.pause({ authenticatedUserId: ownerA }, started.searchRunId);
    await new Promise<void>((resolve) => setTimeout(resolve, 5));
    expect(harness.submitted).toHaveLength(1);
    expect((await harness.app.status({ authenticatedUserId: ownerA }, started.searchRunId)).state).toBe("PAUSED");

    const first = [...harness.candidates.values()][0]!;
    first.status = "SUCCEEDED";
    await harness.app.status({ authenticatedUserId: ownerA }, started.searchRunId);
    await harness.app.resume({ authenticatedUserId: ownerA }, started.searchRunId);
    await waitFor(() => harness.submitted.length === 2);
    expect((await harness.app.status({ authenticatedUserId: ownerA }, started.searchRunId)).state).toBe("RUNNING");

    await harness.app.cancel({ authenticatedUserId: ownerA }, started.searchRunId);
  });

  it("filters SearchRun reads by trusted owner and returns cross-user not-found", async () => {
    const harness = makeHarness();
    const first = await harness.app.start({ authenticatedUserId: ownerA }, command());
    const second = await harness.app.start({ authenticatedUserId: ownerB }, command({ leaderboardScopeId: "scope-b" }));
    await waitFor(() =>
      harness.repository.runs.get(first.searchRunId)?.state === "COMPLETED" &&
      harness.repository.runs.get(second.searchRunId)?.state === "COMPLETED",
    );

    const ownerRuns = await harness.app.list({ authenticatedUserId: ownerA }, { limit: 10 });
    expect(ownerRuns.items.map((run) => run.searchRunId)).toEqual([first.searchRunId]);
    await expect(harness.app.status({ authenticatedUserId: ownerB }, first.searchRunId)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(harness.app.leaderboard({ authenticatedUserId: ownerB }, first.searchRunId)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(harness.app.status({ authenticatedUserId: {} as never }, first.searchRunId)).rejects.toMatchObject(
      new SearchApplicationError("UNAUTHENTICATED"),
    );
  });
});
