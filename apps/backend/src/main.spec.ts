import { describe, expect, it } from "vitest";
import { BadRequestException, ConflictException, ServiceUnavailableException, UnauthorizedException, UnprocessableEntityException } from "@nestjs/common";
import { createAuthModule, createInMemoryAuthDependencies } from "modules/auth/api";
import { createBacktestingService, createInMemoryBacktestingDependencies } from "modules/backtesting/api";
import { createEvaluationModule } from "modules/evaluation/api/bootstrap";
import { createBacktestingExperimentReader, createBacktestingScopeRepository, createInMemoryLeaderboardDependencies, createLeaderboardModule } from "modules/leaderboard/api/bootstrap";
import { createInMemorySearchDependencies, createSearchModule } from "modules/search/api/bootstrap";
import { createInMemoryStrategyDependencies, createStrategyModule } from "modules/strategy/api/bootstrap";
import { AuthController, BacktestAttemptController, BacktestController, BacktestScopeController, ExperimentController, LeaderboardController, MarketController, NewsController, SearchController, SentimentController, StrategyController, StrategyGenerationController } from "./app.module";
import { MarketGateway } from "./market.gateway";
import { composeAllModules, type BackendModules } from "./compose";

describe("backend composition", () => {
  it("includes all nine modules", () => { expect(Object.keys(composeAllModules())).toHaveLength(9); });

  it("maps auth register, login, and protected identity routes to the public Auth API", async () => {
    const auth = createAuthModule(createInMemoryAuthDependencies());
    const controller = new AuthController({ auth } as BackendModules);

    await controller.register({ email: "student@example.com", password: "correct-horse-battery-staple" });
    const { token } = await controller.login({ email: "student@example.com", password: "correct-horse-battery-staple" });

    await expect(controller.me(`Bearer ${token}`)).resolves.toHaveProperty("userId");
    await expect(controller.register({ email: "student@example.com", password: "correct-horse-battery-staple" })).rejects.toBeInstanceOf(ConflictException);
    await expect(controller.me(undefined)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("uses only public module facades for protected strategies, market candles, and News reads", async () => {
    const modules = {
      auth: { register: async () => undefined, login: async () => ({ token: "token" }), verify: async () => ({ userId: "user-1" }) },
      strategy: { listStrategies: () => [{ name: "MA" }], resolveStrategy: async () => { throw new Error("unused"); }, combineSignals: () => "HOLD" },
      marketData: { readCapabilities: async () => ({ provider: "BINANCE", pairs: ["BTCUSDT"], timeframes: ["1h"] }), readCandles: async (query: unknown) => ({ query }), readPairMetadata: async (pair: string) => ({ pair }), createDatasetSnapshot: async (command: unknown) => ({ command }), readDatasetSnapshot: async (query: unknown) => ({ query }), subscribeMarketData: async () => async () => undefined, shutdown: async () => undefined },
      news: { collect: async () => undefined, readNews: async () => [{ id: "news-1" }] },
      sentiment: { analyze: async (input: unknown) => ({ input }), readLatestForNews: async (newsId: string) => ({ newsId }), createSnapshot: async (input: unknown) => ({ input }), getSnapshotRef: async (snapshotId: string) => ({ snapshotId }), readSnapshot: async () => ({ readAt: () => undefined }) },
    } as unknown as BackendModules;

    await expect(new StrategyController(modules).list("Bearer token")).resolves.toEqual([{ name: "MA" }]);
    await expect(new MarketController(modules).candles("Bearer token", "BTCUSDT", "1h", "2")).resolves.toEqual({ query: { pair: "BTCUSDT", timeframe: "1h", limit: 2, range: undefined, cursor: undefined, includeForming: false, completeness: undefined } });
    await expect(new MarketController(modules).pairs("Bearer token")).resolves.toEqual({ provider: "BINANCE", pairs: ["BTCUSDT"], timeframes: ["1h"] });
    await expect(new MarketController(modules).pairMetadata("Bearer token", "BTCUSDT")).resolves.toEqual({ pair: "BTCUSDT" });
    await expect(new MarketController(modules).createSnapshot("Bearer token", { pair: "BTCUSDT", timeframe: "1h", from: "2025-01-01T00:00:00.000Z", to: "2025-01-01T01:00:00.000Z" })).resolves.toHaveProperty("command");
    await expect(new MarketController(modules).readSnapshot("Bearer token", "snapshot-1", undefined, "10")).resolves.toEqual({ query: { snapshotId: "snapshot-1", cursor: undefined, limit: 10 } });
    await expect(new NewsController(modules).list("Bearer token")).resolves.toEqual([{ id: "news-1" }]);
    await expect(new NewsController(modules).collect("Bearer token")).resolves.toBeUndefined();
    await expect(new SentimentController(modules).analyze("Bearer token", { newsId: "news-1", title: "Title", content: "Body", source: "LOCAL_DEMO", publishedAt: "2025-01-01T00:00:00.000Z", relatedCoins: ["BTC"] })).resolves.toHaveProperty("input");
    await expect(new SentimentController(modules).latest("Bearer token", "news-1")).resolves.toEqual({ newsId: "news-1" });
    await expect(new SentimentController(modules).createSnapshot("Bearer token", { relatedCoin: "BTC", from: "2025-01-01T00:00:00.000Z", to: "2025-01-01T01:00:00.000Z", aggregationWindowSeconds: 300, modelName: "LOCAL_LEXICON", modelVersion: "1.0.0", modelSha256: "a".repeat(64) })).resolves.toHaveProperty("input");
    await expect(new SentimentController(modules).snapshot("Bearer token", "snapshot-1")).resolves.toEqual({ snapshotId: "snapshot-1" });
    await expect(new MarketController(modules).candles("Bearer token", "BTCUSDT", "1h", "0")).rejects.toBeInstanceOf(BadRequestException);
    await expect(new NewsController(modules).list()).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("creates reviewable strategy and composite definitions from the authenticated owner", async () => {
    const auth = createAuthModule(createInMemoryAuthDependencies());
    await auth.register("student@example.com", "correct-horse-battery-staple");
    const { token } = await auth.login("student@example.com", "correct-horse-battery-staple");
    const strategyDependencies = createInMemoryStrategyDependencies();
    strategyDependencies.generationAdapter = {
      modelName: "test-model",
      modelVersion: "1",
      generate: async () => ({ kind: "SINGLE", strategyName: "RSI", parameters: { period: 14, buyThreshold: 30, sellThreshold: 70 } }),
    };
    const modules = { auth, strategy: createStrategyModule(strategyDependencies) } as BackendModules;
    const controller = new StrategyController(modules);
    const ma = await controller.define(`Bearer ${token}`, { strategyName: "MA", parameters: { fastPeriod: 20, slowPeriod: 50 } });
    const rsi = await controller.define(`Bearer ${token}`, { strategyName: "RSI", parameters: { period: 14, buyThreshold: 30, sellThreshold: 70 } });
    const composite = await controller.defineComposite(`Bearer ${token}`, { method: "WEIGHTED_SCORE", components: [{ strategyDefinitionId: ma.id, weight: 0.4 }, { strategyDefinitionId: rsi.id, weight: 0.6 }], thresholds: { buy: 0.2, sell: -0.2 } });

    await expect(controller.definitions(`Bearer ${token}`, `${ma.id},${rsi.id}`)).resolves.toHaveLength(2);
    await expect(controller.definitions(`Bearer ${token}`)).resolves.toHaveLength(2);
    await expect(controller.composites(`Bearer ${token}`)).resolves.toHaveLength(1);
    await expect(controller.composite(`Bearer ${token}`, composite.id)).resolves.toMatchObject({ id: composite.id, method: "WEIGHTED_SCORE" });
    await expect(controller.define(`Bearer ${token}`, { strategyName: "MA", parameters: { fastPeriod: 50, slowPeriod: 20 } })).rejects.toBeInstanceOf(BadRequestException);

    const generated = await new StrategyGenerationController(modules).generate(`Bearer ${token}`, { sourceType: "TEXT", text: "Use RSI to identify oversold conditions." });
    expect(generated).toMatchObject({ kind: "SINGLE", modelName: "test-model", strategyDefinition: { strategyName: "RSI" } });
    await expect(new StrategyGenerationController(modules).generate(`Bearer ${token}`, { sourceType: "URL", url: "file:///unsafe" })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("projects authenticated ownership onto strategy contracts and ignores forged body owners", async () => {
    const calls: unknown[] = [];
    const definition = { id: "definition-1", logicalFamilyKey: "strategy:MA", strategyName: "MA", implementationVersion: "1", implementationSha256: "a".repeat(64), version: 1, parameters: { fastPeriod: 20, slowPeriod: 50 }, createdAt: "2025-01-01T00:00:00.000Z" };
    const composite = { id: "composite-1", logicalFamilyKey: "composite:WEIGHTED_SCORE:definition-1", version: 1, method: "WEIGHTED_SCORE" as const, components: [{ strategyDefinitionId: definition.id, weight: 1 }], thresholds: { buy: 0.3, sell: -0.3 }, createdAt: definition.createdAt };
    const modules = {
      auth: { verify: async () => ({ userId: "user-1" }) },
      strategy: {
        defineStrategy: async (owner: string) => { calls.push(["define", owner]); return { ...definition, userId: "forged-user" }; },
        defineComposite: async (owner: string) => { calls.push(["composite", owner]); return { ...composite, userId: "forged-user" }; },
        readDefinitions: async (owner: string) => { calls.push(["definitions", owner]); return [definition]; },
        listDefinitions: async (owner: string) => { calls.push(["list-definitions", owner]); return [definition]; },
        listComposites: async (owner: string) => { calls.push(["list-composites", owner]); return [composite]; },
        readComposite: async (owner: string) => { calls.push(["read-composite", owner]); return composite; },
        generateStrategy: async (owner: string) => { calls.push(["generate", owner]); return { generationId: "generation-1", kind: "SINGLE" as const, strategyDefinition: definition, modelName: "test", modelVersion: "1", promptVersion: "1" }; },
      },
    } as unknown as BackendModules;
    const controller = new StrategyController(modules);

    await expect(controller.define("Bearer token", { strategyName: "MA", parameters: { fastPeriod: 20, slowPeriod: 50 }, userId: "forged-user" } as never)).resolves.toMatchObject({ id: definition.id, userId: "user-1" });
    await expect(controller.defineComposite("Bearer token", { method: "WEIGHTED_SCORE", components: [{ strategyDefinitionId: definition.id, weight: 1 }], thresholds: composite.thresholds, userId: "forged-user" } as never)).resolves.toMatchObject({ id: composite.id, userId: "user-1" });
    await expect(controller.definitions("Bearer token", definition.id)).resolves.toEqual([{ ...definition, userId: "user-1" }]);
    await expect(controller.composites("Bearer token")).resolves.toEqual([{ ...composite, userId: "user-1" }]);
    await expect(controller.composite("Bearer token", composite.id)).resolves.toEqual({ ...composite, userId: "user-1" });
    await expect(new StrategyGenerationController(modules).generate("Bearer token", { sourceType: "TEXT", text: "Use MA" })).resolves.toMatchObject({ strategyDefinition: { id: definition.id, userId: "user-1" } });

    expect(calls).toContainEqual(["define", "user-1"]);
    expect(calls).toContainEqual(["composite", "user-1"]);
    expect(calls).toContainEqual(["definitions", "user-1"]);
    expect(calls).toContainEqual(["generate", "user-1"]);
  });

  it("normalizes a valid single-definition manual backtest to a weighted one-component composite", async () => {
    const calls: unknown[] = [];
    const definition = { id: "definition-1", logicalFamilyKey: "strategy:MA", strategyName: "MA", implementationVersion: "1", implementationSha256: "a".repeat(64), version: 1, parameters: {}, createdAt: "2025-01-01T00:00:00.000Z" };
    const composite = { id: "composite-1", logicalFamilyKey: "composite:WEIGHTED_SCORE:definition-1", version: 1, method: "WEIGHTED_SCORE" as const, components: [{ strategyDefinitionId: definition.id, weight: 1 }], thresholds: { buy: 0.3, sell: -0.3 }, createdAt: definition.createdAt };
    const modules = {
      auth: { verify: async () => ({ userId: "user-1" }) },
      strategy: {
        readDefinitions: async (owner: string, ids: string[]) => { calls.push(["read-definitions", owner, ids]); return ids.map(() => definition); },
        defineComposite: async (owner: string, command: unknown) => { calls.push(["define-composite", owner, command]); return composite; },
      },
      backtesting: {
        startManual: async (auth: unknown, command: unknown) => { calls.push(["start-manual", auth, command]); return { candidateId: "candidate-1", jobId: "candidate-1", status: "QUEUED" }; },
      },
    } as unknown as BackendModules;
    const controller = new BacktestController(modules);

    await expect(controller.start("Bearer token", "submission-key", { leaderboardScopeId: "scope-1", selectionMode: "SINGLE", strategyDefinitionIds: [definition.id], maxAttempts: 2, userId: "forged-user" } as never)).resolves.toEqual({ candidateId: "candidate-1", jobId: "candidate-1", status: "QUEUED" });
    expect(calls).toContainEqual(["define-composite", "user-1", { method: "WEIGHTED_SCORE", components: [{ strategyDefinitionId: definition.id, weight: 1 }], thresholds: { buy: 0.3, sell: -0.3 } }]);
    expect(calls).toContainEqual(["start-manual", { userId: "user-1" }, { leaderboardScopeId: "scope-1", strategyDefinitions: [definition], compositeDefinition: composite, maxAttempts: 2 }]);

    await expect(controller.start("Bearer token", undefined, { leaderboardScopeId: "scope-1", selectionMode: "COMPOSITE", strategyDefinitionIds: [definition.id] })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("preserves nested owners, generic visualization overlays, markers, and canonical transport error statuses", async () => {
    const definition = { id: "definition-1", logicalFamilyKey: "strategy:MA", strategyName: "MA", implementationVersion: "1", implementationSha256: "a".repeat(64), version: 1, parameters: {}, createdAt: "2025-01-01T00:00:00.000Z" };
    const composite = { id: "composite-1", logicalFamilyKey: "composite:MA", version: 1, method: "MAJORITY_VOTE" as const, components: [{ strategyDefinitionId: definition.id, weight: 0 }], createdAt: definition.createdAt };
    const overlays = [{ id: "overlay-1", strategyDefinitionId: definition.id, kind: "LINE" as const, label: "MA", points: [{ time: definition.createdAt, value: 100 }] }];
    const markers = [{ id: "trade-1:ENTRY", tradeId: "trade-1", sequence: 1, kind: "ENTRY" as const, time: definition.createdAt, price: 100, highlighted: true }];
    const calls: unknown[] = [];
    const modules = {
      auth: { verify: async () => ({ userId: "user-1" }) },
      backtesting: {
        readExperimentSummary: async () => ({ id: "experiment-1", compositeDefinition: composite, strategyDefinitions: [definition] }),
        readExperimentVisualization: async (auth: unknown, experimentId: string, request: unknown) => { calls.push([auth, experimentId, request]); return { experimentId, candles: [], overlays, markers, nextCursor: "next" }; },
      },
    } as unknown as BackendModules;
    const controller = new ExperimentController(modules);

    await expect(controller.read("Bearer token", "experiment-1")).resolves.toMatchObject({ compositeDefinition: { userId: "user-1" }, strategyDefinitions: [{ userId: "user-1" }] });
    await expect(controller.visualization("Bearer token", "experiment-1", undefined, undefined, undefined, undefined, "trade-1")).resolves.toEqual({ experimentId: "experiment-1", candles: [], overlays, markers, nextCursor: "next" });
    expect(calls).toContainEqual([{ userId: "user-1" }, "experiment-1", { limit: 500, cursor: undefined, from: undefined, to: undefined, highlightTradeId: "trade-1" }]);

    for (const [message, expected] of [["IMPLEMENTATION_ARTIFACT_UNAVAILABLE", UnprocessableEntityException], ["STRATEGY_ARTIFACT_NOT_FOUND", UnprocessableEntityException], ["MISSING_SNAPSHOT", UnprocessableEntityException], ["SNAPSHOT_INCOMPLETE", BadRequestException], ["INVALID_VISUALIZATION_PAGE", BadRequestException]] as const) {
      const errorController = new ExperimentController({ auth: { verify: async () => ({ userId: "user-1" }) }, backtesting: { readExperimentVisualization: async () => { throw new Error(message); } } } as unknown as BackendModules);
      await expect(errorController.visualization("Bearer token", "experiment-1", "10")).rejects.toBeInstanceOf(expected);
    }
  });

  it("maps generation validation, unusable-source, and bounded model failures to documented HTTP statuses", async () => {
    const controller = new StrategyGenerationController({
      auth: { verify: async () => ({ userId: "user-1" }) },
      strategy: { generateStrategy: async () => { throw new Error("STRATEGY_SOURCE_UNSUPPORTED_CONTENT"); } },
    } as unknown as BackendModules);
    await expect(controller.generate("Bearer token", { sourceType: "TEXT", text: "source" })).rejects.toBeInstanceOf(UnprocessableEntityException);

    const unavailable = new StrategyGenerationController({
      auth: { verify: async () => ({ userId: "user-1" }) },
      strategy: { generateStrategy: async () => { throw new Error("STRATEGY_MODEL_TIMEOUT"); } },
    } as unknown as BackendModules);
    await expect(unavailable.generate("Bearer token", { sourceType: "TEXT", text: "source" })).rejects.toBeInstanceOf(ServiceUnavailableException);

    await expect(controller.generate("Bearer token", { sourceType: "TEXT", text: "source", url: "https://example.com" } as never)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("maps authenticated scope, manual backtest, attempt, and experiment routes to the Backtesting public API", async () => {
    const auth = createAuthModule(createInMemoryAuthDependencies());
    await auth.register("backtest@example.com", "correct-horse-battery-staple");
    const { token } = await auth.login("backtest@example.com", "correct-horse-battery-staple");
    const owner = await auth.verify(token);
    const snapshot = { id: "snapshot-1", pair: "BTCUSDT", pairMetadata: { pair: "BTCUSDT", baseAsset: "BTC", quoteAsset: "USDT", settlementAsset: "USDT" }, timeframe: "1h" as const, range: { from: "2025-01-01T00:00:00.000Z", to: "2025-01-01T03:00:00.000Z" }, candleCount: 3, sha256: "a".repeat(64), createdAt: "2025-01-01T00:00:00.000Z" };
    const candles = [
      { pair: "BTCUSDT", timeframe: "1h" as const, timestamp: "2025-01-01T00:00:00.000Z", open: 100, high: 102, low: 99, close: 101, volume: 1, isClosed: true },
      { pair: "BTCUSDT", timeframe: "1h" as const, timestamp: "2025-01-01T01:00:00.000Z", open: 102, high: 106, low: 101, close: 105, volume: 1, isClosed: true },
      { pair: "BTCUSDT", timeframe: "1h" as const, timestamp: "2025-01-01T02:00:00.000Z", open: 106, high: 111, low: 105, close: 110, volume: 1, isClosed: true },
    ];
    const definition = { id: "definition-1", userId: owner.userId, logicalFamilyKey: "strategy:test", strategyName: "TEST", implementationVersion: "1", implementationSha256: "b".repeat(64), version: 1, parameters: {}, createdAt: snapshot.createdAt };
    const composite = { id: "composite-1", userId: owner.userId, logicalFamilyKey: "composite:test", version: 1, method: "MAJORITY_VOTE" as const, components: [{ strategyDefinitionId: definition.id, weight: 0 }], createdAt: snapshot.createdAt };
    let id = 0;
    const backtesting = createBacktestingService({ ...createInMemoryBacktestingDependencies(), marketData: { readDatasetSnapshot: async () => ({ snapshot, candles }) }, strategy: { readDefinitions: async (_userId, ids) => ids.map((id) => ({ ...definition, id })), readComposite: async (_userId, id) => ({ ...composite, id }), resolveStrategy: async () => ({ name: "test", category: "TREND", analyze: (context) => context.candles.length === 1 ? "BUY" : "HOLD" }), combineSignals: (_composite, signals) => signals[0]?.signal ?? "HOLD" }, evaluation: createEvaluationModule(), clock: { now: () => "2025-01-01T03:00:00.000Z" }, idGenerator: () => `id-${id++}` });
    const leaderboard = createLeaderboardModule({ ...createInMemoryLeaderboardDependencies(), scopeRepository: createBacktestingScopeRepository(backtesting), experimentReader: createBacktestingExperimentReader(backtesting), clock: { now: () => "2025-01-01T03:00:00.000Z" } });
    const search = createSearchModule({ ...createInMemorySearchDependencies(), backtestCoordinator: backtesting, leaderboardService: leaderboard, clock: { now: () => "2025-01-01T03:00:00.000Z" } });
    const modules = {
      auth,
      marketData: { createDatasetSnapshot: async () => snapshot },
      strategy: { readDefinitions: async () => [definition], readComposite: async () => composite },
      evaluation: createEvaluationModule(),
      backtesting,
      leaderboard,
      search,
    } as unknown as BackendModules;
    const scope = await new BacktestScopeController(modules).create(`Bearer ${token}`, "scope-key", { name: "fixture", pair: "BTCUSDT", timeframe: "1h", from: snapshot.range.from, to: snapshot.range.to, initialCapital: 1000, feeRatePercent: 0, slippageBps: 0 });
    const accepted = await new BacktestController(modules).start(`Bearer ${token}`, "submission-key", { leaderboardScopeId: scope.id, strategyDefinitionIds: [definition.id], compositeDefinitionId: composite.id, maxAttempts: 1 });
    expect(accepted).toMatchObject({ candidateId: accepted.jobId, status: "QUEUED" });
    await backtesting.processQueueJob({ schemaVersion: 1, jobId: accepted.jobId, candidateId: accepted.candidateId, leaderboardScopeId: scope.id, maxAttempts: 1, workerRuntimeVersion: "1", workerRuntimeSha256: "c".repeat(64), enqueuedAt: "2025-01-01T03:00:00.000Z" }, { attemptNumber: 1, fenceToken: "controller-worker" });
    await backtesting.processCompletion(accepted.candidateId);
    const progress = await new BacktestController(modules).status(`Bearer ${token}`, accepted.candidateId);
    const attempt = await new BacktestAttemptController(modules).read(`Bearer ${token}`, progress.attempts[0]!.attemptId);
    const experiment = await new ExperimentController(modules).read(`Bearer ${token}`, progress.experimentResultId!);

    expect(progress.status).toBe("COMPLETED");
    expect(attempt).toMatchObject({ status: "COMPLETED", tradeCount: 1 });
    await expect(new BacktestAttemptController(modules).trades(`Bearer ${token}`, attempt.attemptId, "10")).resolves.toMatchObject({ items: [expect.objectContaining({ exitReason: "RANGE_END" })] });
    await expect(new ExperimentController(modules).trades(`Bearer ${token}`, experiment.id, "10")).resolves.toMatchObject({ items: [expect.objectContaining({ result: "WIN" })] });

    const searchStarted = await new SearchController(modules).start(`Bearer ${token}`, { leaderboardScopeId: scope.id, strategyDefinitionIds: [definition.id], maxCandidates: 2, maxInFlight: 1 });
    await expect(new SearchController(modules).status(`Bearer ${token}`, searchStarted.searchRunId)).resolves.toMatchObject({ state: "RUNNING", candidatesTested: 1, queuedCount: 1 });
  });

  it("maps authenticated bounded Search lifecycle and scoped Top-K routes to public facades", async () => {
    const calls: string[] = [];
    const modules = {
      auth: { verify: async () => ({ userId: "user-1" }) },
      backtesting: { readBenchmarkScope: async () => ({ id: "scope-1" }) },
      strategy: { readDefinitions: async (_owner: string, ids: string[]) => ids.map((id) => ({ id })) },
      search: {
        start: async (_auth: unknown, config: { generatorType: string; searchSpace: { availableStrategies: unknown[] } }) => { calls.push(`start:${config.generatorType}:${config.searchSpace.availableStrategies.length}`); return { searchRunId: "run-1" }; },
        status: async () => ({ searchRunId: "run-1", state: "RUNNING" }),
        pause: async () => { calls.push("pause"); }, resume: async () => { calls.push("resume"); }, cancel: async () => { calls.push("cancel"); }, leaderboard: async () => [{ rank: 1 }],
      },
      leaderboard: { topK: async () => [{ rank: 1 }] },
    } as unknown as BackendModules;
    const search = new SearchController(modules);

    await expect(search.start("Bearer token", { leaderboardScopeId: "scope-1", strategyDefinitionIds: ["strategy-1"], maxCandidates: 2 })).resolves.toEqual({ searchRunId: "run-1" });
    await expect(search.status("Bearer token", "run-1")).resolves.toMatchObject({ state: "RUNNING" });
    await search.pause("Bearer token", "run-1"); await search.resume("Bearer token", "run-1"); await search.cancel("Bearer token", "run-1");
    await expect(search.leaderboard("Bearer token", "run-1")).resolves.toEqual([{ rank: 1 }]);
    await expect(new LeaderboardController(modules).topK("Bearer token", "scope-1")).resolves.toEqual([{ rank: 1 }]);
    await expect(new LeaderboardController(modules).list("Bearer token", "scope-1")).resolves.toEqual([{ rank: 1 }]);
    expect(calls).toEqual(["start:RANDOM:1", "pause", "resume", "cancel"]);
  });

  it("maps the remaining authenticated Backtesting, Search, Leaderboard, and Market transport reads without controller-owned domain logic", async () => {
    const calls: unknown[] = [];
    const modules = {
      auth: { verify: async () => ({ userId: "user-1" }) },
      backtesting: {
        listBenchmarkScopes: async (auth: unknown) => { calls.push(["scopes", auth]); return [{ id: "scope-1" }]; },
        cancelManualCandidate: async (...args: unknown[]) => { calls.push(["cancel", args]); },
        listSearchCandidates: async (auth: unknown, searchRunId: string, page: unknown) => { calls.push(["candidates", auth, searchRunId, page]); return { items: [{ candidateId: "candidate-1" }] }; },
        readExperimentVisualization: async (auth: unknown, experimentId: string, page: unknown) => { calls.push(["visualization", auth, experimentId, page]); return { experimentId, candles: [], overlays: [], markers: [] }; },
        verifyReplay: async (auth: unknown, experimentId: string) => { calls.push(["replay", auth, experimentId]); return { experimentId, status: "MATCH" }; },
        readBenchmarkScope: async () => ({ id: "scope-1" }),
      },
      search: { status: async () => ({ searchRunId: "run-1", state: "RUNNING" }) },
      leaderboard: { topK: async () => [{ rank: 1 }] },
      marketData: { readCandles: async (query: unknown) => { calls.push(["candles", query]); return { candles: [] }; } },
    } as unknown as BackendModules;

    await expect(new BacktestScopeController(modules).list("Bearer token")).resolves.toEqual([{ id: "scope-1" }]);
    await expect(new BacktestController(modules).cancel("Bearer token", "candidate-1")).resolves.toBeUndefined();
    await expect(new SearchController(modules).candidates("Bearer token", "run-1", "20", "cursor-1")).resolves.toEqual({ items: [{ candidateId: "candidate-1" }] });
    await expect(new ExperimentController(modules).visualization("Bearer token", "experiment-1", "10", "cursor-1")).resolves.toMatchObject({ experimentId: "experiment-1" });
    await expect(new ExperimentController(modules).replay("Bearer token", "experiment-1")).resolves.toMatchObject({ status: "MATCH" });
    await expect(new LeaderboardController(modules).topK("Bearer token", "scope-1")).resolves.toEqual([{ rank: 1 }]);
    await expect(new MarketController(modules).candles("Bearer token", "BTCUSDT", "1h", undefined, "2025-01-01T00:00:00.000Z", "2025-01-01T02:00:00.000Z", "cursor-2", "true", "REQUIRE_COMPLETE")).resolves.toEqual({ candles: [] });

    expect(calls).toContainEqual(["scopes", { userId: "user-1" }]);
    expect(calls).toContainEqual(["candidates", { userId: "user-1" }, "run-1", { limit: 20, cursor: "cursor-1" }]);
    expect(calls).toContainEqual(["visualization", { userId: "user-1" }, "experiment-1", { limit: 10, cursor: "cursor-1", from: undefined, to: undefined, highlightTradeId: undefined }]);
    expect(calls).toContainEqual(["replay", { userId: "user-1" }, "experiment-1"]);
    expect(calls).toContainEqual(["candles", { pair: "BTCUSDT", timeframe: "1h", limit: undefined, range: { from: "2025-01-01T00:00:00.000Z", to: "2025-01-01T02:00:00.000Z" }, cursor: "cursor-2", includeForming: true, completeness: "REQUIRE_COMPLETE" }]);
  });

  it("authenticates and forwards only normalized Market Data WebSocket messages", async () => {
    const emitted: Array<[string, unknown]> = [];
    let sink: ((update: { kind: "TICK"; payload: { pair: string; price: number; quantity: number; timestamp: string; side: "BUY" | "SELL" } }) => void) | undefined;
    const modules = {
      auth: { verify: async (token: string) => token === "token" ? { userId: "user-1" } : Promise.reject(new Error("INVALID_TOKEN")) },
      marketData: { subscribeMarketData: async (_subscriptions: unknown, next: typeof sink) => { sink = next; return async () => undefined; } },
    } as unknown as BackendModules;
    const socket = { id: "socket-1", handshake: { auth: { token: "token" }, headers: {} }, data: {}, emit: (event: string, payload: unknown) => emitted.push([event, payload]), disconnect: () => undefined };
    const gateway = new MarketGateway(modules);

    await gateway.handleConnection(socket);
    await gateway.command(socket, { schemaVersion: 1, action: "SUBSCRIBE", requestId: "request-1", subscriptions: [{ pair: "BTCUSDT", timeframe: "1h" }] });
    sink?.({ kind: "TICK", payload: { pair: "BTCUSDT", price: 100, quantity: 0.25, timestamp: "2025-01-01T00:00:00.000Z", side: "SELL" } });

    expect(emitted).toContainEqual(["market", expect.objectContaining({ type: "SUBSCRIPTION_ACK", requestId: "request-1" })]);
    expect(emitted).toContainEqual(["market", expect.objectContaining({ type: "MARKET_TICK", payload: { pair: "BTCUSDT", price: 100, quantity: 0.25, timestamp: "2025-01-01T00:00:00.000Z", side: "SELL" } })]);
  });

  it("replaces a client's upstream subscription set when panels change", async () => {
    const requested: unknown[] = [];
    const modules = {
      auth: { verify: async () => ({ userId: "user-1" }) },
      marketData: { subscribeMarketData: async (subscriptions: unknown) => { requested.push(subscriptions); return async () => undefined; } },
    } as unknown as BackendModules;
    const socket = { id: "socket-2", handshake: { auth: { token: "token" }, headers: {} }, data: {}, emit: () => undefined, disconnect: () => undefined };
    const gateway = new MarketGateway(modules);

    await gateway.handleConnection(socket);
    await gateway.command(socket, { schemaVersion: 1, action: "SUBSCRIBE", requestId: "request-1", subscriptions: [{ pair: "BTCUSDT", timeframe: "1m" }] });
    await gateway.command(socket, { schemaVersion: 1, action: "SUBSCRIBE", requestId: "request-2", subscriptions: [{ pair: "BTCUSDT", timeframe: "5m" }] });
    await gateway.command(socket, { schemaVersion: 1, action: "UNSUBSCRIBE", requestId: "request-3", subscriptions: [{ pair: "BTCUSDT", timeframe: "1m" }] });

    expect(requested).toEqual([
      [{ pair: "BTCUSDT", timeframe: "1m" }],
      [{ pair: "BTCUSDT", timeframe: "1m" }, { pair: "BTCUSDT", timeframe: "5m" }],
      [{ pair: "BTCUSDT", timeframe: "5m" }],
    ]);
  });
});
