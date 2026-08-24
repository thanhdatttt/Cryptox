"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluator = exports.EVALUATION_RUNTIME_VERSION = exports.EVALUATION_RUNTIME_SHA256 = void 0;
const evaluator_1 = require("../domain/evaluator");
Object.defineProperty(exports, "EVALUATION_RUNTIME_SHA256", { enumerable: true, get: function () { return evaluator_1.EVALUATION_RUNTIME_SHA256; } });
Object.defineProperty(exports, "EVALUATION_RUNTIME_VERSION", { enumerable: true, get: function () { return evaluator_1.EVALUATION_RUNTIME_VERSION; } });
const evaluator = { evaluate(result) { return (0, evaluator_1.evaluateBacktest)(result); } };
exports.evaluator = evaluator;
