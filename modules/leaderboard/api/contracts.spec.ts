import { describe, expect, it } from "vitest";
import {
  LINEAR_REQUIRED_V1,
  type CreateLeaderboardScopeCommand,
  type RankingConfiguration,
} from "./contracts";

describe("leaderboard public contracts", () => {
  it("freezes LINEAR_REQUIRED_V1 formula, eligibility, ties, and configurable K", () => {
    expect(LINEAR_REQUIRED_V1).toEqual({
      id: "LINEAR_REQUIRED_V1",
      version: 1,
      formula: {
        totalReturnPercentWeight: 0.5,
        winRatePercentWeight: 0.3,
        maxDrawdownMagnitudePercentWeight: -0.2,
      },
      eligibility: {
        requiredExecutionState: "SUCCEEDED",
        finiteRequiredMetrics: true,
        minimumNumberOfTrades: 1,
      },
      tieBreakers: [
        { field: "SCORE", direction: "DESCENDING" },
        { field: "TOTAL_RETURN_PERCENT", direction: "DESCENDING" },
        { field: "MAX_DRAWDOWN_MAGNITUDE_PERCENT", direction: "ASCENDING" },
        { field: "WIN_RATE_PERCENT", direction: "DESCENDING" },
        { field: "EXPERIMENT_ID", direction: "ASCENDING" },
      ],
      defaultTopK: 10,
    });

    const command: CreateLeaderboardScopeCommand = {
      name: "MVP",
      k: 25,
      rankingConfigurationId: "ranking-v1",
      comparisonKey: "BTCUSDT:1h:2026-H1",
    };
    expect(command.k).toBe(25);
  });

  it("makes the selected formula inspectable through configuration reads", () => {
    const configuration: RankingConfiguration = {
      id: "ranking-v1",
      profileId: "LINEAR_REQUIRED_V1",
      version: 1,
      name: "Required MVP ranking",
      formula: LINEAR_REQUIRED_V1.formula,
      minimumNumberOfTrades: 1,
      tieBreakers: LINEAR_REQUIRED_V1.tieBreakers,
      createdAt: "2026-08-27T00:00:00.000Z",
    };
    expect(configuration.formula.totalReturnPercentWeight).toBe(0.5);
  });
});
