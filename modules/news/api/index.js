"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readNews = exports.collect = void 0;
exports.createNewsModule = createNewsModule;
const notImplemented = () => {
  throw new Error("NOT_IMPLEMENTED");
};
const collect = async () => notImplemented();
exports.collect = collect;
const readNews = async () => notImplemented();
exports.readNews = readNews;
function createNewsModule(_deps) {
  return { collect: exports.collect, readNews: exports.readNews };
}
