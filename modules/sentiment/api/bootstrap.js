"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresSentimentSnapshotRepository = exports.PostgresSentimentResultRepository = exports.LOCAL_SENTIMENT_MODEL_VERSION = exports.LOCAL_SENTIMENT_MODEL_SHA256 = exports.LOCAL_SENTIMENT_MODEL_NAME = exports.createDeterministicSentimentAdapter = void 0;
exports.createSentimentModule = createSentimentModule;
const service_1 = require("../application/service");
function createSentimentModule(deps) { return (0, service_1.createSentimentModule)(deps); }
var deterministic_adapter_1 = require("../infrastructure/deterministic-adapter");
Object.defineProperty(exports, "createDeterministicSentimentAdapter", { enumerable: true, get: function () { return deterministic_adapter_1.createDeterministicSentimentAdapter; } });
Object.defineProperty(exports, "LOCAL_SENTIMENT_MODEL_NAME", { enumerable: true, get: function () { return deterministic_adapter_1.LOCAL_SENTIMENT_MODEL_NAME; } });
Object.defineProperty(exports, "LOCAL_SENTIMENT_MODEL_SHA256", { enumerable: true, get: function () { return deterministic_adapter_1.LOCAL_SENTIMENT_MODEL_SHA256; } });
Object.defineProperty(exports, "LOCAL_SENTIMENT_MODEL_VERSION", { enumerable: true, get: function () { return deterministic_adapter_1.LOCAL_SENTIMENT_MODEL_VERSION; } });
var openai_compatible_adapter_1 = require("../infrastructure/openai-compatible-adapter");
Object.defineProperty(exports, "createOpenAiCompatibleSentimentAdapter", { enumerable: true, get: function () { return openai_compatible_adapter_1.createOpenAiCompatibleSentimentAdapter; } });
Object.defineProperty(exports, "SentimentModelError", { enumerable: true, get: function () { return openai_compatible_adapter_1.SentimentModelError; } });
var postgres_repositories_1 = require("../infrastructure/postgres-repositories");
Object.defineProperty(exports, "PostgresSentimentResultRepository", { enumerable: true, get: function () { return postgres_repositories_1.PostgresSentimentResultRepository; } });
Object.defineProperty(exports, "PostgresSentimentSnapshotRepository", { enumerable: true, get: function () { return postgres_repositories_1.PostgresSentimentSnapshotRepository; } });
