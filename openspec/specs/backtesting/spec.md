# Backtesting Capability

## Purpose and boundary

Backtesting owns manual and Search candidate submission, the Backtest Execution Port, bounded local MVP execution, deterministic historical simulation, execution progress/failure, Trades, and completed Experiment results. It delegates metric calculation to Evaluation and ranking to Leaderboard. Callers depend on the execution port, never on the executor mechanism.

## Requirements

### Requirement: Deterministic historical simulation

The capability MUST simulate a versioned strategy over identified historical candles and produce ordered auditable Trades and one terminal success or failure outcome. The same valid definition, data, and configuration MUST produce the same result.

Traceability: `CSL-R-BT-01`, `CSL-R-ST-04`, `CSL-R-VIS-01`, `CSL-R-AR-02`, `CSL-R-AR-03`, `CSL-R-DM-01`.

### Requirement: Bounded replaceable execution

Manual submission and Search MUST use a stable Backtest Execution Port. The MVP adapter MUST execute locally with configurable concurrency/resource bounds. Submission MUST NOT create an uncontrolled loop, and consumers MUST remain independent of an explicitly deferred future execution adapter.

Traceability: `CSL-R-BT-01`, `CSL-R-SE-02`, `CSL-R-AR-01`; ADR-006.

### Requirement: Practical experiment provenance

A completed Experiment MUST record or resolve the immutable strategy/composite definition, normalized parameters, pair, timeframe, historical range, dataset identity/version where practical, code version/commit where practical, Trades, evaluation results, and relevant ranking configuration. It MUST state honestly when exact replay inputs are unavailable.

Traceability: `CSL-R-RP-01`; ADR-007.

### Requirement: Observable execution

Execution status MUST expose duration, progress sufficient for Search and manual views, and a useful terminal failure reason. Each accepted execution MUST settle once as success or failure from the consumer's perspective.

Traceability: `CSL-R-OB-01`.

## Approved behavior and invariants

- Strategy analysis MUST receive historical context without infrastructure access.
- Trades MUST be ordered and refer to the candles/signals that produced their entry/exit visualization markers.
- Evaluation and Leaderboard remain separate capabilities invoked after a successful simulation.
- Completed Experiment data and referenced definitions MUST not be overwritten by later runs or edits.
- Execution bounds are configuration, not fixed architectural constants.

## Executable public API and status

The current executable public surface is [`modules/backtesting/api/index.ts`](../../../modules/backtesting/api/index.ts). The approved relevant operations include `startManual`, `submitSearchCandidate`, `status`, candidate summaries/reads, attempt/trade reads, and Experiment reads. They currently throw `NOT_IMPLEMENTED`. Queue-era operations and types still exported by that barrel are source-reconciliation backlog and do not define active MVP behavior. ADR-006 also records that the approved execution port is not yet present in source.

## Failure expectations

- Invalid strategy references, historical ranges, or incomplete required datasets are rejected before simulation.
- Strategy or simulation exceptions produce an observable failed outcome and do not yield a partially successful Experiment.
- Saturated local capacity applies backpressure or a bounded rejection; it MUST NOT start unbounded concurrent work.
- Missing historical code/data is reported as a replay limitation rather than silently substituted.

## Acceptance scenarios

#### Scenario: Manual backtest completes deterministically

- **Given** a valid versioned strategy and identified complete historical input
- **When** a manual backtest executes twice with the same configuration
- **Then** both successful results contain equivalent ordered Trades and evaluation inputs

#### Scenario: Local concurrency is bounded

- **Given** a configured local execution limit
- **When** submissions exceed available capacity
- **Then** active execution does not exceed the limit and every accepted submission exposes progress or a terminal outcome

#### Scenario: Simulation failure is contained

- **Given** a strategy that raises an execution error
- **When** its backtest runs
- **Then** that execution becomes observably failed and no completed Experiment or ranking entry is presented for it

#### Scenario: Experiment provenance is inspectable

- **Given** a completed Experiment
- **When** its detail is read
- **Then** the strategy version, market range, available dataset/code provenance, Trades, metrics, and ranking configuration reference are inspectable
