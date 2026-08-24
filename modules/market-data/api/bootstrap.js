"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMarketDataSnapshotReader = void 0;
exports.createMarketDataModule = createMarketDataModule;
const service_1 = require("../application/service");
function createMarketDataModule(deps) { return (0, service_1.createMarketDataService)(deps); }
var snapshot_reader_1 = require("./snapshot-reader");
Object.defineProperty(exports, "createMarketDataSnapshotReader", { enumerable: true, get: function () { return snapshot_reader_1.createMarketDataSnapshotReader; } });
