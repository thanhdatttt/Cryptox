import {
  EvaluationDomainError,
  calculateRequiredMetrics,
} from "../domain/evaluator";
import {
  REQUIRED_METRICS_V1_ID,
  type EvaluationError,
  type Evaluator,
  type EvaluatorModulePublicApi,
} from "./contracts";

const EVALUATION_RUNTIME_VERSION = "1.0.0" as const;

const evaluator: Evaluator = {
  evaluate(input) {
    if (input === null || typeof input !== "object") {
      const error = new EvaluationDomainError(
        "INVALID_INPUT",
        "evaluation input must be an object",
      );
      throw error satisfies EvaluationError;
    }

    if (typeof input.candidateId !== "string" || input.candidateId.length === 0) {
      const error = new EvaluationDomainError(
        "INVALID_INPUT",
        "candidateId must be a non-empty string",
      );
      throw error satisfies EvaluationError;
    }

    const metrics = calculateRequiredMetrics(input);
    return {
      candidateId: input.candidateId,
      ...metrics,
      evaluationProfileId: REQUIRED_METRICS_V1_ID,
    };
  },
};

export function createEvaluationModule(): EvaluatorModulePublicApi {
  return { evaluator, runtimeVersion: EVALUATION_RUNTIME_VERSION };
}
