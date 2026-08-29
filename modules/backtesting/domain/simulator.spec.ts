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

const paperConfiguration = (
  positionMode: "LONG" | "SYNTHETIC_SHORT",
  overrides: Partial<{ stopLoss: string; takeProfit: string; initialCapital: number }> = {},
) => ({
  executionProfileId: "BACKTEST_EXECUTION_V1" as const,
  initialCapital: overrides.initialCapital ?? 1_000,
  feeRatePercent: 0,
  slippageBps: 0,
  paperExecution: {
    executionProfileId: "SYNTHETIC_SHORT_PAPER_V1" as const,
    positionMode,
    exitPolicyId: "STOP_LOSS_WINS_V1" as const,
    feeRatePercent: 0.08 as const,
    adverseSlippageBps: 5 as const,
    decimalScale: 8 as const,
    roundingMode: "HALF_UP" as const,
    ...(overrides.stopLoss === undefined ? {} : { stopLoss: overrides.stopLoss }),
    ...(overrides.takeProfit === undefined ? {} : { takeProfit: overrides.takeProfit }),
  },
});

const paperInput = (
  strategy: Strategy,
  positionMode: "LONG" | "SYNTHETIC_SHORT",
  overrides: Partial<{ stopLoss: string; takeProfit: string; initialCapital: number }> = {},
  candles = baseInput(strategy).candles,
): SimulationInput => ({
  ...baseInput(strategy),
  candles,
  configuration: paperConfiguration(positionMode, overrides),
});

const ohlcCandle = (
  index: number,
  open: number,
  high: number,
  low: number,
  close: number,
): Candle => ({
  pair: "BTCUSDT",
  timeframe: "1h",
  timestamp: timestamps[index]!,
  open,
  high,
  low,
  close,
  volume: 10,
  isClosed: true,
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

describe("SYNTHETIC_SHORT_PAPER_V1 fixed-point simulation (CSL-R-BT-02 / CSL-R-RP-02)", () => {
  it("simulates explicit Long and synthetic Short directions from candle opens", () => {
    const long = simulateBacktest(paperInput(fakeStrategy(["BUY", "HOLD", "HOLD", "HOLD"]), "LONG"));
    const short = simulateBacktest(paperInput(fakeStrategy(["SELL", "HOLD", "HOLD", "HOLD"]), "SYNTHETIC_SHORT"));

    expect(long.trades[0]).toMatchObject({
      positionMode: "LONG",
      entryTime: timestamps[1],
      entryPrice: 110.055,
      exitReason: "RANGE_END",
      exitPrice: 128.9355,
    });
    expect(short.trades[0]).toMatchObject({
      positionMode: "SYNTHETIC_SHORT",
      entryTime: timestamps[1],
      entryPrice: 109.945,
      exitReason: "RANGE_END",
      exitPrice: 129.0645,
    });
    expect(long.trades[0]).not.toHaveProperty("orderId");
    expect(short.trades[0]).not.toHaveProperty("leverage");
    expect(short.trades[0]).not.toHaveProperty("margin");
  });

  it("uses eight-place HALF_UP arithmetic for fee, slippage, and P&L golden values", () => {
    const candles = [
      ohlcCandle(0, 100, 100, 100, 100),
      ohlcCandle(1, 100, 100, 100, 100),
      ohlcCandle(2, 103, 103, 103, 103),
    ];
    const result = simulateBacktest(
      paperInput(fakeStrategy(["BUY", "HOLD", "HOLD"]), "LONG", { initialCapital: 1_000 }, candles),
    );
    expect(result.trades[0]).toMatchObject({
      entryPrice: 100.05,
      exitPrice: 102.9485,
      quantity: 9.98701288,
      notionalEntryValue: 999.20063864,
      grossProfit: 28.94735684,
      feeAmount: 1.62187891,
      profit: 27.32547793,
      resultPercent: 2.7325478,
      slippageBps: 5,
    });
    expect(result.endingCapital).toBe(1027.32547793);
    expect(result.trades[0]!.profit.toFixed(8)).toBe("27.32547793");
    expect(result.trades[0]!.feeAmount.toFixed(8)).toBe("1.62187891");
  });

  it("resolves a Long and Short dual-trigger candle once with STOP_LOSS_WINS_V1", () => {
    const candles = [
      ohlcCandle(0, 100, 100, 100, 100),
      ohlcCandle(1, 100, 105, 95, 100),
      ohlcCandle(2, 100, 100, 100, 100),
    ];
    const long = simulateBacktest(
      paperInput(fakeStrategy(["BUY", "HOLD", "HOLD"]), "LONG", { stopLoss: "95", takeProfit: "105" }, candles),
    );
    const short = simulateBacktest(
      paperInput(fakeStrategy(["SELL", "HOLD", "HOLD"]), "SYNTHETIC_SHORT", { stopLoss: "105", takeProfit: "95" }, candles),
    );

    expect(long.trades).toHaveLength(1);
    expect(long.trades[0]).toMatchObject({ exitReason: "STOP_LOSS", exitTime: timestamps[1], exitPrice: 94.9525 });
    expect(short.trades).toHaveLength(1);
    expect(short.trades[0]).toMatchObject({ exitReason: "STOP_LOSS", exitTime: timestamps[1], exitPrice: 105.0525 });
    expect(long.visualization.tradeMarkers).toHaveLength(2);
    expect(short.visualization.tradeMarkers).toHaveLength(2);
  });

  it("keeps next-open timing, excludes the final signal, and closes deterministically at range end", () => {
    const result = simulateBacktest(
      paperInput(fakeStrategy(["BUY", "HOLD", "HOLD", "BUY"]), "LONG"),
    );

    expect(result.trades).toHaveLength(1);
    expect(result.trades[0]).toMatchObject({ entrySignalAt: timestamps[0], entryTime: timestamps[1], exitReason: "RANGE_END" });
    expect(result.visualization.signals.at(-1)?.signal).toBe("BUY");
    expect(result.visualization.signals.at(-1)?.executionNotBefore).toBe("2026-01-01T04:00:00.000Z");
    expect(result.visualization.tradeMarkers.map(({ kind }) => kind)).toEqual(["ENTRY", "EXIT"]);
  });

  it("produces byte-equivalent deterministic reruns for paper results", () => {
    const input = paperInput(fakeStrategy(["SELL", "HOLD", "BUY", "HOLD"]), "SYNTHETIC_SHORT");
    expect(simulateBacktest(input)).toEqual(simulateBacktest(input));
  });

  it("rejects malformed paper settings before any directional simulation", () => {
    expect(() => simulateBacktest({
      ...paperInput(fakeStrategy(["HOLD", "HOLD", "HOLD"]), "LONG"),
      configuration: {
        ...paperConfiguration("LONG"),
        paperExecution: { ...paperConfiguration("LONG").paperExecution, feeRatePercent: 0.1 },
      },
    })).toThrow("paper execution fee and slippage");
  });
});
