"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVALUATION_RUNTIME_SHA256 = exports.EVALUATION_RUNTIME_VERSION = void 0;
const node_crypto_1 = require("node:crypto");
const evaluator_1 = require("../domain/evaluator");
exports.EVALUATION_RUNTIME_VERSION = "1.0.0";
exports.EVALUATION_RUNTIME_SHA256 = (0, node_crypto_1.createHash)("sha256")
    .update(`${exports.EVALUATION_RUNTIME_VERSION}\n${evaluator_1.evaluateBacktest.toString()}`, "utf8")
    .digest("hex");
