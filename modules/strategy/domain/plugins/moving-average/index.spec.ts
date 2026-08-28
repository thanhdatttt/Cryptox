import { describe, expect, it } from "vitest";
import { maFactory, movingAverageDescriptor, movingAverageFactory } from "./index";

type Candle = {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isClosed: true;
};

function candles(closes: readonly number[]): Candle[] {
  return closes.map((close, index) => ({
    timestamp: `2026-01-01T00:${String(index).padStart(2, "0")}:00.000Z`,
    open: close,
    high: close,
    low: close,
    close,
    volume: 1,
    isClosed: true,
  }));
}

function analyze(closes: readonly number[], parameters: Readonly<Record<string, number | string>> = {}) {
  return movingAverageFactory.create(parameters).analyze({
    pair: "BTCUSDT",
    timeframe: "1h",
    candles: candles(closes),
  });
}

describe("MA TECHNICAL_PROFILES_V1 plugin", () => {
  it("exposes the approved descriptor and factory seam", () => {
    expect(movingAverageDescriptor).toMatchObject({
      name: "MA",
      displayName: "Moving Average",
      category: "TREND",
      implementationVersion: "1.0.0",
      behaviorProfileId: "TECHNICAL_PROFILES_V1",
      parameters: [
        expect.objectContaining({ key: "fastPeriod", defaultValue: 20, minimum: 1 }),
        expect.objectContaining({ key: "slowPeriod", defaultValue: 50, minimum: 1 }),
      ],
      visualization: [
        {
          id: "ma-lines",
          label: "Moving averages",
          kind: "LINE",
          pane: "PRICE",
          series: [
            { key: "fast", label: "Fast SMA" },
            { key: "slow", label: "Slow SMA" },
          ],
        },
      ],
    });
    expect(maFactory).toBe(movingAverageFactory);
    expect(movingAverageFactory.create({}).name).toBe("MA");
  });

  it("deep-freezes descriptor metadata", () => {
    expect(Object.isFrozen(movingAverageDescriptor)).toBe(true);
    expect(Object.isFrozen(movingAverageDescriptor.parameters)).toBe(true);
    for (const parameter of movingAverageDescriptor.parameters) {
      expect(Object.isFrozen(parameter)).toBe(true);
    }
    expect(Object.isFrozen(movingAverageDescriptor.visualization)).toBe(true);
    for (const visualization of movingAverageDescriptor.visualization) {
      expect(Object.isFrozen(visualization)).toBe(true);
      expect(Object.isFrozen(visualization.series)).toBe(true);
      for (const series of visualization.series) expect(Object.isFrozen(series)).toBe(true);
    }

    expect(() => {
      const parameter = movingAverageDescriptor.parameters[0] as unknown as { defaultValue: number };
      parameter.defaultValue = 99;
    }).toThrow(TypeError);
  });

  it("signals BUY and SELL only when the fast SMA crosses the slow SMA", () => {
    expect(analyze([10, 10, 10, 10, 12], { fastPeriod: 2, slowPeriod: 3 }).signal).toBe("BUY");
    expect(analyze([10, 10, 10, 10, 8], { fastPeriod: 2, slowPeriod: 3 }).signal).toBe("SELL");
  });

  it("holds on equality and during warm-up", () => {
    const equal = analyze([10, 10, 10, 10, 10], { fastPeriod: 2, slowPeriod: 3 });
    expect(equal.signal).toBe("HOLD");
    expect(equal.visualization.at(-1)).toEqual({
      descriptorId: "ma-lines",
      timestamp: "2026-01-01T00:04:00.000Z",
      values: { fast: 10, slow: 10 },
    });

    const warmup = analyze([10, 11, 12], { fastPeriod: 2, slowPeriod: 3 });
    expect(warmup.signal).toBe("HOLD");
    expect(warmup.visualization).toHaveLength(1);
    expect(analyze([10, 11], { fastPeriod: 2, slowPeriod: 3 }).visualization).toEqual([]);
  });

  it("rejects invalid parameters before execution", () => {
    for (const parameters of [
      { fastPeriod: 0, slowPeriod: 3 },
      { fastPeriod: 2.5, slowPeriod: 3 },
      { fastPeriod: 3, slowPeriod: 3 },
      { fastPeriod: 4, slowPeriod: 3 },
      { fastPeriod: Number.NaN, slowPeriod: 3 },
      { fastPeriod: 2, slowPeriod: 3, extra: 1 },
    ]) {
      expect(() => movingAverageFactory.create(parameters)).toThrow("INVALID_STRATEGY_PARAMETERS");
    }
  });

  it("is deterministic, pure, and uses only the supplied closed candles", () => {
    const input = candles([10, 10, 10, 10, 12]);
    const before = structuredClone(input);
    const strategy = movingAverageFactory.create({ fastPeriod: 2, slowPeriod: 3 });
    const context = { pair: "BTCUSDT", timeframe: "1h", candles: input };
    expect(strategy.analyze(context)).toEqual(strategy.analyze(context));
    expect(input).toEqual(before);
  });

  it("rejects duplicate and decreasing candle timestamps", () => {
    const strategy = movingAverageFactory.create({ fastPeriod: 2, slowPeriod: 3 });
    const duplicate = candles([10, 11, 12]);
    duplicate[1]!.timestamp = duplicate[0]!.timestamp;
    expect(() => strategy.analyze({ pair: "BTCUSDT", timeframe: "1h", candles: duplicate })).toThrow(
      "INVALID_STRATEGY_CONTEXT",
    );

    const decreasing = candles([10, 11, 12]);
    decreasing[1]!.timestamp = "2025-12-31T23:59:00.000Z";
    expect(() => strategy.analyze({ pair: "BTCUSDT", timeframe: "1h", candles: decreasing })).toThrow(
      "INVALID_STRATEGY_CONTEXT",
    );

    const invalidCalendarDate = candles([10, 11, 12]);
    invalidCalendarDate[1]!.timestamp = "2026-02-30T01:00:00.000Z";
    expect(() => strategy.analyze({ pair: "BTCUSDT", timeframe: "1h", candles: invalidCalendarDate })).toThrow(
      "INVALID_STRATEGY_CONTEXT",
    );
  });
});
