import type { Evaluator } from "../domain/contracts";
import { EVALUATION_RUNTIME_SHA256, EVALUATION_RUNTIME_VERSION } from "../domain/evaluator";
export type { EvaluationMetrics, Evaluator, EvaluationError } from "../domain/contracts";
export interface EvaluatorModulePublicApi {
    readonly evaluator: Evaluator;
    readonly runtimeVersion: string;
    readonly runtimeSha256: string;
}
declare const evaluator: Evaluator;
export { EVALUATION_RUNTIME_SHA256, EVALUATION_RUNTIME_VERSION };
export { evaluator };
