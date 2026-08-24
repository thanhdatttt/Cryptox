import type { CompletedBacktestResult } from "modules/backtesting/api";
import type { EvaluationMetrics } from "./contracts";
export declare const EVALUATION_POLICY_ID = "MVP_EVALUATION_V1";
export declare const EVALUATION_RUNTIME_VERSION = "1.0.0";
export declare const EVALUATION_RUNTIME_SHA256 = "e4b2f8a1d1a3e6f22f0d0ef8d5a4b9d2c7e1f9a3b4c6d8e0f1a2b3c4d5e6f708";
export declare function evaluateBacktest(result: CompletedBacktestResult): EvaluationMetrics;
