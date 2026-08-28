# Evaluation V1

`REQUIRED_METRICS_V1` is the deterministic Evaluation profile. Its public output
identifies the profile through `evaluationProfileId`; the module runtime version is
`1.0.0`.

For a valid completed backtest:

- Return percentage is `(endingCapital - initialCapital) / initialCapital * 100`.
  `initialCapital` must be positive and finite.
- Win Rate percentage is `winning closed trades / all closed trades * 100`.
  `WIN` is winning; `LOSS` and `BREAKEVEN` are not. With no trades, Win Rate is 0.
- Number of Trades is the length of the supplied completed-trade sequence.
- Maximum Drawdown is the largest non-negative peak-to-trough percentage magnitude
  `(peak - currentValue) / peak * 100` in the supplied equity-point order. Empty,
  singleton, flat, and all-zero curves have drawdown 0. Equity values must be
  finite and non-negative.

Candidate identity, every required numeric input, trade result, and equity-point
shape are validated. Non-finite input is rejected as `INVALID_INPUT`; a finite
input whose arithmetic overflows is rejected as
`EVALUATION_FINITE_METRIC_VIOLATION`. The evaluator does not mutate its input and
does not calculate scores, optional metrics, persistence, or rankings.
