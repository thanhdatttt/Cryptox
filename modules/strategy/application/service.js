"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInMemoryStrategyDependencies = createInMemoryStrategyDependencies;
exports.createStrategyModule = createStrategyModule;
const node_crypto_1 = require("node:crypto");
const plugins_1 = require("../domain/plugins");
const public_source_loader_1 = require("../infrastructure/public-source-loader");
const stable = (value) => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([left], [right]) => left.localeCompare(right))) : item);
const digest = (value) => (0, node_crypto_1.createHash)("sha256").update(stable(value)).digest("hex");
const isPlainRecord = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const invalid = (code) => { throw new Error(code); };
const keysAre = (value, required, optional = []) => required.every((key) => Object.prototype.hasOwnProperty.call(value, key)) && Object.keys(value).every((key) => required.includes(key) || optional.includes(key));
const finite = (value) => typeof value === "number" && Number.isFinite(value);
const parameterRecord = (value) => isPlainRecord(value) && Object.values(value).every((item) => typeof item === "string" || finite(item));
const validateHttpUrl = (value) => {
    if (typeof value !== "string" || !value.trim() || value.trim().length > 100000)
        throw new Error("VALIDATION_ERROR");
    const text = value.trim();
    let url;
    try {
        url = new URL(text);
    }
    catch {
        throw new Error("VALIDATION_ERROR");
    }
    if (url.protocol !== "http:" && url.protocol !== "https:")
        invalid("VALIDATION_ERROR");
    return text;
};
const runtimeList = (registry) => registry.list();
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
    const values = parameterRecord(parameters) ? parameters : invalid("INVALID_STRATEGY_PARAMETERS");
    const declared = new Map(factory.descriptor.parameters.map((descriptor) => [descriptor.key, descriptor]));
    if (Object.keys(values).some((key) => !declared.has(key)))
        invalid("INVALID_STRATEGY_PARAMETERS");
    const normalized = {};
    for (const descriptor of factory.descriptor.parameters) {
        const value = values[descriptor.key] ?? descriptor.defaultValue;
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
    try {
        factory.validateParameters?.(normalized);
    }
    catch {
        invalid("INVALID_STRATEGY_PARAMETERS");
    }
    return normalized;
};
const MAX_VISUALIZATION_POINTS = 5_000;
const MAX_VISUALIZATION_OVERLAYS = 32;
const validSignal = (value) => value === "BUY" || value === "SELL" || value === "HOLD";
const normalizeVisualization = (definition, overlays) => {
    if (!Array.isArray(overlays))
        return [];
    return overlays.slice(0, MAX_VISUALIZATION_OVERLAYS).flatMap((overlay, overlayIndex) => {
        if (!isPlainRecord(overlay) || (overlay.kind !== "LINE" && overlay.kind !== "ZONE" && overlay.kind !== "SIGNAL"))
            return [];
        const label = typeof overlay.label === "string" && overlay.label.trim() ? overlay.label : `${overlay.kind} overlay`;
        const localId = typeof overlay.id === "string" && overlay.id.trim() ? overlay.id.trim() : `overlay-${overlayIndex + 1}`;
        const points = Array.isArray(overlay.points) ? overlay.points.slice(-MAX_VISUALIZATION_POINTS) : [];
        if (overlay.kind === "LINE") {
            const normalized = points.flatMap((point) => isPlainRecord(point) && typeof point.time === "string" && finite(point.value) ? [{ time: point.time, value: point.value }] : []);
            return normalized.length > 0 ? [{ id: `${definition.id}:${localId}`, strategyDefinitionId: definition.id, kind: "LINE", label, points: normalized }] : [];
        }
        if (overlay.kind === "ZONE") {
            const normalized = points.flatMap((point) => {
                if (!isPlainRecord(point) || typeof point.time !== "string" || !finite(point.low) || !finite(point.high))
                    return [];
                return [{ time: point.time, low: Math.min(point.low, point.high), high: Math.max(point.low, point.high) }];
            });
            return normalized.length > 0 ? [{ id: `${definition.id}:${localId}`, strategyDefinitionId: definition.id, kind: "ZONE", label, points: normalized }] : [];
        }
        const normalized = points.flatMap((point) => isPlainRecord(point) && typeof point.time === "string" && finite(point.value) && validSignal(point.signal) ? [{ time: point.time, value: point.value, signal: point.signal }] : []);
        return normalized.length > 0 ? [{ id: `${definition.id}:${localId}`, strategyDefinitionId: definition.id, kind: "SIGNAL", label, points: normalized }] : [];
    });
};
function createInMemoryStrategyDependencies() {
    const definitions = new Map();
    const composites = new Map();
    const generations = new Map();
    const registry = (0, plugins_1.createStrategyRegistry)();
    const factories = new Map(registry.list().map((descriptor) => [`${descriptor.name}:${descriptor.implementationSha256}`, registry.get(descriptor.name, descriptor.implementationSha256)]));
    const generationUnitOfWork = {
        commit: async ({ ownerUserId, definitions: generatedDefinitions, composite, audit }) => {
            const definitionSnapshot = new Map(definitions);
            const compositeSnapshot = new Map(composites);
            const generationSnapshot = new Map(generations);
            try {
                for (const definition of generatedDefinitions)
                    definitions.set(definition.id, { ownerUserId, value: { ...definition, userId: ownerUserId } });
                if (composite)
                    composites.set(composite.id, { ownerUserId, value: { ...composite, userId: ownerUserId } });
                generations.set(audit.id, { ...audit });
            }
            catch (error) {
                definitions.clear();
                definitionSnapshot.forEach((value, key) => definitions.set(key, value));
                composites.clear();
                compositeSnapshot.forEach((value, key) => composites.set(key, value));
                generations.clear();
                generationSnapshot.forEach((value, key) => generations.set(key, value));
                throw error;
            }
        },
    };
    return {
        artifactResolver: {
            resolve: async (name, sha) => { const factory = factories.get(`${name}:${sha}`); if (!factory)
                throw new Error("IMPLEMENTATION_ARTIFACT_UNAVAILABLE"); return factory; },
            resolveSync: (name, sha) => factories.get(`${name}:${sha}`),
        },
        definitionRepository: {
            insert: async (ownerUserId, definition) => { const value = { ...definition, userId: ownerUserId }; definitions.set(definition.id, { ownerUserId, value }); return value; },
            list: async (ownerUserId) => [...definitions.values()].filter((item) => item.ownerUserId === ownerUserId).map((item) => item.value).sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id)),
            listByIds: async (ownerUserId, ids) => ids.flatMap((id) => { const definition = definitions.get(id); return definition?.ownerUserId === ownerUserId ? [definition.value] : []; }),
            listByLogicalFamily: async (ownerUserId, logicalFamilyKey) => [...definitions.values()].filter((item) => item.ownerUserId === ownerUserId && item.value.logicalFamilyKey === logicalFamilyKey).map((item) => item.value),
            exists: async (id) => definitions.has(id),
        },
        compositeRepository: {
            insert: async (ownerUserId, composite) => { const value = { ...composite, userId: ownerUserId }; composites.set(composite.id, { ownerUserId, value }); return value; },
            list: async (ownerUserId) => [...composites.values()].filter((item) => item.ownerUserId === ownerUserId).map((item) => item.value).sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id)),
            get: async (ownerUserId, id) => { const composite = composites.get(id); return composite?.ownerUserId === ownerUserId ? composite.value : undefined; },
            listByLogicalFamily: async (ownerUserId, logicalFamilyKey) => [...composites.values()].filter((item) => item.ownerUserId === ownerUserId && item.value.logicalFamilyKey === logicalFamilyKey).map((item) => item.value),
        },
        generationAdapter: {
            modelName: "UNCONFIGURED",
            modelVersion: "0",
            generate: async () => { throw new Error("STRATEGY_MODEL_UNAVAILABLE"); },
        },
        sourceLoader: (0, public_source_loader_1.createPublicStrategySourceLoader)(),
        generationUnitOfWork,
        modelName: "UNCONFIGURED",
        modelVersion: "0",
        promptVersion: "1",
    };
}
function createStrategyModule(dependencies = createInMemoryStrategyDependencies()) {
    const defaults = createInMemoryStrategyDependencies();
    const registry = dependencies.registry ?? (0, plugins_1.createStrategyRegistry)();
    const generationAdapter = dependencies.generationAdapter ?? defaults.generationAdapter;
    const sourceLoader = dependencies.sourceLoader ?? defaults.sourceLoader;
    const generationUnitOfWork = dependencies.generationUnitOfWork ?? {
        commit: async () => { throw new Error("STRATEGY_GENERATION_PERSISTENCE_UNAVAILABLE"); },
    };
    const configuredModelName = dependencies.modelName?.trim();
    const configuredModelVersion = dependencies.modelVersion?.trim();
    const modelName = generationAdapter.modelName ?? (configuredModelName && configuredModelName !== "UNCONFIGURED" ? configuredModelName : "configured-model");
    const modelVersion = generationAdapter.modelVersion ?? (configuredModelVersion && configuredModelVersion !== "0" ? configuredModelVersion : "1");
    const promptVersion = dependencies.promptVersion ?? "1";
    const modelTimeoutMs = finite(dependencies.modelTimeoutMs) && dependencies.modelTimeoutMs > 0 ? dependencies.modelTimeoutMs : 15_000;
    const factories = new Map(registry.list().map((descriptor) => [descriptor.name, registry.get(descriptor.name, descriptor.implementationSha256)]));
    const retainedFactories = new Map();
    const nextId = (kind) => `${kind}-${(0, node_crypto_1.randomUUID)()}`;
    const artifactKey = (definition) => `${definition.strategyName}:${definition.implementationSha256}`;
    const exactFactory = (definition, factory) => {
        if (!factory || factory.descriptor.name !== definition.strategyName || factory.descriptor.implementationSha256 !== definition.implementationSha256)
            throw new Error("IMPLEMENTATION_ARTIFACT_UNAVAILABLE");
        return factory;
    };
    const resolveRetainedFactory = async (definition) => {
        const key = artifactKey(definition);
        const cached = retainedFactories.get(key);
        if (cached)
            return cached;
        let factory;
        try {
            factory = await dependencies.artifactResolver.resolve(definition.strategyName, definition.implementationSha256);
        }
        catch (error) {
            if (error instanceof Error && error.message === "IMPLEMENTATION_ARTIFACT_UNAVAILABLE")
                throw error;
            throw new Error("IMPLEMENTATION_ARTIFACT_UNAVAILABLE");
        }
        const resolved = exactFactory(definition, factory);
        retainedFactories.set(key, resolved);
        return resolved;
    };
    const resolveRetainedFactorySync = (definition) => {
        const key = artifactKey(definition);
        const cached = retainedFactories.get(key);
        if (cached)
            return cached;
        const resolved = exactFactory(definition, dependencies.artifactResolver.resolveSync?.(definition.strategyName, definition.implementationSha256));
        retainedFactories.set(key, resolved);
        return resolved;
    };
    const getDefinition = async (userId, id) => {
        const definition = (await dependencies.definitionRepository.listByIds(userId, [id]))[0];
        if (!definition)
            invalid("STRATEGY_DEFINITION_NOT_FOUND");
        return definition;
    };
    const prepareStrategy = async (userId, strategyName, parameters) => {
        if (!userId.trim())
            invalid("INVALID_USER");
        const factory = factories.get(strategyName);
        if (!factory)
            invalid("STRATEGY_NOT_REGISTERED");
        const registeredFactory = factory;
        const normalized = validateParameters(registeredFactory, parameters);
        const logicalFamilyKey = `strategy:${strategyName}`;
        const content = { strategyName, implementationSha256: registeredFactory.descriptor.implementationSha256, parameters: normalized };
        const prior = await dependencies.definitionRepository.listByLogicalFamily(userId, logicalFamilyKey);
        const existing = prior.find((definition) => digest({ strategyName: definition.strategyName, implementationSha256: definition.implementationSha256, parameters: definition.parameters }) === digest(content));
        if (existing)
            return { definition: existing, isNew: false };
        const definition = { id: nextId("strategy-definition"), userId, logicalFamilyKey, familyName: registeredFactory.descriptor.displayName, strategyName, implementationVersion: registeredFactory.descriptor.implementationVersion, implementationSha256: registeredFactory.descriptor.implementationSha256, version: Math.max(0, ...prior.map((item) => item.version)) + 1, parameters: normalized, createdAt: new Date().toISOString() };
        return { definition, isNew: true };
    };
    const defineStrategy = async (userId, strategyName, parameters) => {
        const prepared = await prepareStrategy(userId, strategyName, parameters);
        return prepared.isNew ? dependencies.definitionRepository.insert(userId, prepared.definition) : prepared.definition;
    };
    const requireOwnedDefinition = async (userId, id, knownDefinitions) => {
        if (knownDefinitions?.has(id))
            return;
        const owned = await dependencies.definitionRepository.listByIds(userId, [id]);
        if (owned.length > 0)
            return;
        if (await dependencies.definitionRepository.exists?.(id))
            invalid("OWNERSHIP_MISMATCH");
        invalid("UNKNOWN_STRATEGY_DEFINITION");
    };
    const prepareComposite = async (userId, command, knownDefinitions) => {
        if (!userId.trim() || !command || !["MAJORITY_VOTE", "WEIGHTED_SCORE"].includes(command.method) || !Array.isArray(command.components) || command.components.length === 0)
            invalid("INVALID_COMPOSITE_STRATEGY");
        const components = command.components.map((component) => ({ strategyDefinitionId: component.strategyDefinitionId, weight: component.weight }));
        if (components.some((component) => typeof component.strategyDefinitionId !== "string" || !component.strategyDefinitionId.trim() || !finite(component.weight)))
            invalid("INVALID_COMPOSITE_STRATEGY");
        if (components.some((component) => component.weight < 0))
            invalid("INVALID_COMPOSITE_STRATEGY");
        await Promise.all(components.map((component) => requireOwnedDefinition(userId, component.strategyDefinitionId, knownDefinitions)));
        let thresholds;
        if (command.method === "MAJORITY_VOTE") {
            for (const component of components)
                component.weight = 0;
            thresholds = { buy: 0.3, sell: -0.3 };
        }
        else {
            const totalWeight = components.reduce((sum, component) => sum + component.weight, 0);
            if (components.some((component) => component.weight < 0) || Math.abs(totalWeight - 1) > 1e-9)
                invalid("INVALID_COMPOSITE_STRATEGY");
            thresholds = command.thresholds ?? { buy: 0.3, sell: -0.3 };
            if (!finite(thresholds.buy) || !finite(thresholds.sell) || thresholds.buy <= thresholds.sell)
                invalid("INVALID_COMPOSITE_STRATEGY");
        }
        const logicalFamilyKey = `composite:${command.method}:${components.map((component) => component.strategyDefinitionId).sort().join(",")}`;
        const content = { method: command.method, components, thresholds };
        const prior = await dependencies.compositeRepository.listByLogicalFamily(userId, logicalFamilyKey);
        const existing = prior.find((composite) => digest({ method: composite.method, components: composite.components, thresholds: composite.thresholds }) === digest(content));
        if (existing)
            return { definition: existing, isNew: false };
        return { definition: { id: nextId("composite-strategy"), userId, logicalFamilyKey, version: Math.max(0, ...prior.map((item) => item.version)) + 1, method: command.method, components, thresholds, createdAt: new Date().toISOString() }, isNew: true };
    };
    const defineComposite = async (userId, command) => {
        const prepared = await prepareComposite(userId, command);
        return prepared.isNew ? dependencies.compositeRepository.insert(userId, prepared.definition) : prepared.definition;
    };
    const withTimeout = async (work, timeoutMs, errorCode) => {
        let timer;
        try {
            return await Promise.race([work, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(errorCode)), timeoutMs); })]);
        }
        finally {
            if (timer)
                clearTimeout(timer);
        }
    };
    const proposal = (value) => {
        if (!isPlainRecord(value))
            invalid("STRATEGY_MODEL_SCHEMA_INVALID");
        const record = value;
        if (record.kind !== "SINGLE" && record.kind !== "COMPOSITE")
            invalid("STRATEGY_MODEL_SCHEMA_INVALID");
        if (record.kind === "SINGLE" && !keysAre(record, ["kind", "strategyName", "parameters"]))
            invalid("STRATEGY_MODEL_SCHEMA_INVALID");
        if (record.kind === "COMPOSITE" && !keysAre(record, ["kind", "components", "method"], ["thresholds"]))
            invalid("STRATEGY_MODEL_SCHEMA_INVALID");
        if (record.kind === "SINGLE") {
            const parameters = parameterRecord(record.parameters) ? record.parameters : invalid("STRATEGY_MODEL_SCHEMA_INVALID");
            if (typeof record.strategyName !== "string")
                invalid("STRATEGY_MODEL_SCHEMA_INVALID");
            return { kind: "SINGLE", strategyName: record.strategyName, parameters };
        }
        const thresholds = isPlainRecord(record.thresholds) ? record.thresholds : invalid("STRATEGY_MODEL_SCHEMA_INVALID");
        if (!Array.isArray(record.components) || record.components.length === 0 || !["MAJORITY_VOTE", "WEIGHTED_SCORE"].includes(record.method) || !keysAre(thresholds, ["buy", "sell"]) || !finite(thresholds.buy) || !finite(thresholds.sell))
            invalid("STRATEGY_MODEL_SCHEMA_INVALID");
        const components = record.components.map((component) => {
            if (!isPlainRecord(component) || !keysAre(component, ["strategyName", "parameters", "weight"]) || typeof component.strategyName !== "string" || !parameterRecord(component.parameters) || !finite(component.weight))
                invalid("STRATEGY_MODEL_SCHEMA_INVALID");
            const item = component;
            const parameters = parameterRecord(item.parameters) ? item.parameters : invalid("STRATEGY_MODEL_SCHEMA_INVALID");
            return { strategyName: item.strategyName, parameters, weight: item.weight };
        });
        return { kind: "COMPOSITE", components, method: record.method, thresholds: { buy: thresholds.buy, sell: thresholds.sell } };
    };
    return {
        listStrategies: () => runtimeList(registry),
        resolveStrategy: async (definition) => (await resolveRetainedFactory(definition)).create(definition.parameters),
        combineSignals: runtimeCombine,
        buildVisualization: (definition, contexts) => normalizeVisualization(definition, resolveRetainedFactorySync(definition).create(definition.parameters).buildVisualization?.(contexts.slice(-MAX_VISUALIZATION_POINTS))),
        listDefinitions: async (userId) => dependencies.definitionRepository.list(userId),
        readDefinitions: async (userId, ids) => Promise.all(ids.map((id) => getDefinition(userId, id))),
        listComposites: async (userId) => dependencies.compositeRepository.list(userId),
        readComposite: async (userId, id) => {
            const composite = await dependencies.compositeRepository.get(userId, id);
            if (!composite)
                invalid("COMPOSITE_STRATEGY_NOT_FOUND");
            return composite;
        },
        defineStrategy,
        defineComposite,
        generateStrategy: async (userId, source) => {
            if (!userId.trim() || !isPlainRecord(source) || (source.sourceType !== "TEXT" && source.sourceType !== "URL"))
                invalid("VALIDATION_ERROR");
            const sourceType = source.sourceType;
            const allowedSourceKeys = sourceType === "TEXT" ? ["sourceType", "text"] : ["sourceType", "url"];
            if (!keysAre(source, allowedSourceKeys))
                invalid("VALIDATION_ERROR");
            const value = sourceType === "TEXT" ? source.text : source.url;
            if (typeof value !== "string" || !value.trim())
                invalid("VALIDATION_ERROR");
            let sourceText;
            if (sourceType === "TEXT") {
                sourceText = value.trim();
            }
            else {
                let loaded;
                const validatedUrl = validateHttpUrl(value);
                try {
                    loaded = await sourceLoader.load(validatedUrl);
                }
                catch (error) {
                    if (error instanceof Error && error.message.startsWith("STRATEGY_SOURCE_"))
                        throw error;
                    throw new Error("STRATEGY_SOURCE_UNAVAILABLE");
                }
                if (typeof loaded?.sourceText !== "string")
                    invalid("STRATEGY_SOURCE_UNUSABLE");
                sourceText = loaded.sourceText.trim();
            }
            if (!sourceText)
                invalid("STRATEGY_SOURCE_UNUSABLE");
            let generated;
            try {
                generated = proposal(await withTimeout(generationAdapter.generate({ sourceText, strategies: runtimeList(registry), promptVersion }), modelTimeoutMs, "STRATEGY_MODEL_TIMEOUT"));
            }
            catch (error) {
                if (error instanceof Error && ["STRATEGY_MODEL_TIMEOUT", "STRATEGY_MODEL_UNAVAILABLE", "STRATEGY_MODEL_AUTHENTICATION_FAILED", "STRATEGY_MODEL_RATE_LIMITED", "STRATEGY_MODEL_SCHEMA_INVALID", "STRATEGY_MODEL_ERROR"].includes(error.message))
                    throw error;
                throw new Error("STRATEGY_MODEL_UNAVAILABLE");
            }
            const generatedDefinitions = [];
            let strategyDefinition;
            let compositeStrategyDefinition;
            if (generated.kind === "SINGLE") {
                const prepared = await prepareStrategy(userId, generated.strategyName, generated.parameters);
                strategyDefinition = prepared.definition;
                if (prepared.isNew)
                    generatedDefinitions.push(prepared.definition);
            }
            else {
                const componentDefinitions = [];
                for (const component of generated.components) {
                    const prepared = await prepareStrategy(userId, component.strategyName, component.parameters);
                    if (prepared.isNew)
                        generatedDefinitions.push(prepared.definition);
                    componentDefinitions.push({ strategyDefinitionId: prepared.definition.id, weight: component.weight });
                }
                const knownDefinitions = new Map(generatedDefinitions.map((definition) => [definition.id, definition]));
                const preparedComposite = await prepareComposite(userId, { method: generated.method, components: componentDefinitions, thresholds: generated.thresholds }, knownDefinitions);
                compositeStrategyDefinition = preparedComposite.definition;
            }
            const generationId = nextId("strategy-generation");
            const audit = { id: generationId, ownerUserId: userId, sourceType, ...(sourceType === "TEXT" ? { sourceText: value.trim() } : { sourceUrl: value.trim() }), modelName, modelVersion, promptVersion, outputKind: generated.kind, ...(strategyDefinition ? { strategyDefinitionId: strategyDefinition.id } : { compositeDefinitionId: compositeStrategyDefinition.id }), createdAt: new Date().toISOString() };
            await generationUnitOfWork.commit({ ownerUserId: userId, definitions: generatedDefinitions, composite: compositeStrategyDefinition, audit });
            return { generationId, kind: generated.kind, ...(strategyDefinition ? { strategyDefinition } : { compositeStrategyDefinition }), modelName, modelVersion, promptVersion };
        },
    };
}
