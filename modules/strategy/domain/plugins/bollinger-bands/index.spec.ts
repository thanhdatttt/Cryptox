import { describe, expect, it } from "vitest";
import {
  BOLLINGER_BANDS_DESCRIPTOR,
  BOLLINGER_BANDS_FACTORY,
  bollingerBandsFactory,
  createBollingerBandsStrategy,
} from ".";

function candle(index: number, close: number) {
  return {
    timestamp: `2026-08-28T00:${String(index).padStart(2, "0")}:00.000Z`,
    open: close,
    high: close,
    low: close,
    close,
    volume: 1,
    isClosed: true as const,
  };
}

function context(closes: readonly number[]) {
  return {
    pair: "BTCUSDT",
    timeframe: "1h",
    candles: closes.map((close, index) => candle(index, close)),
  };
}

function contextWithTimestamps(timestamps: readonly string[]) {
  return {
    pair: "BTCUSDT",
    timeframe: "1h",
    candles: timestamps.map((timestamp, index) => ({
      ...candle(index, index + 1),
      timestamp,
    })),
  };
}

describe("Bollinger Bands plugin", () => {
  it("exposes the approved descriptor, factory, and price-band overlay", () => {
    expect(BOLLINGER_BANDS_FACTORY).toBe(bollingerBandsFactory);
    expect(BOLLINGER_BANDS_DESCRIPTOR).toMatchObject({
      name: "BOLLINGER_BANDS",
      category: "VOLATILITY",
      implementationVersion: "1.0.0",
      behaviorProfileId: "TECHNICAL_PROFILES_V1",
      parameters: [
        { key: "period", defaultValue: 20, required: false },
        { key: "deviationMultiplier", defaultValue: 2, required: false },
      ],
      visualization: [
        {
          id: "bollinger-band",
          kind: "BAND",
          pane: "PRICE",
          series: [
            { key: "lower", label: "Lower" },
            { key: "middle", label: "Middle" },
            { key: "upper", label: "Upper" },
          ],
        },
      ],
    });
  });

  it("uses population standard deviation and includes the latest close", () => {
    const strategy = createBollingerBandsStrategy({ period: 4, deviationMultiplier: 1 });
    const result = strategy.analyze(context([1, 2, 3, 4]));
    const expectedDeviation = Math.sqrt(1.25);

    expect(result.signal).toBe("SELL");
    expect(result.signalAt).toBe("2026-08-28T00:03:00.000Z");
    expect(result.visualization).toEqual([
      {
        descriptorId: "bollinger-band",
        timestamp: "2026-08-28T00:03:00.000Z",
        values: {
          lower: 2.5 - expectedDeviation,
          middle: 2.5,
          upper: 2.5 + expectedDeviation,
        },
      },
    ]);
  });

  it("returns HOLD for zero variance and band equality", () => {
    expect(createBollingerBandsStrategy({ period: 3, deviationMultiplier: 2 })
      .analyze(context([7, 7, 7])).signal).toBe("HOLD");

    const equality = createBollingerBandsStrategy({ period: 2, deviationMultiplier: 1 })
      .analyze(context([0, 2]));
    expect(equality.visualization[0]?.values.upper).toBe(2);
    expect(equality.signal).toBe("HOLD");
  });

  it("returns HOLD during warm-up and does not mutate or depend on input mutation", () => {
    const input = context([1, 2, 3]);
    const before = structuredClone(input);
    const strategy = createBollingerBandsStrategy({ period: 4, deviationMultiplier: 2 });

    const first = strategy.analyze(input);
    const second = strategy.analyze(input);

    expect(first).toEqual(second);
    expect(first.signal).toBe("HOLD");
    expect(first.visualization).toEqual([]);
    expect(input).toEqual(before);
  });

  it.each([
    ["invalid", ["2026-08-28T00:00:00.000Z", "not-a-timestamp"]],
    ["duplicate", ["2026-08-28T00:00:00.000Z", "2026-08-28T00:00:00.000Z"]],
    ["decreasing", ["2026-08-28T00:01:00.000Z", "2026-08-28T00:00:00.000Z"]],
  ] as const)("rejects %s candle timestamps", (_case, timestamps) => {
    const strategy = createBollingerBandsStrategy({ period: 2, deviationMultiplier: 2 });

    expect(() => strategy.analyze(contextWithTimestamps(timestamps))).toThrow(
      "INVALID_STRATEGY_CONTEXT",
    );
  });

  it("deep-freezes the descriptor metadata graph", () => {
    const parameter = BOLLINGER_BANDS_DESCRIPTOR.parameters[0]!;
    const visualization = BOLLINGER_BANDS_DESCRIPTOR.visualization[0]!;
    const series = visualization.series[0]!;

    expect(Object.isFrozen(BOLLINGER_BANDS_DESCRIPTOR)).toBe(true);
    expect(Object.isFrozen(BOLLINGER_BANDS_DESCRIPTOR.parameters)).toBe(true);
    expect(Object.isFrozen(parameter)).toBe(true);
    expect(Object.isFrozen(BOLLINGER_BANDS_DESCRIPTOR.visualization)).toBe(true);
    expect(Object.isFrozen(visualization)).toBe(true);
    expect(Object.isFrozen(visualization.series)).toBe(true);
    expect(Object.isFrozen(series)).toBe(true);
  });

  it.each([
    [{ period: 0 }, "period"],
    [{ period: 1.5 }, "period"],
    [{ period: Number.NaN }, "period"],
    [{ deviationMultiplier: 0 }, "deviationMultiplier"],
    [{ deviationMultiplier: -1 }, "deviationMultiplier"],
    [{ deviationMultiplier: Number.POSITIVE_INFINITY }, "deviationMultiplier"],
    [{ unknown: 1 }, "unknown"],
  ])("rejects invalid parameter input (%s)", (parameters) => {
    expect(() => createBollingerBandsStrategy(parameters)).toThrow("INVALID_STRATEGY_PARAMETERS");
  });
});
