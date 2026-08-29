import { describe, expect, it } from "vitest";
import {
  CANDIDATE_STATUSES,
  BACKTEST_EXECUTION_V1,
  SYNTHETIC_SHORT_PAPER_V1,
  type Experiment,
  type Trade,
} from "./contracts";
import type { AuthenticatedUserId } from "modules/auth/api";

describe("backtesting public contracts", () => {
  it("freezes the approved configurable simulator profile and mechanism-neutral states", () => {
    expect(CANDIDATE_STATUSES).toEqual([
      "ACCEPTED",
      "RUNNING",
      "SUCCEEDED",
      "FAILED",
      "CANCELLED",
    ]);
    expect(BACKTEST_EXECUTION_V1).toEqual({
      id: "BACKTEST_EXECUTION_V1",
      positionPolicy: {
        side: "LONG_ONLY",
        maximumOpenPositions: 1,
        allocation: "ALL_AVAILABLE_CASH_INCLUDING_ENTRY_FEE",
        partialPositions: "PROHIBITED",
        pyramiding: "PROHIBITED",
        leverage: "PROHIBITED",
      },
      signalExecution: {
        timing: "COMPLETED_CANDLE_SIGNAL_EXECUTES_AT_NEXT_CANDLE_OPEN",
        finalCandleSignal: "NOT_EXECUTABLE",
        buyWhileFlat: "OPEN_LONG",
        buyWhileLong: "IGNORE",
        sellWhileLong: "CLOSE_LONG",
        sellWhileFlat: "IGNORE",
        hold: "NO_EXECUTION",
      },
      feePolicy: {
        configuredUnit: "PERCENT_PER_EXECUTION_SIDE",
        rate: "FEE_RATE_PERCENT_DIVIDED_BY_100",
        entryFee: "ENTRY_NOTIONAL_TIMES_FEE_RATE",
        exitFee: "EXIT_NOTIONAL_TIMES_FEE_RATE",
        tradeFeeAmount: "ENTRY_FEE_PLUS_EXIT_FEE",
      },
      slippagePolicy: {
        configuredUnit: "BASIS_POINTS",
        rate: "SLIPPAGE_BPS_DIVIDED_BY_10000",
        buyPrice: "NEXT_OPEN_TIMES_ONE_PLUS_SLIPPAGE_RATE",
        sellPrice: "NEXT_OPEN_TIMES_ONE_MINUS_SLIPPAGE_RATE",
        rangeEndSellPrice: "FINAL_CANDLE_CLOSE_TIMES_ONE_MINUS_SLIPPAGE_RATE",
      },
      entryAccounting: {
        quantity: "AVAILABLE_CASH_DIVIDED_BY_(BUY_PRICE_TIMES_(ONE_PLUS_FEE_RATE))",
        entryNotional: "QUANTITY_TIMES_BUY_PRICE",
        exchangeRounding: "NONE",
      },
      exitAccounting: {
        exitNotional: "QUANTITY_TIMES_SELL_PRICE",
        cashReceived: "EXIT_NOTIONAL_MINUS_EXIT_FEE",
        grossProfit: "EXIT_NOTIONAL_MINUS_ENTRY_NOTIONAL",
        profit: "CASH_RECEIVED_MINUS_ENTRY_NOTIONAL_MINUS_ENTRY_FEE",
        resultPercent: "PROFIT_DIVIDED_BY_(ENTRY_NOTIONAL_PLUS_ENTRY_FEE)_TIMES_100",
      },
      rangeEndPolicy: {
        openPosition: "FORCE_CLOSE_AT_FINAL_CANDLE_CLOSE",
        exitReason: "RANGE_END",
        configuredExitFeeApplies: true,
        configuredExitSlippageApplies: true,
        independentOfFinalCandleSignal: true,
      },
      defaults: { initialCapital: 10_000, feeRatePercent: 0.1, slippageBps: 0 },
      excluded: [
        "SHORT_POSITIONS",
        "STOP_LOSS",
        "TAKE_PROFIT",
        "TRAILING_STOP",
        "PARTIAL_FILL",
        "SCALE_IN",
        "SCALE_OUT",
        "STRATEGY_POSITION_SIZING",
        "LEVERAGE",
        "EXCHANGE_LOT_SIZE_RULES",
        "GENERALIZED_RISK_MANAGEMENT",
      ],
    });
  });

  it("keeps Trades auditable without deferred risk fields", () => {
    const trade: Trade = {
      id: "trade-1",
      experimentId: "experiment-1",
      sequence: 1,
      pair: "BTCUSDT",
      entrySignalAt: "2026-08-27T00:00:00.000Z",
      entryTime: "2026-08-27T00:05:00.000Z",
      entryPrice: 100,
      exitSignalAt: "2026-08-27T00:55:00.000Z",
      exitTime: "2026-08-27T01:00:00.000Z",
      exitPrice: 110,
      exitReason: "STRATEGY_EXIT",
      quantity: 1,
      notionalEntryValue: 100,
      grossProfit: 10,
      feeAmount: 0.2,
      slippageBps: 0,
      profit: 9.8,
      resultPercent: 9.8,
      result: "WIN",
    };
    expect(trade.entryTime).not.toBe(trade.entrySignalAt);
    expect(trade).not.toHaveProperty("stopLoss");
    expect(trade).not.toHaveProperty("takeProfit");
  });

  it("represents synthetic paper provenance with fixed eight-place semantics", () => {
    expect(SYNTHETIC_SHORT_PAPER_V1).toMatchObject({
      id: "SYNTHETIC_SHORT_PAPER_V1",
      feeRatePercent: 0.08,
      adverseSlippageBps: 5,
      decimalScale: 8,
    });
    expect(SYNTHETIC_SHORT_PAPER_V1.executionClass).toBe("ACADEMIC_CANDLE_SIMULATION_ONLY");
  });

  it("makes exact definitions, practical replay limits, and visualization inspectable", () => {
    const experiment: Experiment = {
      id: "experiment-1",
      candidateId: "candidate-1",
      strategy: {
        kind: "STRATEGY",
        definition: {
          id: "strategy-1",
          ownerUserId: "user-1" as AuthenticatedUserId,
          logicalFamilyKey: "ma",
          strategyName: "MA",
          implementationVersion: "1",
          behaviorProfileId: "TECHNICAL_PROFILES_V1",
          version: 1,
          parameters: { fastPeriod: 20, slowPeriod: 50 },
          createdAt: "2026-08-27T00:00:00.000Z",
        },
      },
      marketData: {
        provider: "binance",
        pair: "BTCUSDT",
        timeframe: "5m",
        range: {
          from: "2026-07-01T00:00:00.000Z",
          to: "2026-08-01T00:00:00.000Z",
        },
        replayGuarantee: "TRACEABLE",
        replayLimitation: "Dataset bytes were not retained.",
      },
      configuration: {
        executionProfileId: "BACKTEST_EXECUTION_V1",
        initialCapital: 10_000,
        feeRatePercent: 0.1,
        slippageBps: 0,
      },
      metrics: {
        candidateId: "candidate-1",
        totalReturnPercent: 0,
        winRatePercent: 0,
        numberOfTrades: 0,
        maxDrawdownMagnitudePercent: 0,
        evaluationProfileId: "REQUIRED_METRICS_V1",
      },
      rankingConfigurationId: "ranking-v1",
      code: { gitCommit: "abc123" },
      replay: {
        guarantee: "TRACEABLE",
        unavailableInputs: ["HISTORICAL_DATA"],
        limitation: "Exact replay is unavailable.",
      },
      visualization: {
        signals: [
          {
            source: { kind: "STRATEGY", strategyDefinitionId: "strategy-1" },
            timestamp: "2026-07-01T00:00:00.000Z",
            signal: "HOLD",
            executionNotBefore: "2026-07-01T00:05:00.000Z",
          },
        ],
        overlays: [
          {
            strategyDefinitionId: "strategy-1",
            point: {
              descriptorId: "ma-lines",
              timestamp: "2026-07-01T00:00:00.000Z",
              values: { fast: 100, slow: 99 },
            },
          },
        ],
        tradeMarkers: [],
      },
      createdAt: "2026-08-27T00:00:00.000Z",
    };

    expect(experiment.strategy.definition.version).toBe(1);
    expect(experiment.replay.guarantee).toBe("TRACEABLE");
    expect(experiment.visualization.signals[0]?.executionNotBefore).toBe(
      "2026-07-01T00:05:00.000Z",
    );
    expect(experiment.visualization.overlays[0]?.strategyDefinitionId).toBe("strategy-1");
    expect(experiment).not.toHaveProperty("ownerUserId");
    expect(experiment.visualization.tradeMarkers).not.toHaveProperty("ownerUserId");
  });

  it("puts ownership only on the Candidate root and not inherited children", () => {
    const candidate = {
      candidateId: "candidate-1",
      ownerUserId: "user-1" as AuthenticatedUserId,
      origin: { kind: "MANUAL" as const, leaderboardScopeId: "scope-1" },
      strategySelection: { kind: "STRATEGY" as const, strategyDefinitionId: "strategy-1" },
      marketInput: {
        pair: "BTCUSDT",
        timeframe: "1h" as const,
        range: { from: "2026-01-01T00:00:00Z", to: "2026-01-02T00:00:00Z" },
      },
      status: "ACCEPTED" as const,
      createdAt: "2026-08-28T00:00:00.000Z",
      updatedAt: "2026-08-28T00:00:00.000Z",
    };
    expect(candidate.ownerUserId).toBe("user-1");
    expect({ id: "trade-1", experimentId: "experiment-1" }).not.toHaveProperty(
      "ownerUserId",
    );
  });
});
