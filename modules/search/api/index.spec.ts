import { describe, expect, it } from "vitest";
import { start } from "./index";
describe("search skeleton", () => {
  it("stubs start", async () => {
    await expect(
      start({
        searchSpace: { availableStrategies: [] },
        stopCondition: { maxCandidates: 1 },
        generatorType: "RANDOM",
        leaderboardScopeId: "scope",
        maxInFlight: 1,
      }),
    ).rejects.toThrow("NOT_IMPLEMENTED");
  });
});
