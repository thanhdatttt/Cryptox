"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMarketDataSnapshotReader =
  exports.shutdown =
  exports.subscribeMarketData =
  exports.readDatasetSnapshot =
  exports.createDatasetSnapshot =
  exports.readCandles =
    void 0;
exports.createMarketDataModule = createMarketDataModule;
const notImplemented = () => {
  throw new Error("NOT_IMPLEMENTED");
};
const readCandles = async () => notImplemented();
exports.readCandles = readCandles;
const createDatasetSnapshot = async () => notImplemented();
exports.createDatasetSnapshot = createDatasetSnapshot;
const readDatasetSnapshot = async () => notImplemented();
exports.readDatasetSnapshot = readDatasetSnapshot;
const subscribeMarketData = async () => notImplemented();
exports.subscribeMarketData = subscribeMarketData;
const shutdown = async () => notImplemented();
exports.shutdown = shutdown;
var snapshot_reader_1 = require("./snapshot-reader");
Object.defineProperty(exports, "createMarketDataSnapshotReader", {
  enumerable: true,
  get: function () {
    return snapshot_reader_1.createMarketDataSnapshotReader;
  },
});
function createMarketDataModule(_deps) {
  return {
    readCandles: exports.readCandles,
    createDatasetSnapshot: exports.createDatasetSnapshot,
    readDatasetSnapshot: exports.readDatasetSnapshot,
    subscribeMarketData: exports.subscribeMarketData,
    shutdown: exports.shutdown,
  };
}
