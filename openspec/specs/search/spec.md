# Search Capability

## Purpose

Search owns Search Runs, search-space validation, strategy candidate generation, explicit stop conditions, and bounded orchestration. It supports the deterministic `RANDOM_V1`, `DOMAIN_GUIDED_V1`, and `GENETIC_V1` profiles. Search submits candidates through Backtesting's public execution boundary; it does not simulate trades, calculate metrics, rank results, or own execution persistence.

## Requirements

### Requirement: Stable deterministic generator profiles

The capability MUST expose a stable `StrategyGenerator` abstraction and MUST
provide `RANDOM_V1`, `DOMAIN_GUIDED_V1`, and `GENETIC_V1`. Generated candidates
MUST use the same downstream form regardless of profile and MUST satisfy the
configured search space before submission. Every run persists its seed, normalized
algorithm configuration, dataset identity, and code version; the same inputs MUST
produce the same candidate sequence and ranking. Domain-guided generation uses
only declared valid categories and no LLM. Genetic defaults are population 50,
at most 10 generations, elite 10%, mutation 20%, and never exceed the candidate
budget.

Traceability: `CSL-R-SE-01`, `CSL-R-SE-03`, `CSL-R-ST-03`, `CSL-R-AR-01`, `CSL-R-AR-02`, `CSL-R-AR-03`, `CSL-R-DM-01`.

#### Scenario: Search profile emits a valid candidate

- **Given** a valid bounded search space and an approved profile selection
- **When** one candidate is generated
- **Then** its strategy definitions and parameters are within the configured space and can be submitted through Backtesting's public boundary

#### Scenario: Seeded discovery replays its sequence

- **Given** identical search space, algorithm configuration, dataset identity,
  code version, and persisted seed
- **When** an approved profile is run twice
- **Then** both runs generate the same candidate sequence and ranking

### Requirement: Finite bounded execution

Every Search Run MUST have explicit finite stop conditions and a positive configurable in-flight bound. Generation MUST stop when a limit is reached, the run is cancelled, or no capacity remains. The default budget is the earlier of 500 candidates or five minutes. An uncontrolled infinite loop is prohibited.

Traceability: `CSL-R-SE-02`, `CSL-R-OB-01`; ADR-006.

#### Scenario: Stop condition terminates the run

- **Given** a run with a finite candidate limit
- **When** the limit is reached
- **Then** the run becomes stopped with a recorded reason and produces no further candidates

#### Scenario: Capacity bounds submissions

- **Given** a positive `maxInFlight` and no free execution slot
- **When** orchestration evaluates whether to generate more work
- **Then** it submits nothing until capacity is available

### Requirement: Observable lifecycle

The capability MUST expose running/stopped state, stop reason, candidate count, failures, processing timing, and current run ranking. Cancellation MUST be deterministic and MUST not allow new submissions after terminalization.

Traceability: `CSL-R-OB-01`, `CSL-R-LB-01`.

#### Scenario: Cancellation is terminal

- **Given** an active Search Run
- **When** it is cancelled
- **Then** no new candidates are submitted and status exposes the terminal state and accumulated counts

### Requirement: User-owned Search Runs

Each Search Run MUST be a direct user-owned root derived from trusted authenticated
context. Its Strategy Definitions, LeaderboardScope, and Search-created Candidates
MUST have the same owner. Search-created Candidate ownership MUST come from the
trusted SearchRun/user context, never from generated or client identity fields.

Traceability: `CSL-R-OW-01`; ADR-008.

#### Scenario: Search ownership propagates

- **Given** an authenticated user starting a valid Search Run
- **When** Search submits generated Candidates
- **Then** the Run, definitions, Leaderboard scope, and Candidates resolve to that same trusted owner
## Approved behavior and invariants

- A run MUST record its normalized search space, generator selection, stop conditions, and relevant ranking scope.
- Candidate generation and submission MUST respect available executor capacity.
- Candidate failure MUST be counted and observable without creating an uncontrolled replacement loop.
- Search MUST call Backtesting and Leaderboard only through their public APIs.
- Bayesian, reinforcement-learning, agent-based, LLM-generated, and unbounded
  generator kinds remain deferred.
- Search Run collections and lifecycle commands MUST be owner-scoped before pagination/counting or state mutation.

## Executable public API and status

The current executable public surface is [`modules/search/api/index.ts`](../../../modules/search/api/index.ts). It exposes `start`, `pause`, `resume`, `cancel`, `status`, and `leaderboard`, and re-exports the current generator/run projections. These functions currently throw `NOT_IMPLEMENTED` and do not yet carry trusted ownership. C-01A must extend ownership-sensitive contracts before Q-01 ownership work; pure Random generation remains unchanged.

## Failure expectations

- An empty/invalid search space, missing finite stop condition, non-positive in-flight bound, or unsupported generator is rejected before starting.
- Generator failure is recorded with a useful reason and does not produce a malformed candidate.
- Candidate execution failure increments observable failure state while the configured stop conditions and bounds remain authoritative.
- Cancellation on an unknown or incompatible run state fails predictably and does not duplicate submissions.
