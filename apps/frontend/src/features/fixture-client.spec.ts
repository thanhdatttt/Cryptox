import { describe, expect, it } from "vitest";
import type { DefineCompositeRequestDto, StartSearchRequestDto } from "@cryptox/contracts/rest";
import { FeatureClientError } from "./clients";
import { FIXTURE_BACKTEST_CONFIGURATION, FIXTURE_MARKET_INPUT } from "./fixture-data";
import { FixtureFeatureClient } from "./fixture-client";

describe("FixtureFeatureClient", () => {
  it("keeps private resources owner-scoped and returns not-found for another owner", async () => {
    const ownerA = new FixtureFeatureClient({ ownerUserId: "user-a" });
    const ownerB = new FixtureFeatureClient({ ownerUserId: "user-b" });
    const definitionsA = await ownerA.strategyDefinitions();
    const experimentsA = await ownerA.experiments();
    const runsA = await ownerA.searchRuns();

    expect(definitionsA.items.every((definition) => definition.ownerUserId === "user-a")).toBe(true);
    expect((await ownerB.strategyDefinitions()).items.every((definition) => definition.ownerUserId === "user-b")).toBe(true);
    await expect(ownerB.experiment(experimentsA.items[0]!.id)).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });
    await expect(ownerB.searchStatus(runsA.items[0]!.searchRunId)).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });

    const crossOwnerComposite: DefineCompositeRequestDto = {
      schemaVersion: 1,
      logicalFamilyKey: "cross-owner",
      combinationProfileId: "MAJORITY_VOTE_V1",
      strategyDefinitionIds: definitionsA.items.map((definition) => definition.id),
    };
    await expect(ownerB.defineComposite(crossOwnerComposite)).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });
  });

  it("returns a bounded terminal Search status with counts and stop reason", async () => {
    const client = new FixtureFeatureClient({ ownerUserId: "user-search" });
    const definitions = await client.strategyDefinitions();
    const leaderboard = await client.leaderboard();
    const request: StartSearchRequestDto = {
      schemaVersion: 1,
      searchSpace: {
        availableStrategyDefinitionIds: definitions.items.map((definition) => definition.id),
        componentCount: { minimum: 2, maximum: 2 },
        requireDistinctComponents: true,
      },
      stopCondition: { maxCandidates: 3 },
      generatorType: "RANDOM",
      randomSeed: "bounded-test",
      leaderboardScopeId: leaderboard.scope.id,
      candidateTemplate: { marketInput: FIXTURE_MARKET_INPUT, configuration: FIXTURE_BACKTEST_CONFIGURATION },
      maxInFlight: 1,
    };

    const started = await client.startSearch(request);
    const status = await client.searchStatus(started.searchRunId);

    expect(status.searchRun).toMatchObject({ state: "COMPLETED", stopReason: "MAX_CANDIDATES", submittedCandidateCount: 3 });
    const maxCandidates = request.stopCondition.maxCandidates;
    if (typeof maxCandidates !== "number") throw new Error("Test stop condition must be maxCandidates");
    expect(status.searchRun.submittedCandidateCount).toBeLessThanOrEqual(maxCandidates);
    expect(status.searchRun.failedCandidateCount).toBeGreaterThanOrEqual(0);
    expect(status.ranking[0]?.rankingConfigurationId).toBe("LINEAR_REQUIRED_V1");
  });

  it("uses explicit client errors for unknown private identifiers", async () => {
    const client = new FixtureFeatureClient({ ownerUserId: "user-errors" });
    const error = await client.experiment("not-owned").catch((value: unknown) => value);

    expect(error).toBeInstanceOf(FeatureClientError);
    expect(error).toMatchObject({ status: 404, code: "NOT_FOUND" });
  });
});
