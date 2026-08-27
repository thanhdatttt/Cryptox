# Evaluation Capability

## Purpose and boundary

Evaluation owns pure calculation and edge-case policy for backtest metrics. It consumes a completed backtest result and does not know strategy implementations, execute simulations, persist trades, or rank experiments.

## Requirements

### Requirement: Required metric set

Evaluation MUST calculate Return, Win Rate, Maximum Drawdown, and Number of Trades for every valid completed backtest. Metric definitions and zero-denominator behavior MUST be documented and deterministic.

Traceability: `CSL-R-EV-01`, `CSL-R-RP-01`, `CSL-R-AR-02`, `CSL-R-AR-03`, `CSL-R-DM-01`.

### Requirement: Independent deterministic evaluator

The evaluator MUST depend only on the completed result supplied through the Backtesting public boundary. The same valid result MUST produce the same finite metrics, independent of Strategy, executor, persistence, frontend, or Leaderboard implementation.

Traceability: `CSL-R-EV-01`, `CSL-R-AR-01`; ADR-006.

### Suggested requirement: Additional metrics

Profit Factor and Sharpe Ratio SHOULD be supported only after the four required metrics. When present, their sampling and zero-denominator conventions MUST be explicit and they MUST remain finite.

Traceability: `CSL-S-02`.

## Approved behavior and invariants

- Return compares ending and starting portfolio value using one documented convention.
- Win Rate is winning closed trades divided by closed trades; a zero-trade input yields a defined finite value.
- Maximum Drawdown is the largest peak-to-trough decline on the supplied equity sequence and uses one documented finite sign/magnitude convention.
- Number of Trades is the count of completed Trades according to the Backtesting result contract.
- Evaluation MUST NOT mutate the supplied result or calculate a leaderboard score.
- Backtesting invokes Evaluation after a successful simulation; REST adapters, frontend code, Search, and strategies MUST NOT bypass that orchestration boundary to calculate or persist metrics.

## Executable public API and status

The current executable public surface is [`modules/evaluation/api/index.ts`](../../../modules/evaluation/api/index.ts). It defines `EvaluatorModulePublicApi`, re-exports `Evaluator`, `EvaluationMetrics`, and `EvaluationError`, and contains a placeholder evaluator whose `evaluate` method throws `NOT_IMPLEMENTED`. No implemented runtime evaluator export is currently verified.

## Failure expectations

- Missing or structurally invalid required result data fails with a domain evaluation error.
- NaN or infinite inputs and outputs are rejected or normalized according to an explicit metric edge-case policy; non-finite metrics never reach Leaderboard.
- Zero trades and a flat equity curve return defined finite metrics rather than division errors.
- An evaluation failure is attached to the affected execution and does not change unrelated results.

## Acceptance scenarios

#### Scenario: Required metrics are produced

- **Given** a valid completed backtest with known trades and equity values
- **When** it is evaluated
- **Then** Return, Win Rate, Maximum Drawdown, and Number of Trades match the documented formulas

#### Scenario: Zero trades are finite

- **Given** a valid completed backtest with no closed Trades and unchanged equity
- **When** it is evaluated
- **Then** all required metrics are defined and finite

#### Scenario: Evaluation is deterministic and pure

- **Given** the same completed result object
- **When** evaluation runs twice
- **Then** both metric sets are equal and the input remains unchanged

#### Scenario: Invalid numeric input is contained

- **Given** a completed result containing a non-finite required numeric value
- **When** evaluation is attempted
- **Then** it fails explicitly and no ranking submission occurs
