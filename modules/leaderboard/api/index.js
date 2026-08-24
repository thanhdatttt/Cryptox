"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submit = exports.rankSearchRun = exports.topK = exports.score = void 0;
exports.createLeaderboardModule = createLeaderboardModule;
const notImplemented = () => {
  throw new Error("NOT_IMPLEMENTED");
};
const score = () => notImplemented();
exports.score = score;
const topK = async () => notImplemented();
exports.topK = topK;
const rankSearchRun = async () => notImplemented();
exports.rankSearchRun = rankSearchRun;
const submit = async () => notImplemented();
exports.submit = submit;
function createLeaderboardModule(_deps) {
  return {
    score: exports.score,
    topK: exports.topK,
    rankSearchRun: exports.rankSearchRun,
    submit: exports.submit,
    createLeaderboardScope: async () => notImplemented(),
    getLeaderboardScope: async () => notImplemented(),
  };
}
