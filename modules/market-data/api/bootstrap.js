"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisLatestValueCache = exports.createRedisLatestValueCache = exports.PostgresSnapshotRepository = exports.PostgresCandleRepository = exports.createBinanceMarketDataAdapter = exports.createMarketDataSnapshotReader = void 0;
exports.createMarketDataModule = createMarketDataModule;
const service_1 = require("../application/service");
function createMarketDataModule(deps) { return (0, service_1.createMarketDataService)(deps); }
var snapshot_reader_1 = require("./snapshot-reader");
Object.defineProperty(exports, "createMarketDataSnapshotReader", { enumerable: true, get: function () { return snapshot_reader_1.createMarketDataSnapshotReader; } });
var binance_adapter_1 = require("../infrastructure/binance-adapter");
Object.defineProperty(exports, "createBinanceMarketDataAdapter", { enumerable: true, get: function () { return binance_adapter_1.createBinanceMarketDataAdapter; } });
var postgres_repositories_1 = require("../infrastructure/postgres-repositories");
Object.defineProperty(exports, "PostgresCandleRepository", { enumerable: true, get: function () { return postgres_repositories_1.PostgresCandleRepository; } });
Object.defineProperty(exports, "PostgresSnapshotRepository", { enumerable: true, get: function () { return postgres_repositories_1.PostgresSnapshotRepository; } });
var redis_latest_value_cache_1 = require("../infrastructure/redis-latest-value-cache");
Object.defineProperty(exports, "createRedisLatestValueCache", { enumerable: true, get: function () { return redis_latest_value_cache_1.createRedisLatestValueCache; } });
Object.defineProperty(exports, "RedisLatestValueCache", { enumerable: true, get: function () { return redis_latest_value_cache_1.RedisLatestValueCache; } });
