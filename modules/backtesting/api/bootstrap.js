"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBacktestingModule = createBacktestingModule;
const index_1 = require("./index");
function createBacktestingModule(_deps) { return { createBenchmarkScope: index_1.createBenchmarkScope, startManual: index_1.startManual, submitSearchCandidate: index_1.submitSearchCandidate, status: index_1.status, summarizeSearchCandidates: index_1.summarizeSearchCandidates, listSearchCandidates: index_1.listSearchCandidates, cancelSearchCandidates: index_1.cancelSearchCandidates, cancelManualCandidate: index_1.cancelManualCandidate, removePendingJobs: index_1.removePendingJobs, readAttempt: index_1.readAttempt, listAttemptTrades: index_1.listAttemptTrades, readExperimentSummary: index_1.readExperimentSummary, listExperimentTrades: index_1.listExperimentTrades, verifyReplay: index_1.verifyReplay }; }
