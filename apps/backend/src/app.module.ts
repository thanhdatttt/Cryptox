import { randomUUID } from "node:crypto";
import { BadRequestException, Body, ConflictException, Controller, Get, Headers, HttpCode, Inject, Module, NotFoundException, Param, Post, Query, ServiceUnavailableException, UnauthorizedException, UnprocessableEntityException } from "@nestjs/common";
import { AuthException, type AuthModulePublicApi } from "modules/auth/api";
import { BACKTEST_RUNTIME_SHA256, BACKTEST_RUNTIME_VERSION } from "modules/backtesting/api/bootstrap";
import type { Timeframe } from "modules/market-data/api";
import type { CompositeStrategyDefinition, StrategyDefinition } from "modules/strategy/api";
import { composeAllModules, type BackendModules } from "./compose";
import { MarketGateway } from "./market.gateway";

export const BACKEND_MODULES = "BACKEND_MODULES";

const credentials = (body: { email?: unknown; password?: unknown }): { email: string; password: string } => {
  if (typeof body?.email !== "string" || typeof body?.password !== "string") throw new BadRequestException("email and password are required.");
  return { email: body.email, password: body.password };
};

const authHttpError = (error: unknown): never => {
  if (!(error instanceof AuthException)) throw error;
  if (error.code === "EMAIL_ALREADY_EXISTS") throw new ConflictException(error.message);
  if (error.code === "INVALID_CREDENTIALS" || error.code === "INVALID_TOKEN") throw new UnauthorizedException(error.message);
  throw new BadRequestException(error.message);
};

type OwnedStrategyDefinition = StrategyDefinition & { userId: string };
type OwnedCompositeStrategyDefinition = CompositeStrategyDefinition & { userId: string };

const projectStrategyDefinition = (userId: string, definition: StrategyDefinition): OwnedStrategyDefinition => ({
  ...definition,
  // The authenticated principal is authoritative even if an internal adapter
  // already included an owner field. Request bodies never participate here.
  userId,
});

const projectCompositeStrategyDefinition = (userId: string, definition: CompositeStrategyDefinition): OwnedCompositeStrategyDefinition => ({
  ...definition,
  userId,
});

const projectGenerationResult = <T extends {
  strategyDefinition?: StrategyDefinition;
  compositeStrategyDefinition?: CompositeStrategyDefinition;
}>(userId: string, result: T) => ({
  ...result,
  ...(result.strategyDefinition ? { strategyDefinition: projectStrategyDefinition(userId, result.strategyDefinition) } : {}),
  ...(result.compositeStrategyDefinition ? { compositeStrategyDefinition: projectCompositeStrategyDefinition(userId, result.compositeStrategyDefinition) } : {}),
});

const projectExperimentSummary = <T extends {
  compositeDefinition: CompositeStrategyDefinition;
  strategyDefinitions: StrategyDefinition[];
}>(userId: string, result: T) => ({
  ...result,
  compositeDefinition: projectCompositeStrategyDefinition(userId, result.compositeDefinition),
  strategyDefinitions: result.strategyDefinitions.map((definition) => projectStrategyDefinition(userId, definition)),
});

const projectVisualization = <T extends {
  overlays?: unknown;
  markers?: unknown;
  candles?: unknown;
}>(result: T) => ({
  ...result,
  // Keep the backend's generic overlays and trade markers intact. The
  // transport adapter must not recalculate or reinterpret either collection.
  overlays: Array.isArray(result.overlays) ? result.overlays : [],
  markers: Array.isArray(result.markers) ? result.markers : [],
});

@Controller("health")
export class HealthController {
  @Get()
  health(): { status: string } { return { status: "ok" }; }
}

@Controller("auth")
export class AuthController {
  constructor(@Inject(BACKEND_MODULES) private readonly modules: BackendModules) {}

  private get auth(): AuthModulePublicApi { return this.modules.auth; }

  @Post("register")
  async register(@Body() body: { email?: unknown; password?: unknown }): Promise<void> {
    try {
      const input = credentials(body);
      await this.auth.register(input.email, input.password);
    } catch (error) {
      authHttpError(error);
    }
  }

  @Post("login")
  @HttpCode(200)
  async login(@Body() body: { email?: unknown; password?: unknown }): Promise<{ token: string }> {
    try {
      const input = credentials(body);
      return await this.auth.login(input.email, input.password);
    } catch (error) {
      return authHttpError(error);
    }
  }

  @Get("me")
  async me(@Headers("authorization") authorization?: string): Promise<{ userId: string }> {
    if (!authorization?.startsWith("Bearer ")) throw new UnauthorizedException("Bearer token is required.");
    try {
      return await this.auth.verify(authorization.slice("Bearer ".length));
    } catch (error) {
      return authHttpError(error);
    }
  }
}

abstract class ProtectedController {
  constructor(protected readonly modules: BackendModules) {}

  protected async authenticate(authorization?: string): Promise<string> {
    if (!authorization?.startsWith("Bearer ")) throw new UnauthorizedException("Bearer token is required.");
    try {
      return (await this.modules.auth.verify(authorization.slice("Bearer ".length))).userId;
    } catch (error) {
      return authHttpError(error);
    }
  }
}

const strategyHttpError = (error: unknown): never => {
  if (!(error instanceof Error)) throw error;
  if (error.message.endsWith("_NOT_FOUND")) throw new NotFoundException(error.message);
  if (["STRATEGY_SOURCE_UNUSABLE", "STRATEGY_SOURCE_UNSUPPORTED_CONTENT"].includes(error.message)) throw new UnprocessableEntityException(error.message);
  if (["STRATEGY_SOURCE_TIMEOUT", "STRATEGY_SOURCE_TOO_LARGE", "STRATEGY_SOURCE_REDIRECT_LIMIT", "STRATEGY_SOURCE_UNAVAILABLE", "STRATEGY_MODEL_TIMEOUT", "STRATEGY_MODEL_UNAVAILABLE"].includes(error.message)) throw new ServiceUnavailableException(error.message);
  if (["STRATEGY_SOURCE_INVALID_URL", "STRATEGY_SOURCE_UNSAFE"].includes(error.message)) throw new BadRequestException(error.message);
  if (error.message.startsWith("INVALID_") || error.message.startsWith("STRATEGY_MODEL_SCHEMA") || error.message === "VALIDATION_ERROR" || error.message === "STRATEGY_NOT_REGISTERED") throw new BadRequestException(error.message);
  throw error;
};

const backtestHttpError = (error: unknown): never => {
  if (!(error instanceof Error)) throw error;
  if (["IMPLEMENTATION_ARTIFACT_UNAVAILABLE", "STRATEGY_ARTIFACT_NOT_FOUND", "MISSING_SNAPSHOT", "REPLAY_ARTIFACT_EXPIRED"].includes(error.message)) throw new UnprocessableEntityException(error.message);
  if (error.message.endsWith("_NOT_FOUND")) throw new NotFoundException(error.message);
  if (error.message === "BACKTEST_ACCESS_DENIED") throw new NotFoundException(error.message);
  if (error.message === "BACKTEST_CANDIDATE_NOT_MANUAL") throw new ConflictException(error.message);
  if (error.message === "SNAPSHOT_INCOMPLETE" || error.message.includes("WARMUP") || error.message.startsWith("INVALID_VISUALIZATION") || error.message.startsWith("VISUALIZATION_")) throw new BadRequestException(error.message);
  if (error.message.startsWith("INVALID_") || error.message.includes("DATASET") || error.message.includes("STRATEGY")) throw new BadRequestException(error.message);
  throw error;
};

const auxiliaryHttpError = (error: unknown): never => {
  if (!(error instanceof Error)) throw error;
  if (error.message.includes("NOT_FOUND")) throw new NotFoundException(error.message);
  if ("code" in error || error.message.startsWith("INVALID_")) throw new BadRequestException(error.message);
  throw error;
};
const positiveNumber = (value: unknown): number | undefined => value === undefined ? undefined : typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
const nonNegativeNumber = (value: unknown): number | undefined => value === undefined ? undefined : typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
const positiveInteger = (value: unknown): number | undefined => typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined;
const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const nonEmptyString = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const scalarParameters = (value: unknown): Record<string, number | string> | undefined => {
  if (!isRecord(value)) return undefined;
  if (Object.values(value).some((item) => typeof item !== "string" && (typeof item !== "number" || !Number.isFinite(item)))) return undefined;
  return value as Record<string, number | string>;
};
const parsePageLimit = (value: string | undefined, defaultValue: number, maximum: number, message: string): number => {
  const parsed = value === undefined ? defaultValue : Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > maximum) throw new BadRequestException(message);
  return parsed;
};
const parseCompositeComponents = (value: unknown): Array<{ strategyDefinitionId: string; weight: number }> => {
  if (!Array.isArray(value) || value.length === 0) throw new BadRequestException("components must contain at least one strategy definition.");
  const components = value.map((item) => {
    if (!isRecord(item) || !nonEmptyString(item.strategyDefinitionId) || typeof item.weight !== "number" || !Number.isFinite(item.weight)) throw new BadRequestException("components must contain strategyDefinitionId and finite weight values.");
    return { strategyDefinitionId: item.strategyDefinitionId.trim(), weight: item.weight };
  });
  return components;
};
const parseThresholds = (value: unknown): { buy: number; sell: number } | undefined => {
  if (value === undefined) return undefined;
  if (!isRecord(value) || typeof value.buy !== "number" || !Number.isFinite(value.buy) || typeof value.sell !== "number" || !Number.isFinite(value.sell)) throw new BadRequestException("thresholds must contain finite buy and sell values.");
  return { buy: value.buy, sell: value.sell };
};
const searchHttpError = (error: unknown): never => {
  if (!(error instanceof Error)) throw error;
  if (error.message.endsWith("_NOT_FOUND")) throw new NotFoundException(error.message);
  if (error.message === "SEARCH_ACCESS_DENIED" || error.message === "BACKTEST_ACCESS_DENIED") throw new NotFoundException(error.message);
  if (error.message.startsWith("INVALID_") || error.message === "EMPTY_SEARCH_SPACE" || error.message === "CANNOT_RESUME_FAILED_RUN") throw new BadRequestException(error.message);
  throw error;
};

@Controller("strategies")
export class StrategyController extends ProtectedController {
  constructor(@Inject(BACKEND_MODULES) modules: BackendModules) { super(modules); }

  @Get()
  async list(@Headers("authorization") authorization?: string) {
    await this.authenticate(authorization);
    return this.modules.strategy.listStrategies();
  }

  @Post()
  async define(@Headers("authorization") authorization: string | undefined, @Body() body: { strategyName?: unknown; parameters?: unknown }) {
    const userId = await this.authenticate(authorization);
    const parameters = scalarParameters(body?.parameters);
    if (!nonEmptyString(body?.strategyName) || parameters === undefined) throw new BadRequestException("strategyName and parameters are required.");
    try {
      const definition = await this.modules.strategy.defineStrategy(userId, body.strategyName.trim(), parameters);
      return projectStrategyDefinition(userId, definition);
    } catch (error) {
      return strategyHttpError(error);
    }
  }

  @Post("composites")
  async defineComposite(@Headers("authorization") authorization: string | undefined, @Body() body: { method?: unknown; components?: unknown; thresholds?: unknown }) {
    const userId = await this.authenticate(authorization);
    if (body?.method !== "MAJORITY_VOTE" && body?.method !== "WEIGHTED_SCORE") throw new BadRequestException("method and components are required.");
    const components = parseCompositeComponents(body?.components);
    const thresholds = parseThresholds(body?.thresholds);
    try {
      const composite = await this.modules.strategy.defineComposite(userId, { method: body.method, components, thresholds });
      return projectCompositeStrategyDefinition(userId, composite);
    } catch (error) {
      return strategyHttpError(error);
    }
  }

  @Get("definitions")
  async definitions(@Headers("authorization") authorization: string | undefined, @Query("ids") ids?: string) {
    const userId = await this.authenticate(authorization);
    try {
      const definitions = ids ? await this.modules.strategy.readDefinitions(userId, ids.split(",").filter(Boolean)) : await this.modules.strategy.listDefinitions(userId);
      return definitions.map((definition) => projectStrategyDefinition(userId, definition));
    } catch (error) {
      return strategyHttpError(error);
    }
  }

  @Get("composites")
  async composites(@Headers("authorization") authorization: string | undefined) {
    const userId = await this.authenticate(authorization);
    try { return (await this.modules.strategy.listComposites(userId)).map((composite) => projectCompositeStrategyDefinition(userId, composite)); } catch (error) { return strategyHttpError(error); }
  }

  @Get("composites/:id")
  async composite(@Headers("authorization") authorization: string | undefined, @Param("id") id: string) {
    const userId = await this.authenticate(authorization);
    try {
      return projectCompositeStrategyDefinition(userId, await this.modules.strategy.readComposite(userId, id));
    } catch (error) {
      return strategyHttpError(error);
    }
  }
}

@Controller("strategy-generations")
export class StrategyGenerationController extends ProtectedController {
  constructor(@Inject(BACKEND_MODULES) modules: BackendModules) { super(modules); }

  @Post()
  @HttpCode(201)
  async generate(@Headers("authorization") authorization: string | undefined, @Body() body: { sourceType?: unknown; text?: unknown; url?: unknown }) {
    const userId = await this.authenticate(authorization);
    if (body?.sourceType === "TEXT" && body.url === undefined && typeof body.text === "string" && body.text.trim()) {
      try { return projectGenerationResult(userId, await this.modules.strategy.generateStrategy(userId, { sourceType: "TEXT", text: body.text })); } catch (error) { return strategyHttpError(error); }
    }
    if (body?.sourceType === "URL" && body.text === undefined && typeof body.url === "string" && body.url.trim()) {
      try { return projectGenerationResult(userId, await this.modules.strategy.generateStrategy(userId, { sourceType: "URL", url: body.url })); } catch (error) { return strategyHttpError(error); }
    }
    throw new BadRequestException("sourceType and a non-empty text or URL are required.");
  }
}

@Controller("market")
export class MarketController extends ProtectedController {
  constructor(@Inject(BACKEND_MODULES) modules: BackendModules) { super(modules); }

  @Get("pairs")
  async pairs(@Headers("authorization") authorization: string | undefined) {
    await this.authenticate(authorization);
    try { return await this.modules.marketData.readCapabilities(); } catch (error) { return auxiliaryHttpError(error); }
  }

  @Get("candles")
  async candles(
    @Headers("authorization") authorization: string | undefined,
    @Query("pair") pair: string | undefined,
    @Query("timeframe") timeframe: string | undefined,
    @Query("limit") limit?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("cursor") cursor?: string,
    @Query("includeForming") includeForming?: string,
    @Query("completeness") completeness?: string,
  ) {
    await this.authenticate(authorization);
    if (!pair || !timeframe) throw new BadRequestException("pair and timeframe are required.");
    let parsedLimit: number | undefined;
    if (limit !== undefined) {
      parsedLimit = Number(limit);
      if (!Number.isInteger(parsedLimit) || parsedLimit <= 0) throw new BadRequestException("limit must be a positive integer.");
    }
    if ((from === undefined) !== (to === undefined)) throw new BadRequestException("from and to must be supplied together.");
    if (includeForming !== undefined && includeForming !== "true" && includeForming !== "false") throw new BadRequestException("includeForming must be true or false.");
    if (completeness !== undefined && completeness !== "ALLOW_PARTIAL" && completeness !== "REQUIRE_COMPLETE") throw new BadRequestException("completeness is invalid.");
    try {
      return await this.modules.marketData.readCandles({ pair, timeframe: timeframe as Timeframe, limit: parsedLimit, range: from && to ? { from, to } : undefined, cursor, includeForming: includeForming === "true", completeness: completeness as "ALLOW_PARTIAL" | "REQUIRE_COMPLETE" | undefined });
    } catch (error) {
      if (error instanceof Error && "code" in error) throw new BadRequestException(error.message);
      throw error;
    }
  }

  @Get("pairs/:pair")
  async pairMetadata(@Headers("authorization") authorization: string | undefined, @Param("pair") pair: string) {
    await this.authenticate(authorization);
    try { return await this.modules.marketData.readPairMetadata(pair); } catch (error) { return auxiliaryHttpError(error); }
  }

  @Post("snapshots")
  async createSnapshot(@Headers("authorization") authorization: string | undefined, @Body() body: { pair?: unknown; timeframe?: unknown; from?: unknown; to?: unknown }) {
    await this.authenticate(authorization);
    if (typeof body.pair !== "string" || typeof body.timeframe !== "string" || typeof body.from !== "string" || typeof body.to !== "string") throw new BadRequestException("pair, timeframe, from, and to are required.");
    try { return await this.modules.marketData.createDatasetSnapshot({ pair: body.pair, timeframe: body.timeframe as Timeframe, range: { from: body.from, to: body.to } }); } catch (error) { return auxiliaryHttpError(error); }
  }

  @Get("snapshots/:snapshotId")
  async readSnapshot(@Headers("authorization") authorization: string | undefined, @Param("snapshotId") snapshotId: string, @Query("cursor") cursor?: string, @Query("limit") limit?: string) {
    await this.authenticate(authorization);
    let parsedLimit: number | undefined;
    if (limit !== undefined) {
      const parsed = Number(limit);
      if (!Number.isInteger(parsed) || parsed <= 0) throw new BadRequestException("limit must be a positive integer.");
      parsedLimit = parsed;
    }
    try { return await this.modules.marketData.readDatasetSnapshot({ snapshotId, cursor, limit: parsedLimit }); } catch (error) { return auxiliaryHttpError(error); }
  }
}

@Controller("news")
export class NewsController extends ProtectedController {
  constructor(@Inject(BACKEND_MODULES) modules: BackendModules) { super(modules); }

  @Get()
  async list(@Headers("authorization") authorization?: string) {
    await this.authenticate(authorization);
    return this.modules.news.readNews();
  }

  @Post("collect")
  @HttpCode(202)
  async collect(@Headers("authorization") authorization?: string): Promise<void> {
    await this.authenticate(authorization);
    try { await this.modules.news.collect(); } catch (error) { return auxiliaryHttpError(error); }
  }
}

@Controller("sentiment")
export class SentimentController extends ProtectedController {
  constructor(@Inject(BACKEND_MODULES) modules: BackendModules) { super(modules); }

  @Post("analyze")
  async analyze(@Headers("authorization") authorization: string | undefined, @Body() body: { newsId?: unknown; title?: unknown; content?: unknown; source?: unknown; publishedAt?: unknown; relatedCoins?: unknown }) {
    await this.authenticate(authorization);
    if (typeof body.newsId !== "string" || typeof body.title !== "string" || typeof body.content !== "string" || typeof body.source !== "string" || typeof body.publishedAt !== "string" || !Array.isArray(body.relatedCoins) || body.relatedCoins.some((coin) => typeof coin !== "string")) throw new BadRequestException("normalized sentiment input is required.");
    try { return await this.modules.sentiment.analyze({ newsId: body.newsId, title: body.title, content: body.content, source: body.source, publishedAt: body.publishedAt, relatedCoins: body.relatedCoins }); } catch (error) { return auxiliaryHttpError(error); }
  }

  @Get("news/:newsId")
  async latest(@Headers("authorization") authorization: string | undefined, @Param("newsId") newsId: string) {
    await this.authenticate(authorization);
    try { return await this.modules.sentiment.readLatestForNews(newsId); } catch (error) { return auxiliaryHttpError(error); }
  }

  @Post("snapshots")
  async createSnapshot(@Headers("authorization") authorization: string | undefined, @Body() body: { relatedCoin?: unknown; from?: unknown; to?: unknown; aggregationWindowSeconds?: unknown; modelName?: unknown; modelVersion?: unknown; modelSha256?: unknown }) {
    await this.authenticate(authorization);
    if (typeof body.relatedCoin !== "string" || typeof body.from !== "string" || typeof body.to !== "string" || typeof body.aggregationWindowSeconds !== "number" || typeof body.modelName !== "string" || typeof body.modelVersion !== "string" || typeof body.modelSha256 !== "string") throw new BadRequestException("complete sentiment snapshot input is required.");
    try { return await this.modules.sentiment.createSnapshot({ relatedCoin: body.relatedCoin, range: { from: body.from, to: body.to }, aggregationWindowSeconds: body.aggregationWindowSeconds, modelName: body.modelName, modelVersion: body.modelVersion, modelSha256: body.modelSha256 }); } catch (error) { return auxiliaryHttpError(error); }
  }

  @Get("snapshots/:snapshotId")
  async snapshot(@Headers("authorization") authorization: string | undefined, @Param("snapshotId") snapshotId: string) {
    await this.authenticate(authorization);
    try { return await this.modules.sentiment.getSnapshotRef(snapshotId); } catch (error) { return auxiliaryHttpError(error); }
  }
}

@Controller(["leaderboard-scopes", "backtest-scopes"])
export class BacktestScopeController extends ProtectedController {
  constructor(@Inject(BACKEND_MODULES) modules: BackendModules) { super(modules); }

  @Post()
  async create(
    @Headers("authorization") authorization: string | undefined,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: { name?: unknown; pair?: unknown; timeframe?: unknown; from?: unknown; to?: unknown; initialCapital?: unknown; feeRatePercent?: unknown; slippageBps?: unknown; stopLossPercent?: unknown; takeProfitPercent?: unknown; scoreFormulaId?: unknown },
  ) {
    const userId = await this.authenticate(authorization);
    if (typeof body?.name !== "string" || typeof body?.pair !== "string" || typeof body?.timeframe !== "string" || typeof body?.from !== "string" || typeof body?.to !== "string") throw new BadRequestException("name, pair, timeframe, from, and to are required.");
    const initialCapital = positiveNumber(body.initialCapital); const feeRatePercent = nonNegativeNumber(body.feeRatePercent); const slippageBps = nonNegativeNumber(body.slippageBps) ?? 5;
    if (initialCapital === undefined || feeRatePercent === undefined || !Number.isInteger(slippageBps)) throw new BadRequestException("initialCapital, feeRatePercent, and integer slippageBps are required.");
    const stopLossPercent = positiveNumber(body.stopLossPercent); const takeProfitPercent = positiveNumber(body.takeProfitPercent);
    if ((body.stopLossPercent !== undefined && stopLossPercent === undefined) || (body.takeProfitPercent !== undefined && takeProfitPercent === undefined)) throw new BadRequestException("risk percentages must be positive numbers.");
    try {
      const datasetSnapshot = await this.modules.marketData.createDatasetSnapshot({ pair: body.pair, timeframe: body.timeframe as Timeframe, range: { from: body.from, to: body.to } });
      return await this.modules.backtesting.createBenchmarkScope({ userId }, { name: body.name, datasetSnapshot, initialCapital, feeRatePercent, slippageBps, riskPolicy: stopLossPercent === undefined && takeProfitPercent === undefined ? undefined : { stopLossPercent, takeProfitPercent }, scoreFormulaId: typeof body.scoreFormulaId === "string" && body.scoreFormulaId.trim() ? body.scoreFormulaId : "MVP_MANUAL_V1", workerRuntimeVersion: BACKTEST_RUNTIME_VERSION, workerRuntimeSha256: BACKTEST_RUNTIME_SHA256, evaluationRuntimeVersion: this.modules.evaluation.runtimeVersion, evaluationRuntimeSha256: this.modules.evaluation.runtimeSha256 }, { scopeIdempotencyKey: idempotencyKey?.trim() || randomUUID() });
    } catch (error) { return backtestHttpError(error); }
  }

  @Get()
  async list(@Headers("authorization") authorization: string | undefined) {
    const userId = await this.authenticate(authorization);
    try { return await this.modules.backtesting.listBenchmarkScopes({ userId }); } catch (error) { return backtestHttpError(error); }
  }
}

@Controller("backtests")
export class BacktestController extends ProtectedController {
  constructor(@Inject(BACKEND_MODULES) modules: BackendModules) { super(modules); }

  @Post()
  @HttpCode(202)
  async start(
    @Headers("authorization") authorization: string | undefined,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: { leaderboardScopeId?: unknown; selectionMode?: unknown; strategyDefinitionIds?: unknown; compositeDefinitionId?: unknown; maxAttempts?: unknown },
  ) {
    const userId = await this.authenticate(authorization);
    if (!nonEmptyString(body?.leaderboardScopeId) || !Array.isArray(body?.strategyDefinitionIds) || body.strategyDefinitionIds.length === 0 || body.strategyDefinitionIds.some((id) => !nonEmptyString(id))) throw new BadRequestException("leaderboardScopeId and strategyDefinitionIds are required.");
    const strategyDefinitionIds = body.strategyDefinitionIds.map((id) => id.trim());
    if (new Set(strategyDefinitionIds).size !== strategyDefinitionIds.length) throw new BadRequestException("strategyDefinitionIds must not contain duplicates.");
    if (body?.selectionMode !== undefined && body.selectionMode !== "SINGLE" && body.selectionMode !== "COMPOSITE") throw new BadRequestException("selectionMode must be SINGLE or COMPOSITE.");
    if (body?.compositeDefinitionId !== undefined && !nonEmptyString(body.compositeDefinitionId)) throw new BadRequestException("compositeDefinitionId must be a non-empty string when supplied.");
    const maxAttempts = body.maxAttempts === undefined ? 1 : typeof body.maxAttempts === "number" ? body.maxAttempts : undefined;
    if (!Number.isInteger(maxAttempts) || maxAttempts === undefined || maxAttempts < 1) throw new BadRequestException("maxAttempts must be a positive integer.");
    try {
      const strategyDefinitions = await this.modules.strategy.readDefinitions(userId, strategyDefinitionIds);
      const compositeDefinition = body.compositeDefinitionId === undefined
        ? await this.normalizeSingleDefinition(userId, strategyDefinitionIds, body.selectionMode, strategyDefinitions)
        : await this.modules.strategy.readComposite(userId, body.compositeDefinitionId.trim());
      this.assertSelectionMode(body.selectionMode, strategyDefinitionIds, compositeDefinition);
      return await this.modules.backtesting.startManual({ userId }, { leaderboardScopeId: body.leaderboardScopeId.trim(), strategyDefinitions, compositeDefinition, maxAttempts }, { submissionIdempotencyKey: idempotencyKey?.trim() || undefined });
    } catch (error) { return backtestHttpError(error); }
  }

  private async normalizeSingleDefinition(
    userId: string,
    strategyDefinitionIds: string[],
    selectionMode: unknown,
    strategyDefinitions: StrategyDefinition[],
  ): Promise<CompositeStrategyDefinition> {
    if (strategyDefinitionIds.length !== 1 || selectionMode === "COMPOSITE" || strategyDefinitions.length !== 1) throw new BadRequestException("a single manual backtest requires exactly one strategy definition.");
    if (typeof this.modules.strategy.defineComposite !== "function") throw new BadRequestException("a composite definition is required for manual backtests.");
    return this.modules.strategy.defineComposite(userId, {
      method: "WEIGHTED_SCORE",
      components: [{ strategyDefinitionId: strategyDefinitionIds[0]!, weight: 1 }],
      thresholds: { buy: 0.3, sell: -0.3 },
    });
  }

  private assertSelectionMode(selectionMode: unknown, strategyDefinitionIds: string[], compositeDefinition: CompositeStrategyDefinition): void {
    if (selectionMode === undefined) return;
    const components = compositeDefinition.components;
    const isSingle = strategyDefinitionIds.length === 1 && components.length === 1 && components[0]?.strategyDefinitionId === strategyDefinitionIds[0] && components[0]?.weight === 1;
    const isComposite = components.length >= 2;
    if ((selectionMode === "SINGLE" && !isSingle) || (selectionMode === "COMPOSITE" && !isComposite)) throw new BadRequestException("selectionMode does not match the supplied immutable strategy selection.");
  }

  @Post(":candidateId/cancel")
  @HttpCode(204)
  async cancel(@Headers("authorization") authorization: string | undefined, @Param("candidateId") candidateId: string) {
    const userId = await this.authenticate(authorization);
    try { await this.modules.backtesting.cancelManualCandidate({ userId }, candidateId); } catch (error) { return backtestHttpError(error); }
  }

  @Get(":candidateId")
  async status(@Headers("authorization") authorization: string | undefined, @Param("candidateId") candidateId: string) {
    const userId = await this.authenticate(authorization);
    try { return await this.modules.backtesting.status({ userId }, candidateId); } catch (error) { return backtestHttpError(error); }
  }
}

@Controller("backtest-attempts")
export class BacktestAttemptController extends ProtectedController {
  constructor(@Inject(BACKEND_MODULES) modules: BackendModules) { super(modules); }
  @Get(":attemptId")
  async read(@Headers("authorization") authorization: string | undefined, @Param("attemptId") attemptId: string) { const userId = await this.authenticate(authorization); try { return await this.modules.backtesting.readAttempt({ userId }, attemptId); } catch (error) { return backtestHttpError(error); } }
  @Get(":attemptId/trades")
  async trades(@Headers("authorization") authorization: string | undefined, @Param("attemptId") attemptId: string, @Query("limit") limit?: string, @Query("cursor") cursor?: string) { const userId = await this.authenticate(authorization); const parsed = parsePageLimit(limit, 10, 500, "limit must be an integer from 1 to 500."); try { return await this.modules.backtesting.listAttemptTrades({ userId }, attemptId, { limit: parsed, cursor }); } catch (error) { return backtestHttpError(error); } }
}

@Controller("experiments")
export class ExperimentController extends ProtectedController {
  constructor(@Inject(BACKEND_MODULES) modules: BackendModules) { super(modules); }
  @Get(":experimentId")
  async read(@Headers("authorization") authorization: string | undefined, @Param("experimentId") experimentId: string) { const userId = await this.authenticate(authorization); try { return projectExperimentSummary(userId, await this.modules.backtesting.readExperimentSummary({ userId }, experimentId)); } catch (error) { return backtestHttpError(error); } }
  @Get(":experimentId/trades")
  async trades(@Headers("authorization") authorization: string | undefined, @Param("experimentId") experimentId: string, @Query("limit") limit?: string, @Query("cursor") cursor?: string) { const userId = await this.authenticate(authorization); const parsed = parsePageLimit(limit, 10, 500, "limit must be an integer from 1 to 500."); try { return await this.modules.backtesting.listExperimentTrades({ userId }, experimentId, { limit: parsed, cursor }); } catch (error) { return backtestHttpError(error); } }
  @Get(":experimentId/visualization")
  async visualization(@Headers("authorization") authorization: string | undefined, @Param("experimentId") experimentId: string, @Query("limit") limit?: string, @Query("cursor") cursor?: string, @Query("from") from?: string, @Query("to") to?: string, @Query("highlightTradeId") highlightTradeId?: string) { const userId = await this.authenticate(authorization); const parsed = parsePageLimit(limit, 500, 2000, "limit must be an integer from 1 to 2000."); try { return projectVisualization(await this.modules.backtesting.readExperimentVisualization({ userId }, experimentId, { limit: parsed, cursor, from, to, highlightTradeId })); } catch (error) { return backtestHttpError(error); } }
  @Post(":experimentId/replay")
  async replay(@Headers("authorization") authorization: string | undefined, @Param("experimentId") experimentId: string) { const userId = await this.authenticate(authorization); try { return await this.modules.backtesting.verifyReplay({ userId }, experimentId); } catch (error) { return backtestHttpError(error); } }
}

@Controller("search-runs")
export class SearchController extends ProtectedController {
  constructor(@Inject(BACKEND_MODULES) modules: BackendModules) { super(modules); }

  @Post()
  async start(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: { leaderboardScopeId?: unknown; strategyDefinitionIds?: unknown; generatorType?: unknown; maxCandidates?: unknown; maxDurationSeconds?: unknown; noImprovementAfterIterations?: unknown; maxInFlight?: unknown; maxComponents?: unknown },
  ) {
    const userId = await this.authenticate(authorization);
    if (typeof body?.leaderboardScopeId !== "string" || !Array.isArray(body.strategyDefinitionIds) || body.strategyDefinitionIds.length === 0 || body.strategyDefinitionIds.some((id) => typeof id !== "string")) throw new BadRequestException("leaderboardScopeId and strategyDefinitionIds are required.");
    const generatorType = body.generatorType === undefined ? "RANDOM" : body.generatorType;
    if (generatorType !== "RANDOM" && generatorType !== "DOMAIN_GUIDED" && generatorType !== "GENETIC") throw new BadRequestException("generatorType is invalid.");
    const maxCandidates = positiveInteger(body.maxCandidates); const maxDurationSeconds = positiveInteger(body.maxDurationSeconds); const noImprovementAfterIterations = positiveInteger(body.noImprovementAfterIterations);
    if (maxCandidates === undefined && maxDurationSeconds === undefined && noImprovementAfterIterations === undefined) throw new BadRequestException("one positive stop condition is required.");
    const maxInFlight = body.maxInFlight === undefined ? 1 : positiveInteger(body.maxInFlight); const maxComponents = body.maxComponents === undefined ? undefined : positiveInteger(body.maxComponents);
    if (maxInFlight === undefined || (body.maxComponents !== undefined && maxComponents === undefined)) throw new BadRequestException("maxInFlight and maxComponents must be positive integers.");
    try {
      const availableStrategies = await this.modules.strategy.readDefinitions(userId, body.strategyDefinitionIds);
      return await this.modules.search.start({ userId }, { searchSpace: { availableStrategies, maxComponents }, stopCondition: { maxCandidates, maxDurationSeconds, noImprovementAfterIterations } as import("modules/search/api").StopCondition, generatorType, leaderboardScopeId: body.leaderboardScopeId, maxInFlight });
    } catch (error) { return searchHttpError(error); }
  }

  @Get(":searchRunId")
  async status(@Headers("authorization") authorization: string | undefined, @Param("searchRunId") searchRunId: string) { const userId = await this.authenticate(authorization); try { return await this.modules.search.status({ userId }, searchRunId); } catch (error) { return searchHttpError(error); } }
  @Post(":searchRunId/pause")
  async pause(@Headers("authorization") authorization: string | undefined, @Param("searchRunId") searchRunId: string) { const userId = await this.authenticate(authorization); try { await this.modules.search.pause({ userId }, searchRunId); } catch (error) { return searchHttpError(error); } }
  @Post(":searchRunId/resume")
  async resume(@Headers("authorization") authorization: string | undefined, @Param("searchRunId") searchRunId: string) { const userId = await this.authenticate(authorization); try { await this.modules.search.resume({ userId }, searchRunId); } catch (error) { return searchHttpError(error); } }
  @Post(":searchRunId/cancel")
  async cancel(@Headers("authorization") authorization: string | undefined, @Param("searchRunId") searchRunId: string) { const userId = await this.authenticate(authorization); try { await this.modules.search.cancel({ userId }, searchRunId); } catch (error) { return searchHttpError(error); } }
  @Get(":searchRunId/candidates")
  async candidates(@Headers("authorization") authorization: string | undefined, @Param("searchRunId") searchRunId: string, @Query("limit") limit?: string, @Query("cursor") cursor?: string) { const userId = await this.authenticate(authorization); const parsed = parsePageLimit(limit, 20, 500, "limit must be an integer from 1 to 500."); try { await this.modules.search.status({ userId }, searchRunId); return await this.modules.backtesting.listSearchCandidates({ userId }, searchRunId, { limit: parsed, cursor }); } catch (error) { return searchHttpError(error); } }
  @Get(":searchRunId/leaderboard")
  async leaderboard(@Headers("authorization") authorization: string | undefined, @Param("searchRunId") searchRunId: string) { const userId = await this.authenticate(authorization); try { return await this.modules.search.leaderboard({ userId }, searchRunId); } catch (error) { return searchHttpError(error); } }
}

@Controller(["leaderboard", "leaderboards"])
export class LeaderboardController extends ProtectedController {
  constructor(@Inject(BACKEND_MODULES) modules: BackendModules) { super(modules); }
  @Get()
  async list(@Headers("authorization") authorization: string | undefined, @Query("scopeId") scopeId?: string) { if (!scopeId) throw new BadRequestException("scopeId is required."); return this.readTopK(authorization, scopeId); }
  @Get(":leaderboardScopeId")
  async topK(@Headers("authorization") authorization: string | undefined, @Param("leaderboardScopeId") leaderboardScopeId: string) { return this.readTopK(authorization, leaderboardScopeId); }
  private async readTopK(authorization: string | undefined, leaderboardScopeId: string) { const userId = await this.authenticate(authorization); try { await this.modules.backtesting.readBenchmarkScope({ userId }, leaderboardScopeId); return await this.modules.leaderboard.topK(userId, leaderboardScopeId); } catch (error) { return searchHttpError(error); } }
}

@Module({
  controllers: [HealthController, AuthController, StrategyController, StrategyGenerationController, MarketController, NewsController, SentimentController, BacktestScopeController, BacktestController, BacktestAttemptController, ExperimentController, SearchController, LeaderboardController],
  providers: [MarketGateway, { provide: BACKEND_MODULES, useFactory: (): BackendModules => composeAllModules() }],
})
export class AppModule {}
