import { BadRequestException, Body, ConflictException, Controller, Get, Headers, HttpCode, Inject, Module, NotFoundException, Param, Post, Query, UnauthorizedException } from "@nestjs/common";
import { AuthException, type AuthModulePublicApi } from "modules/auth/api";
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

@Module({
  controllers: [HealthController, AuthController, StrategyController, MarketController, NewsController],
  providers: [{ provide: BACKEND_MODULES, useFactory: (): BackendModules => composeAllModules() }],
})
export class AppModule {}
