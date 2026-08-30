import { describe, expect, it } from "vitest";
import type { AuthenticatedRequestContext, AuthenticatedUserId } from "modules/auth/api";
import { InMemoryLeaderboardRepositories } from "../application/memory";
import { createLeaderboardModule } from "./bootstrap";

const ownerA = "owner-a" as AuthenticatedUserId;
const ownerB = "owner-b" as AuthenticatedUserId;
const contextA: AuthenticatedRequestContext = { authenticatedUserId: ownerA };
const contextB: AuthenticatedRequestContext = { authenticatedUserId: ownerB };

const experiment = {
  executionState: "SUCCEEDED" as const,
  experimentId: "experiment-public-boundary",
  candidateId: "candidate-public-boundary",
  searchRunId: "run-public-boundary",
  metrics: {
    candidateId: "candidate-public-boundary",
    totalReturnPercent: 10,
    winRatePercent: 50,
    numberOfTrades: 2,
    maxDrawdownMagnitudePercent: 2,
    evaluationProfileId: "REQUIRED_METRICS_V1" as const,
  },
};

describe("Leaderboard public module boundary", () => {
  it("uses trusted context for owner isolation instead of a payload identity field", async () => {
    const repositories = new InMemoryLeaderboardRepositories();
    const leaderboard = createLeaderboardModule(repositories.createDependencies());
    const scope = await leaderboard.createLeaderboardScope(contextA, {
      name: "Owner A scope",
      k: 2,
      rankingConfigurationId: "ranking-v1",
      comparisonKey: "public-boundary",
    });
    repositories.addExperiment(ownerA, experiment);

    await expect(leaderboard.getLeaderboardScope(contextB, scope.id))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(leaderboard.submit(contextB, {
      leaderboardScopeId: scope.id,
      experiment: { ...experiment, ownerUserId: ownerB } as never,
    })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(leaderboard.topK(contextB, scope.id))
      .rejects.toMatchObject({ code: "NOT_FOUND" });

    await expect(leaderboard.submit(contextA, { leaderboardScopeId: scope.id, experiment }))
      .resolves.toMatchObject({ admitted: true });
    await expect(leaderboard.rankSearchRun(contextB, experiment.searchRunId)).resolves.toEqual([]);
  });
});
