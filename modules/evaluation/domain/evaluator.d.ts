import type { CompletedBacktestResult } from "modules/backtesting/api";
import type { EvaluationMetrics } from "./contracts";
export declare const EVALUATION_POLICY_ID = "MVP_EVALUATION_V1";
export declare function evaluateBacktest(result: CompletedBacktestResult, provenance: {
    version: string;
    sha256: string;
}): EvaluationMetrics;
