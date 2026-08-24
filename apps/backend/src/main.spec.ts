import { describe, expect, it } from "vitest";
import { composeAllModules } from "./compose";
describe("backend composition", () => {
  it("includes all nine modules", () => {
    expect(Object.keys(composeAllModules())).toHaveLength(9);
  });
});
