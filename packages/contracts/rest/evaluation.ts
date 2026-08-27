export interface EvaluationMetricsDto {
  candidateId: string;
  totalReturnPercent: number;
  winRatePercent: number;
  numberOfTrades: number;
  maxDrawdownMagnitudePercent: number;
  evaluationProfileId: "REQUIRED_METRICS_V1";
}
