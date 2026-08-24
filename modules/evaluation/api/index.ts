import type { CompletedBacktestResult } from "modules/backtesting/api";
import type { EvaluationMetrics, Evaluator } from "../domain/contracts";
export type { EvaluationMetrics, Evaluator, EvaluationError } from "../domain/contracts";
export interface EvaluatorModulePublicApi {
  readonly evaluator: Evaluator;
  readonly runtimeVersion: string;
  readonly runtimeSha256: string;
}
const evaluator: Evaluator = {
  evaluate(_result: CompletedBacktestResult): EvaluationMetrics {
    throw new Error("NOT_IMPLEMENTED");
  },
};
