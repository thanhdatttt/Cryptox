# Leaderboard Capability

## Purpose and boundary

Leaderboard owns score/ranking configuration, deterministic scoring, Top-K admission, and ranking reads for completed Experiments. It consumes evaluated results and does not run strategies, simulations, or metric calculations.

## Requirements

### Requirement: Configurable reproducible Top-K

The capability MUST maintain Top-K rankings with positive configurable `K`. The default MAY be `10`, but `10` is not an architectural invariant. Any overall score MUST use an identified configuration and be explainable and reproducible from stored metrics. For a discovery result, the admitted Experiment and its Search Run provenance MUST identify the profile/configuration, seed, dataset identity, and code version that produced the candidate sequence.

Traceability: `CSL-R-LB-01`, `CSL-R-RP-01`, `CSL-R-RP-02`, `CSL-R-SE-03`, `CSL-R-AR-02`, `CSL-R-AR-03`.

### Requirement: Deterministic admission and reads

Only completed, successfully evaluated Experiments with finite required metrics MAY be admitted. Ranking order and tie-breaking MUST be deterministic. Search Run rankings and general scope rankings MUST not mutate Experiment or Evaluation data.

Traceability: `CSL-R-LB-01`, `CSL-R-SE-01`, `CSL-R-AR-01`.

### Requirement: Observable ranking state

Consumers MUST be able to read the current ranking state and relate each entry to its Experiment, evaluation metrics, strategy version, and score configuration.

Traceability: `CSL-R-OB-01`, `CSL-R-DM-01`.

### Requirement: User-specific ranking scopes

LeaderboardScope MUST be a direct user-owned root. A scope MUST admit and rank only
Experiments whose Candidate has the same owner. LeaderboardEntry inherits ownership
from its scope; RankingConfiguration remains shared system data.

Traceability: `CSL-R-LB-01`, `CSL-R-OW-01`; ADR-008.

## Approved behavior and invariants

- `K` MUST be a positive configured value; omitted configuration uses `10`.
- The same metrics and score configuration MUST yield the same score.
- Admission MUST retain no more than `K` entries in a scope and MUST apply a stable tie-break.
- Re-submitting the same completed Experiment MUST not create duplicate entries.
- Ranking configuration changes MUST be identifiable and MUST not rewrite historical provenance.
- Scope/entry collections MUST filter by owner before pagination/counting, and client identity fields MUST NOT authorize access.

## Executable public API and status

The current executable public surface is [`modules/leaderboard/api/index.ts`](../../../modules/leaderboard/api/index.ts). It exposes scope/configuration operations, `score`, `topK`, `rankSearchRun`, and `submit`, and re-exports ranking projections. These functions currently throw `NOT_IMPLEMENTED` and do not yet represent user ownership. C-01A must extend scope/application/repository contracts before L-01; the scoring formula and tie order remain frozen.

## Failure expectations

- Non-positive `K`, unknown scope, missing score configuration, or non-finite metrics are rejected explicitly.
- A failed or incomplete backtest is not admitted.
- Duplicate submission is idempotent from the ranking reader's perspective.
- A scoring failure affects only the relevant submission and remains observable to the originating execution.

## Acceptance scenarios

#### Scenario: Default Top-10 is configurable

- **Given** no explicit `K`
- **When** a leaderboard scope is created and more than ten valid results are submitted
- **Then** the read returns at most ten entries, and another scope can use a different positive `K`

#### Scenario: Ranking is reproducible

- **Given** the same finite metrics and score configuration
- **When** scoring is repeated
- **Then** the same score and deterministic order are produced

#### Scenario: Lower-ranked entry is rejected

- **Given** a full Top-K scope
- **When** a valid result ranks below every admitted entry
- **Then** the Top-K set is unchanged while the Experiment remains readable

#### Scenario: Entry is traceable

- **Given** an admitted leaderboard entry
- **When** its details are requested
- **Then** its Experiment, strategy version, metrics, and score-configuration reference can be inspected

#### Scenario: Scope rejects another user's Experiment

- **Given** a User A LeaderboardScope and a completed User B Experiment
- **When** admission is attempted
- **Then** no entry is created and User B data is absent from User A's ranking
