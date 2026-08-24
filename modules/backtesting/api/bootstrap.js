"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPostgresBacktestingDependencies = exports.PostgresBacktestingRepository = exports.BACKTEST_RUNTIME_VERSION = exports.BACKTEST_RUNTIME_SHA256 = exports.createBacktestingService = exports.createInMemoryBacktestingDependencies = void 0;
exports.createBacktestingModule = createBacktestingModule;
const service_1 = require("../application/service");
function createBacktestingModule(deps) { return (0, service_1.createBacktestingService)(deps ?? (0, service_1.createInMemoryBacktestingDependencies)()); }
var service_2 = require("../application/service");
Object.defineProperty(exports, "createInMemoryBacktestingDependencies", { enumerable: true, get: function () { return service_2.createInMemoryBacktestingDependencies; } });
Object.defineProperty(exports, "createBacktestingService", { enumerable: true, get: function () { return service_2.createBacktestingService; } });
Object.defineProperty(exports, "BACKTEST_RUNTIME_SHA256", { enumerable: true, get: function () { return service_2.BACKTEST_RUNTIME_SHA256; } });
Object.defineProperty(exports, "BACKTEST_RUNTIME_VERSION", { enumerable: true, get: function () { return service_2.BACKTEST_RUNTIME_VERSION; } });
var postgres_repository_1 = require("../infrastructure/postgres-repository");
Object.defineProperty(exports, "PostgresBacktestingRepository", { enumerable: true, get: function () { return postgres_repository_1.PostgresBacktestingRepository; } });
Object.defineProperty(exports, "createPostgresBacktestingDependencies", { enumerable: true, get: function () { return postgres_repository_1.createPostgresBacktestingDependencies; } });
