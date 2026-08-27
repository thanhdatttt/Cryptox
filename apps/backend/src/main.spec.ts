import { describe, expect, it } from "vitest";
import { composeAllModules } from "./compose";
describe("backend composition", () => {
  it("includes the eight active structural module placeholders", () => {
    expect(Object.keys(composeAllModules())).toEqual([
      "marketData",
      "strategy",
      "search",
      "backtesting",
      "evaluation",
      "leaderboard",
      "news",
      "sentiment",
    ]);
  });
});
