import { describe, expect, it } from "vitest";
import type { AuthenticatedRequestContext, AuthenticatedUserId } from "modules/auth/api";
import {
  LINEAR_REQUIRED_V1,
  type LeaderboardEntry,
  type RankableExperiment,
} from "../api/contracts";
import { createLeaderboardApplication } from "./service";
import { InMemoryLeaderboardRepositories } from "./memory";

const userA = "user-a" as AuthenticatedUserId;
const userB = "user-b" as AuthenticatedUserId;
const contextA: AuthenticatedRequestContext = { authenticatedUserId: userA };
const contextB: AuthenticatedRequestContext = { authenticatedUserId: userB };

function metrics(
  candidateId: string,
  overrides: Partial<RankableExperiment["metrics"]> = {},
): RankableExperiment["metrics"] {
  return {
    candidateId,
    totalReturnPercent: 10,
    winRatePercent: 50,
    numberOfTrades: 2,
    maxDrawdownMagnitudePercent: 2,
    evaluationProfileId: "REQUIRED_METRICS_V1",
    ...overrides,
  };
}

function experiment(
  experimentId: string,
  overrides: Partial<RankableExperiment> = {},
): RankableExperiment {
  const candidateId = overrides.candidateId ?? `candidate-${experimentId}`;
  return {
    executionState: "SUCCEEDED",
    experimentId,
    candidateId,
    metrics: metrics(candidateId, { ...overrides.metrics, candidateId }),
    ...(overrides.searchRunId === undefined ? {} : { searchRunId: overrides.searchRunId }),
    ...(overrides.extensionProvenance === undefined
      ? {}
      : { extensionProvenance: structuredClone(overrides.extensionProvenance) }),
  };
}

function harness() {
  const repositories = new InMemoryLeaderboardRepositories();
  repositories.clock = { now: () => "2026-08-29T00:00:00.000Z" };
  repositories.idGenerator = (() => {
    let value = 0;
    return () => String(++value);
  })();
  const app = createLeaderboardApplication(repositories.createDependencies());
  return { app, repositories };
}

async function createScope(
  app: ReturnType<typeof createLeaderboardApplication>,
  context: AuthenticatedRequestContext = contextA,
  k?: number,
) {
  return app.createLeaderboardScope(context, {
    name: k === undefined ? "Default" : `Top ${k}`,
    ...(k === undefined ? {} : { k }),
    rankingConfigurationId: "ranking-v1",
    comparisonKey: "BTCUSDT:1h:2026-H1",
  });
}

describe("L-01 configurable reproducible leaderboard", () => {
  it("creates owner scopes with default or alternate positive K and exposes config provenance", async () => {
    const { app } = harness();
    const defaultScope = await createScope(app);
    const alternateScope = await createScope(app, contextA, 2);

    expect(defaultScope.k).toBe(LINEAR_REQUIRED_V1.defaultTopK);
    expect(alternateScope.k).toBe(2);
    await expect(app.getRankingConfiguration(defaultScope.rankingConfigurationId)).resolves.toMatchObject({
      id: "ranking-v1",
      profileId: LINEAR_REQUIRED_V1.id,
      version: LINEAR_REQUIRED_V1.version,
      formula: LINEAR_REQUIRED_V1.formula,
    });
    await expect(app.createLeaderboardScope(contextA, {
      name: "Invalid",
      k: 0,
      rankingConfigurationId: "ranking-v1",
      comparisonKey: "scope",
    })).rejects.toMatchObject({ code: "INVALID_TOP_K" });
  });

  it("scores exactly with LINEAR_REQUIRED_V1 and rejects non-finite metrics", async () => {
    const { app } = harness();
    const scope = await createScope(app);
    expect(app.score(scope.id, metrics("candidate", {
      totalReturnPercent: 10,
      winRatePercent: 50,
      maxDrawdownMagnitudePercent: 5,
    }))).toEqual({
      leaderboardScopeId: scope.id,
      rankingConfigurationId: "ranking-v1",
      overallScore: 19,
      rankEligible: true,
    });
    expect(app.score(scope.id, metrics("candidate", { numberOfTrades: 0 }))).toEqual({
      leaderboardScopeId: scope.id,
      rankingConfigurationId: "ranking-v1",
      overallScore: 0,
      rankEligible: false,
      rankExclusionReason: "NO_TRADES",
    });
    expect(() => app.score(scope.id, metrics("candidate", { totalReturnPercent: Number.NaN }))).toThrow();
  });

  it("admits only owner-owned completed experiments, retains configurable Top-K, and is duplicate-safe", async () => {
    const { app, repositories } = harness();
    const scope = await createScope(app, contextA, 2);
    const first = experiment("experiment-a", { searchRunId: "run-1" });
    const second = experiment("experiment-b", {
      searchRunId: "run-1",
      metrics: metrics("candidate-experiment-b", { totalReturnPercent: 8, maxDrawdownMagnitudePercent: 0 }),
    });
    const rejected = experiment("experiment-rejected", {
      metrics: metrics("candidate-experiment-rejected", { totalReturnPercent: -100 }),
    });
    const winner = experiment("experiment-winner", {
      searchRunId: "run-1",
      metrics: metrics("candidate-experiment-winner", { totalReturnPercent: 100 }),
    });
    for (const item of [first, second, rejected, winner]) repositories.addExperiment(userA, item);

    await expect(app.submit(contextA, { leaderboardScopeId: scope.id, experiment: first }))
      .resolves.toMatchObject({ admitted: true });
    await expect(app.submit(contextA, { leaderboardScopeId: scope.id, experiment: second }))
      .resolves.toMatchObject({ admitted: true });
    await expect(app.submit(contextA, { leaderboardScopeId: scope.id, experiment: rejected }))
      .resolves.toEqual({ admitted: false });
    const winningResult = await app.submit(contextA, { leaderboardScopeId: scope.id, experiment: winner });
    expect(winningResult).toMatchObject({ admitted: true, evictedExperimentId: "experiment-b" });
    expect(await app.topK(contextA, scope.id)).toHaveLength(2);
    expect((await app.topK(contextA, scope.id)).map((entry) => entry.experimentId)).toEqual([
      "experiment-winner",
      "experiment-a",
    ]);

    const duplicate = await app.submit(contextA, { leaderboardScopeId: scope.id, experiment: winner });
    expect(duplicate).toMatchObject({ admitted: true, entry: winningResult.entry });
    expect((await app.topK(contextA, scope.id)).filter((entry) => entry.experimentId === winner.experimentId)).toHaveLength(1);
    await expect(app.submit(contextA, { leaderboardScopeId: scope.id, experiment: second }))
      .resolves.toEqual({ admitted: false });
    await expect(app.submit(contextB, { leaderboardScopeId: scope.id, experiment: winner }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(app.topK(contextB, scope.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("applies the frozen tie-break sequence and keeps search-run reads owner-filtered", async () => {
    const { app, repositories } = harness();
    const scope = await createScope(app, contextA, 10);
    const returnTie = experiment("experiment-return-high", {
      searchRunId: "run-2",
      metrics: metrics("candidate-return-high", {
        totalReturnPercent: 10,
        winRatePercent: 50,
        maxDrawdownMagnitudePercent: 5,
      }),
    });
    const returnLower = experiment("experiment-return-low", {
      searchRunId: "run-2",
      metrics: metrics("candidate-return-low", {
        totalReturnPercent: 8,
        winRatePercent: 50,
        maxDrawdownMagnitudePercent: 0,
      }),
    });
    const drawdownLower = experiment("experiment-drawdown-low", {
      searchRunId: "run-2",
      metrics: metrics("candidate-drawdown-low", {
        totalReturnPercent: 10,
        winRatePercent: 50,
        maxDrawdownMagnitudePercent: 5,
      }),
    });
    for (const item of [returnTie, returnLower, drawdownLower]) {
      repositories.addExperiment(userA, item);
      await app.submit(contextA, { leaderboardScopeId: scope.id, experiment: item });
    }
    expect((await app.topK(contextA, scope.id)).map((entry) => entry.experimentId)).toEqual([
      "experiment-drawdown-low",
      "experiment-return-high",
      "experiment-return-low",
    ]);
    expect(await app.rankSearchRun(contextB, "run-2")).toEqual([]);
    expect((await app.rankSearchRun(contextA, "run-2")).map((entry) => entry.rank)).toEqual([1, 2, 3]);
  });

  it("rejects unauthenticated and cross-user experiment admission, including guessed identifiers", async () => {
    const { app, repositories } = harness();
    const scopeB = await createScope(app, contextB);
    const privateExperiment = experiment("private-experiment");
    repositories.addExperiment(userB, privateExperiment);
    await expect(app.getLeaderboardScope({} as AuthenticatedRequestContext, scopeB.id))
      .rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    await expect(app.getLeaderboardScope(contextA, scopeB.id))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(app.submit(contextA, { leaderboardScopeId: scopeB.id, experiment: privateExperiment }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("does not admit incomplete, failed, or unverified experiments", async () => {
    const { app, repositories } = harness();
    const scope = await createScope(app);
    const incomplete = { ...experiment("incomplete"), executionState: "FAILED" } as never;
    const noReaderExperiment = experiment("no-reader");
    repositories.addExperiment(userA, incomplete);
    await expect(app.submit(contextA, { leaderboardScopeId: scope.id, experiment: incomplete }))
      .rejects.toMatchObject({ code: "INELIGIBLE_EXPERIMENT" });
    const noReaderHarness = harness();
    const { experimentRepository: _experimentRepository, ...noReaderDependencies } =
      noReaderHarness.repositories.createDependencies();
    const noReaderApp = createLeaderboardApplication(noReaderDependencies);
    const noReaderScope = await createScope(noReaderApp);
    await expect(noReaderApp.submit(contextA, {
      leaderboardScopeId: noReaderScope.id,
      experiment: noReaderExperiment,
    })).rejects.toMatchObject({ code: "EXPERIMENT_OWNERSHIP_UNVERIFIED" });

    await expect(noReaderApp.submit(contextA, {
      leaderboardScopeId: noReaderScope.id,
      experiment: { ...noReaderExperiment, ownerUserId: userA } as never,
    })).rejects.toMatchObject({ code: "EXPERIMENT_OWNERSHIP_UNVERIFIED" });
  });

  it("admits and validates only the frozen extension provenance projection", async () => {
    const { app, repositories } = harness();
    const scope = await createScope(app, contextA, 3);
    const provenance = experiment("provenance-experiment", {
      searchRunId: "seeded-run",
      extensionProvenance: {
        searchProfileId: "DOMAIN_GUIDED_V1",
        paperExecutionProfileId: "SYNTHETIC_SHORT_PAPER_V1",
        newsExtractionTemplateVersion: 4,
      },
    });
    const original = structuredClone(provenance);
    repositories.addExperiment(userA, provenance);

    const firstRead = await repositories.experimentRepository.getByOwnerAndId(
      userA,
      provenance.experimentId,
    );
    firstRead!.metrics.totalReturnPercent = 999;
    firstRead!.extensionProvenance!.searchProfileId = "MUTATED";
    await expect(repositories.experimentRepository.getByOwnerAndId(
      userA,
      provenance.experimentId,
    )).resolves.toMatchObject(original);

    const projectionWithoutOptionalProvenance = structuredClone(provenance);
    delete projectionWithoutOptionalProvenance.extensionProvenance;
    delete projectionWithoutOptionalProvenance.searchRunId;
    await expect(app.submit(contextA, {
      leaderboardScopeId: scope.id,
      experiment: projectionWithoutOptionalProvenance,
    }))
      .resolves.toMatchObject({ admitted: true });
    expect(provenance).toEqual(original);
    await expect(app.topK(contextA, scope.id)).resolves.toMatchObject([
      { experimentId: provenance.experimentId, searchRunId: "seeded-run" },
    ]);

    const changedProvenance = experiment("provenance-experiment", {
      searchRunId: "seeded-run",
      extensionProvenance: {
        searchProfileId: "OTHER_PROFILE",
        paperExecutionProfileId: "SYNTHETIC_SHORT_PAPER_V1",
        newsExtractionTemplateVersion: 4,
      },
    });
    await expect(app.submit(contextA, {
      leaderboardScopeId: scope.id,
      experiment: changedProvenance,
    })).rejects.toMatchObject({ code: "NOT_FOUND" });

    const malformed = experiment("malformed-provenance", {
      extensionProvenance: { searchProfileId: " " },
    });
    repositories.addExperiment(userA, malformed);
    await expect(app.submit(contextA, { leaderboardScopeId: scope.id, experiment: malformed }))
      .rejects.toMatchObject({ code: "INELIGIBLE_EXPERIMENT" });
  });

  it("rejects malformed, non-finite, and non-required Evaluation projections", async () => {
    const { app, repositories } = harness();
    const scope = await createScope(app);
    const malformed = experiment("malformed-metrics");
    const nonFinite = experiment("non-finite-metrics", {
      metrics: metrics("candidate-non-finite", { totalReturnPercent: Number.POSITIVE_INFINITY }),
    });
    const wrongProfile = experiment("wrong-metrics-profile", {
      metrics: metrics("candidate-wrong-profile", {
        evaluationProfileId: "OTHER_PROFILE" as never,
      }),
    });
    const candidateMismatch = {
      ...experiment("candidate-mismatch"),
      metrics: metrics("different-candidate"),
    } as never;

    (malformed as { metrics: unknown }).metrics = undefined;
    for (const [item, expectedCode] of [
      [malformed, "INELIGIBLE_EXPERIMENT"],
      [nonFinite, "INVALID_METRICS"],
      [wrongProfile, "INVALID_METRICS"],
      [candidateMismatch, "INELIGIBLE_EXPERIMENT"],
    ] as const) {
      repositories.addExperiment(userA, item);
      await expect(app.submit(contextA, { leaderboardScopeId: scope.id, experiment: item }))
        .rejects.toMatchObject({ code: expectedCode });
    }
  });

  it("keeps configuration and ranking reads immutable while applying code-unit tie order", async () => {
    const { app, repositories } = harness();
    const scope = await createScope(app, contextA, 2);
    const config = await app.getRankingConfiguration(scope.rankingConfigurationId);
    const mutableConfig = config as unknown as {
      formula: { totalReturnPercentWeight: number };
      tieBreakers: Array<{ direction: string }>;
    };
    mutableConfig.formula.totalReturnPercentWeight = 99;
    mutableConfig.tieBreakers[0]!.direction = "ASCENDING";
    expect((await app.getRankingConfiguration(scope.rankingConfigurationId)).formula)
      .toEqual(LINEAR_REQUIRED_V1.formula);

    const zulu = experiment("zulu", {
      metrics: metrics("candidate-zulu", {
        totalReturnPercent: 10,
        winRatePercent: 50,
        maxDrawdownMagnitudePercent: 2,
      }),
    });
    const alpha = experiment("alpha", {
      metrics: metrics("candidate-alpha", {
        totalReturnPercent: 10,
        winRatePercent: 50,
        maxDrawdownMagnitudePercent: 2,
      }),
    });
    repositories.addExperiment(userA, zulu);
    repositories.addExperiment(userA, alpha);
    await app.submit(contextA, { leaderboardScopeId: scope.id, experiment: zulu });
    await app.submit(contextA, { leaderboardScopeId: scope.id, experiment: alpha });
    expect((await app.topK(contextA, scope.id)).map((entry) => entry.experimentId))
      .toEqual(["alpha", "zulu"]);
  });
});
