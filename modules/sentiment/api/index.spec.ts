import { describe, expect, it } from "vitest";
import { readSnapshot } from "./index";
describe("sentiment skeleton", () => {
  it("stubs snapshot reads", () => {
    expect(() => readSnapshot("snapshot")).toThrow("NOT_IMPLEMENTED");
  });
});
