import { describe, expect, it } from "vitest";
import { BadRequestException, ConflictException, UnauthorizedException } from "@nestjs/common";
import { createAuthModule, createInMemoryAuthDependencies } from "modules/auth/api";
import { createInMemoryStrategyDependencies, createStrategyModule } from "modules/strategy/api/bootstrap";
import { AuthController, MarketController, NewsController, StrategyController } from "./app.module";
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
});
