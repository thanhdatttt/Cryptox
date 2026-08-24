"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readSnapshot = exports.createSnapshot = exports.readLatestForNews = exports.analyze = void 0;
exports.createSentimentModule = createSentimentModule;
const notImplemented = () => { throw new Error("NOT_IMPLEMENTED"); };
const analyze = async () => notImplemented();
exports.analyze = analyze;
const readLatestForNews = async () => notImplemented();
exports.readLatestForNews = readLatestForNews;
const createSnapshot = async () => notImplemented();
exports.createSnapshot = createSnapshot;
const readSnapshot = () => notImplemented();
exports.readSnapshot = readSnapshot;
function createSentimentModule(_deps) { return { analyze: exports.analyze, readLatestForNews: exports.readLatestForNews, createSnapshot: exports.createSnapshot, readSnapshot: exports.readSnapshot }; }
