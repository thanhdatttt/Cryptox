import { describe, expect, it } from "vitest";
import {
  BacktestSimulationError,
  type Candle,
  type Signal,
  simulateBacktest,
  type SimulationInput,
  type Strategy,
  type StrategyVisualizationPoint,
} from "./simulator";

const timestamps = [
  "2026-01-01T00:00:00.000Z",
  "2026-01-01T01:00:00.000Z",
  "2026-01-01T02:00:00.000Z",
  "2026-01-01T03:00:00.000Z",
];

const candle = (index: number, open: number, close = open): Candle => ({
  pair: "BTCUSDT",
  timeframe: "1h",
  timestamp: timestamps[index]!,
  open,
  high: Math.max(open, close) + 1,
  low: Math.min(open, close) - 1,
  close,
  volume: 10,
  isClosed: true,
});

const fakeStrategy = (
  signals: readonly Signal[],
  overlays: readonly StrategyVisualizationPoint[] = [],
): Strategy => ({
  name: "FAKE",
  category: "TREND",
  analyze: (context) => {
    const current = context.candles[context.candles.length - 1]!;
    return {
      signal: signals[context.candles.length - 1] ?? "HOLD",
      signalAt: current.timestamp,
      visualization: overlays.filter((point) => point.timestamp === current.timestamp),
    };
  },
});

const baseInput = (strategy: Strategy): SimulationInput => ({
  candidateId: "candidate-1",
  pair: "BTCUSDT",
  timeframe: "1h",
  candles: [
    candle(0, 100, 101),
    candle(1, 110, 111),
    candle(2, 120, 121),
    candle(3, 130, 129),
  ],
  strategy,
  strategySelection: { kind: "STRATEGY", strategyDefinitionId: "strategy-1" },
  startedAt: timestamps[0],
  completedAt: timestamps[3],
});

describe("deterministic historical simulator (CSL-R-BT-01 / CSL-R-VIS-01)", () => {
  it("executes a candle-t signal at the next open and never uses the final signal", () => {
    const result = simulateBacktest(
      baseInput(fakeStrategy(["BUY", "HOLD", "SELL", "BUY"])),
    );

    expect(result.trades).toHaveLength(1);
    expect(result.trades[0]).toMatchObject({
      entrySignalAt: timestamps[0],
      entryTime: timestamps[1],
      entryPrice: 110,
      exitSignalAt: timestamps[2],
      exitTime: timestamps[3],
      exitPrice: 130,
      exitReason: "STRATEGY_EXIT",
    });
    expect(result.visualization.signals.map(({ signal }) => signal)).toEqual([
      "BUY",
      "HOLD",
      "SELL",
      "BUY",
    ]);
    expect(result.visualization.signals[3]?.executionNotBefore).toBe(
      "2026-01-01T04:00:00.000Z",
    );
  });

  it("ignores repeated BUY signals while the single long position is open", () => {
    const result = simulateBacktest(
      baseInput(fakeStrategy(["BUY", "BUY", "BUY", "BUY"])),
    );

    expect(result.trades).toHaveLength(1);
    expect(result.trades[0]?.entryTime).toBe(timestamps[1]);
    expect(result.trades[0]?.exitReason).toBe("RANGE_END");
    expect(result.visualization.tradeMarkers.map(({ kind }) => kind)).toEqual([
      "ENTRY",
      "EXIT",
    ]);
  });

  it("applies entry/exit fees and configured slippage using the approved accounting", () => {
    const input: SimulationInput = {
      ...baseInput(fakeStrategy(["BUY", "HOLD", "HOLD"])),
      candles: [candle(0, 100), candle(1, 100), candle(2, 110)],
      initialCapital: 1_000,
      feeRatePercent: 1,
      slippageBps: 100,
    };
    const result = simulateBacktest(input);
    const buyPrice = 100 * 1.01;
    const quantity = 1_000 / (buyPrice * 1.01);
    const entryNotional = quantity * buyPrice;
    const exitPrice = 110 * 0.99;
    const exitNotional = quantity * exitPrice;
    const entryFee = entryNotional * 0.01;
    const exitFee = exitNotional * 0.01;
    const profit = exitNotional - exitFee - entryNotional - entryFee;

    expect(result.trades[0]).toMatchObject({
      entryPrice: buyPrice,
      exitPrice,
      quantity,
      notionalEntryValue: entryNotional,
      grossProfit: exitNotional - entryNotional,
      feeAmount: entryFee + exitFee,
      slippageBps: 100,
      profit,
      resultPercent: (profit / (entryNotional + entryFee)) * 100,
    });
    expect(result.endingCapital).toBe(1_000 + profit);
  });

  it("returns an unchanged equity curve and no trades when every signal is HOLD", () => {
    const result = simulateBacktest(
      baseInput(fakeStrategy(["HOLD", "HOLD", "HOLD", "HOLD"])),
    );

    expect(result.trades).toEqual([]);
    expect(result.endingCapital).toBe(10_000);
    expect(result.equityCurve).toEqual(
      timestamps.map((timestamp) => ({ timestamp, value: 10_000 })),
    );
  });

  it("forces a range-end close independently of the final candle signal", () => {
    const result = simulateBacktest(
      baseInput(fakeStrategy(["BUY", "HOLD", "HOLD", "SELL"])),
    );

    expect(result.trades[0]).toMatchObject({
      entryTime: timestamps[1],
      exitTime: timestamps[3],
      exitPrice: 129,
      exitReason: "RANGE_END",
    });
    expect(result.trades[0]).not.toHaveProperty("exitSignalAt");
  });

  it("emits generic overlay traces without mutating the strategy output", () => {
    const overlay: StrategyVisualizationPoint = {
      descriptorId: "moving-average",
      timestamp: timestamps[0]!,
      values: { slow: 99, fast: 100 },
    };
    const result = simulateBacktest(
      baseInput(fakeStrategy(["HOLD", "HOLD", "HOLD", "HOLD"], [overlay])),
    );

    expect(result.visualization.overlays).toEqual([
      { strategyDefinitionId: "strategy-1", point: overlay },
    ]);
    expect(overlay.values).toEqual({ slow: 99, fast: 100 });
  });

  it("produces byte-equivalent result data on deterministic reruns", () => {
    const input = baseInput(fakeStrategy(["BUY", "HOLD", "SELL", "HOLD"]));
    const first = simulateBacktest(input);
    const second = simulateBacktest(input);

    expect(second).toEqual(first);
  });

  it("contains a fake strategy failure as a typed simulation error", () => {
    const input = baseInput({
      name: "FAILING_FAKE",
      category: "TREND",
      analyze: () => {
        throw new Error("fixture strategy exploded");
      },
    });

    try {
      simulateBacktest(input);
      expect.fail("simulation should throw");
    } catch (error) {
      expect(error).toBeInstanceOf(BacktestSimulationError);
      expect(error).toMatchObject({ code: "STRATEGY_FAILED" });
      expect((error as Error).message).toContain("fixture strategy exploded");
    }
  });

  it("rejects forming or out-of-order input before strategy execution", () => {
    const strategy = fakeStrategy(["HOLD"]);
    const input = baseInput(strategy);
    const formingCandles = input.candles.map((item) => ({ ...item }));
    formingCandles[1] = { ...formingCandles[1]!, isClosed: false };

    expect(() => simulateBacktest({ ...input, candles: formingCandles })).toThrow(
      "historical simulation requires closed candles",
    );
    const orderedCandles = input.candles.map((item) => ({ ...item }));
    expect(() =>
      simulateBacktest({
        ...input,
        candles: [orderedCandles[0]!, orderedCandles[2]!, orderedCandles[1]!, orderedCandles[3]!],
      }),
    ).toThrow("strictly ordered");
  });
});
