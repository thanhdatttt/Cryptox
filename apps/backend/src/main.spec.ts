import { describe, expect, it } from "vitest";
import { BadRequestException, ConflictException, UnauthorizedException } from "@nestjs/common";
import { createAuthModule, createInMemoryAuthDependencies } from "modules/auth/api";
import { createBacktestingService, createInMemoryBacktestingDependencies } from "modules/backtesting/api";
import { createEvaluationModule } from "modules/evaluation/api/bootstrap";
import { createBacktestingExperimentReader, createBacktestingScopeRepository, createInMemoryLeaderboardDependencies, createLeaderboardModule } from "modules/leaderboard/api/bootstrap";
import { createInMemorySearchDependencies, createSearchModule } from "modules/search/api/bootstrap";
import { createInMemoryStrategyDependencies, createStrategyModule } from "modules/strategy/api/bootstrap";
import { AuthController, BacktestAttemptController, BacktestController, BacktestScopeController, ExperimentController, LeaderboardController, MarketController, NewsController, SearchController, StrategyController } from "./app.module";
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
      marketData: { readCandles: async (query: unknown) => ({ query }), readPairMetadata: async () => { throw new Error("unused"); }, createDatasetSnapshot: async () => { throw new Error("unused"); }, readDatasetSnapshot: async () => { throw new Error("unused"); }, subscribeMarketData: async () => async () => undefined, shutdown: async () => undefined },
      news: { collect: async () => undefined, readNews: async () => [{ id: "news-1" }] },
    } as unknown as BackendModules;

    await expect(new StrategyController(modules).list("Bearer token")).resolves.toEqual([{ name: "MA" }]);
    await expect(new MarketController(modules).candles("Bearer token", "BTCUSDT", "1h", "2")).resolves.toEqual({ query: { pair: "BTCUSDT", timeframe: "1h", limit: 2 } });
    await expect(new NewsController(modules).list("Bearer token")).resolves.toEqual([{ id: "news-1" }]);
    await expect(new MarketController(modules).candles("Bearer token", "BTCUSDT", "1h", "0")).rejects.toBeInstanceOf(BadRequestException);
    await expect(new NewsController(modules).list()).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("creates reviewable strategy and composite definitions from the authenticated owner", async () => {
    const auth = createAuthModule(createInMemoryAuthDependencies());
    await auth.register("student@example.com", "correct-horse-battery-staple");
    const { token } = await auth.login("student@example.com", "correct-horse-battery-staple");
    const modules = { auth, strategy: createStrategyModule(createInMemoryStrategyDependencies()) } as BackendModules;
    const controller = new StrategyController(modules);
    const ma = await controller.define(`Bearer ${token}`, { strategyName: "MA", parameters: { fastPeriod: 20, slowPeriod: 50 } });
    const rsi = await controller.define(`Bearer ${token}`, { strategyName: "RSI", parameters: { period: 14, buyThreshold: 30, sellThreshold: 70 } });
    const composite = await controller.defineComposite(`Bearer ${token}`, { method: "WEIGHTED_SCORE", components: [{ strategyDefinitionId: ma.id, weight: 0.4 }, { strategyDefinitionId: rsi.id, weight: 0.6 }], thresholds: { buy: 0.2, sell: -0.2 } });

    await expect(controller.definitions(`Bearer ${token}`, `${ma.id},${rsi.id}`)).resolves.toHaveLength(2);
    await expect(controller.composite(`Bearer ${token}`, composite.id)).resolves.toMatchObject({ id: composite.id, method: "WEIGHTED_SCORE" });
    await expect(controller.define(`Bearer ${token}`, { strategyName: "MA", parameters: { fastPeriod: 50, slowPeriod: 20 } })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("maps authenticated scope, manual backtest, attempt, and experiment routes to the Backtesting public API", async () => {
    const auth = createAuthModule(createInMemoryAuthDependencies());
    await auth.register("backtest@example.com", "correct-horse-battery-staple");
    const { token } = await auth.login("backtest@example.com", "correct-horse-battery-staple");
    const snapshot = { id: "snapshot-1", pair: "BTCUSDT", pairMetadata: { pair: "BTCUSDT", baseAsset: "BTC", quoteAsset: "USDT", settlementAsset: "USDT" }, timeframe: "1h" as const, range: { from: "2025-01-01T00:00:00.000Z", to: "2025-01-01T03:00:00.000Z" }, candleCount: 3, sha256: "a".repeat(64), createdAt: "2025-01-01T00:00:00.000Z" };
    const candles = [
      { pair: "BTCUSDT", timeframe: "1h" as const, timestamp: "2025-01-01T00:00:00.000Z", open: 100, high: 102, low: 99, close: 101, volume: 1, isClosed: true },
      { pair: "BTCUSDT", timeframe: "1h" as const, timestamp: "2025-01-01T01:00:00.000Z", open: 102, high: 106, low: 101, close: 105, volume: 1, isClosed: true },
      { pair: "BTCUSDT", timeframe: "1h" as const, timestamp: "2025-01-01T02:00:00.000Z", open: 106, high: 111, low: 105, close: 110, volume: 1, isClosed: true },
    ];
    const definition = { id: "definition-1", logicalFamilyKey: "strategy:test", strategyName: "TEST", implementationVersion: "1", implementationSha256: "b".repeat(64), version: 1, parameters: {}, createdAt: snapshot.createdAt };
    const composite = { id: "composite-1", logicalFamilyKey: "composite:test", version: 1, method: "MAJORITY_VOTE" as const, components: [{ strategyDefinitionId: definition.id, weight: 0 }], createdAt: snapshot.createdAt };
    let id = 0;
    const backtesting = createBacktestingService({ ...createInMemoryBacktestingDependencies(), marketData: { readDatasetSnapshot: async () => ({ snapshot, candles }) }, strategy: { resolveStrategy: async () => ({ name: "test", category: "TREND", analyze: (context) => context.candles.length === 1 ? "BUY" : "HOLD" }), combineSignals: (_composite, signals) => signals[0]?.signal ?? "HOLD" }, evaluation: createEvaluationModule(), clock: { now: () => "2025-01-01T03:00:00.000Z" }, idGenerator: () => `id-${id++}` });
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
    const progress = await new BacktestController(modules).status(`Bearer ${token}`, accepted.candidateId);
    const attempt = await new BacktestAttemptController(modules).read(`Bearer ${token}`, progress.attempts[0]!.attemptId);
    const experiment = await new ExperimentController(modules).read(`Bearer ${token}`, progress.experimentResultId!);

    expect(accepted.status).toBe("COMPLETED");
    expect(attempt).toMatchObject({ status: "COMPLETED", tradeCount: 1 });
    await expect(new BacktestAttemptController(modules).trades(`Bearer ${token}`, attempt.attemptId, "10")).resolves.toMatchObject({ items: [expect.objectContaining({ exitReason: "RANGE_END" })] });
    await expect(new ExperimentController(modules).trades(`Bearer ${token}`, experiment.id, "10")).resolves.toMatchObject({ items: [expect.objectContaining({ result: "WIN" })] });

    const searchStarted = await new SearchController(modules).start(`Bearer ${token}`, { leaderboardScopeId: scope.id, strategyDefinitionIds: [definition.id], maxCandidates: 2, maxInFlight: 1 });
    await expect(new SearchController(modules).status(`Bearer ${token}`, searchStarted.searchRunId)).resolves.toMatchObject({ state: "COMPLETED", candidatesTested: 2 });
    await expect(new SearchController(modules).leaderboard(`Bearer ${token}`, searchStarted.searchRunId)).resolves.toHaveLength(2);
    await expect(new LeaderboardController(modules).topK(`Bearer ${token}`, scope.id)).resolves.toHaveLength(2);
  });

  it("maps authenticated bounded Search lifecycle and scoped Top-K routes to public facades", async () => {
    const calls: string[] = [];
    const modules = {
      auth: { verify: async () => ({ userId: "user-1" }) },
      backtesting: { readBenchmarkScope: async () => ({ id: "scope-1" }) },
      strategy: { readDefinitions: async (_owner: string, ids: string[]) => ids.map((id) => ({ id })) },
      search: {
        start: async (config: { generatorType: string; searchSpace: { availableStrategies: unknown[] } }) => { calls.push(`start:${config.generatorType}:${config.searchSpace.availableStrategies.length}`); return { searchRunId: "run-1" }; },
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
    expect(calls).toEqual(["start:RANDOM:1", "pause", "resume", "cancel"]);
  });
});
