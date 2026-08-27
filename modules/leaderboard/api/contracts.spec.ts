import { describe, expect, it } from "vitest";
import type { CreateLeaderboardScopeCommand, LeaderboardScope } from "./contracts";

describe("leaderboard public contracts", () => {
  it("owns configurable K without selecting a ranking formula", () => {
    const command: CreateLeaderboardScopeCommand = {
      name: "MVP",
      k: 25,
      rankingConfigurationId: "ranking-v1",
      comparisonKey: "BTCUSDT:1h:2026-H1",
    };
    const scope: LeaderboardScope = {
      id: "scope-1",
      ...command,
      k: command.k ?? 10,
      createdAt: "2026-08-27T00:00:00.000Z",
    };

    expect(scope.k).toBe(25);
    expect(scope).not.toHaveProperty("weights");
    expect(scope).not.toHaveProperty("riskPolicy");
  });
});
