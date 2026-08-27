# Search Capability

## Purpose and boundary

Search owns Search Runs, search-space validation, strategy candidate generation, explicit stop conditions, and bounded orchestration. Random Search is the only implemented-target MVP generator. Search submits candidates through Backtesting's public execution boundary; it does not simulate trades, calculate metrics, rank results, or own execution persistence.

## Requirements

### Requirement: Stable generator seam and Random Search MVP

The capability MUST expose a stable `StrategyGenerator` abstraction and MUST provide Random Search for the MVP. Generated candidates MUST use the same downstream form regardless of generator implementation and MUST satisfy the configured search space before submission.

Traceability: `CSL-R-SE-01`, `CSL-R-ST-03`, `CSL-R-AR-01`, `CSL-R-AR-02`, `CSL-R-AR-03`, `CSL-R-DM-01`.

### Requirement: Finite bounded execution

Every Search Run MUST have explicit finite stop conditions and a positive configurable in-flight bound. Generation MUST stop when a limit is reached, the run is cancelled, or no capacity remains. An uncontrolled infinite loop is prohibited.

Traceability: `CSL-R-SE-02`, `CSL-R-OB-01`; ADR-006.

### Requirement: Observable lifecycle

The capability MUST expose running/stopped state, stop reason, candidate count, failures, processing timing, and current run ranking. Cancellation MUST be deterministic and MUST not allow new submissions after terminalization.

Traceability: `CSL-R-OB-01`, `CSL-R-LB-01`.

## Approved behavior and invariants

- A run MUST record its normalized search space, generator selection, stop conditions, and relevant ranking scope.
- Candidate generation and submission MUST respect available executor capacity.
- Candidate failure MUST be counted and observable without creating an uncontrolled replacement loop.
- Search MUST call Backtesting and Leaderboard only through their public APIs.
- Future generator kinds are an explicitly deferred extension seam; they are not MVP implementations.

## Executable public API and status

The current executable public surface is [`modules/search/api/index.ts`](../../../modules/search/api/index.ts). It exposes `start`, `pause`, `resume`, `cancel`, `status`, and `leaderboard`, and re-exports the current generator/run projections. These functions currently throw `NOT_IMPLEMENTED`. Any current enum values beyond Random Search are source-reconciliation items, not active implementation requirements.

## Failure expectations

- An empty/invalid search space, missing finite stop condition, non-positive in-flight bound, or unsupported generator is rejected before starting.
- Generator failure is recorded with a useful reason and does not produce a malformed candidate.
- Candidate execution failure increments observable failure state while the configured stop conditions and bounds remain authoritative.
- Cancellation on an unknown or incompatible run state fails predictably and does not duplicate submissions.

## Acceptance scenarios

#### Scenario: Random Search emits a valid candidate

- **Given** a valid bounded search space and Random Search selection
- **When** one candidate is generated
- **Then** its strategy definitions and parameters are within the configured space and can be submitted through Backtesting's public boundary

#### Scenario: Stop condition terminates the run

- **Given** a run with a finite candidate limit
- **When** the limit is reached
- **Then** the run becomes stopped with a recorded reason and produces no further candidates

#### Scenario: Capacity bounds submissions

- **Given** a positive `maxInFlight` and no free execution slot
- **When** orchestration evaluates whether to generate more work
- **Then** it submits nothing until capacity is available

#### Scenario: Cancellation is terminal

- **Given** an active Search Run
- **When** it is cancelled
- **Then** no new candidates are submitted and status exposes the terminal state and accumulated counts
