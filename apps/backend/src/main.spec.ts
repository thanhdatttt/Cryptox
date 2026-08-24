import { describe, expect, it } from "vitest";
import { BadRequestException, ConflictException, UnauthorizedException } from "@nestjs/common";
import { createAuthModule, createInMemoryAuthDependencies } from "modules/auth/api";
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
});
