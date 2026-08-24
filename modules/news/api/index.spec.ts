import { describe, expect, it } from "vitest";
import { readNews } from "./index";
describe("news skeleton", () => {
  it("stubs reads", async () => {
    await expect(readNews()).rejects.toThrow("NOT_IMPLEMENTED");
  });
});
