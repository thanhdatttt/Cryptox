"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluationModule = void 0;
exports.createEvaluationModule = createEvaluationModule;
const evaluator = { evaluate(_result) { throw new Error("NOT_IMPLEMENTED"); } };
function createEvaluationModule() { return { evaluator, runtimeVersion: "0.0.0-skeleton", runtimeSha256: "0".repeat(64) }; }
exports.evaluationModule = createEvaluationModule();
