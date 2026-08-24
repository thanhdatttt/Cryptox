import { randomUUID } from "node:crypto";
import { BadRequestException, Body, ConflictException, Controller, Get, Headers, HttpCode, Inject, Module, NotFoundException, Param, Post, Query, UnauthorizedException } from "@nestjs/common";
import { AuthException, type AuthModulePublicApi } from "modules/auth/api";
import { BACKTEST_RUNTIME_SHA256, BACKTEST_RUNTIME_VERSION } from "modules/backtesting/api/bootstrap";
import type { Timeframe } from "modules/market-data/api";
import { composeAllModules, type BackendModules } from "./compose";

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
  if (error.message.startsWith("INVALID_") || error.message === "STRATEGY_NOT_REGISTERED") throw new BadRequestException(error.message);
  throw error;
};

const backtestHttpError = (error: unknown): never => {
  if (!(error instanceof Error)) throw error;
  if (error.message.endsWith("_NOT_FOUND")) throw new NotFoundException(error.message);
  if (error.message === "BACKTEST_ACCESS_DENIED") throw new UnauthorizedException(error.message);
  if (error.message.startsWith("INVALID_") || error.message.includes("DATASET") || error.message.includes("STRATEGY")) throw new BadRequestException(error.message);
  throw error;
};
const positiveNumber = (value: unknown): number | undefined => value === undefined ? undefined : typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
const nonNegativeNumber = (value: unknown): number | undefined => value === undefined ? undefined : typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;

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
    if (typeof body?.strategyName !== "string" || !body.parameters || typeof body.parameters !== "object" || Array.isArray(body.parameters)) throw new BadRequestException("strategyName and parameters are required.");
    try {
      return await this.modules.strategy.defineStrategy(userId, body.strategyName, body.parameters as Record<string, number | string>);
    } catch (error) {
      return strategyHttpError(error);
    }
  }

  @Post("composites")
  async defineComposite(@Headers("authorization") authorization: string | undefined, @Body() body: { method?: unknown; components?: unknown; thresholds?: unknown }) {
    const userId = await this.authenticate(authorization);
    if ((body?.method !== "MAJORITY_VOTE" && body?.method !== "WEIGHTED_SCORE") || !Array.isArray(body.components)) throw new BadRequestException("method and components are required.");
    try {
      return await this.modules.strategy.defineComposite(userId, { method: body.method, components: body.components as Array<{ strategyDefinitionId: string; weight: number }>, thresholds: body.thresholds as { buy: number; sell: number } | undefined });
    } catch (error) {
      return strategyHttpError(error);
    }
  }

  @Get("definitions")
  async definitions(@Headers("authorization") authorization: string | undefined, @Query("ids") ids?: string) {
    const userId = await this.authenticate(authorization);
    if (!ids) throw new BadRequestException("ids is required.");
    try {
      return await this.modules.strategy.readDefinitions(userId, ids.split(",").filter(Boolean));
    } catch (error) {
      return strategyHttpError(error);
    }
  }

  @Get("composites/:id")
  async composite(@Headers("authorization") authorization: string | undefined, @Param("id") id: string) {
    const userId = await this.authenticate(authorization);
    try {
      return await this.modules.strategy.readComposite(userId, id);
    } catch (error) {
      return strategyHttpError(error);
    }
  }
}

@Controller("market")
export class MarketController extends ProtectedController {
  constructor(@Inject(BACKEND_MODULES) modules: BackendModules) { super(modules); }

  @Get("candles")
  async candles(
    @Headers("authorization") authorization: string | undefined,
    @Query("pair") pair: string | undefined,
    @Query("timeframe") timeframe: string | undefined,
    @Query("limit") limit?: string,
  ) {
    await this.authenticate(authorization);
    if (!pair || !timeframe) throw new BadRequestException("pair and timeframe are required.");
    let parsedLimit: number | undefined;
    if (limit !== undefined) {
      parsedLimit = Number(limit);
      if (!Number.isInteger(parsedLimit) || parsedLimit <= 0) throw new BadRequestException("limit must be a positive integer.");
    }
    try {
      return await this.modules.marketData.readCandles({ pair, timeframe: timeframe as Timeframe, limit: parsedLimit });
    } catch (error) {
      if (error instanceof Error && "code" in error) throw new BadRequestException(error.message);
      throw error;
    }
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
}

@Controller("backtest-scopes")
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
    const initialCapital = positiveNumber(body.initialCapital); const feeRatePercent = nonNegativeNumber(body.feeRatePercent); const slippageBps = nonNegativeNumber(body.slippageBps) ?? 0;
    if (initialCapital === undefined || feeRatePercent === undefined || !Number.isInteger(slippageBps)) throw new BadRequestException("initialCapital, feeRatePercent, and integer slippageBps are required.");
    const stopLossPercent = positiveNumber(body.stopLossPercent); const takeProfitPercent = positiveNumber(body.takeProfitPercent);
    if ((body.stopLossPercent !== undefined && stopLossPercent === undefined) || (body.takeProfitPercent !== undefined && takeProfitPercent === undefined)) throw new BadRequestException("risk percentages must be positive numbers.");
    try {
      const datasetSnapshot = await this.modules.marketData.createDatasetSnapshot({ pair: body.pair, timeframe: body.timeframe as Timeframe, range: { from: body.from, to: body.to } });
      return await this.modules.backtesting.createBenchmarkScope({ name: body.name, datasetSnapshot, initialCapital, feeRatePercent, slippageBps, riskPolicy: stopLossPercent === undefined && takeProfitPercent === undefined ? undefined : { stopLossPercent, takeProfitPercent }, scoreFormulaId: typeof body.scoreFormulaId === "string" && body.scoreFormulaId.trim() ? body.scoreFormulaId : "MVP_MANUAL_V1", workerRuntimeVersion: BACKTEST_RUNTIME_VERSION, workerRuntimeSha256: BACKTEST_RUNTIME_SHA256, evaluationRuntimeVersion: this.modules.evaluation.runtimeVersion, evaluationRuntimeSha256: this.modules.evaluation.runtimeSha256 }, { ownerUserId: userId, scopeIdempotencyKey: idempotencyKey?.trim() || randomUUID() });
    } catch (error) { return backtestHttpError(error); }
  }
}

@Controller("backtests")
export class BacktestController extends ProtectedController {
  constructor(@Inject(BACKEND_MODULES) modules: BackendModules) { super(modules); }

  @Post()
  @HttpCode(201)
  async start(
    @Headers("authorization") authorization: string | undefined,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: { leaderboardScopeId?: unknown; strategyDefinitionIds?: unknown; compositeDefinitionId?: unknown; maxAttempts?: unknown },
  ) {
    const userId = await this.authenticate(authorization);
    if (typeof body?.leaderboardScopeId !== "string" || !Array.isArray(body.strategyDefinitionIds) || body.strategyDefinitionIds.length === 0 || body.strategyDefinitionIds.some((id) => typeof id !== "string") || typeof body.compositeDefinitionId !== "string") throw new BadRequestException("leaderboardScopeId, strategyDefinitionIds, and compositeDefinitionId are required.");
    const maxAttempts = body.maxAttempts === undefined ? 1 : typeof body.maxAttempts === "number" ? body.maxAttempts : undefined;
    if (!Number.isInteger(maxAttempts) || maxAttempts === undefined || maxAttempts < 1) throw new BadRequestException("maxAttempts must be a positive integer.");
    try {
      const strategyDefinitions = await this.modules.strategy.readDefinitions(userId, body.strategyDefinitionIds);
      const compositeDefinition = await this.modules.strategy.readComposite(userId, body.compositeDefinitionId);
      return await this.modules.backtesting.startManual({ leaderboardScopeId: body.leaderboardScopeId, strategyDefinitions, compositeDefinition, maxAttempts }, { ownerUserId: userId, submissionIdempotencyKey: idempotencyKey?.trim() || undefined });
    } catch (error) { return backtestHttpError(error); }
  }

  @Get(":candidateId")
  async status(@Headers("authorization") authorization: string | undefined, @Param("candidateId") candidateId: string) {
    const userId = await this.authenticate(authorization);
    try { return await this.modules.backtesting.status(candidateId, { ownerUserId: userId }); } catch (error) { return backtestHttpError(error); }
  }
}

@Controller("backtest-attempts")
export class BacktestAttemptController extends ProtectedController {
  constructor(@Inject(BACKEND_MODULES) modules: BackendModules) { super(modules); }
  @Get(":attemptId")
  async read(@Headers("authorization") authorization: string | undefined, @Param("attemptId") attemptId: string) { const userId = await this.authenticate(authorization); try { return await this.modules.backtesting.readAttempt(attemptId, { ownerUserId: userId }); } catch (error) { return backtestHttpError(error); } }
  @Get(":attemptId/trades")
  async trades(@Headers("authorization") authorization: string | undefined, @Param("attemptId") attemptId: string, @Query("limit") limit?: string, @Query("cursor") cursor?: string) { const userId = await this.authenticate(authorization); const parsed = limit === undefined ? 100 : Number(limit); if (!Number.isInteger(parsed) || parsed < 1) throw new BadRequestException("limit must be a positive integer."); try { return await this.modules.backtesting.listAttemptTrades(attemptId, { limit: parsed, cursor }, { ownerUserId: userId }); } catch (error) { return backtestHttpError(error); } }
}

@Controller("experiments")
export class ExperimentController extends ProtectedController {
  constructor(@Inject(BACKEND_MODULES) modules: BackendModules) { super(modules); }
  @Get(":experimentId")
  async read(@Headers("authorization") authorization: string | undefined, @Param("experimentId") experimentId: string) { const userId = await this.authenticate(authorization); try { return await this.modules.backtesting.readExperimentSummary(experimentId, { ownerUserId: userId }); } catch (error) { return backtestHttpError(error); } }
  @Get(":experimentId/trades")
  async trades(@Headers("authorization") authorization: string | undefined, @Param("experimentId") experimentId: string, @Query("limit") limit?: string, @Query("cursor") cursor?: string) { const userId = await this.authenticate(authorization); const parsed = limit === undefined ? 100 : Number(limit); if (!Number.isInteger(parsed) || parsed < 1) throw new BadRequestException("limit must be a positive integer."); try { return await this.modules.backtesting.listExperimentTrades(experimentId, { limit: parsed, cursor }, { ownerUserId: userId }); } catch (error) { return backtestHttpError(error); } }
}

@Module({
  controllers: [HealthController, AuthController, StrategyController, MarketController, NewsController, BacktestScopeController, BacktestController, BacktestAttemptController, ExperimentController],
  providers: [{ provide: BACKEND_MODULES, useFactory: (): BackendModules => composeAllModules() }],
})
export class AppModule {}
