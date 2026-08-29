"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPostgresStrategyDependencies = exports.PostgresStrategyGenerationUnitOfWork = exports.PostgresStrategyGenerationRepository = exports.PostgresCompositeDefinitionRepository = exports.PostgresStrategyDefinitionRepository = void 0;
const plugins_1 = require("../domain/plugins");
const object = (value) => typeof value === "string" ? JSON.parse(value) : value;
const definition = (row) => ({ id: row.id, logicalFamilyKey: row.logical_family_key, familyName: row.family_name ?? undefined, strategyName: row.strategy_name, implementationVersion: row.implementation_version, implementationSha256: row.implementation_sha256, version: row.version, parameters: object(row.parameters), createdAt: new Date(row.created_at).toISOString() });
const composite = (row) => ({ id: row.id, logicalFamilyKey: row.logical_family_key, version: row.version, method: row.method, components: object(row.components), thresholds: row.thresholds === null ? undefined : object(row.thresholds), createdAt: new Date(row.created_at).toISOString() });
const generation = (row) => ({ id: row.id, ownerUserId: row.user_id, sourceType: row.source_type, ...(row.source_text === null ? { sourceUrl: row.source_url } : { sourceText: row.source_text }), modelName: row.model_name, modelVersion: row.model_version, promptVersion: row.prompt_version, outputKind: row.output_kind, ...(row.strategy_definition_id === null ? { compositeDefinitionId: row.composite_definition_id } : { strategyDefinitionId: row.strategy_definition_id }), createdAt: new Date(row.created_at).toISOString() });
const generationColumns = "id, user_id, source_type, source_text, source_url, model_name, model_version, prompt_version, output_kind, strategy_definition_id, composite_definition_id, created_at";
class PostgresStrategyDefinitionRepository {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async insert(ownerUserId, value) {
        const result = await this.pool.query("INSERT INTO strategy_definitions (id, user_id, logical_family_key, family_name, strategy_name, implementation_version, implementation_sha256, version, parameters, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10) RETURNING id, logical_family_key, family_name, strategy_name, implementation_version, implementation_sha256, version, parameters, created_at", [value.id, ownerUserId, value.logicalFamilyKey, value.familyName ?? null, value.strategyName, value.implementationVersion, value.implementationSha256, value.version, JSON.stringify(value.parameters), value.createdAt]);
        return definition(result.rows[0]);
    }
    async list(ownerUserId) {
        const result = await this.pool.query("SELECT id, logical_family_key, family_name, strategy_name, implementation_version, implementation_sha256, version, parameters, created_at FROM strategy_definitions WHERE user_id = $1 ORDER BY created_at ASC, id ASC", [ownerUserId]);
        return result.rows.map(definition);
    }
    async listByIds(ownerUserId, ids) {
        if (ids.length === 0)
            return [];
        const result = await this.pool.query("SELECT id, logical_family_key, family_name, strategy_name, implementation_version, implementation_sha256, version, parameters, created_at FROM strategy_definitions WHERE user_id = $1 AND id = ANY($2::text[])", [ownerUserId, ids]);
        const rows = new Map(result.rows.map((row) => [row.id, definition(row)]));
        return ids.flatMap((id) => { const item = rows.get(id); return item ? [item] : []; });
    }
    async listByLogicalFamily(ownerUserId, logicalFamilyKey) {
        const result = await this.pool.query("SELECT id, logical_family_key, family_name, strategy_name, implementation_version, implementation_sha256, version, parameters, created_at FROM strategy_definitions WHERE user_id = $1 AND logical_family_key = $2 ORDER BY version ASC", [ownerUserId, logicalFamilyKey]);
        return result.rows.map(definition);
    }
    async exists(id) {
        const result = await this.pool.query("SELECT EXISTS (SELECT 1 FROM strategy_definitions WHERE id = $1) AS exists", [id]);
        return result.rows[0]?.exists === true;
    }
}
exports.PostgresStrategyDefinitionRepository = PostgresStrategyDefinitionRepository;
class PostgresCompositeDefinitionRepository {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async insert(ownerUserId, value) {
        const result = await this.pool.query("INSERT INTO composite_strategy_definitions (id, user_id, logical_family_key, version, method, components, thresholds, created_at) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8) RETURNING id, logical_family_key, version, method, components, thresholds, created_at", [value.id, ownerUserId, value.logicalFamilyKey, value.version, value.method, JSON.stringify(value.components), JSON.stringify(value.thresholds ?? null), value.createdAt]);
        return composite(result.rows[0]);
    }
    async list(ownerUserId) {
        const result = await this.pool.query("SELECT id, logical_family_key, version, method, components, thresholds, created_at FROM composite_strategy_definitions WHERE user_id = $1 ORDER BY created_at ASC, id ASC", [ownerUserId]);
        return result.rows.map(composite);
    }
    async get(ownerUserId, id) {
        const result = await this.pool.query("SELECT id, logical_family_key, version, method, components, thresholds, created_at FROM composite_strategy_definitions WHERE user_id = $1 AND id = $2 LIMIT 1", [ownerUserId, id]);
        return result.rows[0] ? composite(result.rows[0]) : undefined;
    }
    async listByLogicalFamily(ownerUserId, logicalFamilyKey) {
        const result = await this.pool.query("SELECT id, logical_family_key, version, method, components, thresholds, created_at FROM composite_strategy_definitions WHERE user_id = $1 AND logical_family_key = $2 ORDER BY version ASC", [ownerUserId, logicalFamilyKey]);
        return result.rows.map(composite);
    }
}
exports.PostgresCompositeDefinitionRepository = PostgresCompositeDefinitionRepository;
class PostgresStrategyGenerationRepository {
    client;
    constructor(client) {
        this.client = client;
    }
    async insert(value) {
        const result = await this.client.query(`INSERT INTO strategy_generation_requests (${generationColumns}) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING ${generationColumns}`, [value.id, value.ownerUserId, value.sourceType, value.sourceText ?? null, value.sourceUrl ?? null, value.modelName, value.modelVersion, value.promptVersion, value.outputKind, value.strategyDefinitionId ?? null, value.compositeDefinitionId ?? null, value.createdAt]);
        if (!result.rows[0])
            throw new Error("STRATEGY_GENERATION_PERSISTENCE_INTEGRITY_ERROR");
        return generation(result.rows[0]);
    }
}
exports.PostgresStrategyGenerationRepository = PostgresStrategyGenerationRepository;
class PostgresStrategyGenerationUnitOfWork {
    client;
    constructor(client) {
        this.client = client;
    }
    async commit(input) {
        if (!this.client.connect)
            throw new Error("STRATEGY_GENERATION_PERSISTENCE_UNAVAILABLE");
        const client = await this.client.connect();
        try {
            await client.query("BEGIN", []);
            for (const value of input.definitions) {
                await client.query("INSERT INTO strategy_definitions (id, user_id, logical_family_key, family_name, strategy_name, implementation_version, implementation_sha256, version, parameters, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)", [value.id, input.ownerUserId, value.logicalFamilyKey, value.familyName ?? null, value.strategyName, value.implementationVersion, value.implementationSha256, value.version, JSON.stringify(value.parameters), value.createdAt]);
            }
            if (input.composite) {
                const value = input.composite;
                await client.query("INSERT INTO composite_strategy_definitions (id, user_id, logical_family_key, version, method, components, thresholds, created_at) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8)", [value.id, input.ownerUserId, value.logicalFamilyKey, value.version, value.method, JSON.stringify(value.components), JSON.stringify(value.thresholds ?? null), value.createdAt]);
            }
            const audit = input.audit;
            await client.query(`INSERT INTO strategy_generation_requests (${generationColumns}) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`, [audit.id, audit.ownerUserId, audit.sourceType, audit.sourceText ?? null, audit.sourceUrl ?? null, audit.modelName, audit.modelVersion, audit.promptVersion, audit.outputKind, audit.strategyDefinitionId ?? null, audit.compositeDefinitionId ?? null, audit.createdAt]);
            await client.query("COMMIT", []);
        }
        catch (error) {
            try {
                await client.query("ROLLBACK", []);
            }
            catch { /* preserve original failure */ }
            throw error;
        }
        finally {
            client.release();
        }
    }
}
exports.PostgresStrategyGenerationUnitOfWork = PostgresStrategyGenerationUnitOfWork;
const createPostgresStrategyDependencies = (pool) => ({
    artifactResolver: {
        resolve: async (strategyName, implementationSha256) => {
            const factory = plugins_1.builtInFactories.find((item) => item.descriptor.name === strategyName && item.descriptor.implementationSha256 === implementationSha256);
            if (!factory)
                throw new Error("STRATEGY_ARTIFACT_NOT_FOUND");
            return factory;
        },
    },
    definitionRepository: new PostgresStrategyDefinitionRepository(pool),
    compositeRepository: new PostgresCompositeDefinitionRepository(pool),
    generationUnitOfWork: new PostgresStrategyGenerationUnitOfWork(pool),
    modelName: process.env.STRATEGY_MODEL_NAME ?? "UNCONFIGURED",
    modelVersion: process.env.STRATEGY_MODEL_VERSION ?? "0",
    promptVersion: process.env.STRATEGY_PROMPT_VERSION ?? "1",
});
exports.createPostgresStrategyDependencies = createPostgresStrategyDependencies;
