"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStrategyModule = createStrategyModule;
const index_1 = require("./index");
function createStrategyModule(_deps) { return { listStrategies: index_1.listStrategies, resolveStrategy: index_1.resolveStrategy, combineSignals: index_1.combineSignals, defineStrategy: async () => { throw new Error("NOT_IMPLEMENTED"); }, defineComposite: async () => { throw new Error("NOT_IMPLEMENTED"); } }; }
