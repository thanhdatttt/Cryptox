import { describe, expect, it } from "vitest";
import { createEvaluationModule } from "./bootstrap";
describe("evaluation skeleton", () => {
  it("does not expose a bare evaluate function", () => {
    expect(createEvaluationModule()).toHaveProperty("evaluator");
  });
});
