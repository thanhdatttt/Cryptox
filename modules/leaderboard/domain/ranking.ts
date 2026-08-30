import {
  REQUIRED_METRICS_V1_ID,
  type EvaluationMetrics,
} from "@cryptox/evaluation";
import {
  LINEAR_REQUIRED_V1,
  type RankingConfiguration,
} from "../api/contracts";

export class LeaderboardScoringDomainError extends Error {
  public readonly name = "LeaderboardScoringDomainError";

  public constructor(
    public readonly code: "INVALID_METRICS" | "INVALID_CONFIGURATION",
    message: string,
  ) {
    super(message);
  }
}

const REQUIRED_NUMERIC_FIELDS = [
  "totalReturnPercent",
  "winRatePercent",
  "numberOfTrades",
  "maxDrawdownMagnitudePercent",
] as const;

const REQUIRED_FORMULA_KEYS = [
  "totalReturnPercentWeight",
  "winRatePercentWeight",
  "maxDrawdownMagnitudePercentWeight",
] as const;

function hasExactKeys(value: object, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  return actual.length === keys.length && actual.every((key, index) => key === [...keys].sort()[index]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function assertFiniteMetrics(metrics: EvaluationMetrics): void {
  if (!isRecord(metrics)) {
    throw new LeaderboardScoringDomainError("INVALID_METRICS", "metrics must be an object");
  }

  for (const field of REQUIRED_NUMERIC_FIELDS) {
    const value = metrics[field];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new LeaderboardScoringDomainError(
        "INVALID_METRICS",
        `${field} must be a finite number`,
      );
    }
  }

  if (
    typeof metrics.candidateId !== "string" ||
    metrics.candidateId.trim().length === 0 ||
    metrics.evaluationProfileId !== REQUIRED_METRICS_V1_ID ||
    !Number.isInteger(metrics.numberOfTrades) ||
    metrics.numberOfTrades < 0
  ) {
    throw new LeaderboardScoringDomainError("INVALID_METRICS", "metrics shape is invalid");
  }
}

export function assertRankingConfiguration(configuration: RankingConfiguration): void {
  if (
    !isRecord(configuration) ||
    typeof configuration.id !== "string" ||
    configuration.id.trim().length === 0 ||
    configuration.profileId !== LINEAR_REQUIRED_V1.id ||
    configuration.version !== LINEAR_REQUIRED_V1.version ||
    configuration.minimumNumberOfTrades !== LINEAR_REQUIRED_V1.eligibility.minimumNumberOfTrades
  ) {
    throw new LeaderboardScoringDomainError(
      "INVALID_CONFIGURATION",
      "unsupported ranking configuration",
    );
  }

  const weights = configuration.formula;
  if (
    !isRecord(weights) ||
    !hasExactKeys(weights, REQUIRED_FORMULA_KEYS) ||
    weights.totalReturnPercentWeight !== LINEAR_REQUIRED_V1.formula.totalReturnPercentWeight ||
    weights.winRatePercentWeight !== LINEAR_REQUIRED_V1.formula.winRatePercentWeight ||
    weights.maxDrawdownMagnitudePercentWeight !==
      LINEAR_REQUIRED_V1.formula.maxDrawdownMagnitudePercentWeight ||
    !Number.isFinite(weights.totalReturnPercentWeight) ||
    !Number.isFinite(weights.winRatePercentWeight) ||
    !Number.isFinite(weights.maxDrawdownMagnitudePercentWeight)
  ) {
    throw new LeaderboardScoringDomainError(
      "INVALID_CONFIGURATION",
      "ranking formula must match LINEAR_REQUIRED_V1",
    );
  }

  if (
    !Array.isArray(configuration.tieBreakers) ||
    configuration.tieBreakers.length !== LINEAR_REQUIRED_V1.tieBreakers.length ||
    configuration.tieBreakers.some(
      (tieBreaker, index) =>
        !isRecord(tieBreaker) ||
        tieBreaker.field !== LINEAR_REQUIRED_V1.tieBreakers[index]?.field ||
        tieBreaker.direction !== LINEAR_REQUIRED_V1.tieBreakers[index]?.direction,
    )
  ) {
    throw new LeaderboardScoringDomainError(
      "INVALID_CONFIGURATION",
      "ranking tie-breakers must match LINEAR_REQUIRED_V1",
    );
  }
}

export function scoreEvaluation(
  leaderboardScopeId: string,
  configuration: RankingConfiguration,
  metrics: EvaluationMetrics,
): {
  leaderboardScopeId: string;
  rankingConfigurationId: string;
  overallScore: number;
  rankEligible: true;
} | {
  leaderboardScopeId: string;
  rankingConfigurationId: string;
  overallScore: number;
  rankEligible: false;
  rankExclusionReason: "NO_TRADES";
} {
  assertRankingConfiguration(configuration);
  assertFiniteMetrics(metrics);

  if (metrics.numberOfTrades < configuration.minimumNumberOfTrades) {
    return {
      leaderboardScopeId,
      rankingConfigurationId: configuration.id,
      overallScore: 0,
      rankEligible: false,
      rankExclusionReason: "NO_TRADES",
    };
  }

  const overallScore =
    metrics.totalReturnPercent * configuration.formula.totalReturnPercentWeight +
    metrics.winRatePercent * configuration.formula.winRatePercentWeight +
    metrics.maxDrawdownMagnitudePercent * configuration.formula.maxDrawdownMagnitudePercentWeight;

  if (!Number.isFinite(overallScore)) {
    throw new LeaderboardScoringDomainError(
      "INVALID_METRICS",
      "score calculation produced a non-finite value",
    );
  }

  return {
    leaderboardScopeId,
    rankingConfigurationId: configuration.id,
    overallScore,
    rankEligible: true,
  };
}
