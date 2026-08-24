"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMarketDataSnapshotReader = createMarketDataSnapshotReader;
const service_1 = require("../application/service");
function createMarketDataSnapshotReader(deps) {
    return { readDatasetSnapshot: (0, service_1.createMarketDataService)(deps).readDatasetSnapshot };
}
