import type { Evaluator } from "../domain/contracts";
export type { EvaluationMetrics, Evaluator, EvaluationError } from "../domain/contracts";
export interface EvaluatorModulePublicApi {
    readonly evaluator: Evaluator;
    readonly runtimeVersion: string;
    readonly runtimeSha256: string;
}
export declare function createEvaluationModule(): EvaluatorModulePublicApi;
export declare const evaluationModule: EvaluatorModulePublicApi;
