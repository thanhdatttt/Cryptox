"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leaderboard = exports.status = exports.cancel = exports.resume = exports.pause = exports.start = void 0;
exports.createSearchModule = createSearchModule;
const notImplemented = () => { throw new Error("NOT_IMPLEMENTED"); };
const start = async () => notImplemented();
exports.start = start;
const pause = async () => notImplemented();
exports.pause = pause;
const resume = async () => notImplemented();
exports.resume = resume;
const cancel = async () => notImplemented();
exports.cancel = cancel;
const status = async () => notImplemented();
exports.status = status;
const leaderboard = async () => notImplemented();
exports.leaderboard = leaderboard;
function createSearchModule(_deps) { return { start: exports.start, pause: exports.pause, resume: exports.resume, cancel: exports.cancel, status: exports.status, leaderboard: exports.leaderboard, onCandidateFinished: async () => notImplemented(), fillAvailableSlots: async () => notImplemented() }; }
