"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInMemoryStrategyDependencies = createInMemoryStrategyDependencies;
exports.createStrategyModule = createStrategyModule;
const node_crypto_1 = require("node:crypto");
const plugins_1 = require("../domain/plugins");
const stable = (value) => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([left], [right]) => left.localeCompare(right))) : item);
const digest = (value) => (0, node_crypto_1.createHash)("sha256").update(stable(value)).digest("hex");
const isPlainRecord = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const invalid = (code) => { throw new Error(code); };
const runtimeList = () => plugins_1.builtInFactories.map((factory) => factory.descriptor);
const runtimeResolve = async (definition) => {
    const factory = plugins_1.builtInFactories.find((candidate) => candidate.descriptor.name === definition.strategyName && candidate.descriptor.implementationSha256 === definition.implementationSha256);
    if (!factory)
        invalid("STRATEGY_ARTIFACT_NOT_FOUND");
    return factory.create(definition.parameters);
};
const runtimeCombine = (definition, signals) => {
    const selected = definition.components.map((component) => ({ component, signal: signals.find((item) => item.strategyDefinitionId === component.strategyDefinitionId)?.signal ?? "HOLD" }));
    if (selected.length === 0)
        return "HOLD";
    if (definition.method === "MAJORITY_VOTE") {
        const counts = { BUY: 0, SELL: 0, HOLD: 0 };
        selected.forEach(({ signal }) => { counts[signal] += 1; });
        if (counts.BUY > counts.SELL && counts.BUY > counts.HOLD)
            return "BUY";
        return counts.SELL > counts.BUY && counts.SELL > counts.HOLD ? "SELL" : "HOLD";
    }
    const score = selected.reduce((sum, { component, signal }) => sum + component.weight * (signal === "BUY" ? 1 : signal === "SELL" ? -1 : 0), 0);
    const thresholds = definition.thresholds ?? { buy: 0.3, sell: -0.3 };
    return score > thresholds.buy ? "BUY" : score < thresholds.sell ? "SELL" : "HOLD";
};
const validateParameters = (factory, parameters) => {
    if (!isPlainRecord(parameters))
        invalid("INVALID_STRATEGY_PARAMETERS");
    const declared = new Map(factory.descriptor.parameters.map((descriptor) => [descriptor.key, descriptor]));
    if (Object.keys(parameters).some((key) => !declared.has(key)))
        invalid("INVALID_STRATEGY_PARAMETERS");
    const normalized = {};
    for (const descriptor of factory.descriptor.parameters) {
        const value = parameters[descriptor.key] ?? descriptor.defaultValue;
        if (value === undefined && descriptor.required)
            invalid("INVALID_STRATEGY_PARAMETERS");
        if (descriptor.type === "ENUM") {
            if (typeof value !== "string" || !descriptor.options?.includes(value))
                invalid("INVALID_STRATEGY_PARAMETERS");
        }
        else {
            if (typeof value !== "number" || !Number.isFinite(value) || (descriptor.type === "INTEGER" && !Number.isInteger(value)))
                invalid("INVALID_STRATEGY_PARAMETERS");
            const numericValue = value;
            if (descriptor.minimum !== undefined && numericValue < descriptor.minimum)
                invalid("INVALID_STRATEGY_PARAMETERS");
            if (descriptor.maximum !== undefined && numericValue > descriptor.maximum)
                invalid("INVALID_STRATEGY_PARAMETERS");
        }
        normalized[descriptor.key] = value;
    }
    if (factory.descriptor.name === "MA" && Number(normalized.fastPeriod) >= Number(normalized.slowPeriod))
        invalid("INVALID_STRATEGY_PARAMETERS");
    if (factory.descriptor.name === "RSI" && Number(normalized.buyThreshold) >= Number(normalized.sellThreshold))
        invalid("INVALID_STRATEGY_PARAMETERS");
    return normalized;
};
function createInMemoryStrategyDependencies() {
    const definitions = new Map();
    const composites = new Map();
    const factories = new Map(plugins_1.builtInFactories.map((factory) => [`${factory.descriptor.name}:${factory.descriptor.implementationSha256}`, factory]));
    return {
        artifactResolver: { resolve: async (name, sha) => { const factory = factories.get(`${name}:${sha}`); if (!factory)
                throw new Error("STRATEGY_ARTIFACT_NOT_FOUND"); return factory; } },
        definitionRepository: {
            insert: async (ownerUserId, definition) => { definitions.set(definition.id, { ownerUserId, value: definition }); return definition; },
            list: async (ownerUserId) => [...definitions.values()].filter((item) => item.ownerUserId === ownerUserId).map((item) => item.value).sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id)),
            listByIds: async (ownerUserId, ids) => ids.flatMap((id) => { const definition = definitions.get(id); return definition?.ownerUserId === ownerUserId ? [definition.value] : []; }),
            listByLogicalFamily: async (ownerUserId, logicalFamilyKey) => [...definitions.values()].filter((item) => item.ownerUserId === ownerUserId && item.value.logicalFamilyKey === logicalFamilyKey).map((item) => item.value),
        },
        compositeRepository: {
            insert: async (ownerUserId, composite) => { composites.set(composite.id, { ownerUserId, value: composite }); return composite; },
            list: async (ownerUserId) => [...composites.values()].filter((item) => item.ownerUserId === ownerUserId).map((item) => item.value).sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id)),
            get: async (ownerUserId, id) => { const composite = composites.get(id); return composite?.ownerUserId === ownerUserId ? composite.value : undefined; },
            listByLogicalFamily: async (ownerUserId, logicalFamilyKey) => [...composites.values()].filter((item) => item.ownerUserId === ownerUserId && item.value.logicalFamilyKey === logicalFamilyKey).map((item) => item.value),
        },
    };
}
function createStrategyModule(dependencies = createInMemoryStrategyDependencies()) {
    const factories = new Map(plugins_1.builtInFactories.map((factory) => [factory.descriptor.name, factory]));
    const nextId = (kind) => `${kind}-${(0, node_crypto_1.randomUUID)()}`;
    const getDefinition = async (userId, id) => {
        const definition = (await dependencies.definitionRepository.listByIds(userId, [id]))[0];
        if (!definition)
            invalid("STRATEGY_DEFINITION_NOT_FOUND");
        return definition;
    };
    return {
        listStrategies: runtimeList,
        resolveStrategy: async (definition) => {
            await dependencies.artifactResolver.resolve(definition.strategyName, definition.implementationSha256);
            return runtimeResolve(definition);
        },
        combineSignals: runtimeCombine,
        listDefinitions: async (userId) => dependencies.definitionRepository.list(userId),
        readDefinitions: async (userId, ids) => Promise.all(ids.map((id) => getDefinition(userId, id))),
        listComposites: async (userId) => dependencies.compositeRepository.list(userId),
        readComposite: async (userId, id) => {
            const composite = await dependencies.compositeRepository.get(userId, id);
            if (!composite)
                invalid("COMPOSITE_STRATEGY_NOT_FOUND");
            return composite;
        },
        defineStrategy: async (userId, strategyName, parameters) => {
            if (!userId.trim())
                invalid("INVALID_USER");
            const factory = factories.get(strategyName);
            if (!factory)
                invalid("STRATEGY_NOT_REGISTERED");
            const normalized = validateParameters(factory, parameters);
            const logicalFamilyKey = `strategy:${strategyName}`;
            const content = { strategyName, implementationSha256: factory.descriptor.implementationSha256, parameters: normalized };
            const prior = await dependencies.definitionRepository.listByLogicalFamily(userId, logicalFamilyKey);
            const existing = prior.find((definition) => digest({ strategyName: definition.strategyName, implementationSha256: definition.implementationSha256, parameters: definition.parameters }) === digest(content));
            if (existing)
                return existing;
            const definition = { id: nextId("strategy-definition"), logicalFamilyKey, familyName: factory.descriptor.displayName, strategyName, implementationVersion: factory.descriptor.implementationVersion, implementationSha256: factory.descriptor.implementationSha256, version: Math.max(0, ...prior.map((item) => item.version)) + 1, parameters: normalized, createdAt: new Date().toISOString() };
            return dependencies.definitionRepository.insert(userId, definition);
        },
        defineComposite: async (userId, command) => {
            if (!userId.trim() || !command || !["MAJORITY_VOTE", "WEIGHTED_SCORE"].includes(command.method) || command.components.length === 0)
                invalid("INVALID_COMPOSITE_STRATEGY");
            const components = command.components.map((component) => ({ strategyDefinitionId: component.strategyDefinitionId, weight: component.weight }));
            await Promise.all(components.map((component) => getDefinition(userId, component.strategyDefinitionId)));
            let thresholds;
            if (command.method === "MAJORITY_VOTE") {
                for (const component of components)
                    component.weight = 0;
                thresholds = { buy: 0.3, sell: -0.3 };
            }
            else {
                const totalWeight = components.reduce((sum, component) => sum + component.weight, 0);
                if (components.some((component) => !Number.isFinite(component.weight)) || Math.abs(totalWeight - 1) > 1e-9)
                    invalid("INVALID_COMPOSITE_STRATEGY");
                thresholds = command.thresholds ?? { buy: 0.3, sell: -0.3 };
                if (![thresholds.buy, thresholds.sell].every(Number.isFinite) || thresholds.buy <= thresholds.sell)
                    invalid("INVALID_COMPOSITE_STRATEGY");
            }
            const logicalFamilyKey = `composite:${command.method}:${components.map((component) => component.strategyDefinitionId).sort().join(",")}`;
            const content = { method: command.method, components, thresholds };
            const prior = await dependencies.compositeRepository.listByLogicalFamily(userId, logicalFamilyKey);
            const existing = prior.find((composite) => digest({ method: composite.method, components: composite.components, thresholds: composite.thresholds }) === digest(content));
            if (existing)
                return existing;
            const composite = { id: nextId("composite-strategy"), logicalFamilyKey, version: Math.max(0, ...prior.map((item) => item.version)) + 1, method: command.method, components, thresholds, createdAt: new Date().toISOString() };
            return dependencies.compositeRepository.insert(userId, composite);
        },
        buildVisualization: () => [],
    };
}
