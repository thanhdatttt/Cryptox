import { describe, expect, it } from "vitest";
import { composeWorkerModules } from "./compose";
describe("worker composition", () => {
  it("contains only worker-safe capabilities", () => {
    expect(Object.keys(composeWorkerModules())).toEqual([
      "backtesting",
      "strategy",
      "marketDataSnapshotReader",
    ]);
  });
});
