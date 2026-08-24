import { describe, expect, it } from "vitest";
import { verify } from "./index";
describe("auth skeleton", () => {
  it("stubs verification", async () => {
    await expect(verify("token")).rejects.toThrow("NOT_IMPLEMENTED");
  });
});
