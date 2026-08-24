"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEvaluationModule = createEvaluationModule;
const index_1 = require("./index");
function createEvaluationModule() { return { evaluator: index_1.evaluator, runtimeVersion: index_1.EVALUATION_RUNTIME_VERSION, runtimeSha256: index_1.EVALUATION_RUNTIME_SHA256 }; }
