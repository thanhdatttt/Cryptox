import { describe, expect, it } from "vitest";
import { LINEAR_REQUIRED_V1, type RankingConfiguration } from "../api/contracts";
import { assertFiniteMetrics, assertRankingConfiguration, scoreEvaluation } from "./ranking";

const configuration = (): RankingConfiguration => ({
  id: "ranking-v1",
  profileId: LINEAR_REQUIRED_V1.id,
  version: LINEAR_REQUIRED_V1.version,
  name: "Required",
  formula: { ...LINEAR_REQUIRED_V1.formula },
  minimumNumberOfTrades: LINEAR_REQUIRED_V1.eligibility.minimumNumberOfTrades,
  tieBreakers: [...LINEAR_REQUIRED_V1.tieBreakers] as RankingConfiguration["tieBreakers"],
  createdAt: "2026-08-29T00:00:00.000Z",
});

const metrics = {
  candidateId: "candidate-1",
  totalReturnPercent: 10,
  winRatePercent: 50,
  numberOfTrades: 2,
  maxDrawdownMagnitudePercent: 2,
  evaluationProfileId: "REQUIRED_METRICS_V1" as const,
};

function expectInvalidConfiguration(action: () => unknown): void {
  try {
    action();
  } catch (error) {
    expect(error).toMatchObject({ code: "INVALID_CONFIGURATION" });
    return;
  }
  throw new Error("expected INVALID_CONFIGURATION");
}

function expectInvalidMetrics(action: () => unknown): void {
  try {
    action();
  } catch (error) {
    expect(error).toMatchObject({ code: "INVALID_METRICS" });
    return;
  }
  throw new Error("expected INVALID_METRICS");
}

describe("LINEAR_REQUIRED_V1 configuration guard", () => {
  it("rejects altered formula weights even when profile and version match", () => {
    const altered = configuration();
    altered.formula = { ...altered.formula, winRatePercentWeight: 0.4 };
    expectInvalidConfiguration(() => assertRankingConfiguration(altered));
    expectInvalidConfiguration(() => scoreEvaluation("scope-1", altered, metrics));
  });

  it("rejects reordered, missing, or altered tie-breakers", () => {
    const altered = configuration();
    altered.tieBreakers = [
      altered.tieBreakers[1]!,
      altered.tieBreakers[0]!,
      altered.tieBreakers[2]!,
      altered.tieBreakers[3]!,
      altered.tieBreakers[4]!,
    ];
    expectInvalidConfiguration(() => assertRankingConfiguration(altered));

    const missing = configuration();
    missing.tieBreakers = missing.tieBreakers.slice(0, 4) as RankingConfiguration["tieBreakers"];
    expectInvalidConfiguration(() => assertRankingConfiguration(missing));
  });

  it("requires finite metrics from the approved Evaluation profile", () => {
    expectInvalidMetrics(() => assertFiniteMetrics({
      ...metrics,
      totalReturnPercent: Number.NaN,
    }));
    expectInvalidMetrics(() => assertFiniteMetrics({
      ...metrics,
      evaluationProfileId: "OTHER_PROFILE" as never,
    }));
    expectInvalidMetrics(() => assertFiniteMetrics({
      ...metrics,
      numberOfTrades: 1.5,
    }));
  });
});
