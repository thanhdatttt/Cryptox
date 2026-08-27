import type { Evaluator, EvaluatorModulePublicApi } from "./contracts";
const evaluator: Evaluator = {
  evaluate() {
    throw new Error("NOT_IMPLEMENTED");
  },
};
export function createEvaluationModule(): EvaluatorModulePublicApi {
  return { evaluator, runtimeVersion: "0.0.0-skeleton" };
}
