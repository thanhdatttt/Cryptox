import type { CompletedBacktestResult } from "modules/backtesting/api";
import type { EvaluationMetrics, Evaluator } from "../domain/contracts";
import { EVALUATION_RUNTIME_SHA256, EVALUATION_RUNTIME_VERSION } from "../application/runtime-provenance";
import { evaluateBacktest } from "../domain/evaluator";
export type { EvaluationMetrics, Evaluator, EvaluationError } from "../domain/contracts";
export interface EvaluatorModulePublicApi { readonly evaluator: Evaluator; readonly runtimeVersion: string; readonly runtimeSha256: string; }
const evaluator: Evaluator = { evaluate(result: CompletedBacktestResult): EvaluationMetrics { return evaluateBacktest(result, { version: EVALUATION_RUNTIME_VERSION, sha256: EVALUATION_RUNTIME_SHA256 }); } };
export { EVALUATION_RUNTIME_SHA256, EVALUATION_RUNTIME_VERSION };
export { evaluator };
