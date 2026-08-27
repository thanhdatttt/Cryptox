import { describe, expect, it } from "vitest";
import * as evaluationApi from "./index";
import { createEvaluationModule } from "./bootstrap";

describe("evaluation public entrypoint", () => {
  it("exports only the required metric profile at the runtime root", () => {
    expect(Object.keys(evaluationApi).sort()).toEqual(
      ["REQUIRED_METRICS_V1", "REQUIRED_METRICS_V1_ID"].sort(),
    );
    expect(createEvaluationModule()).toHaveProperty("evaluator");
  });
});
