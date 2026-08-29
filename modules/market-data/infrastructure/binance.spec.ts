import { describe, expect, it, vi } from "vitest";
import { createBinanceHistoricalProvider } from "./binance";

const request = {
  pair: "BTCUSDT",
  timeframe: "5m" as const,
  range: { from: "2026-01-01T00:00:00.000Z", to: "2026-01-01T00:15:00.000Z" },
  limit: 2,
};

function kline(minute: number, close: string): unknown[] {
  const open = Date.parse(`2026-01-01T00:${String(minute).padStart(2, "0")}:00.000Z`);
  return [open, close, close, close, close, "2", open + 299_999, "0", 1, "1", "1", "0"];
}

function response(payload: unknown, status = 200): { ok: boolean; status: number; json: () => Promise<unknown> } {
  return { ok: status >= 200 && status < 300, status, json: async () => payload };
}

describe("Binance historical provider", () => {
  it("maps bounded half-open REST pages into canonical candles and opaque cursors", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(response([kline(0, "100"), kline(5, "101")]))
      .mockResolvedValueOnce(response([kline(10, "102")]));
    const provider = createBinanceHistoricalProvider({ baseUrl: "https://example.test", pageSize: 2, fetch: fetcher });

    const first = await provider.readCandles(request);
    expect(first.candles).toMatchObject([
      { pair: "BTCUSDT", timeframe: "5m", timestamp: "2026-01-01T00:00:00.000Z", close: 100, isClosed: true },
      { pair: "BTCUSDT", timeframe: "5m", timestamp: "2026-01-01T00:05:00.000Z", close: 101, isClosed: true },
    ]);
    expect(first.nextCursor).toEqual(expect.any(String));
    const firstUrl = new URL(fetcher.mock.calls[0]![0] as string);
    expect(firstUrl.searchParams.get("endTime")).toBe(String(Date.parse(request.range.to) - 1));
    expect(firstUrl.searchParams.get("limit")).toBe("2");

    const second = await provider.readCandles({ ...request, cursor: first.nextCursor });
    expect(second.candles[0]).toMatchObject({ timestamp: "2026-01-01T00:10:00.000Z", close: 102 });
    expect(second.nextCursor).toBeUndefined();
    expect(new URL(fetcher.mock.calls[1]![0] as string).searchParams.get("startTime")).toBe(
      String(Date.parse("2026-01-01T00:05:00.000Z") + 1),
    );
  });

  it("rejects malformed payloads and provider HTTP failures without exposing raw response data", async () => {
    const malformed = createBinanceHistoricalProvider({ fetch: async () => response([["not-a-time"]]) });
    await expect(malformed.readCandles(request)).rejects.toThrow("malformed kline");

    const failed = createBinanceHistoricalProvider({ fetch: async () => response({ secret: "not-for-consumers" }, 429) });
    await expect(failed.readCandles(request)).rejects.not.toThrow("not-for-consumers");
  });

  it("keeps realtime outside the historical provider packet", async () => {
    const provider = createBinanceHistoricalProvider({ fetch: async () => response([]) });
    await expect(provider.subscribe([], () => undefined)).rejects.toThrow("outside the M-01 historical provider");
    await provider.shutdown();
    await expect(provider.readCandles(request)).rejects.toThrow("shut down");
  });
});

