import { describe, expect, it } from "vitest";
import { RSI_FACTORY, rsiDescriptor, rsiFactory } from "./index";

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
  return rsiFactory.create(parameters).analyze({
    pair: "BTCUSDT",
    timeframe: "1h",
    candles: candles(closes),
  });
}

describe("RSI TECHNICAL_PROFILES_V1 plugin", () => {
  it("exposes the approved descriptor and factory seam", () => {
    expect(rsiDescriptor).toMatchObject({
      name: "RSI",
      displayName: "RSI",
      category: "MOMENTUM",
      implementationVersion: "1.0.0",
      behaviorProfileId: "TECHNICAL_PROFILES_V1",
      parameters: [
        expect.objectContaining({ key: "period", defaultValue: 14, minimum: 1 }),
        expect.objectContaining({ key: "buyThreshold", defaultValue: 30, minimum: 0, maximum: 100 }),
        expect.objectContaining({ key: "sellThreshold", defaultValue: 70, minimum: 0, maximum: 100 }),
      ],
      visualization: [
        {
          id: "rsi",
          label: "RSI",
          kind: "LINE",
          pane: "INDICATOR",
          series: [{ key: "value", label: "RSI" }],
        },
      ],
    });
    expect(RSI_FACTORY).toBe(rsiFactory);
    expect(rsiFactory.create({}).name).toBe("RSI");
  });

  it("deep-freezes descriptor metadata", () => {
    expect(Object.isFrozen(rsiDescriptor)).toBe(true);
    expect(Object.isFrozen(rsiDescriptor.parameters)).toBe(true);
    for (const parameter of rsiDescriptor.parameters) {
      expect(Object.isFrozen(parameter)).toBe(true);
    }
    expect(Object.isFrozen(rsiDescriptor.visualization)).toBe(true);
    for (const visualization of rsiDescriptor.visualization) {
      expect(Object.isFrozen(visualization)).toBe(true);
      expect(Object.isFrozen(visualization.series)).toBe(true);
      for (const series of visualization.series) expect(Object.isFrozen(series)).toBe(true);
    }

    expect(() => {
      const parameter = rsiDescriptor.parameters[0] as unknown as { defaultValue: number };
      parameter.defaultValue = 99;
    }).toThrow(TypeError);
  });

  it("calculates Wilder RSI, uses strict thresholds, and emits deterministic overlays", () => {
    const result = analyze([44, 45, 46, 45, 44, 45, 46, 47], {
      period: 5,
      buyThreshold: 30,
      sellThreshold: 70,
    });
    expect(result.signal).toBe("SELL");
    expect(result.signalAt).toBe("2026-01-01T00:07:00.000Z");
    expect(result.visualization).toHaveLength(3);
    expect(result.visualization[0]).toMatchObject({
      descriptorId: "rsi",
      timestamp: "2026-01-01T00:05:00.000Z",
      values: { value: 60 },
    });
    expect(result.visualization[1]?.values.value).toBeCloseTo(68, 10);
    expect(result.visualization[2]?.values.value).toBeCloseTo(74.4, 10);

    const equality = analyze([1, 2, 1, 0], { period: 2, buyThreshold: 25, sellThreshold: 75 });
    expect(equality.signal).toBe("HOLD");
    expect(analyze([1, 2, 1, 0], { period: 2, buyThreshold: 30, sellThreshold: 100 }).signal).toBe("BUY");
  });

  it("handles flat, no-loss, and no-gain series according to the profile", () => {
    expect(analyze([10, 10, 10], { period: 2 }).visualization.at(-1)?.values.value).toBe(50);
    expect(analyze([1, 2, 3], { period: 2 }).signal).toBe("SELL");
    expect(analyze([3, 2, 1], { period: 2 }).signal).toBe("BUY");
  });

  it("holds during RSI warm-up", () => {
    const result = analyze([10, 11], { period: 2 });
    expect(result.signal).toBe("HOLD");
    expect(result.visualization).toEqual([]);
  });

  it("rejects invalid parameters before execution", () => {
    for (const parameters of [
      { period: 0 },
      { period: 1.5 },
      { period: Number.POSITIVE_INFINITY },
      { buyThreshold: -1 },
      { sellThreshold: 101 },
      { buyThreshold: 70, sellThreshold: 30 },
      { period: 2, unknown: 1 },
    ]) {
      expect(() => rsiFactory.create(parameters)).toThrow("INVALID_STRATEGY_PARAMETERS");
    }
  });

  it("is deterministic and does not mutate candle input", () => {
    const input = candles([10, 10, 11, 10, 12]);
    const before = structuredClone(input);
    const strategy = rsiFactory.create({ period: 2 });
    const context = { pair: "BTCUSDT", timeframe: "1h", candles: input };
    expect(strategy.analyze(context)).toEqual(strategy.analyze(context));
    expect(input).toEqual(before);
  });

  it("rejects duplicate and decreasing candle timestamps", () => {
    const strategy = rsiFactory.create({ period: 2 });
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
