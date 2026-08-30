import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import {
  REST_SCHEMA_VERSION,
  RestContractValidationError,
} from "@cryptox/contracts/rest";
import type { AuthenticatedRequestContext } from "@cryptox/auth";
import {
  BACKEND_RUNTIME_TOKEN,
  type BackendRuntime,
} from "./runtime";
import { authenticatedContext, type BackendRequest } from "./auth-context";
import { mapCapabilityError, restCall, unavailableCapability } from "./rest-errors";
import {
  createLeaderboardScopeRequest,
  defineCompositeRequest,
  defineStrategyRequest,
  marketHistoryRequest,
  newsQuery,
  pageRequest,
  queryValue,
  startManualBacktestRequest,
  startSearchRequest,
  toCandidateProgressDto,
  toCompositeDefinitionDto,
  toExperimentDto,
  toLeaderboardEntryDto,
  toLeaderboardScopeDto,
  toMarketHistoryResponse,
  toNewsPageResponse,
  toRankingConfigurationDto,
  toSearchRankingEntryDto,
  toSearchRunStatusDto,
  toStrategyDefinitionDto,
  toStrategyPluginDescriptor,
  toTradeDto,
} from "./transport";

interface QueryRecord {
  readonly [key: string]: unknown;
}

@Controller()
export class CapabilitiesController {
  public constructor(
    @Inject(BACKEND_RUNTIME_TOKEN) private readonly runtime: BackendRuntime,
  ) {}

  @Post("market-data/history")
  @HttpCode(HttpStatus.OK)
  async marketHistory(@Body() body: unknown) {
    if (!this.runtime.marketData) return unavailableCapability(this.runtime, "market-data-provider");
    return restCall(this.runtime, async () => toMarketHistoryResponse(
      await this.runtime.marketData!.readCandles({ ...marketHistoryRequest(body) }),
    ), "market-data-provider");
  }

  @Get("strategy/catalog")
  strategyCatalog() {
    return {
      schemaVersion: REST_SCHEMA_VERSION,
      items: this.runtime.strategy.listStrategies().map(toStrategyPluginDescriptor),
    };
  }

  @Get("strategy/definitions")
  async strategyDefinitions(@Req() request: BackendRequest, @Query() query: QueryRecord) {
    return this.privateCall(request, "strategy", async (context) => {
      const page = pageRequest(query);
      const result = await this.runtime.strategy.listStrategyDefinitions(context, page);
      return {
        schemaVersion: REST_SCHEMA_VERSION,
        items: result.items.map(toStrategyDefinitionDto),
        ...(result.nextCursor === undefined ? {} : { nextCursor: result.nextCursor }),
      };
    });
  }

  @Get("strategy/composites")
  async strategyComposites(@Req() request: BackendRequest, @Query() query: QueryRecord) {
    return this.privateCall(request, "strategy", async (context) => {
      const page = pageRequest(query);
      const result = await this.runtime.strategy.listCompositeDefinitions(context, page);
      return {
        schemaVersion: REST_SCHEMA_VERSION,
        items: result.items.map(toCompositeDefinitionDto),
        ...(result.nextCursor === undefined ? {} : { nextCursor: result.nextCursor }),
      };
    });
  }

  @Post("strategy/definitions")
  @HttpCode(HttpStatus.OK)
  async defineStrategy(@Req() request: BackendRequest, @Body() body: unknown) {
    return this.privateCall(request, "strategy", async (context) => ({
      schemaVersion: REST_SCHEMA_VERSION,
      definition: toStrategyDefinitionDto(
        await this.runtime.strategy.defineStrategy(context, { ...defineStrategyRequest(body) }),
      ),
    }));
  }

  @Post("strategy/composites")
  @HttpCode(HttpStatus.OK)
  async defineComposite(@Req() request: BackendRequest, @Body() body: unknown) {
    return this.privateCall(request, "strategy", async (context) => ({
      schemaVersion: REST_SCHEMA_VERSION,
      definition: toCompositeDefinitionDto(
        await this.runtime.strategy.defineComposite(context, { ...defineCompositeRequest(body) }),
      ),
    }));
  }

  @Get("search/runs")
  async searchRuns(@Req() request: BackendRequest, @Query() query: QueryRecord) {
    return this.privateCall(request, "search", async (context) => {
      const search = this.runtime.search;
      if (!search) return unavailableCapability(this.runtime, "search-composition");
      const result = await search.list(context, pageRequest(query));
      return {
        schemaVersion: REST_SCHEMA_VERSION,
        items: result.items.map(toSearchRunStatusDto),
        ...(result.nextCursor === undefined ? {} : { nextCursor: result.nextCursor }),
      };
    });
  }

  @Post("search/runs")
  @HttpCode(HttpStatus.OK)
  async startSearch(@Req() request: BackendRequest, @Body() body: unknown) {
    return this.privateCall(request, "search", async (context) => {
      const search = this.runtime.search;
      if (!search) return unavailableCapability(this.runtime, "search-composition");
      const result = await search.start(context, { ...startSearchRequest(body) });
      return { schemaVersion: REST_SCHEMA_VERSION, searchRunId: result.searchRunId };
    });
  }

  @Get("search/runs/:searchRunId")
  async searchStatus(@Req() request: BackendRequest, @Param("searchRunId") searchRunId: string) {
    return this.privateCall(request, "search", async (context) => {
      const search = this.runtime.search;
      if (!search) return unavailableCapability(this.runtime, "search-composition");
      const [status, ranking] = await Promise.all([
        search.status(context, searchRunId),
        search.leaderboard(context, searchRunId),
      ]);
      return {
        schemaVersion: REST_SCHEMA_VERSION,
        searchRun: toSearchRunStatusDto(status),
        ranking: ranking.map(toSearchRankingEntryDto),
      };
    });
  }

  @Post("search/runs/:searchRunId/cancel")
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelSearch(@Req() request: BackendRequest, @Param("searchRunId") searchRunId: string): Promise<void> {
    await this.privateCall(request, "search", async (context) => {
      const search = this.runtime.search;
      if (!search) return unavailableCapability(this.runtime, "search-composition");
      await search.cancel(context, searchRunId);
    });
  }

  @Post("search/runs/:searchRunId/pause")
  @HttpCode(HttpStatus.NO_CONTENT)
  async pauseSearch(@Req() request: BackendRequest, @Param("searchRunId") searchRunId: string): Promise<void> {
    await this.privateCall(request, "search", async (context) => {
      const search = this.runtime.search;
      if (!search) return unavailableCapability(this.runtime, "search-composition");
      await search.pause(context, searchRunId);
    });
  }

  @Post("search/runs/:searchRunId/resume")
  @HttpCode(HttpStatus.NO_CONTENT)
  async resumeSearch(@Req() request: BackendRequest, @Param("searchRunId") searchRunId: string): Promise<void> {
    await this.privateCall(request, "search", async (context) => {
      const search = this.runtime.search;
      if (!search) return unavailableCapability(this.runtime, "search-composition");
      await search.resume(context, searchRunId);
    });
  }

  @Post("backtesting")
  @HttpCode(HttpStatus.OK)
  async startBacktest(@Req() request: BackendRequest, @Body() body: unknown) {
    return this.privateCall(request, "backtesting", async (context) => {
      const backtesting = this.runtime.backtesting;
      if (!backtesting) return unavailableCapability(this.runtime, "backtest-runner");
      const result = await backtesting.startManual(context, { ...startManualBacktestRequest(body) });
      return { schemaVersion: REST_SCHEMA_VERSION, candidateId: result.candidateId, status: result.status };
    });
  }

  @Get("backtesting/candidates/:candidateId")
  async candidateStatus(@Req() request: BackendRequest, @Param("candidateId") candidateId: string) {
    return this.privateCall(request, "backtesting", async (context) => {
      const backtesting = this.runtime.backtesting;
      if (!backtesting) return unavailableCapability(this.runtime, "backtest-runner");
      return {
        schemaVersion: REST_SCHEMA_VERSION,
        candidate: toCandidateProgressDto(await backtesting.status(context, candidateId)),
      };
    });
  }

  @Get("backtesting/search-runs/:searchRunId/candidates")
  async searchCandidates(@Req() request: BackendRequest, @Param("searchRunId") searchRunId: string, @Query() query: QueryRecord) {
    return this.privateCall(request, "backtesting", async (context) => {
      const backtesting = this.runtime.backtesting;
      if (!backtesting) return unavailableCapability(this.runtime, "backtest-runner");
      const page = await backtesting.listSearchCandidates(context, searchRunId, pageRequest(query));
      return {
        schemaVersion: REST_SCHEMA_VERSION,
        items: page.items.map(toCandidateProgressDto),
        ...(page.nextCursor === undefined ? {} : { nextCursor: page.nextCursor }),
      };
    });
  }

  @Post("backtesting/candidates/:candidateId/cancel")
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelCandidate(@Req() request: BackendRequest, @Param("candidateId") candidateId: string): Promise<void> {
    await this.privateCall(request, "backtesting", async (context) => {
      const backtesting = this.runtime.backtesting;
      if (!backtesting) return unavailableCapability(this.runtime, "backtest-runner");
      await backtesting.cancelCandidate(context, candidateId);
    });
  }

  @Get("backtesting/experiments")
  async experiments(@Req() request: BackendRequest, @Query() query: QueryRecord) {
    return this.privateCall(request, "backtesting", async (context) => {
      const backtesting = this.runtime.backtesting;
      if (!backtesting) return unavailableCapability(this.runtime, "backtest-runner");
      const searchRunId = queryValue(query, "searchRunId");
      if (!searchRunId) throw new RestContractValidationError("searchRunId is required for the public experiment list");
      const items = await backtesting.listSearchExperiments(context, searchRunId);
      return { schemaVersion: REST_SCHEMA_VERSION, items: items.map(toExperimentDto) };
    });
  }

  @Get("backtesting/experiments/:experimentId")
  async experiment(@Req() request: BackendRequest, @Param("experimentId") experimentId: string) {
    return this.privateCall(request, "backtesting", async (context) => {
      const backtesting = this.runtime.backtesting;
      if (!backtesting) return unavailableCapability(this.runtime, "backtest-runner");
      return {
        schemaVersion: REST_SCHEMA_VERSION,
        experiment: toExperimentDto(await backtesting.readExperiment(context, experimentId)),
      };
    });
  }

  @Get("backtesting/experiments/:experimentId/trades")
  async trades(@Req() request: BackendRequest, @Param("experimentId") experimentId: string, @Query() query: QueryRecord) {
    return this.privateCall(request, "backtesting", async (context) => {
      const backtesting = this.runtime.backtesting;
      if (!backtesting) return unavailableCapability(this.runtime, "backtest-runner");
      const page = await backtesting.listExperimentTrades(context, experimentId, pageRequest(query));
      return {
        schemaVersion: REST_SCHEMA_VERSION,
        items: page.items.map(toTradeDto),
        ...(page.nextCursor === undefined ? {} : { nextCursor: page.nextCursor }),
      };
    });
  }

  @Post("leaderboard/scopes")
  @HttpCode(HttpStatus.OK)
  async createLeaderboardScope(@Req() request: BackendRequest, @Body() body: unknown) {
    return this.privateCall(request, "leaderboard", async (context) => {
      const leaderboard = this.runtime.leaderboard;
      if (!leaderboard) return unavailableCapability(this.runtime, "leaderboard-persistence");
      return {
        schemaVersion: REST_SCHEMA_VERSION,
        scope: toLeaderboardScopeDto(await leaderboard.createLeaderboardScope(context, { ...createLeaderboardScopeRequest(body) })),
      };
    });
  }

  @Get("leaderboard/ranking-configurations")
  async rankingConfigurations() {
    if (!this.runtime.leaderboard) return unavailableCapability(this.runtime, "leaderboard-persistence");
    return restCall(this.runtime, async () => ({
      schemaVersion: REST_SCHEMA_VERSION,
      items: (await this.runtime.leaderboard!.listRankingConfigurations()).map(toRankingConfigurationDto),
    }), "leaderboard-persistence");
  }

  @Get("leaderboard")
  async leaderboard(@Req() request: BackendRequest, @Query() query: QueryRecord) {
    return this.privateCall(request, "leaderboard", async (context) => {
      const leaderboard = this.runtime.leaderboard;
      if (!leaderboard) return unavailableCapability(this.runtime, "leaderboard-persistence");
      const scopeId = queryValue(query, "scopeId") ?? process.env.LEADERBOARD_SCOPE_ID?.trim();
      if (!scopeId) return unavailableCapability(this.runtime, "leaderboard-persistence");
      const scope = await leaderboard.getLeaderboardScope(context, scopeId);
      const [rankingConfiguration, entries] = await Promise.all([
        leaderboard.getRankingConfiguration(scope.rankingConfigurationId),
        leaderboard.topK(context, scope.id),
      ]);
      return {
        schemaVersion: REST_SCHEMA_VERSION,
        scope: toLeaderboardScopeDto(scope),
        rankingConfiguration: toRankingConfigurationDto(rankingConfiguration),
        entries: entries.map(toLeaderboardEntryDto),
      };
    });
  }

  @Get("news")
  async news(@Query() query: QueryRecord) {
    if (!this.runtime.news) return unavailableCapability(this.runtime, "news-provider");
    return restCall(this.runtime, async () => toNewsPageResponse(
      await this.runtime.news!.readNews(newsQuery(query)),
    ), "news-provider");
  }

  private async privateCall<T>(
    request: BackendRequest,
    capability: "strategy" | "search" | "backtesting" | "leaderboard",
    operation: (context: AuthenticatedRequestContext) => Promise<T> | T,
  ): Promise<T> {
    try {
      const context = await authenticatedContext(request, this.runtime.auth);
      if (!this.runtime.isCapabilityAvailable(capability)) {
        return unavailableCapability(this.runtime, capability === "strategy" ? "strategy-persistence" : capability === "search" ? "search-composition" : capability === "backtesting" ? "backtest-runner" : "leaderboard-persistence");
      }
      return await operation(context);
    } catch (error) {
      throw mapCapabilityError(
        error,
        this.runtime,
        capability === "strategy"
          ? "strategy-persistence"
          : capability === "search"
            ? "search-composition"
            : capability === "backtesting"
              ? "backtest-runner"
              : "leaderboard-persistence",
      );
    }
  }
}
