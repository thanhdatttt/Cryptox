import type { EvaluatorModulePublicApi } from "./index";
import type { Evaluator } from "../domain/contracts";
const evaluator: Evaluator = { evaluate() { throw new Error("NOT_IMPLEMENTED"); } };
export function createEvaluationModule(): EvaluatorModulePublicApi { return { evaluator, runtimeVersion: "0.0.0-skeleton", runtimeSha256: "0".repeat(64) }; }
