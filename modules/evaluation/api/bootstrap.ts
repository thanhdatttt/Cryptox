import type { EvaluatorModulePublicApi } from "./index";
import type { Evaluator } from "../domain/contracts";
import { evaluator, EVALUATION_RUNTIME_SHA256, EVALUATION_RUNTIME_VERSION } from "./index";
export function createEvaluationModule(): EvaluatorModulePublicApi { return { evaluator, runtimeVersion: EVALUATION_RUNTIME_VERSION, runtimeSha256: EVALUATION_RUNTIME_SHA256 }; }
