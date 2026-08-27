import { describe, expect, it } from "vitest";
import * as leaderboardApi from "./index";

describe("leaderboard public entrypoint", () => {
  it("allowlists configuration reads and ranking operations", () => {
    expect(Object.keys(leaderboardApi).sort()).toEqual(
      [
        "LEADERBOARD_COMPARISON_IDENTITY_V1",
        "LINEAR_REQUIRED_V1",
        "LINEAR_REQUIRED_V1_ID",
        "createLeaderboardScope",
        "getLeaderboardScope",
        "getRankingConfiguration",
        "listRankingConfigurations",
        "rankSearchRun",
        "score",
        "submit",
        "topK",
      ].sort(),
    );
    expect(() => leaderboardApi.score("scope", {} as never)).toThrow("NOT_IMPLEMENTED");
  });
});
