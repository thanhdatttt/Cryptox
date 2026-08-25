"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defineComposite = exports.defineStrategy = exports.readComposite = exports.listComposites = exports.readDefinitions = exports.listDefinitions = exports.combineSignals = exports.resolveStrategy = exports.listStrategies = void 0;
const plugins_1 = require("../domain/plugins");
const service_1 = require("../application/service");
const factories = new Map(plugins_1.builtInFactories.map((factory) => [factory.descriptor.name, factory]));
const defaultRuntime = (0, service_1.createStrategyModule)();
const listStrategies = () => plugins_1.builtInFactories.map((factory) => factory.descriptor);
exports.listStrategies = listStrategies;
const resolveStrategy = async (definition) => {
    const factory = factories.get(definition.strategyName);
    if (!factory || factory.descriptor.implementationSha256 !== definition.implementationSha256)
        throw new Error("STRATEGY_ARTIFACT_NOT_FOUND");
    return factory.create(definition.parameters);
};
exports.resolveStrategy = resolveStrategy;
const combineSignals = (definition, signals) => {
    const selected = definition.components.map((component) => ({ component, signal: signals.find((item) => item.strategyDefinitionId === component.strategyDefinitionId)?.signal ?? "HOLD" }));
    if (selected.length === 0)
        return "HOLD";
    if (definition.method === "MAJORITY_VOTE") {
        const counts = { BUY: 0, SELL: 0, HOLD: 0 };
        selected.forEach(({ signal }) => { counts[signal] += 1; });
        if (counts.BUY > counts.SELL && counts.BUY > counts.HOLD)
            return "BUY";
        if (counts.SELL > counts.BUY && counts.SELL > counts.HOLD)
            return "SELL";
        return "HOLD";
    }
    const score = selected.reduce((sum, { component, signal }) => sum + component.weight * (signal === "BUY" ? 1 : signal === "SELL" ? -1 : 0), 0);
    const thresholds = definition.thresholds ?? { buy: 0.3, sell: -0.3 };
    if (score > thresholds.buy)
        return "BUY";
    if (score < thresholds.sell)
        return "SELL";
    return "HOLD";
};
exports.combineSignals = combineSignals;
const listDefinitions = (userId) => defaultRuntime.listDefinitions(userId);
exports.listDefinitions = listDefinitions;
const readDefinitions = (userId, ids) => defaultRuntime.readDefinitions(userId, ids);
exports.readDefinitions = readDefinitions;
const listComposites = (userId) => defaultRuntime.listComposites(userId);
exports.listComposites = listComposites;
const readComposite = (userId, id) => defaultRuntime.readComposite(userId, id);
exports.readComposite = readComposite;
const defineStrategy = (userId, strategyName, parameters) => defaultRuntime.defineStrategy(userId, strategyName, parameters);
exports.defineStrategy = defineStrategy;
const defineComposite = (userId, command) => defaultRuntime.defineComposite(userId, command);
exports.defineComposite = defineComposite;
