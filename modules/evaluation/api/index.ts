import type { CompletedBacktestResult } from "modules/backtesting/api";
import type { EvaluationMetrics, Evaluator } from "../domain/contracts";
import { EVALUATION_RUNTIME_SHA256, EVALUATION_RUNTIME_VERSION, evaluateBacktest } from "../domain/evaluator";
export type { EvaluationMetrics, Evaluator, EvaluationError } from "../domain/contracts";
export interface EvaluatorModulePublicApi { readonly evaluator: Evaluator; readonly runtimeVersion: string; readonly runtimeSha256: string; }
const evaluator: Evaluator = { evaluate(result: CompletedBacktestResult): EvaluationMetrics { return evaluateBacktest(result); } };
export { EVALUATION_RUNTIME_SHA256, EVALUATION_RUNTIME_VERSION };
export { evaluator };
