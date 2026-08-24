"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.combineSignals = exports.resolveStrategy = exports.listStrategies = void 0;
exports.createStrategyModule = createStrategyModule;
const notImplemented = () => { throw new Error("NOT_IMPLEMENTED"); };
const listStrategies = () => notImplemented();
exports.listStrategies = listStrategies;
const resolveStrategy = async (_definition) => notImplemented();
exports.resolveStrategy = resolveStrategy;
const combineSignals = (_definition, _signals) => notImplemented();
exports.combineSignals = combineSignals;
function createStrategyModule(_deps) { return { listStrategies: exports.listStrategies, resolveStrategy: exports.resolveStrategy, combineSignals: exports.combineSignals, defineStrategy: async () => notImplemented(), defineComposite: async () => notImplemented() }; }
