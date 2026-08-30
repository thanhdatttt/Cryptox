"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluator = exports.EVALUATION_RUNTIME_VERSION = exports.EVALUATION_RUNTIME_SHA256 = void 0;
const runtime_provenance_1 = require("../application/runtime-provenance");
Object.defineProperty(exports, "EVALUATION_RUNTIME_SHA256", { enumerable: true, get: function () { return runtime_provenance_1.EVALUATION_RUNTIME_SHA256; } });
Object.defineProperty(exports, "EVALUATION_RUNTIME_VERSION", { enumerable: true, get: function () { return runtime_provenance_1.EVALUATION_RUNTIME_VERSION; } });
const evaluator_1 = require("../domain/evaluator");
const evaluator = { evaluate(result) { return (0, evaluator_1.evaluateBacktest)(result, { version: runtime_provenance_1.EVALUATION_RUNTIME_VERSION, sha256: runtime_provenance_1.EVALUATION_RUNTIME_SHA256 }); } };
exports.evaluator = evaluator;
