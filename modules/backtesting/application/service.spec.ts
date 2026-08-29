import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedRequestContext, AuthenticatedUserId } from "modules/auth/api";
import { createEvaluationModule } from "@cryptox/evaluation/bootstrap";
import type { StrategyDefinition, Strategy } from "@cryptox/strategy";
import type { DatasetSnapshotPage, DatasetSnapshotRef } from "@cryptox/market-data";
import type { LeaderboardScope, LeaderboardSubmissionResult } from "@cryptox/leaderboard";
import { BoundedLocalBacktestExecutor } from "../infrastructure/local/bounded-local-backtest-executor";
import { InMemoryBacktestingRepositories } from "./memory";
import { createBacktestingApplication, type BacktestingApplication, type CandidateExecutionRequest, type CandidateRunResult } from "./service";

const userA = "00000000-0000-4000-8000-000000000001" as AuthenticatedUserId;
const userB = "00000000-0000-4000-8000-000000000002" as AuthenticatedUserId;
const contextA: AuthenticatedRequestContext = { authenticatedUserId: userA };
const contextB: AuthenticatedRequestContext = { authenticatedUserId: userB };
const range = { from: "2026-01-01T00:00:00.000Z", to: "2026-01-01T00:15:00.000Z" };
const configuration = {
  executionProfileId: "BACKTEST_EXECUTION_V1" as const,
  initialCapital: 10_000,
  feeRatePercent: 0,
  slippageBps: 0,
};

const definition: StrategyDefinition = {
  id: "strategy-a",
  ownerUserId: userA,
  logicalFamilyKey: "fixture",
  strategyName: "FIXTURE",
  implementationVersion: "1",
  behaviorProfileId: "FIXTURE_V1",
  version: 1,
  parameters: {},
  createdAt: "2026-01-01T00:00:00.000Z",
};

const snapshot: DatasetSnapshotRef = {
  id: "dataset-a",
  provider: "fixture",
  pair: "BTCUSDT",
  timeframe: "5m",
  range,
  candleCount: 3,
  createdAt: "2026-01-01T00:00:00.000Z",
  replayGuarantee: "EXACT_REPLAY_AVAILABLE",
  version: "fixture-v1",
};

const snapshotPage: DatasetSnapshotPage = {
  snapshot,
  candles: [
    { pair: "BTCUSDT", timeframe: "5m", timestamp: "2026-01-01T00:00:00.000Z", open: 100, high: 101, low: 99, close: 100, volume: 1, isClosed: true },
    { pair: "BTCUSDT", timeframe: "5m", timestamp: "2026-01-01T00:05:00.000Z", open: 100, high: 111, low: 100, close: 110, volume: 1, isClosed: true },
    { pair: "BTCUSDT", timeframe: "5m", timestamp: "2026-01-01T00:10:00.000Z", open: 110, high: 111, low: 109, close: 110, volume: 1, isClosed: true },
  ],
};

function fixtureStrategy(): Strategy {
  return {
    name: "FIXTURE",
    category: "TREND",
    analyze: (input) => ({
      signal: input.candles.length === 1 ? "BUY" : input.candles.length === 3 ? "SELL" : "HOLD",
      signalAt: input.candles.at(-1)!.timestamp,
      visualization: [],
    }),
  };
}

function makeApplication(
  repositories = new InMemoryBacktestingRepositories(),
  submitLeaderboard: (owner: AuthenticatedUserId) => Promise<LeaderboardSubmissionResult> = async () => ({ admitted: true }),
  marketData = {
    createDatasetSnapshot: async () => snapshot,
    readDatasetSnapshot: async (_query: { snapshotId: string }): Promise<DatasetSnapshotPage> => snapshotPage,
  },
  strategy: Strategy = fixtureStrategy(),
  candidateRepository?: InMemoryBacktestingRepositories["candidateRepository"],
  completionUnitOfWork?: InMemoryBacktestingRepositories["completionUnitOfWork"],
): { app: BacktestingApplication; repositories: InMemoryBacktestingRepositories } {
  let app!: BacktestingApplication;
  const execution = new BoundedLocalBacktestExecutor<CandidateExecutionRequest, CandidateRunResult>({
    capacity: 1,
    runner: { run: (request, signal) => app.runCandidate(request, signal) },
    clock: repositories.clock,
  });
  const scopeFor = (ownerUserId: AuthenticatedUserId): LeaderboardScope => ({
    id: "scope-a",
    ownerUserId,
    name: "fixture",
    k: 10,
    rankingConfigurationId: "ranking-v1",
    comparisonKey: "fixture",
    createdAt: "2026-01-01T00:00:00.000Z",
  });
  const dependencies = repositories.createDependencies({
      execution,
      marketData,
      strategy: {
        readStrategyDefinition: async (context, strategyDefinitionId) => {
          if (strategyDefinitionId !== definition.id) throw new Error("NOT_FOUND");
          return { ...definition, ownerUserId: context.authenticatedUserId };
        },
        readCompositeDefinition: async () => { throw new Error("not used"); },
        resolveStrategy: async () => strategy,
        combineSignals: () => "HOLD",
      },
      evaluation: createEvaluationModule(),
      leaderboard: {
        getLeaderboardScope: async (context) => scopeFor(context.authenticatedUserId),
        score: () => ({ leaderboardScopeId: "scope-a", rankingConfigurationId: "ranking-v1", overallScore: 1, rankEligible: true }),
        submit: async (context) => submitLeaderboard(context.authenticatedUserId),
      },
      });
  app = createBacktestingApplication({
    ...dependencies,
    candidateRepository: candidateRepository ?? repositories.candidateRepository,
    completionUnitOfWork: completionUnitOfWork ?? dependencies.completionUnitOfWork,
  },
  {
      searchRunOwnerGuard: async (context, searchRunId) => {
        if (context.authenticatedUserId !== userA || searchRunId !== "run-a") throw new Error("NOT_FOUND");
      },
    },
  );
  return { app, repositories };
}

function manualCommand(overrides: Partial<{ leaderboardScopeId: string; strategyId: string }> = {}) {
  return {
    leaderboardScopeId: overrides.leaderboardScopeId ?? "scope-a",
    strategySelection: { kind: "STRATEGY" as const, strategyDefinitionId: overrides.strategyId ?? "strategy-a" },
    marketInput: { pair: "BTCUSDT", timeframe: "5m" as const, range, datasetId: "dataset-a", datasetVersion: "fixture-v1" },
    configuration,
  };
}

describe("BacktestingApplication", () => {
  it("propagates trusted manual/Search ownership and reaches an admitted leaderboard", async () => {
    const { app, repositories } = makeApplication();
    const manual = await app.startManual(contextA, manualCommand());
    await vi.waitFor(async () => expect((await app.status(contextA, manual.candidateId)).status).toBe("SUCCEEDED"));
    const search = await app.submitSearchCandidate(contextA, { ...manualCommand(), searchRunId: "run-a", iterationNumber: 1 });
    const candidate = await repositories.candidateRepository.getByOwnerAndId(userA, manual.candidateId);
    const searchCandidate = await repositories.candidateRepository.getByOwnerAndId(userA, search.candidateId);
    expect(candidate?.ownerUserId).toBe(userA);
    expect(candidate?.origin).toEqual({ kind: "MANUAL", leaderboardScopeId: "scope-a" });
    expect(searchCandidate?.origin).toEqual({ kind: "SEARCH", searchRunId: "run-a", leaderboardScopeId: "scope-a", iterationNumber: 1 });
    await expect(app.status(contextB, manual.candidateId)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(app.status(contextA, manual.candidateId)).resolves.toMatchObject({ status: "SUCCEEDED" });
    const status = await app.status(contextA, manual.candidateId);
    expect(status.experimentId).toBeTruthy();
    await expect(app.readExperiment(contextB, status.experimentId!)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(app.readExperiment(contextA, status.experimentId!)).resolves.toMatchObject({
      candidateId: manual.candidateId,
      rankingConfigurationId: "ranking-v1",
      marketData: { datasetId: "dataset-a", datasetVersion: "fixture-v1" },
      replay: { guarantee: "TRACEABLE", unavailableInputs: ["EXECUTABLE_CODE"] },
    });
    expect(await repositories.experiments.get(status.experimentId!)).toHaveProperty("equityCurve");
    await expect(app.readExperiment(contextA, status.experimentId!)).resolves.not.toHaveProperty("equityCurve");
  });

  it("round-trips synthetic paper provenance through the Candidate and Experiment boundary", async () => {
    const syntheticShortStrategy: Strategy = {
      ...fixtureStrategy(),
      analyze: (input) => ({
        signal: input.candles.length === 1 ? "SELL" : "HOLD",
        signalAt: input.candles.at(-1)!.timestamp,
        visualization: [],
      }),
    };
    const { app, repositories } = makeApplication(
      new InMemoryBacktestingRepositories(),
      undefined,
      undefined,
      syntheticShortStrategy,
    );
    const paperExecution = {
      executionProfileId: "SYNTHETIC_SHORT_PAPER_V1" as const,
      positionMode: "SYNTHETIC_SHORT" as const,
      exitPolicyId: "STOP_LOSS_WINS_V1" as const,
      feeRatePercent: 0.08 as const,
      adverseSlippageBps: 5 as const,
      decimalScale: 8 as const,
      roundingMode: "HALF_UP" as const,
      stopLoss: "112.00000000",
      takeProfit: "90.00000000",
    };
    const accepted = await app.startManual(contextA, {
      ...manualCommand(),
      configuration: { ...configuration, paperExecution },
    });

    await vi.waitFor(async () => expect((await app.status(contextA, accepted.candidateId)).status).toBe("SUCCEEDED"));
    const candidate = await repositories.candidateRepository.getByOwnerAndId(userA, accepted.candidateId);
    expect(candidate?.configuration.paperExecution).toEqual(paperExecution);
    const experimentId = (await app.status(contextA, accepted.candidateId)).experimentId!;
    expect(repositories.trades.get(experimentId)?.[0]).toMatchObject({
      positionMode: "SYNTHETIC_SHORT",
      exitReason: "RANGE_END",
    });
    await expect(app.readExperiment(contextA, experimentId)).resolves.toMatchObject({
      configuration: { paperExecution },
      paperExecutionProvenance: paperExecution,
    });
    await expect(app.readExperiment(contextB, experimentId)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects invalid synthetic paper settings before Candidate persistence", async () => {
    const { app, repositories } = makeApplication();
    await expect(app.startManual(contextA, {
      ...manualCommand(),
      configuration: {
        ...configuration,
        paperExecution: {
          executionProfileId: "SYNTHETIC_SHORT_PAPER_V1",
          positionMode: "LONG",
          exitPolicyId: "STOP_LOSS_WINS_V1",
          feeRatePercent: 0.1,
          adverseSlippageBps: 5,
          decimalScale: 8,
          roundingMode: "HALF_UP",
        } as never,
      },
    })).rejects.toMatchObject({ code: "INVALID_REQUEST" });
    expect(repositories.candidates.size).toBe(0);
  });

  it("contains strategy failure and leaves no partial Experiment", async () => {
    const failingStrategy: Strategy = { ...fixtureStrategy(), analyze: () => { throw new Error("fixture strategy failed"); } };
    const { app, repositories } = makeApplication(new InMemoryBacktestingRepositories(), undefined, undefined, failingStrategy);
    const accepted = await app.startManual(contextA, manualCommand());
    await vi.waitFor(async () => expect((await app.status(contextA, accepted.candidateId)).status).toBe("FAILED"));
    const candidate = await repositories.candidateRepository.getByOwnerAndId(userA, accepted.candidateId);
    expect(candidate?.failure?.code).toBe("STRATEGY_FAILED");
    expect(repositories.experiments.size).toBe(0);
  });

  it("rejects guessed strategy and SearchRun ownership before candidate insert", async () => {
    const { app, repositories } = makeApplication();
    await expect(app.startManual(contextA, manualCommand({ strategyId: "strategy-b" }))).rejects.toThrow("NOT_FOUND");
    await expect(app.submitSearchCandidate(contextB, { ...manualCommand(), searchRunId: "run-a", iterationNumber: 1 })).rejects.toThrow("NOT_FOUND");
    expect(repositories.candidates.size).toBe(0);
  });

  it("converts terminal outcome persistence rejection into one terminal candidate failure", async () => {
    const repositories = new InMemoryBacktestingRepositories();
    const originalSave = repositories.candidateRepository.save;
    let rejectSuccessSave = true;
    const candidateRepository = {
      ...repositories.candidateRepository,
      save: async (ownerUserId: AuthenticatedUserId, candidate: Parameters<typeof originalSave>[1]) => {
        if (candidate.status === "SUCCEEDED" && rejectSuccessSave) {
          rejectSuccessSave = false;
          throw new Error("candidate status write failed");
        }
        return originalSave(ownerUserId, candidate);
      },
    };
    const { app } = makeApplication(repositories, undefined, undefined, fixtureStrategy(), candidateRepository);
    const accepted = await app.startManual(contextA, manualCommand());
    await vi.waitFor(async () => expect((await app.status(contextA, accepted.candidateId)).status).toBe("FAILED"));
    await expect(app.status(contextA, accepted.candidateId)).resolves.toMatchObject({
      status: "FAILED",
      failure: { code: "SIMULATION_FAILED" },
    });
  });

  it("rolls back the Experiment when same-owner ranking admission fails", async () => {
    const { app, repositories } = makeApplication(new InMemoryBacktestingRepositories(), async () => {
      throw new Error("ranking unavailable");
    });
    const accepted = await app.startManual(contextA, manualCommand());
    await vi.waitFor(async () => expect((await app.status(contextA, accepted.candidateId)).status).toBe("FAILED"));
    expect(repositories.experiments.size).toBe(0);
    expect((await app.status(contextA, accepted.candidateId)).failure?.code).toBe("RANKING_FAILED");
  });

  it("records saturation as a single terminal failure and does not cross owner boundaries", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const { app, repositories } = makeApplication(new InMemoryBacktestingRepositories(), async () => ({ admitted: true }), {
      createDatasetSnapshot: async () => { await gate; return snapshot; },
      readDatasetSnapshot: async () => snapshotPage,
    });
    const first = await app.startManual(contextA, manualCommand());
    const second = await app.startManual(contextA, manualCommand());
    await vi.waitFor(async () => expect((await app.status(contextA, second.candidateId)).failure?.code).toBe("SATURATED"));
    await expect(app.cancelCandidate(contextB, first.candidateId)).rejects.toMatchObject({ code: "NOT_FOUND" });
    release();
    await vi.waitFor(async () => expect((await app.status(contextA, first.candidateId)).status).toBe("SUCCEEDED"));
    expect((await app.status(contextA, second.candidateId)).status).toBe("FAILED");
    expect(repositories.experiments.size).toBe(1);
  });

  it("aborts completion between Experiment and Leaderboard participants", async () => {
    const repositories = new InMemoryBacktestingRepositories();
    let release!: () => void;
    const completionGate = new Promise<void>((resolve) => { release = resolve; });
    const delayedCompletion: typeof repositories.completionUnitOfWork = {
      commit: async (input, participants) => repositories.unitOfWork.run(async () => {
        const experiment = await participants.insertExperiment(input.ownerUserId, input.experiment, input.trades);
        await completionGate;
        const leaderboard = await participants.submitLeaderboard(input.ownerUserId, input.leaderboardSubmission);
        return { experiment, leaderboard };
      }),
    };
    let leaderboardCalls = 0;
    const { app } = makeApplication(
      repositories,
      async () => { leaderboardCalls += 1; return { admitted: true }; },
      undefined,
      fixtureStrategy(),
      undefined,
      delayedCompletion,
    );
    const accepted = await app.startManual(contextA, manualCommand());
    await vi.waitFor(async () => expect(repositories.experiments.size).toBe(1));
    await app.cancelCandidate(contextA, accepted.candidateId);
    release();
    await vi.waitFor(async () => expect((await app.status(contextA, accepted.candidateId)).status).toBe("CANCELLED"));
    expect(leaderboardCalls).toBe(0);
    expect(repositories.experiments.size).toBe(0);
  });

  it("treats cancellation during final completion as too late for a Search candidate", async () => {
    const repositories = new InMemoryBacktestingRepositories();
    let release!: () => void;
    const completionGate = new Promise<void>((resolve) => { release = resolve; });
    const delayedCompletion: typeof repositories.completionUnitOfWork = {
      commit: async (input, participants) => {
        const result = await repositories.completionUnitOfWork.commit(input, participants);
        await completionGate;
        return result;
      },
    };
    const { app } = makeApplication(
      repositories,
      async () => ({ admitted: true }),
      undefined,
      fixtureStrategy(),
      undefined,
      delayedCompletion,
    );
    const accepted = await app.submitSearchCandidate(contextA, {
      ...manualCommand(),
      searchRunId: "run-a",
      iterationNumber: 1,
    });

    await vi.waitFor(async () => expect(repositories.experiments.size).toBe(1));
    // The completion adapter has persisted its participants but has not yet
    // returned to the executor. Cancellation must not create a second terminal
    // outcome or leave a successful Experiment behind a CANCELLED Candidate.
    await expect(app.cancelSearchCandidates(contextA, "run-a")).resolves.toEqual({ candidateIds: [] });
    release();

    await vi.waitFor(async () => expect((await app.status(contextA, accepted.candidateId)).status).toBe("SUCCEEDED"));
    expect(repositories.experiments.size).toBe(1);
  });
});
