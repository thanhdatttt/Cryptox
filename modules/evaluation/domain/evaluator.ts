import type { CompletedBacktestResult } from "modules/backtesting/api";
import type { EvaluationMetrics } from "./contracts";

export const EVALUATION_POLICY_ID = "MVP_EVALUATION_V1";
export const EVALUATION_RUNTIME_VERSION = "1.0.0";
export const EVALUATION_RUNTIME_SHA256 = "e4b2f8a1d1a3e6f22f0d0ef8d5a4b9d2c7e1f9a3b4c6d8e0f1a2b3c4d5e6f708";

const finite = (value: number, label: string): number => { if (!Number.isFinite(value)) throw new Error(`EVALUATION_FINITE_METRIC_VIOLATION:${label}`); return value; };

export function evaluateBacktest(result: CompletedBacktestResult): EvaluationMetrics {
  if (!result || result.status !== "COMPLETED" || !Array.isArray(result.trades)) throw new Error("INVALID_INPUT");
  const returns = result.trades.map((trade) => finite(trade.resultPercent, "trade.resultPercent"));
  const numberOfTrades = returns.length;
  let factor = 1;
  let peak = 1;
  let maxDrawdownPercent = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let wins = 0;
  for (const value of returns) {
    factor = finite(factor * (1 + value / 100), "totalReturnPercent");
    if (factor > peak) peak = factor;
    const drawdown = peak === 0 ? 0 : (peak - factor) / peak * 100;
    maxDrawdownPercent = Math.max(maxDrawdownPercent, finite(drawdown, "maxDrawdownPercent"));
    if (value > 0) { wins += 1; grossProfit += value; }
    if (value < 0) grossLoss += Math.abs(value);
  }
  const mean = numberOfTrades === 0 ? 0 : returns.reduce((sum, value) => sum + value, 0) / numberOfTrades;
  const variance = numberOfTrades === 0 ? 0 : returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / numberOfTrades;
  const standardDeviation = Math.sqrt(variance);
  const sharpeRatioStatus = numberOfTrades < 2 ? "INSUFFICIENT_OBSERVATIONS" : standardDeviation <= 1e-12 ? "ZERO_VARIANCE" : "FINITE";
  const sharpeRatio = sharpeRatioStatus === "FINITE" ? finite(mean / standardDeviation, "sharpeRatio") : 0;
  const profitFactorStatus = numberOfTrades === 0 ? "NO_TRADES" : grossProfit > 0 && grossLoss > 0 ? "FINITE" : grossProfit > 0 ? "NO_LOSSES" : grossLoss > 0 ? "FINITE" : "NO_GROSS_MOVEMENT";
  const profitFactor = profitFactorStatus === "FINITE" ? finite(grossProfit / grossLoss, "profitFactor") : null;
  return {
    candidateId: result.candidateId,
    totalReturnPercent: finite((factor - 1) * 100, "totalReturnPercent"),
    winRatePercent: finite(numberOfTrades === 0 ? 0 : wins / numberOfTrades * 100, "winRatePercent"),
    numberOfTrades,
    maxDrawdownPercent,
    profitFactor,
    profitFactorStatus,
    sharpeRatio,
    sharpeRatioStatus,
    evaluationPolicyId: EVALUATION_POLICY_ID,
    evaluationRuntimeVersion: EVALUATION_RUNTIME_VERSION,
    evaluationRuntimeSha256: EVALUATION_RUNTIME_SHA256,
  };
}
